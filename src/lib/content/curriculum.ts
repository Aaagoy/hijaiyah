import { LETTERS, letterByChar, type Letter } from "./letters";
import { syllable, VOWELS, type Vowel } from "./phonemes";

export interface Candidate {
  key: string;
  phonemes: string;
  latin: string;
}

export interface CurriculumItem {
  key: string;
  arabic: string;
  latin: string;
  phonemes: string;
  explanation: string;
  /** Likely wrong readings (never includes the target itself). */
  candidates: Candidate[];
}

export interface CurriculumSublevel {
  key: string;
  order: number;
  title: string;
  items: CurriculumItem[];
}

export interface CurriculumLevel {
  key: string;
  order: number;
  title: string;
  description: string;
  comingSoon: boolean;
  sublevels: CurriculumSublevel[];
}

const LETTER_GROUPS = [5, 5, 5, 5, 4, 4];
const MIXED_GROUP = 7;

const VOWEL_INFO: Record<Vowel, { harakat: string; tanwin: string; harakatShape: string; tanwinShape: string }> = {
  a: { harakat: "Fathah", tanwin: "Fathatain", harakatShape: "garis miring di atas huruf", tanwinShape: "dua garis miring di atas huruf" },
  i: { harakat: "Kasrah", tanwin: "Kasratain", harakatShape: "garis miring di bawah huruf", tanwinShape: "dua garis miring di bawah huruf" },
  u: { harakat: "Dhammah", tanwin: "Dhammatain", harakatShape: "seperti wau kecil di atas huruf", tanwinShape: "dua dhammah di atas huruf" },
};

function chunk<T>(list: T[], sizes: number[]): T[][] {
  const out: T[][] = [];
  let at = 0;
  for (const size of sizes) {
    out.push(list.slice(at, at + size));
    at += size;
  }
  return out;
}

function dedupe(target: string, candidates: Candidate[]): Candidate[] {
  const seen = new Set([target]);
  return candidates.filter((c) => (seen.has(c.phonemes) ? false : (seen.add(c.phonemes), true)));
}

function syllableCandidate(letter: Letter, vowel: Vowel, tanwin: boolean): Candidate {
  const s = syllable(letter, vowel, tanwin);
  return { key: `${letter.key}-${vowel}${tanwin ? "n" : ""}`, phonemes: s.phonemes, latin: s.latin };
}

function nameCandidate(letter: Letter): Candidate {
  return { key: `name-${letter.key}`, phonemes: letter.namePhonemes, latin: letter.name };
}

function nameItem(letter: Letter, group: Letter[]): CurriculumItem {
  const twins = letter.twins.map(letterByChar);
  const twinNote = twins.length
    ? ` Bedakan dengan ${twins.map((t) => `${t.char} (${t.name})`).join(" dan ")}.`
    : "";
  return {
    key: `huruf-${letter.key}`,
    arabic: letter.char,
    latin: letter.name,
    phonemes: letter.namePhonemes,
    explanation: `Huruf ${letter.char} dibaca "${letter.name}".${twinNote}`,
    candidates: dedupe(letter.namePhonemes, [...twins, ...group.filter((l) => l !== letter)].map(nameCandidate)),
  };
}

function syllableItem(levelKey: string, letter: Letter, vowel: Vowel, tanwin: boolean): CurriculumItem {
  const s = syllable(letter, vowel, tanwin);
  const info = VOWEL_INFO[vowel];
  const mark = tanwin ? `${info.tanwin} (${info.tanwinShape})` : `${info.harakat} (${info.harakatShape})`;
  const sound = tanwin ? `${vowel}n` : vowel;
  const candidates = [
    ...VOWELS.filter((v) => v !== vowel).map((v) => syllableCandidate(letter, v, tanwin)),
    syllableCandidate(letter, vowel, !tanwin),
    ...letter.twins.map((c) => syllableCandidate(letterByChar(c), vowel, tanwin)),
  ];
  return {
    key: `${levelKey}-${letter.key}`,
    arabic: s.arabic,
    latin: s.latin,
    phonemes: s.phonemes,
    explanation: `${mark} dibaca "${sound}": ${s.arabic} dibaca "${s.latin}".`,
    candidates: dedupe(s.phonemes, candidates),
  };
}

function groupTitle(letters: Letter[]): string {
  return letters.map((l) => l.char).join(" ");
}

function letterLevel(order: number, key: string, title: string, description: string, makeItem: (l: Letter, group: Letter[]) => CurriculumItem): CurriculumLevel {
  return {
    key,
    order,
    title,
    description,
    comingSoon: false,
    sublevels: chunk(LETTERS, LETTER_GROUPS).map((group, i) => ({
      key: `${key}-${i + 1}`,
      order: i + 1,
      title: groupTitle(group),
      items: group.map((l) => makeItem(l, group)),
    })),
  };
}

function mixedLevel(order: number, key: string, title: string, description: string, tanwin: boolean): CurriculumLevel {
  const groups = chunk(LETTERS, [MIXED_GROUP, MIXED_GROUP, MIXED_GROUP, MIXED_GROUP]);
  return {
    key,
    order,
    title,
    description,
    comingSoon: false,
    sublevels: groups.map((group, g) => ({
      key: `${key}-${g + 1}`,
      order: g + 1,
      title: groupTitle(group),
      items: group.map((l, i) => syllableItem(key, l, VOWELS[(g * MIXED_GROUP + i) % 3], tanwin)),
    })),
  };
}

function comingSoon(order: number, key: string, title: string, description: string): CurriculumLevel {
  return { key, order, title, description, comingSoon: true, sublevels: [] };
}

export function buildCurriculum(): CurriculumLevel[] {
  return [
    letterLevel(1, "huruf", "Huruf Hijaiyah", "Kenali 28 huruf hijaiyah dan cara menyebut namanya.", nameItem),
    letterLevel(2, "fathah", "Fathah", "Huruf berharakat fathah dibaca a.", (l) => syllableItem("fathah", l, "a", false)),
    letterLevel(3, "kasrah", "Kasrah", "Huruf berharakat kasrah dibaca i.", (l) => syllableItem("kasrah", l, "i", false)),
    letterLevel(4, "dhammah", "Dhammah", "Huruf berharakat dhammah dibaca u.", (l) => syllableItem("dhammah", l, "u", false)),
    mixedLevel(5, "campuran-harakat", "Campuran Harakat", "Latihan acak fathah, kasrah, dan dhammah.", false),
    letterLevel(6, "fathatain", "Fathatain", "Tanwin fathatain dibaca an.", (l) => syllableItem("fathatain", l, "a", true)),
    letterLevel(7, "kasratain", "Kasratain", "Tanwin kasratain dibaca in.", (l) => syllableItem("kasratain", l, "i", true)),
    letterLevel(8, "dhammatain", "Dhammatain", "Tanwin dhammatain dibaca un.", (l) => syllableItem("dhammatain", l, "u", true)),
    mixedLevel(9, "campuran-tanwin", "Campuran Tanwin", "Latihan acak fathatain, kasratain, dan dhammatain.", true),
    comingSoon(10, "tajwid", "Hukum Tajwid", "Belajar hukum bacaan seperti ghunnah, qalqalah, dan mad."),
    comingSoon(11, "potongan-kata", "Potongan Kata Al-Qur'an", "Latihan membaca potongan kata dari Al-Qur'an."),
  ];
}
