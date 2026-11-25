import type { Letter } from "./letters";

export type Vowel = "a" | "i" | "u";
export const VOWELS: Vowel[] = ["a", "i", "u"];

const SHORT_MARK: Record<Vowel, string> = { a: "َ", i: "ِ", u: "ُ" };
const TANWIN_MARK: Record<Vowel, string> = { a: "ً", i: "ٍ", u: "ٌ" };
/** Alif carrying a vowel is written with a hamzah seat. */
const ALIF_SEAT: Record<Vowel, string> = { a: "أ", i: "إ", u: "أ" };

export interface Syllable {
  arabic: string;
  phonemes: string;
  latin: string;
}

/**
 * A letter with a short vowel, optionally with tanwin. Tanwin is read in its joined (washal)
 * form: consonant + vowel + n, as in the tilawa corpus (كُفُوًا → كُفُوَن).
 */
export function syllable(letter: Letter, vowel: Vowel, tanwin: boolean): Syllable {
  const isAlif = letter.key === "alif";
  const base = isAlif ? ALIF_SEAT[vowel] : letter.char;
  const consonant = isAlif ? "ء" : letter.char;
  return {
    arabic: base + (tanwin ? TANWIN_MARK[vowel] : SHORT_MARK[vowel]),
    phonemes: consonant + SHORT_MARK[vowel] + (tanwin ? "ن" : ""),
    latin: letter.latin + vowel + (tanwin ? "n" : ""),
  };
}
