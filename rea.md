# Chat Management Implementation Guide

A comprehensive, modular guide for implementing chat history management in AI-powered applications. This document covers database design, API architecture, state management, UI components, and edge case handling.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Module 1: Database Schema](#2-module-1-database-schema)
3. [Module 2: API Routes](#3-module-2-api-routes)
4. [Module 3: State Management Store](#4-module-3-state-management-store)
5. [Module 4: UI Components](#5-module-4-ui-components)
6. [Module 5: Title Generation](#6-module-5-title-generation)
7. [Module 6: Session Lifecycle](#7-module-6-session-lifecycle)
8. [Module 7: Message Persistence & Streaming](#8-module-7-message-persistence--streaming)
9. [Module 8: Multi-Agent Support](#9-module-8-multi-agent-support)
10. [Edge Cases & Bug Prevention](#10-edge-cases--bug-prevention)
11. [Implementation Checklist](#11-implementation-checklist)

---

## 1. Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           USER INTERFACE                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────┐  │
│  │  ChatInput   │  │ ChatMessage  │  │    ChatHistoryModal          │  │
│  │  - Send msg  │  │ - Render msg │  │    - List sessions           │  │
│  │  - Model sel │  │ - Tool calls │  │    - Select/Delete           │  │
│  │  - Web search│  │ - Reasoning  │  │    - New chat                │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        STATE MANAGEMENT                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │                    ChatHistoryStore                              │   │
│  │  - sessions: ChatSession[]                                       │   │
│  │  - activeSessionId: { [agentType]: string | null }              │   │
│  │  - fetchSessions(), createSession(), deleteSession()            │   │
│  │  - fetchSession(), updateSessionMessages()                       │   │
│  └─────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                           API LAYER                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐    │
│  │ GET /sessions  │  │ POST /sessions │  │ PATCH /sessions/:id    │    │
│  │ List all       │  │ Create new     │  │ Update messages/title  │    │
│  └────────────────┘  └────────────────┘  └────────────────────────┘    │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐    │
│  │ GET /:id       │  │ DELETE /:id    │  │ POST /generate-title   │    │
│  │ Get with msgs  │  │ Delete session │  │ AI-powered titles      │    │
│  └────────────────┘  └────────────────┘  └────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                          DATABASE                                        │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐     ┌─────────────────────────────────┐   │
│  │      ChatSession        │────▶│         ChatMessage             │   │
│  │  - id, title, agentType │     │  - id, role, content, parts     │   │
│  │  - userId, timestamps   │     │  - sessionId (FK)               │   │
│  │  - lastResponseId       │     │                                 │   │
│  └─────────────────────────┘     └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Design Principles

1. **Separation of Concerns**: Database, API, Store, and UI are independent modules
2. **Optimistic UI**: Show changes immediately, sync in background
3. **Debounced Persistence**: Save after streaming completes, not during
4. **Idempotent Operations**: Hash-based duplicate prevention
5. **Multi-Agent Ready**: Separate session tracking per agent type
6. **Graceful Degradation**: Fallbacks for title generation, session loading

---

## 2. Module 1: Database Schema

### 2.1 Schema Definition (Prisma)

```prisma
// schema.prisma

model ChatSession {
  id             String   @id @default(cuid())
  userId         String?
  title          String
  agentType      String   // "financial" | "market" | "general"
  lastResponseId String?  // For OpenAI Responses API (GPT-5/o1 models)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user     User?         @relation(fields: [userId], references: [id], onDelete: SetNull)
  messages ChatMessage[]

  @@index([userId])
  @@index([agentType])
  @@index([updatedAt])
}

model ChatMessage {
  id        String   @id @default(cuid())
  sessionId String
  role      String   // "user" | "assistant" | "system"
  content   String   // Extracted text content
  parts     String?  // JSON string for tool calls, reasoning, sources

  createdAt DateTime @default(now())

  session ChatSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([sessionId])
}
```

### 2.2 Schema Design Decisions

| Field | Purpose | Why |
|-------|---------|-----|
| `agentType` | Categorize chats by agent | Enables multi-agent apps with separate histories |
| `lastResponseId` | OpenAI Responses API continuity | Required for GPT-5/o1 reasoning chain resumption |
| `parts` (JSON) | Store complex message structures | Tool calls, reasoning steps, citations need structured data |
| `onDelete: Cascade` | Auto-cleanup messages | Prevents orphaned messages when session deleted |
| `@@index([updatedAt])` | Fast sorting by recent | List view always shows most recent first |

### 2.3 TypeScript Types

```typescript
// types/chat.ts

export type AgentType = 'financial' | 'market' | 'general'

export interface ChatSession {
  id: string
  userId: string | null
  title: string
  agentType: AgentType
  lastResponseId: string | null
  createdAt: Date
  updatedAt: Date
  messages: ChatMessage[]
}

export interface ChatSessionSummary {
  id: string
  title: string
  agentType: AgentType
  createdAt: Date
  updatedAt: Date
}

export interface ChatMessage {
  id: string
  sessionId: string
  role: 'user' | 'assistant' | 'system'
  content: string
  parts?: MessagePart[]
  createdAt: Date
}

export type MessagePart =
  | { type: 'text'; text: string }
  | { type: 'reasoning'; reasoning: string; details?: unknown[] }
  | { type: 'tool-call'; toolCallId: string; toolName: string; args: unknown }
  | { type: 'tool-result'; toolCallId: string; result: unknown }
  | { type: 'source'; source: { url: string; title?: string } }
```

---

## 3. Module 2: API Routes

### 3.1 Route Structure

```
/api/chat-history/
├── route.ts              # GET (list), POST (create)
├── [id]/
│   └── route.ts          # GET (single), PATCH (update), DELETE
└── generate-title/
    └── route.ts          # POST (AI title generation)
```

### 3.2 List Sessions - GET /api/chat-history

```typescript
// app/api/chat-history/route.ts

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedUser } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const sessions = await prisma.chatSession.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        title: true,
        agentType: true,
        createdAt: true,
        updatedAt: true,
        // Exclude messages for list performance
      },
    })

    return NextResponse.json({ success: true, data: sessions })
  } catch (error) {
    console.error('Failed to fetch chat sessions:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }
}
```

### 3.3 Create Session - POST /api/chat-history

```typescript
// app/api/chat-history/route.ts (continued)

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { title, agentType } = await request.json()

    // Validate agentType
    const validAgentTypes = ['financial', 'market', 'general']
    if (!agentType || !validAgentTypes.includes(agentType)) {
      return NextResponse.json(
        { success: false, error: 'Valid agentType is required' },
        { status: 400 }
      )
    }

    const session = await prisma.chatSession.create({
      data: {
        title: title || 'New Chat',
        agentType,
        userId: user.id,
      },
    })

    return NextResponse.json({ success: true, data: session })
  } catch (error) {
    console.error('Failed to create chat session:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create session' },
      { status: 500 }
    )
  }
}
```

### 3.4 Get Single Session - GET /api/chat-history/[id]

```typescript
// app/api/chat-history/[id]/route.ts

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    const session = await prisma.chatSession.findUnique({
      where: { id, userId: user.id }, // Ownership check
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: session })
  } catch (error) {
    console.error('Failed to fetch chat session:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch session' },
      { status: 500 }
    )
  }
}
```

### 3.5 Update Session - PATCH /api/chat-history/[id]

```typescript
// app/api/chat-history/[id]/route.ts (continued)

// Helper to extract text from various message formats
function extractTextContent(message: any): string {
  // Handle AI SDK UIMessage format with parts
  if (message.parts && Array.isArray(message.parts)) {
    const textParts = message.parts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
    if (textParts.length > 0) return textParts.join('\n')
  }
  // Handle simple string content
  if (typeof message.content === 'string') {
    return message.content
  }
  // Handle array content (OpenAI format)
  if (Array.isArray(message.content)) {
    return message.content
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('\n')
  }
  return ''
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params
    const { title, messages, lastResponseId } = await request.json()

    // Verify ownership
    const existingSession = await prisma.chatSession.findUnique({
      where: { id, userId: user.id },
    })

    if (!existingSession) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      )
    }

    // Update session metadata
    const session = await prisma.chatSession.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(lastResponseId !== undefined && { lastResponseId }),
        updatedAt: new Date(),
      },
    })

    // Full message sync (delete old, create new)
    if (messages && Array.isArray(messages)) {
      await prisma.chatMessage.deleteMany({
        where: { sessionId: id },
      })

      if (messages.length > 0) {
        await prisma.chatMessage.createMany({
          data: messages.map((msg: any) => ({
            sessionId: id,
            role: msg.role,
            content: extractTextContent(msg),
            parts: msg.parts ? JSON.stringify(msg.parts) : null,
          })),
        })
      }
    }

    return NextResponse.json({ success: true, data: session })
  } catch (error) {
    console.error('Failed to update chat session:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update session' },
      { status: 500 }
    )
  }
}
```

### 3.6 Delete Session - DELETE /api/chat-history/[id]

```typescript
// app/api/chat-history/[id]/route.ts (continued)

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Verify ownership
    const existingSession = await prisma.chatSession.findUnique({
      where: { id, userId: user.id },
    })

    if (!existingSession) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      )
    }

    // Delete session (messages cascade delete via schema)
    await prisma.chatSession.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully',
    })
  } catch (error) {
    console.error('Failed to delete chat session:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete session' },
      { status: 500 }
    )
  }
}
```

---

## 4. Module 3: State Management Store

### 4.1 Store Architecture

Use `useSyncExternalStore` for React 18+ or Zustand for simpler setup.

```typescript
// stores/chat-history-store.ts

import { useSyncExternalStore, useCallback } from 'react'
import type { AgentType, ChatSession, ChatSessionSummary } from '@/types/chat'

// State shape
interface ChatHistoryState {
  sessions: ChatSessionSummary[]
  activeSessionId: Record<AgentType, string | null>
  isLoading: boolean
  isInitialized: boolean
}

const initialState: ChatHistoryState = {
  sessions: [],
  activeSessionId: {
    financial: null,
    market: null,
    general: null,
  },
  isLoading: false,
  isInitialized: false,
}

// Store implementation
let state = initialState
const listeners = new Set<() => void>()

function emitChange() {
  listeners.forEach((listener) => listener())
}

export const chatHistoryStore = {
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  getState() {
    return state
  },

  // Fetch all sessions
  fetchSessions: async (): Promise<void> => {
    state = { ...state, isLoading: true }
    emitChange()

    try {
      const response = await fetch('/api/chat-history')
      const result = await response.json()

      if (result.success) {
        state = {
          ...state,
          sessions: result.data.map((s: any) => ({
            ...s,
            createdAt: new Date(s.createdAt),
            updatedAt: new Date(s.updatedAt),
          })),
          isLoading: false,
          isInitialized: true,
        }
      } else {
        state = { ...state, isLoading: false, isInitialized: true }
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
      state = { ...state, isLoading: false, isInitialized: true }
    }

    emitChange()
  },

  // Create new session
  createSession: async (
    agentType: AgentType,
    title?: string
  ): Promise<string | null> => {
    try {
      const response = await fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentType, title: title || 'New Chat' }),
      })

      const result = await response.json()

      if (result.success) {
        const newSession: ChatSessionSummary = {
          ...result.data,
          createdAt: new Date(result.data.createdAt),
          updatedAt: new Date(result.data.updatedAt),
        }

        state = {
          ...state,
          sessions: [newSession, ...state.sessions],
          activeSessionId: {
            ...state.activeSessionId,
            [agentType]: newSession.id,
          },
        }
        emitChange()

        return newSession.id
      }

      return null
    } catch (error) {
      console.error('Failed to create session:', error)
      return null
    }
  },

  // Delete session
  deleteSession: async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/chat-history/${id}`, {
        method: 'DELETE',
      })

      const result = await response.json()

      if (result.success) {
        // Remove from sessions list
        const deletedSession = state.sessions.find((s) => s.id === id)

        state = {
          ...state,
          sessions: state.sessions.filter((s) => s.id !== id),
        }

        // Clear active session if deleted
        if (deletedSession) {
          const agentType = deletedSession.agentType as AgentType
          if (state.activeSessionId[agentType] === id) {
            state = {
              ...state,
              activeSessionId: {
                ...state.activeSessionId,
                [agentType]: null,
              },
            }
          }
        }

        emitChange()
        return true
      }

      return false
    } catch (error) {
      console.error('Failed to delete session:', error)
      return false
    }
  },

  // Fetch single session with messages
  fetchSession: async (id: string): Promise<ChatSession | null> => {
    try {
      const response = await fetch(`/api/chat-history/${id}`)
      const result = await response.json()

      if (result.success && result.data) {
        const session = result.data

        return {
          ...session,
          createdAt: new Date(session.createdAt),
          updatedAt: new Date(session.updatedAt),
          messages: session.messages.map((m: any, index: number) => ({
            // Generate NEW IDs to avoid OpenAI API errors
            // Old IDs may conflict with reasoning chain requirements
            id: `loaded-${session.id}-${index}-${Date.now()}`,
            role: m.role,
            content: m.content,
            parts: m.parts ? JSON.parse(m.parts) : undefined,
            createdAt: new Date(m.createdAt),
          })),
        }
      }

      return null
    } catch (error) {
      console.error('Failed to fetch session:', error)
      return null
    }
  },

  // Update session messages and/or title
  updateSessionMessages: async (
    id: string,
    messages: any[],
    title?: string,
    lastResponseId?: string
  ): Promise<boolean> => {
    try {
      const response = await fetch(`/api/chat-history/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          ...(title && { title }),
          ...(lastResponseId !== undefined && { lastResponseId }),
        }),
      })

      const result = await response.json()

      if (result.success) {
        // Update title in local state if provided
        if (title) {
          state = {
            ...state,
            sessions: state.sessions.map((s) =>
              s.id === id ? { ...s, title, updatedAt: new Date() } : s
            ),
          }
          emitChange()
        }

        return true
      }

      return false
    } catch (error) {
      console.error('Failed to update session:', error)
      return false
    }
  },

  // Set active session for agent type
  setActiveSession: (agentType: AgentType, sessionId: string | null) => {
    state = {
      ...state,
      activeSessionId: {
        ...state.activeSessionId,
        [agentType]: sessionId,
      },
    }
    emitChange()
  },

  // Get active session for agent type
  getActiveSessionId: (agentType: AgentType): string | null => {
    return state.activeSessionId[agentType]
  },
}

// React hook
export function useChatHistoryStore() {
  const sessions = useSyncExternalStore(
    chatHistoryStore.subscribe,
    () => chatHistoryStore.getState().sessions,
    () => initialState.sessions
  )

  const activeSessionId = useSyncExternalStore(
    chatHistoryStore.subscribe,
    () => chatHistoryStore.getState().activeSessionId,
    () => initialState.activeSessionId
  )

  const isLoading = useSyncExternalStore(
    chatHistoryStore.subscribe,
    () => chatHistoryStore.getState().isLoading,
    () => initialState.isLoading
  )

  const isInitialized = useSyncExternalStore(
    chatHistoryStore.subscribe,
    () => chatHistoryStore.getState().isInitialized,
    () => initialState.isInitialized
  )

  // Wrap methods in useCallback for stable references
  const fetchSessions = useCallback(() => chatHistoryStore.fetchSessions(), [])
  const createSession = useCallback(
    (agentType: AgentType, title?: string) =>
      chatHistoryStore.createSession(agentType, title),
    []
  )
  const deleteSession = useCallback(
    (id: string) => chatHistoryStore.deleteSession(id),
    []
  )
  const fetchSession = useCallback(
    (id: string) => chatHistoryStore.fetchSession(id),
    []
  )
  const updateSessionMessages = useCallback(
    (id: string, messages: any[], title?: string, lastResponseId?: string) =>
      chatHistoryStore.updateSessionMessages(id, messages, title, lastResponseId),
    []
  )
  const setActiveSession = useCallback(
    (agentType: AgentType, sessionId: string | null) =>
      chatHistoryStore.setActiveSession(agentType, sessionId),
    []
  )
  const getActiveSessionId = useCallback(
    (agentType: AgentType) => chatHistoryStore.getActiveSessionId(agentType),
    []
  )

  return {
    sessions,
    activeSessionId,
    isLoading,
    isInitialized,
    fetchSessions,
    createSession,
    deleteSession,
    fetchSession,
    updateSessionMessages,
    setActiveSession,
    getActiveSessionId,
  }
}
```

---

## 5. Module 4: UI Components

### 5.1 Chat History Modal

```tsx
// components/chat/chat-history-modal.tsx

'use client'

import { useEffect, useState } from 'react'
import { useChatHistoryStore } from '@/stores/chat-history-store'
import { formatRelativeTime } from '@/lib/utils'
import type { AgentType, ChatSessionSummary } from '@/types/chat'

interface ChatHistoryModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentAgentType: AgentType
  onSelectChat: (sessionId: string, agentType: AgentType) => void
}

export function ChatHistoryModal({
  open,
  onOpenChange,
  currentAgentType,
  onSelectChat,
}: ChatHistoryModalProps) {
  const {
    sessions,
    activeSessionId,
    isLoading,
    isInitialized,
    fetchSessions,
    deleteSession,
  } = useChatHistoryStore()

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load sessions when modal opens
  useEffect(() => {
    if (open && !isInitialized) {
      fetchSessions()
    }
  }, [open, isInitialized, fetchSessions])

  // Sort by most recent
  const sortedSessions = [...sessions].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  )

  const handleSelectChat = (session: ChatSessionSummary) => {
    onSelectChat(session.id, session.agentType as AgentType)
    onOpenChange(false)
  }

  const handleDeleteClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation()
    setDeleteConfirmId(sessionId)
  }

  const handleConfirmDelete = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!deleteConfirmId) return

    setIsDeleting(true)
    await deleteSession(deleteConfirmId)
    setIsDeleting(false)
    setDeleteConfirmId(null)
  }

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteConfirmId(null)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-white p-4 shadow-xl dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Chat History</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : sortedSessions.length === 0 ? (
            <p className="py-8 text-center text-gray-500">No conversations yet</p>
          ) : (
            <div className="space-y-2">
              {sortedSessions.map((session) => {
                const isActive =
                  activeSessionId[session.agentType as AgentType] === session.id
                const isConfirmingDelete = deleteConfirmId === session.id

                return (
                  <div
                    key={session.id}
                    onClick={() => handleSelectChat(session)}
                    className={`
                      cursor-pointer rounded-lg p-3 transition-colors
                      ${isActive ? 'bg-primary/10 border border-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}
                    `}
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{session.title}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                          <span>{formatRelativeTime(session.updatedAt)}</span>
                          {session.agentType !== currentAgentType && (
                            <span className="rounded bg-gray-200 px-1.5 py-0.5 dark:bg-gray-700">
                              {session.agentType}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="ml-2 flex-shrink-0">
                        {isConfirmingDelete ? (
                          <div className="flex gap-1">
                            <button
                              onClick={handleConfirmDelete}
                              disabled={isDeleting}
                              className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
                            >
                              {isDeleting ? '...' : 'Delete'}
                            </button>
                            <button
                              onClick={handleCancelDelete}
                              className="rounded bg-gray-300 px-2 py-1 text-xs hover:bg-gray-400"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => handleDeleteClick(e, session.id)}
                            className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

### 5.2 Chat Panel Integration

```tsx
// components/layout/chat-panel.tsx (key sections)

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useChat } from '@ai-sdk/react'
import { useChatHistoryStore } from '@/stores/chat-history-store'
import type { AgentType } from '@/types/chat'

interface ChatPanelProps {
  agentType: AgentType
  apiEndpoint: string
}

export function ChatPanel({ agentType, apiEndpoint }: ChatPanelProps) {
  const {
    activeSessionId,
    fetchSession,
    updateSessionMessages,
    createSession,
  } = useChatHistoryStore()

  const currentSessionId = activeSessionId[agentType]

  // Refs for preventing race conditions
  const prevSessionIdRef = useRef<string | null | undefined>(undefined)
  const isCreatingSessionRef = useRef(false)
  const justCreatedSessionRef = useRef<string | null>(null)
  const titleGeneratedRef = useRef<Set<string>>(new Set())
  const lastSavedMessagesRef = useRef<string>('')

  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  // Stable chat ID per agent type
  const chatId = `chat-${agentType}`

  const {
    messages,
    setMessages,
    append,
    stop,
    status,
  } = useChat({
    id: chatId,
    api: apiEndpoint,
  })

  const isStreaming = status === 'streaming'

  // Effect 1: Load messages when session changes
  useEffect(() => {
    const handleSessionChange = async () => {
      const prevSessionId = prevSessionIdRef.current
      const isFirstMount = prevSessionId === undefined
      prevSessionIdRef.current = currentSessionId

      // New chat - clear messages
      if (currentSessionId === null && prevSessionId !== null && !isFirstMount) {
        setMessages([])
        lastSavedMessagesRef.current = ''
        return
      }

      // Skip if we're creating or just created this session
      if (
        currentSessionId &&
        (isCreatingSessionRef.current ||
          justCreatedSessionRef.current === currentSessionId)
      ) {
        if (justCreatedSessionRef.current === currentSessionId) {
          justCreatedSessionRef.current = null
        }
        return
      }

      // Load from history
      if (currentSessionId && (currentSessionId !== prevSessionId || isFirstMount)) {
        setIsLoadingHistory(true)
        try {
          const session = await fetchSession(currentSessionId)
          if (session && session.messages.length > 0) {
            setMessages(session.messages)
            lastSavedMessagesRef.current = JSON.stringify(
              session.messages.map((m) => m.id)
            )
            // CRITICAL: Mark as already having title
            titleGeneratedRef.current.add(currentSessionId)
          } else {
            setMessages([])
          }
        } finally {
          setIsLoadingHistory(false)
        }
      }
    }

    handleSessionChange()
  }, [currentSessionId, fetchSession, setMessages])

  // Effect 2: Save messages after streaming completes
  useEffect(() => {
    const saveMessages = async () => {
      if (!currentSessionId || messages.length === 0) return

      // Hash to prevent duplicate saves
      const messagesHash = JSON.stringify(messages.map((m) => m.id))
      if (messagesHash === lastSavedMessagesRef.current) return
      lastSavedMessagesRef.current = messagesHash

      await updateSessionMessages(currentSessionId, messages)
    }

    if (!isStreaming && messages.length > 0) {
      saveMessages()
    }
  }, [messages, currentSessionId, isStreaming, updateSessionMessages])

  // Effect 3: Create session for first message
  useEffect(() => {
    const createNewSessionIfNeeded = async () => {
      if (isCreatingSessionRef.current) return
      if (!currentSessionId && messages.length > 0) {
        isCreatingSessionRef.current = true
        try {
          const newSessionId = await createSession(agentType, 'New Chat')
          if (newSessionId) {
            justCreatedSessionRef.current = newSessionId
            await updateSessionMessages(newSessionId, messages)
          }
        } finally {
          isCreatingSessionRef.current = false
        }
      }
    }

    if (!isStreaming && messages.length > 0 && !currentSessionId) {
      createNewSessionIfNeeded()
    }
  }, [messages, currentSessionId, agentType, isStreaming, createSession, updateSessionMessages])

  // Effect 4: Generate smart title after first AI response
  useEffect(() => {
    const generateTitle = async () => {
      if (!currentSessionId || titleGeneratedRef.current.has(currentSessionId)) {
        return
      }

      const hasUserMessage = messages.some((m) => m.role === 'user')
      const hasAssistantMessage = messages.some((m) => m.role === 'assistant')
      if (!hasUserMessage || !hasAssistantMessage) return

      titleGeneratedRef.current.add(currentSessionId)

      const title = await generateSmartTitle(messages.slice(0, 4))
      await updateSessionMessages(currentSessionId, messages, title)
    }

    if (!isStreaming && currentSessionId && messages.length >= 2) {
      generateTitle()
    }
  }, [messages, currentSessionId, isStreaming, updateSessionMessages])

  // Loading state
  if (isLoadingHistory) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <ChatMessage key={message.id} message={message} />
        ))}
      </div>

      {/* Input */}
      <ChatInput onSubmit={(content) => append({ role: 'user', content })} />
    </div>
  )
}
```

---

## 6. Module 5: Title Generation

### 6.1 Simple Title (Fallback)

```typescript
// lib/chat-utils.ts

export function generateChatTitle(message: string): string {
  const maxLength = 50
  const cleaned = message.trim().replace(/\n/g, ' ')

  if (cleaned.length <= maxLength) {
    return cleaned
  }

  const truncated = cleaned.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')

  return lastSpace > 30
    ? truncated.slice(0, lastSpace) + '...'
    : truncated + '...'
}
```

### 6.2 AI-Powered Title Generation

```typescript
// lib/chat-utils.ts (continued)

export async function generateSmartTitle(
  messages: { role: string; content: string }[]
): Promise<string> {
  try {
    const response = await fetch('/api/chat-history/generate-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    })

    const result = await response.json()

    if (result.success && result.title) {
      return result.title
    }

    // Fallback
    const firstUserMessage = messages.find((m) => m.role === 'user')
    return firstUserMessage
      ? generateChatTitle(firstUserMessage.content)
      : 'New Chat'
  } catch (error) {
    console.error('Failed to generate smart title:', error)
    const firstUserMessage = messages.find((m) => m.role === 'user')
    return firstUserMessage
      ? generateChatTitle(firstUserMessage.content)
      : 'New Chat'
  }
}
```

### 6.3 Title Generation API

```typescript
// app/api/chat-history/generate-title/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { generateText } from 'ai'
import { openai } from '@ai-sdk/openai'

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Messages array is required' },
        { status: 400 }
      )
    }

    // Get first few messages for context
    const contextMessages = messages.slice(0, 4).map((m: any) => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : '',
    }))

    // Use fast, cheap model for title generation
    const result = await generateText({
      model: openai('gpt-4o-mini'),
      system: `You are a title generator for an AI chat application.
Generate a concise, descriptive title (3-6 words) that captures the main topic.
Do NOT use quotes around the title.
Do NOT include prefixes like "Title:" or "Chat:".
Just return the title text directly.`,
      messages: [
        {
          role: 'user',
          content: `Generate a short title for this conversation:\n\n${contextMessages
            .map((m: any) => `${m.role}: ${m.content}`)
            .join('\n\n')}`,
        },
      ],
    })

    // Clean up title
    const title = result.text.trim().replace(/^["']|["']$/g, '')

    return NextResponse.json({ success: true, title })
  } catch (error) {
    console.error('Failed to generate title:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate title' },
      { status: 500 }
    )
  }
}
```

---

## 7. Module 6: Session Lifecycle

### 7.1 Lifecycle Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                       SESSION LIFECYCLE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌──────────┐    User sends     ┌──────────────┐                   │
│   │ No       │───first message──▶│ CREATE       │                   │
│   │ Session  │                   │ Session      │                   │
│   └──────────┘                   └──────┬───────┘                   │
│                                         │                            │
│                                         ▼                            │
│   ┌──────────────────────────────────────────────────────────┐      │
│   │                    ACTIVE SESSION                         │      │
│   │                                                           │      │
│   │  ┌─────────┐   Stream    ┌─────────┐   Complete  ┌─────┐ │      │
│   │  │ User    │────────────▶│Streaming│───────────▶│ SAVE │ │      │
│   │  │ Message │             │         │             │ msgs │ │      │
│   │  └─────────┘             └─────────┘             └──┬──┘ │      │
│   │                                                     │     │      │
│   │                    ┌────────────────────────────────┘     │      │
│   │                    ▼                                      │      │
│   │  ┌─────────────────────────────────────────────────────┐ │      │
│   │  │ If first AI response → Generate Smart Title → SAVE  │ │      │
│   │  └─────────────────────────────────────────────────────┘ │      │
│   └──────────────────────────────────────────────────────────┘      │
│                                                                      │
│   User clicks        ┌──────────┐                                   │
│   history item  ────▶│ LOAD     │──▶ Set messages + mark title done │
│                      │ Session  │                                   │
│                      └──────────┘                                   │
│                                                                      │
│   User clicks        ┌──────────┐                                   │
│   "New Chat"    ────▶│ CLEAR    │──▶ Set sessionId = null           │
│                      │          │    Clear messages                 │
│                      └──────────┘                                   │
│                                                                      │
│   User clicks        ┌──────────┐                                   │
│   delete button ────▶│ DELETE   │──▶ Remove from DB + state         │
│                      │ Session  │    Clear if was active            │
│                      └──────────┘                                   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.2 Critical Timing

| Event | Action | When |
|-------|--------|------|
| First message sent | Create session | After streaming completes |
| AI responds | Save messages | After streaming completes |
| First AI response | Generate title | After save, once per session |
| Load session | Set messages | Immediately, with loading state |
| New chat | Clear messages | Immediately |
| Delete session | Remove + clear | After API confirms |

---

## 8. Module 7: Message Persistence & Streaming

### 8.1 Streaming Integration Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     MESSAGE PERSISTENCE FLOW                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. User submits message                                            │
│     │                                                                │
│     ▼                                                                │
│  2. useChat.append({ role: 'user', content: '...' })               │
│     │                                                                │
│     ▼                                                                │
│  3. POST /api/chat ───▶ AI processes ───▶ Stream response          │
│     │                                                                │
│     ▼                                                                │
│  4. Client receives chunks → Updates messages state                 │
│     │                                                                │
│     ▼                                                                │
│  5. status changes: 'submitted' → 'streaming' → 'ready'            │
│     │                                                                │
│     ▼                                                                │
│  6. onFinish callback fires                                         │
│     │  ├── Extract responseId (for GPT-5/o1)                        │
│     │  └── Save to state if not aborted                             │
│     │                                                                │
│     ▼                                                                │
│  7. Save effect triggers (when !isStreaming)                        │
│     │  ├── Hash messages to check for changes                       │
│     │  ├── Skip if hash matches last save                           │
│     │  └── PATCH /api/chat-history/{id}                             │
│     │                                                                │
│     ▼                                                                │
│  8. Title effect triggers (if first AI response)                    │
│     │  ├── Check titleGeneratedRef                                  │
│     │  ├── Call generateSmartTitle()                                │
│     │  └── Update session with title                                │
│     │                                                                │
│     ▼                                                                │
│  9. Session creation effect (if no session)                         │
│     ├── Check isCreatingSessionRef                                  │
│     ├── Create session with 'New Chat' title                        │
│     ├── Set justCreatedSessionRef                                   │
│     └── Save messages to new session                                │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.2 OpenAI Responses API (GPT-5/o1)

For reasoning models that use OpenAI's Responses API:

```typescript
// app/api/chat/route.ts

export async function POST(req: Request) {
  const { messages, previousResponseId, modelId } = await req.json()

  const isReasoningModel = modelId.includes('o1') || modelId.includes('gpt-5')

  let messagesToSend = messages

  if (previousResponseId && messages.length > 0) {
    // With previousResponseId, OpenAI reconstructs context
    // Only send the latest user message
    const lastUserMessage = messages.findLast((m: any) => m.role === 'user')
    messagesToSend = lastUserMessage ? [lastUserMessage] : messages
  }

  const result = streamText({
    model: isReasoningModel
      ? openai.responses(modelId)
      : openai(modelId),
    messages: messagesToSend,
    providerOptions: isReasoningModel
      ? {
          openai: {
            reasoningEffort: 'medium',
            ...(previousResponseId && { previousResponseId }),
          },
        }
      : undefined,
  })

  return result.toUIMessageStreamResponse()
}
```

---

## 9. Module 8: Multi-Agent Support

### 9.1 Architecture for Multiple Agents

```typescript
// Store tracks separate active session per agent
interface ChatHistoryState {
  activeSessionId: {
    financial: string | null
    market: string | null
    general: string | null
    // Add more agent types as needed
  }
}
```

### 9.2 Agent-Specific Chat Panels

```tsx
// Each agent has its own chat panel with independent state
function FinancialAgentChat() {
  return <ChatPanel agentType="financial" apiEndpoint="/api/chat/financial" />
}

function MarketAgentChat() {
  return <ChatPanel agentType="market" apiEndpoint="/api/chat/market" />
}
```

### 9.3 Switching Agents

```tsx
// Dashboard layout handles agent switching
function DashboardLayout() {
  const [currentAgent, setCurrentAgent] = useState<AgentType>('financial')
  const { setActiveSession } = useChatHistoryStore()

  const handleNewChat = () => {
    // Only clears current agent's session
    setActiveSession(currentAgent, null)
  }

  return (
    <div>
      <AgentTabs value={currentAgent} onChange={setCurrentAgent} />
      {currentAgent === 'financial' && <FinancialAgentChat />}
      {currentAgent === 'market' && <MarketAgentChat />}
    </div>
  )
}
```

---

## 10. Edge Cases & Bug Prevention

### 10.1 Common Bugs and Fixes

| Bug | Cause | Fix |
|-----|-------|-----|
| Title regenerates on load | `titleGeneratedRef` not set when loading | Add session ID to ref when loading from history |
| Loading spinner on first message | Race condition: `activeSessionId` set before `justCreatedSessionRef` | Check `isCreatingSessionRef` in addition to `justCreatedSessionRef` |
| Duplicate sessions created | Async creation without guard | Use `isCreatingSessionRef` mutex |
| Messages lost on session switch | Messages cleared before save completes | Save synchronously before switch |
| Stale previousResponseId | Old reasoning chain used after pause | Clear `previousResponseId` when loading session |
| Duplicate saves | Effect runs multiple times | Hash-based comparison before save |

### 10.2 Critical Ref Guards

```typescript
// Prevent duplicate session creation
const isCreatingSessionRef = useRef(false)

// Track just-created sessions to skip loading
const justCreatedSessionRef = useRef<string | null>(null)

// Track sessions that already have titles
const titleGeneratedRef = useRef<Set<string>>(new Set())

// Track last saved state to prevent duplicate saves
const lastSavedMessagesRef = useRef<string>('')

// Track previous session ID for change detection
const prevSessionIdRef = useRef<string | null | undefined>(undefined)
```

### 10.3 Session Change Effect Template

```typescript
useEffect(() => {
  const handleSessionChange = async () => {
    const prevSessionId = prevSessionIdRef.current
    const isFirstMount = prevSessionId === undefined
    prevSessionIdRef.current = currentSessionId

    // Case 1: New chat (clear)
    if (currentSessionId === null && prevSessionId !== null && !isFirstMount) {
      setMessages([])
      lastSavedMessagesRef.current = ''
      return
    }

    // Case 2: Session being created (skip - prevent loading state)
    if (
      currentSessionId &&
      (isCreatingSessionRef.current ||
        justCreatedSessionRef.current === currentSessionId)
    ) {
      if (justCreatedSessionRef.current === currentSessionId) {
        justCreatedSessionRef.current = null
      }
      return
    }

    // Case 3: Load from history
    if (currentSessionId && (currentSessionId !== prevSessionId || isFirstMount)) {
      setIsLoadingHistory(true)
      try {
        const session = await fetchSession(currentSessionId)
        if (session?.messages.length > 0) {
          setMessages(session.messages)
          lastSavedMessagesRef.current = JSON.stringify(
            session.messages.map((m) => m.id)
          )
          titleGeneratedRef.current.add(currentSessionId) // CRITICAL
        } else {
          setMessages([])
        }
      } finally {
        setIsLoadingHistory(false)
      }
    }
  }

  handleSessionChange()
}, [currentSessionId, fetchSession, setMessages])
```

---

## 11. Implementation Checklist

### Phase 1: Database Setup
- [ ] Create ChatSession model with indexes
- [ ] Create ChatMessage model with cascade delete
- [ ] Run migrations
- [ ] Create TypeScript types

### Phase 2: API Routes
- [ ] GET /api/chat-history (list sessions)
- [ ] POST /api/chat-history (create session)
- [ ] GET /api/chat-history/[id] (get with messages)
- [ ] PATCH /api/chat-history/[id] (update messages/title)
- [ ] DELETE /api/chat-history/[id] (delete session)
- [ ] POST /api/chat-history/generate-title (AI titles)

### Phase 3: State Management
- [ ] Create chat history store
- [ ] Implement all CRUD methods
- [ ] Add multi-agent activeSessionId tracking
- [ ] Create React hook with useSyncExternalStore

### Phase 4: UI Components
- [ ] ChatHistoryModal with list, select, delete
- [ ] ChatPanel with session lifecycle effects
- [ ] ChatMessage component
- [ ] ChatInput component
- [ ] New Chat button integration

### Phase 5: Title Generation
- [ ] Simple title fallback function
- [ ] AI-powered title API
- [ ] Client-side smart title caller
- [ ] Title generation effect with deduplication

### Phase 6: Edge Case Handling
- [ ] Add all ref guards
- [ ] Implement hash-based save deduplication
- [ ] Handle session creation race condition
- [ ] Handle title regeneration on load
- [ ] Clear previousResponseId on session load

### Phase 7: Testing
- [ ] Create new chat → verify session created
- [ ] Load existing chat → verify no title regeneration
- [ ] Switch sessions → verify no data loss
- [ ] Delete session → verify cascade cleanup
- [ ] Multi-agent → verify independent histories

---

## Appendix: Utility Functions

### Format Relative Time

```typescript
export function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString()
}
```

### Extract Text from Message

```typescript
export function extractTextContent(message: any): string {
  if (message.parts && Array.isArray(message.parts)) {
    const textParts = message.parts
      .filter((p: any) => p.type === 'text')
      .map((p: any) => p.text)
    if (textParts.length > 0) return textParts.join('\n')
  }
  if (typeof message.content === 'string') {
    return message.content
  }
  if (Array.isArray(message.content)) {
    return message.content
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text)
      .join('\n')
  }
  return ''
}
```

---

## License

This documentation is provided as-is for educational and implementation reference purposes.
