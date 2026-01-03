'use client'

import { useState } from 'react'
import { FaXTwitter, FaLinkedinIn } from 'react-icons/fa6'
import { Link2, Check } from 'lucide-react'

interface ShareButtonsProps {
  title: string
  slug: string
}

export function ShareButtons({ title, slug }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)
  
  // Build the full URL (works on client side)
  const getFullUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/blogs/${slug}`
    }
    return `/blogs/${slug}`
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getFullUrl())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  const shareOnTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(getFullUrl())}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const shareOnLinkedIn = () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(getFullUrl())}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground">Share:</span>
      
      <button
        onClick={shareOnTwitter}
        className="p-2 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-all hover:scale-110"
        aria-label="Share on X"
      >
        <FaXTwitter className="w-4 h-4" />
      </button>
      
      <button
        onClick={shareOnLinkedIn}
        className="p-2 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-all hover:scale-110"
        aria-label="Share on LinkedIn"
      >
        <FaLinkedinIn className="w-4 h-4" />
      </button>
      
      <button
        onClick={handleCopyLink}
        className="p-2 rounded-full bg-muted hover:bg-muted/80 text-foreground transition-all hover:scale-110"
        aria-label="Copy link"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-500" />
        ) : (
          <Link2 className="w-4 h-4" />
        )}
      </button>
    </div>
  )
}
