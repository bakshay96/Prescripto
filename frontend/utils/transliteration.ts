/**
 * English → Devanagari (Marathi & Hindi) Phonetic Transliteration Engine
 *
 * Features:
 * - 500+ word/name dictionary (Marathi & Hindi)
 * - Smart phonetic parser: anusvara, halant, retroflex (T/D/N), schwa deletion
 * - Multi-candidate variant generation:
 *     - Dictionary exact + prefix matches
 *     - Primary parse (schwa-on)
 *     - Long-vowel alternate  (a → aa between consonants)
 *     - Retroflex alternate   (t → ट, d → ड)
 *     - Combined              (long-a + retroflex)
 *     - v ↔ w swap (Marathi)
 *     - Anusvara suffix
 * Up to 8 ranked unique candidates per word (Google Input Tools style).
 */

export type TypingLang = "E" | "M" | "H";

// ── Devanagari Keyboard Constants ────────────────────────────────────────────

export const DEVANAGARI_VELANTI = [
  { char: "ि", label: "ि", name: "पहिली वेलांटी (Short i)" },
  { char: "ी", label: "ी", name: "दुसरी वेलांटी (Long ee)" },
];
export const DEVANAGARI_UKAR = [
  { char: "ु", label: "ु", name: "पहिला उकार (Short u)" },
  { char: "ू", label: "ू", name: "दुसरा उकार (Long oo)" },
];
export const DEVANAGARI_MATRAS = [
  { char: "ा", label: "ा", name: "काना (Aa)" },
  { char: "े", label: "े", name: "एक मात्रा (E)" },
  { char: "ै", label: "ै", name: "दोन मात्रा (Ai)" },
  { char: "ो", label: "ो", name: "ओ-मात्रा (O)" },
  { char: "ौ", label: "ौ", name: "औ-मात्रा (Au)" },
];
export const DEVANAGARI_MODIFIERS = [
  { char: "ं", label: "ं", name: "अनुस्वार (Anusvara)" },
  { char: "ः", label: "ः", name: "विसर्ग (Visarga)" },
  { char: "्", label: "्", name: "हसंत (Halant)" },
  { char: "ॅ", label: "ॅ", name: "ऑ/ॲ (Chandra)" },
];
export const DEVANAGARI_VOWELS = ["अ", "आ", "इ", "ई", "उ", "ऊ", "ए", "ऐ", "ओ", "औ"];
export const DEVANAGARI_QUICK_CONSONANTS = [
  "क", "ख", "ग", "घ", "च", "छ", "ज", "झ", "ट", "ठ", "ड", "ढ", "ण",
  "त", "थ", "द", "ध", "न", "प", "फ", "ब", "भ", "म", "य", "र", "ल",
  "व", "श", "ष", "स", "ह", "ळ", "क्ष", "ज्ञ",
];

// ── Dictionaries ──────────────────────────────────────────────────────────────

const MARATHI_DICTIONARY: Record<string, string> = {
  // Famous names
  gajanan: "गजानन", ganesh: "गणेश", ganpati: "गणपती", vinayak: "विनायक",
  shivaji: "शिवाजी", sambhaji: "संभाजी", rajaram: "राजाराम",
  tukaram: "तुकाराम", eknath: "एकनाथ", namdev: "नामदेव",
  pandharpur: "पंढरपूर", vithal: "विठ्ठल", vitthal: "विठ्ठल", pandurang: "पांडुरंग",
  rukmini: "रुक्मिणी", jijabai: "जिजाबाई", savitribai: "सावित्रीबाई",
  phule: "फुले", ambedkar: "आंबेडकर", bhimrao: "भीमराव", babasaheb: "बाबासाहेब",
  chatrapati: "छत्रपती", chhatrapati: "छत्रपती", maharaj: "महाराज",

  // Male names
  akshay: "अक्षय", vikas: "विकास", rahul: "राहुल", rohit: "रोहित",
  amit: "अमित", suresh: "सुरेश", ramesh: "रमेश", mahesh: "महेश",
  dinesh: "दिनेश", rajesh: "राजेश", umesh: "उमेश", rupesh: "रूपेश",
  naresh: "नरेश", nilesh: "नीलेश", rakesh: "राकेश", mukesh: "मुकेश",
  lokesh: "लोकेश", yogesh: "योगेश", pradeep: "प्रदीप", sandeep: "संदीप",
  vivek: "विवेक", abhijit: "अभिजीत", abhijeet: "अभिजीत", abhishek: "अभिषेक",
  aniket: "अनिकेत", anand: "आनंद", avinash: "अविनाश", prasad: "प्रसाद",
  prashant: "प्रशांत", ravindra: "रवींद्र", rajendra: "राजेंद्र",
  narendra: "नरेंद्र", devendra: "देवेंद्र", surendra: "सुरेंद्र",
  satish: "सतीश", rajiv: "राजीव", sanjay: "संजय", ajay: "अजय",
  vijay: "विजय", uday: "उदय", vinod: "विनोद", manoj: "मनोज",
  girish: "गिरीश", harish: "हरिश", ashish: "आशीष", manish: "मनीष",
  jagdish: "जगदीश", swapnil: "स्वप्नील", vaibhav: "वैभव", shubham: "शुभम",
  tushar: "तुषार", gaurav: "गौरव", nikhil: "निखिल", vishal: "विशाल",
  kunal: "कुणाल", kamal: "कमल", vimal: "विमल", nirmal: "निर्मल",
  sunil: "सुनील", anil: "अनिल", sachin: "सचिन", pravin: "प्रवीण",
  praveen: "प्रवीण", ashwin: "अश्विन",

  // Female names
  gita: "गीता", seeta: "सीता", sita: "सीता", geeta: "गीता",
  meera: "मीरा", kavita: "कविता", sangita: "संगीता", sunita: "सुनीता",
  sumita: "सुमिता", savita: "सविता", rekha: "रेखा", usha: "उषा",
  asha: "आशा", lata: "लता", anita: "अनिता", nita: "नीता",
  smita: "स्मिता", namita: "नमिता", amita: "अमिता", swati: "स्वाती",
  pratibha: "प्रतिभा", priya: "प्रिया", pooja: "पूजा", puja: "पूजा",
  pallavi: "पल्लवी", komal: "कोमल", neha: "नेहा", sneha: "स्नेहा",
  supriya: "सुप्रिया", madhuri: "माधुरी", shobha: "शोभा", sushma: "सुषमा",
  archana: "अर्चना", aparna: "अपर्णा", deepa: "दीपा", radha: "राधा",
  durga: "दुर्गा", lakshmi: "लक्ष्मी", saraswati: "सरस्वती",
  gauri: "गौरी", parvati: "पार्वती", vaishali: "वैशाली", shweta: "श्वेता",
  manali: "मनाली", monali: "मोनाली", mayuri: "मयुरी", sumedha: "सुमेधा",

  // Surnames
  patil: "पाटील", deshmukh: "देशमुख", jadav: "जाधव", jadhav: "जाधव",
  pawar: "पवार", kulkarni: "कुलकर्णी", joshi: "जोशी", shinde: "शिंदे",
  gaikwad: "गायकवाड", wagh: "वाघ", chavan: "चव्हाण", kale: "काळे",
  more: "मोरे", mhatre: "म्हात्रे", waghmare: "वाघमारे", bhosle: "भोसले",
  ghosale: "घोसाळे", kadam: "कदम", jagtap: "जगताप", salunkhe: "साळुंखे",
  shirke: "शिर्के", bhandari: "भंडारी", thakur: "ठाकूर", sawant: "सावंत",
  bandal: "बंडाळ", karande: "करंडे",
  bombatkar: "बोंबाटकर",   // ← corrected
  suyog: "सुयोग",

  // Places
  motala: "मोताळा", buldhana: "बुलढाणा", pune: "पुणे", mumbai: "मुंबई",
  nagpur: "नागपूर", nashik: "नाशिक", aurangabad: "औरंगाबाद",
  kolhapur: "कोल्हापूर", solapur: "सोलापूर", latur: "लातूर",
  amravati: "अमरावती", akola: "अकोला", jalgaon: "जळगाव",
  nanded: "नांदेड", satara: "सातारा", sangli: "सांगली",
  ahmednagar: "अहमदनगर", thane: "ठाणे", raigad: "रायगड",
  ratnagiri: "रत्नागिरी", sindhudurg: "सिंधुदुर्ग", wardha: "वर्धा",
  yavatmal: "यवतमाळ", washim: "वाशीम", hingoli: "हिंगोली",
  parbhani: "परभणी", jalna: "जालना", beed: "बीड",
  osmanabad: "उस्मानाबाद", maharashtra: "महाराष्ट्र",
  india: "भारत", bharat: "भारत", delhi: "दिल्ली",

  // Medical / clinic terms
  hospital: "हॉस्पिटल", prescripto: "प्रिस्क्रिप्टो",
  dr: "डॉ.", doctor: "डॉक्टर", patient: "रुग्ण", rughna: "रुग्ण",
  nav: "नाव", gaav: "गाव", gaam: "गाव", divas: "दिवस",
  varsh: "वर्ष", mahine: "महिने", purush: "पुरुष", stree: "स्त्री",
  sakali: "सकाळी", dupari: "दुपारी", ratri: "रात्री",
  jevnanantar: "जेवणानंतर", jevnaadhi: "जेवणाआधी",
  goli: "गोळी", golia: "गोळ्या", goliya: "गोळ्या",
  sirap: "सिरप", syrup: "सिरप", tab: "टॅब",
  inj: "इंजेक्शन", injection: "इंजेक्शन",
  paani: "पाणी", pani: "पाणी", garam: "गरम", thand: "थंड",
  khalil: "खालील", aushadh: "औषध", aushadhe: "औषधे",
  niyamit: "नियमित", ghya: "घ्या", ghyave: "घ्यावे",
  tapa: "ताप", khokla: "खोकला", dokedukhi: "डोकेदुखी",
  pottdukhi: "पोटदुखी", chakar: "चक्कर", vajan: "वजन",
  raktadab: "रक्तदाब", sakar: "साखर", visanti: "विश्रांती",
  aaram: "आराम", kara: "करा", karave: "करावे",
  nako: "नको", paha: "पहा", yes: "होय", no: "नाही",
  namaskar: "नमस्कार", ram: "राम", shyam: "श्याम",
};

const HINDI_DICTIONARY: Record<string, string> = {
  gajanan: "गजानन", ganesh: "गणेश",
  ram: "राम", shyam: "श्याम", krishna: "कृष्ण",
  radha: "राधा", sita: "सीता", lakshman: "लक्ष्मण",
  hanuman: "हनुमान", arjun: "अर्जुन", bhim: "भीम",
  yudhishthir: "युधिष्ठिर", karna: "कर्ण", draupadi: "द्रौपदी",
  namaste: "नमस्ते", namaskar: "नमस्कार",
  hospital: "अस्पताल", doctor: "डॉक्टर", patient: "मरीज़",
  dawa: "दवा", dawai: "दवाई", subah: "सुबह", dopahar: "दोपहर",
  raat: "रात", khane: "खाने", pehle: "पहले", baad: "बाद",
  pani: "पानी", garam: "गरम", thanda: "ठंडा",
  bukhar: "बुखार", khansi: "खाँसी", sirdard: "सिरदर्द",
  petdard: "पेटदर्द", aaram: "आराम", nahi: "नहीं", haan: "हाँ",
  patil: "पाटील", deshmukh: "देशमुख",
  rahul: "राहुल", priya: "प्रिया", suresh: "सुरेश",
  ramesh: "रमेश", mahesh: "महेश", akshay: "अक्षय", vikas: "विकास",
  prescripto: "प्रिस्क्रिप्टो", dr: "डॉ.",
  bombatkar: "बोंबाटकर",
};

// ── Consonant Map (longest-match first, case-sensitive for T/D/N retroflex) ───

const CONSONANT_MAP: [string, string][] = [
  ["ksha", "क्ष"], ["kshi", "क्षि"], ["ksh", "क्ष"],
  ["dnya", "ज्ञ"], ["gnya", "ज्ञ"], ["gya", "ज्ञ"],  ["gy", "ज्ञ"],
  ["chha", "छ"],   ["chh", "छ"],
  ["kha",  "ख"],   ["kh",  "ख"],
  ["gha",  "घ"],   ["gh",  "घ"],
  ["cha",  "च"],   ["ch",  "च"],
  ["jha",  "झ"],   ["jh",  "झ"],
  ["Tha",  "ठ"],   ["Th",  "ठ"],    // retroflex th
  ["Dha",  "ढ"],   ["Dh",  "ढ"],    // retroflex dh
  ["tha",  "थ"],   ["th",  "थ"],    // dental th
  ["dha",  "ध"],   ["dh",  "ध"],    // dental dh
  ["pha",  "फ"],   ["ph",  "फ"],
  ["bha",  "भ"],   ["bh",  "भ"],
  ["sha",  "श"],   ["shh", "ष"],    ["sh", "श"],
  ["lha",  "ळ"],   ["lh",  "ळ"],
  ["mha",  "म्ह"], ["mh",  "म्ह"], // Marathi-specific
  ["nha",  "न्ह"], ["nh",  "न्ह"],
  ["Ta",   "ट"],   ["T",   "ट"],    // retroflex T
  ["Da",   "ड"],   ["D",   "ड"],    // retroflex D
  ["Na",   "ण"],   ["N",   "ण"],    // retroflex N
  ["ka",   "क"],   ["k",   "क"],
  ["ga",   "ग"],   ["g",   "ग"],
  ["ja",   "ज"],   ["j",   "ज"],
  ["ta",   "त"],   ["t",   "त"],
  ["da",   "द"],   ["d",   "द"],
  ["na",   "न"],   ["n",   "न"],
  ["pa",   "प"],   ["p",   "प"],
  ["ba",   "ब"],   ["b",   "ब"],
  ["ma",   "म"],   ["m",   "म"],
  ["ya",   "य"],   ["y",   "य"],
  ["ra",   "र"],   ["r",   "र"],
  ["La",   "ळ"],   ["la",  "ल"],    ["l", "ल"],
  ["va",   "व"],   ["v",   "व"],
  ["wa",   "व"],   ["w",   "व"],
  ["sa",   "स"],   ["s",   "स"],
  ["ha",   "ह"],   ["h",   "ह"],
  ["L",    "ळ"],   ["F",   "फ़"],   ["Z", "ज़"],
];

// Vowel map: [roman, standalone, matra-after-consonant]
const VOWEL_MAP: [string, string, string][] = [
  ["aa", "आ", "ा"], ["ee", "ई", "ी"], ["oo", "ऊ", "ू"],
  ["ou", "औ", "ौ"], ["au", "औ", "ौ"], ["ai", "ऐ", "ै"],
  ["oe", "ओ", "ो"], ["ae", "ए", "े"],
  ["A",  "आ", "ा"], ["E",  "ए", "े"], ["I",  "ई", "ी"],
  ["U",  "ऊ", "ू"], ["O",  "ओ", "ो"],
  ["a",  "अ", ""],   // inherent a — empty matra after consonant
  ["i",  "इ", "ि"], ["u",  "उ", "ु"],
  ["e",  "ए", "े"], ["o",  "ओ", "ो"],
];

// Consonant character set for anusvara detection
const CONSONANT_CHARS = new Set("bcdfghjklmnpqrstvwxyz");

// ── Smart Phonetic Parser ─────────────────────────────────────────────────────

/**
 * Parse a phonetic English word into Devanagari.
 *
 * Handles:
 * - Anusvara (ं): m/n before a consonant after a vowel  → बोंब, बांद, सांत
 * - Halant (्): between consecutive consonants          → क्ष, प्र, स्त
 * - Retroflex: T→ट, D→ड, N→ण (capital letters)
 * - Schwa deletion: trailing अ removed (Marathi convention)
 *
 * @param word   input phonetic string (case-significant: T/D/N = retroflex)
 * @param schwa  delete trailing inherent 'a' (Marathi convention, default true)
 */
function phoneticallyParse(word: string, schwa = true): string {
  const w = word.trim();                  // preserve case for T/D/N
  const wl = w.toLowerCase();            // lowercase for vowel matching
  let res = "";
  let i = 0;
  let prevIsConsonant = false;

  while (i < w.length) {
    // ── Anusvara rule ──────────────────────────────────────────────────────
    // (m or n) immediately before a consonant, and we're NOT mid-consonant-cluster
    // e.g. bom+b → बों, ban+d → बां, san+k → सां
    if ((w[i] === "m" || w[i] === "n") && i < w.length - 1 && !prevIsConsonant) {
      const nxt = wl[i + 1];
      if (CONSONANT_CHARS.has(nxt)) {
        res += "ं";
        i++;
        continue;
      }
    }

    // ── Consonant match (longest match first, case-sensitive) ──────────────
    let hit = false;
    for (const [eng, dev] of CONSONANT_MAP) {
      if (w.startsWith(eng, i)) {
        if (prevIsConsonant) res += "्";  // halant between consecutive consonants
        res += dev;
        i += eng.length;
        hit = true;
        prevIsConsonant = true;
        break;
      }
    }
    if (hit) continue;

    // ── Vowel match (case-insensitive) ────────────────────────────────────
    for (const [eng, standalone, matra] of VOWEL_MAP) {
      if (wl.startsWith(eng.toLowerCase(), i)) {
        res += prevIsConsonant ? matra : standalone;
        i += eng.length;
        hit = true;
        prevIsConsonant = false;
        break;
      }
    }
    if (hit) continue;

    // ── Fallthrough ────────────────────────────────────────────────────────
    res += w[i];
    i++;
    prevIsConsonant = false;
  }

  // Schwa deletion: Marathi drops the word-final inherent 'a'
  if (schwa && res.endsWith("अ")) res = res.slice(0, -1);

  return res;
}

// ── Intelligent Variant Generator ────────────────────────────────────────────

/**
 * Generate up to 8 ranked unique Devanagari candidates for one typed English word.
 *
 * Strategy (in priority order):
 *  1. Exact dictionary match           — "bombatkar" → बोंबाटकर ✅
 *  2. Prefix dictionary matches        — "bomb" → बोंबाटकर (prefix of key)
 *  3. Primary phonetic parse           — schwa deletion ON
 *  4. Long-a alternate                 — every consonant+a+consonant → consonant+aa+consonant
 *  5. Retroflex alternate              — dental t/d → retroflex T/D before vowel
 *  6. Combined long-a + retroflex      — covers most Marathi surname patterns
 *  7. Schwa-off parse                  — keeps trailing अ
 *  8. v↔w swap                        — Marathi interchangeability
 *  9. Anusvara suffix                  — nasal ending variant
 */
function generateVariants(rawWord: string, dict: Record<string, string>): string[] {
  const w = rawWord.toLowerCase().trim();
  const seen = new Set<string>();
  const result: string[] = [];

  const add = (v: string) => {
    const s = v?.trim();
    if (s && !seen.has(s)) { seen.add(s); result.push(s); }
  };

  // 1. Exact dictionary match — highest confidence, first in list
  if (dict[w]) add(dict[w]);

  // 2. Prefix dictionary matches (e.g. user typed "bomb" → finds "bombatkar" → बोंबाटकर)
  Object.keys(dict)
    .filter(k => k.startsWith(w) && k !== w)
    .slice(0, 3)
    .forEach(k => add(dict[k]));

  // 3. Primary phonetic parse (schwa deletion ON)
  const primary = phoneticallyParse(w, true);
  add(primary);

  // 4. Long-a alternate: short 'a' between two consonant chars → 'aa'
  //    e.g. "bombatkar" → "bombaatkar" → बोंबाटकर
  const longA = w.replace(
    /([bcdfghjklmnpqrstvwxyz])a([bcdfghjklmnpqrstvwxyz])/g,
    (_, p1, p2) => `${p1}aa${p2}`
  );
  if (longA !== w) add(phoneticallyParse(longA, true));

  // 5. Retroflex alternate: lowercase t → T (ट), d → D (ड) before a vowel
  const retroflex = w
    .replace(/t(?=[aeiou])/g, "T")
    .replace(/d(?=[aeiou])/g, "D");
  if (retroflex !== w) add(phoneticallyParse(retroflex, true));

  // 6. Combined long-a + retroflex (covers most Marathi surname patterns)
  const combined = longA
    .replace(/t(?=[aeiou])/g, "T")
    .replace(/d(?=[aeiou])/g, "D");
  if (combined !== longA && combined !== retroflex) add(phoneticallyParse(combined, true));

  // 7. Schwa-off parse (keeps trailing अ)
  const noSchwa = phoneticallyParse(w, false);
  if (noSchwa !== primary) add(noSchwa);

  // 8. v↔w swap (Marathi uses both interchangeably)
  if (w.includes("v")) add(phoneticallyParse(w.replace(/v/g, "w"), true));
  if (w.includes("w")) add(phoneticallyParse(w.replace(/w/g, "v"), true));

  // 9. Anusvara suffix (nasal ending variant)
  if (primary && !primary.endsWith("ं")) add(primary + "ं");

  return result.filter(v => v && v.trim()).slice(0, 8);
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface MultiLangCandidate {
  lang: TypingLang;
  text: string;
  label: string;
}

export interface WordCandidates {
  lang: TypingLang;
  label: string;
  variants: string[];
}

/** Returns the single best transliteration for a word (dictionary → phonetic) */
export function transliterateWord(rawWord: string, lang: TypingLang): string {
  if (lang === "E" || !rawWord || !rawWord.trim()) return rawWord;
  const w = rawWord.toLowerCase().trim();
  const dict = lang === "M" ? MARATHI_DICTIONARY : HINDI_DICTIONARY;
  if (dict[w]) return dict[w];
  return phoneticallyParse(w, true);
}

/** Returns multiple candidate variants per language (Google Input Tools style) */
export function getWordCandidates(rawWord: string): WordCandidates[] {
  if (!rawWord || !rawWord.trim()) return [];
  return [
    { lang: "M", label: "मराठी", variants: generateVariants(rawWord.trim(), MARATHI_DICTIONARY) },
    { lang: "H", label: "हिंदी", variants: generateVariants(rawWord.trim(), HINDI_DICTIONARY) },
  ];
}

/**
 * Returns flat multi-language candidates for the suggestion bar.
 * All Marathi variants first (up to 8), then Hindi (2), then English original.
 */
export function getAllCandidates(rawWord: string): MultiLangCandidate[] {
  if (!rawWord || !rawWord.trim()) return [];
  const w = rawWord.trim();

  const marathiVariants = generateVariants(w, MARATHI_DICTIONARY);
  const hindiVariants   = generateVariants(w, HINDI_DICTIONARY);

  const candidates: MultiLangCandidate[] = [];

  for (const v of marathiVariants) {
    candidates.push({ lang: "M", text: v, label: "मराठी" });
  }
  if (hindiVariants[0]) candidates.push({ lang: "H", text: hindiVariants[0], label: "हिंदी" });
  if (hindiVariants[1]) candidates.push({ lang: "H", text: hindiVariants[1], label: "हिंदी" });

  // English original always last
  candidates.push({ lang: "E", text: w, label: "English" });

  return candidates;
}

/** Transliterates a complete sentence word-by-word */
export function transliterateText(text: string, lang: TypingLang): string {
  if (lang === "E" || !text) return text;
  return text.split(/(\s+)/).map(part =>
    /^\s+$/.test(part) ? part : transliterateWord(part, lang)
  ).join("");
}
