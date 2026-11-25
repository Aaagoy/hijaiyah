/**
 * The 28 hijaiyah letters.
 *
 * Phoneme strings use the @tilawa/core alphabet: a consonant followed by a short vowel mark
 * (بَ), long a = "اا", long i = "ۦۦ", long u = "ۥۥ", hamzah = "ء".
 */
export interface Letter {
  /** Stable ASCII key used in item keys, e.g. "ba". */
  key: string;
  char: string;
  /** Consonant transliteration (Indonesian style), e.g. "b", "ts", "kh". Empty for alif. */
  latin: string;
  /** Letter name as taught, e.g. "Ba". */
  name: string;
  /** How the letter name is read, in tilawa phonemes. */
  namePhonemes: string;
  /** Letters that look alike (differ only by dots) and are easy to swap; used as wrong-reading candidates. */
  twins: string[];
}

export const LETTERS: Letter[] = [
  { key: "alif", char: "ا", latin: "", name: "Alif", namePhonemes: "ءَلِف", twins: [] },
  { key: "ba", char: "ب", latin: "b", name: "Ba", namePhonemes: "بَاا", twins: ["ت", "ث"] },
  { key: "ta", char: "ت", latin: "t", name: "Ta", namePhonemes: "تَاا", twins: ["ب", "ث"] },
  { key: "tsa", char: "ث", latin: "ts", name: "Tsa", namePhonemes: "ثَاا", twins: ["ب", "ت"] },
  { key: "jim", char: "ج", latin: "j", name: "Jim", namePhonemes: "جِۦۦم", twins: ["ح", "خ"] },
  { key: "hha", char: "ح", latin: "ḥ", name: "Ḥa", namePhonemes: "حَاا", twins: ["ج", "خ"] },
  { key: "kho", char: "خ", latin: "kh", name: "Kho", namePhonemes: "خَاا", twins: ["ج", "ح"] },
  { key: "dal", char: "د", latin: "d", name: "Dal", namePhonemes: "دَاال", twins: ["ذ"] },
  { key: "dzal", char: "ذ", latin: "dz", name: "Dzal", namePhonemes: "ذَاال", twins: ["د"] },
  { key: "ro", char: "ر", latin: "r", name: "Ro", namePhonemes: "رَاا", twins: ["ز"] },
  { key: "zai", char: "ز", latin: "z", name: "Zai", namePhonemes: "زَااي", twins: ["ر"] },
  { key: "sin", char: "س", latin: "s", name: "Sin", namePhonemes: "سِۦۦن", twins: ["ش"] },
  { key: "syin", char: "ش", latin: "sy", name: "Syin", namePhonemes: "شِۦۦن", twins: ["س"] },
  { key: "shod", char: "ص", latin: "sh", name: "Shod", namePhonemes: "صَااد", twins: ["ض"] },
  { key: "dhod", char: "ض", latin: "dh", name: "Dhod", namePhonemes: "ضَااد", twins: ["ص"] },
  { key: "tho", char: "ط", latin: "th", name: "Tho", namePhonemes: "طَاا", twins: ["ظ"] },
  { key: "zho", char: "ظ", latin: "zh", name: "Zho", namePhonemes: "ظَاا", twins: ["ط"] },
  { key: "ain", char: "ع", latin: "'", name: "'Ain", namePhonemes: "عَين", twins: ["غ"] },
  { key: "ghoin", char: "غ", latin: "gh", name: "Ghoin", namePhonemes: "غَين", twins: ["ع"] },
  { key: "fa", char: "ف", latin: "f", name: "Fa", namePhonemes: "فَاا", twins: ["ق"] },
  { key: "qof", char: "ق", latin: "q", name: "Qof", namePhonemes: "قَااف", twins: ["ف"] },
  { key: "kaf", char: "ك", latin: "k", name: "Kaf", namePhonemes: "كَااف", twins: [] },
  { key: "lam", char: "ل", latin: "l", name: "Lam", namePhonemes: "لَاام", twins: [] },
  { key: "mim", char: "م", latin: "m", name: "Mim", namePhonemes: "مِۦۦم", twins: [] },
  { key: "nun", char: "ن", latin: "n", name: "Nun", namePhonemes: "نُۥۥن", twins: [] },
  { key: "wau", char: "و", latin: "w", name: "Wau", namePhonemes: "وَااو", twins: [] },
  { key: "ha", char: "ه", latin: "h", name: "Ha", namePhonemes: "هَاا", twins: [] },
  { key: "ya", char: "ي", latin: "y", name: "Ya", namePhonemes: "يَاا", twins: [] },
];

export function letterByChar(char: string): Letter {
  const letter = LETTERS.find((l) => l.char === char);
  if (!letter) throw new Error(`Unknown letter: ${char}`);
  return letter;
}
