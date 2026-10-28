import fs from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { education, projects, roles } from '@/data/profile'
import { basePath, counterpartPath, languageAlternates, localeFromPath } from '@/i18n/config'
import { dictionary } from '@/i18n/dictionaries'
import { shouldNudge } from '@/i18n/nudge'
import { HINDI, localizedProfile } from '@/i18n/profile'

describe('Hindi profile overlay', () => {
  // A record without a translation would ship its English prose on the Hindi page. It does
  // not break anything, which is exactly why it needs a test to be noticed.
  it('translates every role, school and project', () => {
    for (const role of roles) {
      expect(HINDI.roles[role.id], `role ${role.id}`).toBeDefined()
      if (role.summary) expect(HINDI.roles[role.id]?.summary, `role ${role.id} summary`).toBeTruthy()
      if (role.location) expect(HINDI.roles[role.id]?.location, `role ${role.id} location`).toBeTruthy()
    }
    for (const entry of education) {
      expect(HINDI.education[entry.id], `education ${entry.id}`).toBeDefined()
      expect(HINDI.education[entry.id]?.focus).toHaveLength(entry.focus.length)
    }
    for (const project of projects) {
      const text = HINDI.projects[project.id]
      expect(text, `project ${project.id}`).toBeDefined()
      expect(text?.tagline && text.summary && text.linkLabel, `project ${project.id} prose`).toBeTruthy()
      expect(text?.capabilities, `project ${project.id} capabilities`).toHaveLength(
        project.capabilities.length,
      )
    }
  })

  it('has no translation for a record that no longer exists', () => {
    const ids = (records: readonly { id: string }[]) => records.map((record) => record.id).sort()
    expect(Object.keys(HINDI.roles).sort()).toEqual(ids(roles))
    expect(Object.keys(HINDI.education).sort()).toEqual(ids(education))
    expect(Object.keys(HINDI.projects).sort()).toEqual(ids(projects))
  })

  it('never changes a fact, only the prose around it', () => {
    const hindi = localizedProfile('hi')
    hindi.projects.forEach((project, at) => {
      expect(project.name).toBe(projects[at]?.name)
      expect(project.url).toBe(projects[at]?.url)
      expect(project.status).toBe(projects[at]?.status)
    })
    hindi.roles.forEach((role, at) => {
      expect(role.from).toBe(roles[at]?.from)
      expect(role.until).toBe(roles[at]?.until)
      expect(role.stack).toEqual(roles[at]?.stack)
    })
  })

  it('returns the records themselves for English', () => {
    expect(localizedProfile('en').projects).toBe(projects)
  })
})

describe('dictionaries', () => {
  it('give Hindi twelve month names', () => {
    expect(dictionary('hi').months).toHaveLength(12)
  })

  it('point each switcher at the other language', () => {
    expect(dictionary('en').switcher.target).toBe('hi')
    expect(dictionary('hi').switcher.target).toBe('en')
  })
})

describe('locale paths', () => {
  it('reads the language from the URL prefix', () => {
    expect(localeFromPath('/')).toBe('en')
    expect(localeFromPath('/projects/')).toBe('en')
    expect(localeFromPath('/hi')).toBe('hi')
    expect(localeFromPath('/hi/blogs/')).toBe('hi')
    // A path that merely starts with the letters is not the prefix.
    expect(localeFromPath('/hiring/')).toBe('en')
  })

  it('strips the prefix', () => {
    expect(basePath('/hi')).toBe('/')
    expect(basePath('/hi/')).toBe('/')
    expect(basePath('/hi/projects/')).toBe('/projects/')
    expect(basePath('/blogs/')).toBe('/blogs/')
  })

  it('sends the switcher to the same page in the other language', () => {
    expect(counterpartPath('/', 'hi')).toBe('/hi/')
    expect(counterpartPath('/projects', 'hi')).toBe('/hi/projects/')
    expect(counterpartPath('/hi/blogs', 'en')).toBe('/blogs/')
    expect(counterpartPath('/hi', 'en')).toBe('/')
  })

  it('lands an untranslated post on the writing index rather than a 404', () => {
    expect(counterpartPath('/blogs/agentchatmanager', 'hi')).toBe('/hi/blogs/')
    expect(counterpartPath('/no-such-page/', 'hi')).toBe('/hi/')
  })

  it('declares every language and an x-default as alternates', () => {
    expect(languageAlternates('/projects/')).toEqual({
      en: '/projects/',
      hi: '/hi/projects/',
      'x-default': '/projects/',
    })
  })
})

describe('language redirect', () => {
  const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'vercel.json'), 'utf8')) as {
    redirects: {
      source: string
      has?: { type: string; key?: string; value?: string }[]
      missing?: { type: string; key?: string }[]
      destination: string
      permanent: boolean
    }[]
  }
  const toHindi = config.redirects.filter((rule) => rule.destination === '/hi/')
  const header = toHindi
    .flatMap((rule) => rule.has ?? [])
    .find((condition) => condition.key === 'accept-language')
  const pattern = new RegExp(header?.value ?? '(?!)')

  it('is temporary, so a browser never caches one visitor’s language for the URL', () => {
    expect(toHindi.length).toBeGreaterThan(0)
    for (const rule of toHindi) expect(rule.permanent).toBe(false)
  })

  it('honours a saved choice before the browser language', () => {
    const headerRule = toHindi.find((rule) => rule.has?.some((c) => c.key === 'accept-language'))
    expect(headerRule?.missing).toEqual([{ type: 'cookie', key: 'lang' }])
  })

  it('fires only when Hindi is the browser’s first choice', () => {
    expect(pattern.test('hi')).toBe(true)
    expect(pattern.test('hi-IN')).toBe(true)
    expect(pattern.test('hi-IN,hi;q=0.9,en-US;q=0.8,en;q=0.7')).toBe(true)
    expect(pattern.test('hi;q=0.9,en;q=0.8')).toBe(true)

    // An English-first browser in India stays on English, Hindi listed second or not.
    expect(pattern.test('en-IN,en;q=0.9,hi;q=0.8')).toBe(false)
    expect(pattern.test('en-US,en;q=0.9')).toBe(false)
    // Another language that merely starts with the letters.
    expect(pattern.test('hil')).toBe(false)
  })
})

describe('India nudge', () => {
  it('invites an English reader in India who has never chosen', () => {
    expect(shouldNudge({ locale: 'en', timeZone: 'Asia/Kolkata', cookie: '' })).toBe(true)
    expect(shouldNudge({ locale: 'en', timeZone: 'Asia/Calcutta', cookie: 'ph_x=1' })).toBe(true)
  })

  it('stays quiet once a language has been chosen, either way', () => {
    expect(shouldNudge({ locale: 'en', timeZone: 'Asia/Kolkata', cookie: 'lang=en' })).toBe(false)
    expect(shouldNudge({ locale: 'en', timeZone: 'Asia/Kolkata', cookie: 'a=1; lang=hi' })).toBe(false)
  })

  it('stays quiet outside India and on pages already in Hindi', () => {
    expect(shouldNudge({ locale: 'en', timeZone: 'America/New_York', cookie: '' })).toBe(false)
    expect(shouldNudge({ locale: 'en', timeZone: undefined, cookie: '' })).toBe(false)
    expect(shouldNudge({ locale: 'hi', timeZone: 'Asia/Kolkata', cookie: '' })).toBe(false)
  })
})
