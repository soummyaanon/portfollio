import type { Locale } from './config'

/**
 * Every interface string on the translated pages, one object per language.
 *
 * English is the reference: `Dictionary` is its shape, and every other language is typed
 * against it, so a string added here without its Hindi counterpart fails the type check
 * instead of shipping an English word on a Hindi page. Product names, tool names and the
 * author's name are not in here — they are names, and they read the same in both.
 *
 * Facts about the author (role summaries, project write-ups) are not here either; they
 * live beside the records they translate, in `src/i18n/profile.ts`.
 */
const en = {
  meta: {
    homeDescription:
      'I’m a builder making healthcare AI, agentic automation, and fully autonomous software that make life easier.',
    projectsTitle: 'Projects',
    projectsDescription:
      'Every project in full: an agent overlay for macOS, a debugging plugin for Claude Code, a financial intelligence platform, and the tools around them.',
    writingTitle: 'Writing',
    writingDescription:
      'Notes on building AI systems that survive contact with production — agents, workflows, and the parts that are harder than the demo suggests.',
    home: 'Home',
  },
  nav: {
    home: 'Home',
    blogs: 'Blogs',
    projects: 'Projects',
    email: 'Email',
  },
  /** The switcher on an English page points at Hindi, so it speaks Hindi. */
  switcher: {
    target: 'hi' as Locale,
    label: 'हिन्दी में पढ़ें',
    glyph: 'हि',
  },
  mode: {
    group: 'Document rendering',
    human: 'Human',
    machine: 'Machine',
    pressBefore: 'press ',
    pressAfter: '',
  },
  lead: {
    before: 'I’m a builder making ',
    afterFocus: ' that make life easier. Off the clock, I follow ',
    afterInterests: '.',
  },
  list: {
    comma: ', ',
    and: ' and ',
    serialAnd: ', and ',
  },
  sections: {
    work: 'Work',
    github: 'GitHub activity',
    education: 'Education',
    selectedWork: 'Selected work',
    tools: 'Tools',
    writing: 'Writing',
  },
  months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  present: 'Present',
  remote: 'Remote',
  inDevelopment: 'In development',
  seeAllProjects: 'See all projects',
  entries: (count: string) => `${count} entries`,
  interfaceAlt: (name: string) => `${name} interface`,
  emblemAlt: (name: string) => `${name} emblem`,
  github: {
    total: (total: string, since: string) => `Total ${total} contributions since ${since}`,
    unavailable: 'Calendar data is generated at build time and is not available for this build.',
  },
  projectsPage: {
    back: 'Index',
    count: (count: number) => `${count} entries`,
  },
  writingPage: {
    count: (count: number) => `${count} ${count === 1 ? 'piece' : 'pieces'}`,
    empty:
      'Nothing published yet. Pieces land here as they are finished — mostly notes on agent architecture and what breaks between a demo and production.',
    /** Shown only where the pieces are in another language than the page. */
    sourceLanguage: '',
    dateLocale: 'en-US',
  },
}

export type Dictionary = typeof en

const hi: Dictionary = {
  meta: {
    homeDescription:
      'मैं हेल्थकेयर AI, एजेंटिक ऑटोमेशन और पूरी तरह ऑटोनॉमस सॉफ़्टवेयर बनाता हूँ, जो ज़िंदगी आसान बनाते हैं।',
    projectsTitle: 'प्रोजेक्ट',
    projectsDescription:
      'हर प्रोजेक्ट पूरे विस्तार से: macOS के लिए एजेंट ओवरले, Claude Code के लिए डीबगिंग प्लगइन, एक फ़ाइनेंशियल इंटेलिजेंस प्लेटफ़ॉर्म, और उनके आसपास के टूल।',
    writingTitle: 'लेखन',
    writingDescription:
      'ऐसे AI सिस्टम बनाने पर नोट्स जो प्रोडक्शन में टिके रहें — एजेंट, वर्कफ़्लो, और वे हिस्से जो डेमो से कहीं ज़्यादा मुश्किल निकलते हैं।',
    home: 'होम',
  },
  nav: {
    home: 'होम',
    blogs: 'ब्लॉग',
    projects: 'प्रोजेक्ट',
    email: 'ईमेल',
  },
  switcher: {
    target: 'en',
    label: 'Read in English',
    glyph: 'EN',
  },
  mode: {
    group: 'डॉक्यूमेंट का रूप',
    human: 'मानव',
    machine: 'मशीन',
    pressBefore: '',
    pressAfter: ' दबाएँ',
  },
  lead: {
    before: 'मैं ',
    afterFocus: ' बनाता हूँ, जो ज़िंदगी आसान बनाते हैं। काम के बाद मैं ',
    afterInterests: ' की खोजों पर नज़र रखता हूँ।',
  },
  list: {
    comma: ', ',
    and: ' और ',
    // Hindi lists take no comma before the last item.
    serialAnd: ' और ',
  },
  sections: {
    work: 'काम',
    github: 'GitHub गतिविधि',
    education: 'शिक्षा',
    selectedWork: 'चुनिंदा प्रोजेक्ट',
    tools: 'टूल',
    writing: 'लेखन',
  },
  months: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर'],
  present: 'अब तक',
  remote: 'रिमोट',
  inDevelopment: 'डेवलपमेंट में',
  seeAllProjects: 'सभी प्रोजेक्ट देखें',
  entries: (count) => `${count} प्रोजेक्ट`,
  interfaceAlt: (name) => `${name} का इंटरफ़ेस`,
  emblemAlt: (name) => `${name} का प्रतीक चिह्न`,
  github: {
    total: (total, since) => `${since} से अब तक कुल ${total} योगदान`,
    unavailable: 'कैलेंडर का डेटा बिल्ड के समय बनता है, और इस बिल्ड में उपलब्ध नहीं है।',
  },
  projectsPage: {
    back: 'होम',
    count: (count) => `${count} प्रोजेक्ट`,
  },
  writingPage: {
    count: (count) => `${count} लेख`,
    empty:
      'अभी कुछ प्रकाशित नहीं हुआ है। लेख पूरे होते ही यहाँ आते हैं — ज़्यादातर एजेंट आर्किटेक्चर पर, और इस पर कि डेमो और प्रोडक्शन के बीच क्या टूटता है।',
    sourceLanguage: 'लेख अंग्रेज़ी में हैं।',
    dateLocale: 'hi-IN',
  },
}

const DICTIONARIES: Record<Locale, Dictionary> = { en, hi }

export function dictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale]
}
