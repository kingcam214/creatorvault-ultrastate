/**
 * SlangExxchange
 * 
 * The ultimate dictionary for authentic street English and Dominican slang.
 * Used by Creator Intelligence Engine and LLMs to sound authentic.
 */

export interface SlangEntry {
  term: string;
  language: 'en_street' | 'es_do';
  meaning: string;
  usage: string;
  tags: string[];
}

export const slangDictionary: SlangEntry[] = [
  // Dominican Slang (es_do) - Input by Yodeiris
  {
    term: "Qué lo qué",
    language: "es_do",
    meaning: "What's up / How are you",
    usage: "¡Qué lo qué, mi gente! Bienvenidos a mi VaultSpace.",
    tags: ["greeting", "common"]
  },
  {
    term: "Tíguere",
    language: "es_do",
    meaning: "A street-smart guy, hustler, or just a guy",
    usage: "Ese tíguere sabe cómo hacer dinero en las redes.",
    tags: ["noun", "street"]
  },
  {
    term: "Pampara",
    language: "es_do",
    meaning: "Awesome, lit, popping",
    usage: "Este contenido nuevo está prendiendo la pampara.",
    tags: ["adjective", "hype"]
  },
  {
    term: "Dique",
    language: "es_do",
    meaning: "Supposedly / Apparently",
    usage: "Dique que TikTok paga bien, pero VaultSpace es mejor.",
    tags: ["filler", "common"]
  },
  {
    term: "Jeje",
    language: "es_do",
    meaning: "Haha (laughter)",
    usage: "No te pierdas mi nuevo video, jeje.",
    tags: ["expression"]
  },
  {
    term: "Dar banda",
    language: "es_do",
    meaning: "To ignore, leave alone, or let go",
    usage: "Le di banda a OnlyFans, ahora estoy en VaultSpace.",
    tags: ["verb phrase", "street"]
  },
  {
    term: "Pila",
    language: "es_do",
    meaning: "A lot / A ton",
    usage: "Hay pila de dinero esperando por ti.",
    tags: ["quantifier"]
  },
  
  // Street English (en_street)
  {
    term: "No cap",
    language: "en_street",
    meaning: "For real / No lie",
    usage: "VaultSpace is the best platform out right now, no cap.",
    tags: ["expression", "truth"]
  },
  {
    term: "Bet",
    language: "en_street",
    meaning: "Okay / Agreed / For sure",
    usage: "You want exclusive content? Bet, link in bio.",
    tags: ["agreement"]
  },
  {
    term: "Drip",
    language: "en_street",
    meaning: "Style, clothes, swagger",
    usage: "Check the drip in my latest post.",
    tags: ["noun", "fashion"]
  }
];

export function getSlangByLanguage(language: 'en_street' | 'es_do'): SlangEntry[] {
  return slangDictionary.filter(entry => entry.language === language);
}

export function getRandomSlang(language: 'en_street' | 'es_do', count: number = 3): string[] {
  const available = getSlangByLanguage(language);
  const shuffled = [...available].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count).map(entry => entry.term);
}

export function formatSlangContext(language: 'en_street' | 'es_do'): string {
  const slang = getSlangByLanguage(language);
  return slang.map(s => `- "${s.term}": ${s.meaning} (Example: ${s.usage})`).join('\n');
}
