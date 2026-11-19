/**
 * The profile in each language.
 *
 * `src/data/profile.ts` stays the single source of truth for what is true. This file only
 * says how the prose in it reads in another language, keyed by the same stable record ids.
 * Names, dates, URLs, statuses and tool names are never overlaid — they are facts, and a
 * translation that could change one would be a second source of truth.
 *
 * A record or field with no overlay falls back to English rather than going blank, and
 * `tests/i18n.test.ts` fails the build if any record is missing its translation, so a new
 * project shows up in English on the Hindi page for exactly as long as it takes to notice.
 */

import {
  education,
  person,
  projects,
  roles,
  type Education,
  type Person,
  type Project,
  type Role,
} from '@/data/profile'

import { projectContent } from '@/data/project-content'

import type { Locale } from './config'

type PersonText = Partial<Pick<Person, 'title' | 'location' | 'focus' | 'interests'>>
type RoleText = Partial<Pick<Role, 'org' | 'title' | 'location' | 'summary'>>
type EducationText = Partial<Pick<Education, 'institution' | 'credential' | 'field' | 'focus'>>
type ProjectText = Partial<Pick<Project, 'tagline' | 'linkLabel' | 'summary' | 'capabilities'>>

export interface ProfileTranslation {
  readonly person: PersonText
  readonly roles: Readonly<Record<string, RoleText>>
  readonly education: Readonly<Record<string, EducationText>>
  readonly projects: Readonly<Record<string, ProjectText>>
}

export const HINDI: ProfileTranslation = {
  person: {
    title: 'AI इंजीनियर',
    focus: ['हेल्थकेयर AI', 'एजेंटिक ऑटोमेशन', 'पूरी तरह ऑटोनॉमस सॉफ़्टवेयर'],
    interests: ['डीप स्पेस'],
  },
  roles: {
    undisclosed: {
      org: 'गोपनीय',
      title: 'सॉफ़्टवेयर इंजीनियर',
      summary: 'संगठन की कार्यक्षमता बढ़ाने के लिए आंतरिक प्रक्रियाओं में ऑटोमेशन बना रहा हूँ।',
    },
    wybit: {
      title: 'सॉफ़्टवेयर इंजीनियर',
      location: 'ऑरलैंडो, फ़्लोरिडा, अमेरिका',
      summary: 'हेल्थकेयर को नया रूप देने वाले एजेंट डेवलप किए।',
    },
    cloudoplus: {
      title: 'AI इंजीनियर',
      location: 'सांता एना, कैलिफ़ोर्निया, अमेरिका',
      summary:
        'AI से चलने वाला एक QA एजेंट बनाया, जिसने क्वालिटी एश्योरेंस की प्रक्रिया को ऑटोमेट किया — टेस्टिंग तेज़ हुई और मैनुअल मेहनत घटी।',
    },
    chatsguru: {
      title: 'AI इंजीनियर',
      location: 'अहमदाबाद, गुजरात, भारत',
      summary:
        'कई AI प्रोडक्ट शिप किए — एक सोशल प्लेटफ़ॉर्म, जो सिर्फ़ अकाउंट जोड़ने भर से सभी चैनलों की पोस्टिंग एक जगह ले आया, और एक प्लेटफ़ॉर्म, जहाँ यूज़र अपने निजी बॉट ख़ुद बनाते थे।',
    },
  },
  education: {
    vtu: {
      institution: 'विश्वेश्वरैया प्रौद्योगिकी विश्वविद्यालय',
      credential: 'मास्टर ऑफ़ कंप्यूटर एप्लिकेशन्स',
      field: 'कंप्यूटर साइंस',
      focus: ['सॉफ़्टवेयर डेवलपमेंट', 'एल्गोरिदम', 'डेटा स्ट्रक्चर'],
    },
  },
  // Each project's Hindi prose is edited beside its English in the CMS (content/projects.json).
  projects: Object.fromEntries(projectContent.map((project) => [project.id, project.hi])),
}

const TRANSLATIONS: Partial<Record<Locale, ProfileTranslation>> = { hi: HINDI }

export interface LocalizedProfile {
  readonly person: Person
  readonly roles: readonly Role[]
  readonly education: readonly Education[]
  readonly projects: readonly Project[]
}

function overlay<T extends { readonly id: string }>(
  records: readonly T[],
  text: Readonly<Record<string, Partial<T>>>,
): readonly T[] {
  return records.map((record) => ({ ...record, ...text[record.id] }))
}

const ENGLISH: LocalizedProfile = { person, roles, education, projects }
const cache = new Map<Locale, LocalizedProfile>()

/** The profile records with their prose in `locale`. English is the records themselves. */
export function localizedProfile(locale: Locale): LocalizedProfile {
  const translation = TRANSLATIONS[locale]
  if (!translation) return ENGLISH

  const cached = cache.get(locale)
  if (cached) return cached

  const result: LocalizedProfile = {
    person: { ...person, ...translation.person },
    roles: overlay<Role>(roles, translation.roles),
    education: overlay<Education>(education, translation.education),
    projects: overlay<Project>(projects, translation.projects),
  }
  cache.set(locale, result)
  return result
}
