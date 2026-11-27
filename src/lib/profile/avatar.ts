import { LETTERS, type Letter } from "@/lib/content/letters";

export type Avatar = { kind: "huruf"; letter: Letter; color: string } | { kind: "foto"; url: string };

/** Background + text colour per letter, used in turn so neighbouring letters differ. */
export const LETTER_COLORS = [
  "bg-emerald-500 text-white",
  "bg-sky-500 text-white",
  "bg-amber-400 text-amber-950",
  "bg-rose-500 text-white",
  "bg-violet-500 text-white",
  "bg-teal-500 text-white",
  "bg-orange-500 text-white",
];

export const MAX_INPUT_BYTES = 5 * 1024 * 1024;
export const AVATAR_BUCKET = "avatars";

const BY_KEY = new Map(LETTERS.map((l, i) => [l.key, i]));

function letterAvatar(index: number): Avatar {
  return { kind: "huruf", letter: LETTERS[index], color: LETTER_COLORS[index % LETTER_COLORS.length] };
}

/** A stable letter for users who have not chosen an avatar. */
export function defaultLetterKey(username: string): string {
  let hash = 0;
  for (const ch of username) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0;
  return LETTERS[hash % LETTERS.length].key;
}

/** Turn the stored `profiles.avatar` value into what to draw. */
export function resolveAvatar(avatar: string | null, username: string, publicUrl: (path: string) => string): Avatar {
  if (avatar?.startsWith("foto:")) return { kind: "foto", url: publicUrl(avatar.slice("foto:".length)) };
  const chosen = avatar?.startsWith("huruf:") ? BY_KEY.get(avatar.slice("huruf:".length)) : undefined;
  return letterAvatar(chosen ?? BY_KEY.get(defaultLetterKey(username))!);
}

/** Storage path of an uploaded photo avatar, or null for letter avatars. */
export function photoPath(avatar: string | null): string | null {
  return avatar?.startsWith("foto:") ? avatar.slice("foto:".length) : null;
}

export function checkImageFile(file: { type: string; size: number }): string | undefined {
  if (!file.type.startsWith("image/")) return "File harus berupa gambar (JPG, PNG, atau WebP).";
  if (file.size > MAX_INPUT_BYTES) return "Ukuran foto maksimal 5 MB.";
  return undefined;
}

/** Public URL of a file in the avatars bucket. */
export function avatarUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${AVATAR_BUCKET}/${path}`;
}
