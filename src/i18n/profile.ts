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

const VISIT = 'साइट देखें'

export const HINDI: ProfileTranslation = {
  person: {
    title: 'सॉफ़्टवेयर इंजीनियर',
    location: 'भारत',
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
  projects: {
    purge: {
      tagline: 'डेवलपर्स के लिए Mac स्टोरेज क्लीनर',
      linkLabel: VISIT,
      summary:
        'एक टर्मिनल टूल, जो आपकी पूरी Mac होम डायरेक्टरी में दोबारा बन सकने वाले बिल्ड आउटपुट, कैश और लॉग ढूँढता है, फिर उन्हें देखकर चुन-चुनकर डिलीट करने देता है, ताकि गीगाबाइट्स की जगह वापस मिल सके।',
      capabilities: [
        'एक ही बार में पूरी होम डायरेक्टरी में जंक फ़ाइलें स्कैन करता है',
        'रिव्यू इंटरफ़ेस — सिर्फ़ चुनी गई चीज़ें ही डिलीट होती हैं',
        'पूरी तरह टर्मिनल में चलता है, npm से इंस्टॉल होता है',
        'macOS की परमिशन पाबंदियों को एक वैकल्पिक रास्ते से संभालता है',
        'कोई डिपेंडेंसी नहीं, कोई टेलीमेट्री नहीं',
      ],
    },
    'agent-island': {
      tagline: 'कोडिंग एजेंट्स के लिए Dynamic Island',
      linkLabel: 'macOS के लिए डाउनलोड करें',
      summary:
        'एक macOS ओवरले, जो MacBook के नॉच को घेरकर साथ-साथ चल रहे Claude Code, Codex और Cursor सेशन की ख़बर देता है — कौन काम कर रहा है, किसका काम पूरा हुआ, और कौन आपका इंतज़ार कर रहा है।',
      capabilities: [
        'प्रोजेक्ट, बीते समय और मौजूदा गतिविधि के साथ लाइव सेशन की पंक्तियाँ',
        'Claude की परमिशन रिक्वेस्ट नॉच से ही ⌘Y और ⌘N से मंज़ूर करें',
        'एजेंट के बहुविकल्पीय सवाल का जवाब ⌘1–9 से दें',
        'किसी सेशन पर क्लिक करें, और ठीक वही टर्मिनल टैब सामने आ जाता है जिसमें वह चल रहा है',
        'पूरी तरह लोकल — कोई अकाउंट नहीं, कोई API key नहीं, कोई टेलीमेट्री नहीं',
      ],
    },
    arthion: {
      tagline: 'फ़ाइनेंशियल इंटेलिजेंस',
      linkLabel: VISIT,
      summary:
        'फ़ाइनेंशियल इंटेलिजेंस प्लेटफ़ॉर्म, जो रियल-टाइम स्टॉक एनालिसिस, टेक्निकल इंडिकेटर, मार्केट सेंटिमेंट ट्रैकिंग और ऐसी जानकारी देता है जिस पर आप अमल कर सकें।',
      capabilities: [
        'OHLC और लाइन व्यू के साथ रियल-टाइम स्टॉक चार्ट',
        'RSI और MACD समेत टेक्निकल इंडिकेटर',
        'गेनर्स, लूज़र्स और सबसे सक्रिय शेयरों की ट्रैकिंग',
        'ख़बरें और सेंटिमेंट एनालिसिस',
        'AI से बनी स्टॉक सिफ़ारिशें',
      ],
    },
    'god-of-debugger': {
      tagline: 'Claude Code के लिए डीबगिंग प्लगइन',
      linkLabel: VISIT,
      summary:
        'ग़लत साबित करके डीबग करें। एक स्लैश कमांड बग रिपोर्ट को फ़ॉल्सिफ़िकेशन प्रोटोकॉल में बदल देता है, और फ़िक्स तभी सुझाया जाता है जब सिर्फ़ एक हाइपोथीसिस बची रह जाए।',
      capabilities: [
        'हाइपोथीसिस बनाने से पहले एक डिटर्मिनिस्टिक रिप्रो तैयार करता है',
        'आपस में टकराती प्राइमरी और एडवर्सेरियल हाइपोथीसिस बनाता है',
        'हर हाइपोथीसिस के लिए एक फ़ॉल्सिफ़िकेशन एक्सपेरिमेंट, जिन्हें पैरेलल सबएजेंट चलाते हैं',
        'सर्वाइवल टेबल, जो हर हाइपोथीसिस को ख़ारिज, बची हुई या अनिर्णीत आँकती है',
        'बचे हुए एक्सपेरिमेंट को स्थायी रिग्रेशन टेस्ट में बदल देता है',
      ],
    },
    marcko: {
      tagline: 'ओपन सोर्स मार्कडाउन एडिटर',
      linkLabel: VISIT,
      summary:
        'रियल-टाइम प्रीव्यू, सुरक्षित डॉक्यूमेंट शेयरिंग और एन्क्रिप्शन एट रेस्ट वाला मार्कडाउन एडिटर। डेवलपर्स और लेखकों के लिए मुफ़्त।',
      capabilities: [
        'रियल-टाइम मार्कडाउन प्रीव्यू',
        'एंटरप्राइज़ स्तर की सुरक्षित डॉक्यूमेंट शेयरिंग',
        'एन्क्रिप्शन एट रेस्ट',
        'लिखने के लिए AI इंटीग्रेशन',
      ],
    },
    'bixai-starter': {
      tagline: 'Next.js AI एजेंट टेम्पलेट',
      linkLabel: VISIT,
      summary:
        'Next.js और OpenAI Agents SDK पर बने, प्रोडक्शन के लिए तैयार एजेंट ऐप्स का टेम्पलेट — मॉड्यूलर टूल स्ट्रक्चर और डिप्लॉयमेंट तक के तेज़ रास्ते के साथ।',
      capabilities: [
        'प्रोडक्शन के लिए तैयार Next.js इंटीग्रेशन',
        'OpenAI Agents SDK सपोर्ट',
        'मॉड्यूलर टूल और एजेंट स्ट्रक्चर',
      ],
    },
    aarekhit: {
      tagline: 'डेटा विज़ुअलाइज़ेशन',
      linkLabel: VISIT,
      summary:
        'ग्राफ़ विज़ुअलाइज़ेशन और एनालिसिस प्लेटफ़ॉर्म, जो टेक्स्ट और डेटा को सेकंडों में इंटरैक्टिव विज़ुअलाइज़ेशन में बदल देता है।',
      capabilities: [
        'इंटरैक्टिव ग्राफ़ विज़ुअलाइज़ेशन',
        'AI से चलने वाला डेटा एनालिसिस',
        'रियल-टाइम कोलैबोरेशन',
        'कस्टम स्टाइलिंग और थीमिंग',
      ],
    },
    notex: {
      tagline: 'AI नोट-टेकिंग',
      linkLabel: VISIT,
      summary:
        'AI से निकली जानकारियों और noteX असिस्टेंस बॉट के साथ नोट-टेकिंग, इस तरह व्यवस्थित कि विचार क्रम में भी रहें और निजी भी।',
      capabilities: [
        'noteX असिस्टेंस बॉट',
        'व्यवस्थित नोट्स के लिए स्मार्ट ऑर्गनाइज़ेशन',
        'क्रॉस-प्लेटफ़ॉर्म सिंक',
      ],
    },
    readany: {
      tagline: 'PDF बुक रीडर',
      linkLabel: VISIT,
      summary:
        'PDF रीडर, जो स्थिर डॉक्यूमेंट को पढ़ने के अनुभव में बदल देता है — असली जैसे पन्ने पलटने और ढेर सारे कस्टमाइज़ेशन के साथ।',
      capabilities: [
        'असली जैसा पेज-फ़्लिप एनिमेशन',
        'कस्टमाइज़ होने वाली रीडिंग थीम',
        'बुकमार्क और एनोटेशन',
        'टेक्स्ट-टू-स्पीच',
      ],
    },
  },
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
