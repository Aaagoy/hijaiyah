import type { Avatar } from "@/lib/profile/avatar";

const SIZES = {
  sm: "h-7 w-7 text-lg",
  md: "h-12 w-12 text-2xl",
  lg: "h-20 w-20 text-4xl",
};

/** A round avatar: a hijaiyah letter on a coloured circle, or the user's photo. */
export function AvatarBadge({ avatar, size = "md", label }: { avatar: Avatar; size?: keyof typeof SIZES; label?: string }) {
  const base = `inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ${SIZES[size]}`;
  if (avatar.kind === "foto") {
    // A plain <img>: Supabase public files are already small, so next/image would only add a remote-host config.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatar.url} alt={label ?? "Foto profil"} className={`${base} object-cover`} />;
  }
  return (
    <span className={`${base} ${avatar.color} font-arabic leading-none`} role="img" aria-label={label ?? `Avatar huruf ${avatar.letter.name}`}>
      <span className="-mt-[0.15em]">{avatar.letter.char}</span>
    </span>
  );
}
