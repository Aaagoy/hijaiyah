"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { AvatarBadge } from "@/components/avatar-badge";
import { btn, field } from "@/components/ui";
import { USERNAME_HINT } from "@/lib/auth/validation";
import { LETTERS } from "@/lib/content/letters";
import { AVATAR_BUCKET, avatarUrl, checkImageFile, defaultLetterKey, photoPath, resolveAvatar } from "@/lib/profile/avatar";
import { resizeToSquare } from "@/lib/profile/resize-image";
import { createClient } from "@/lib/supabase/client";
import { chooseAvatar, updateUsername, type UsernameState } from "./actions";

interface Props {
  userId: string;
  username: string;
  avatar: string | null;
}

export function ProfileEditor({ userId, username, avatar: initialAvatar }: Props) {
  // No chosen avatar yet: pin the default letter now so a rename does not change the picture.
  const [avatar, setAvatar] = useState(initialAvatar ?? `huruf:${defaultLetterKey(username)}`);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<{ tone: "info" | "error" | "ok"; text: string } | null>(null);
  const [busy, startBusy] = useTransition();
  const fileInput = useRef<HTMLInputElement>(null);
  const [nameState, saveName, savingName] = useActionState<UsernameState, FormData>(updateUsername, { value: username });

  const shown = resolveAvatar(avatar, nameState.ok ? nameState.value : username, avatarUrl);
  const current = avatar ?? null;

  /** Save the new avatar, then remove the previous photo (only once the new one is stored). */
  async function apply(next: string) {
    const result = await chooseAvatar(next);
    if (!result.ok) {
      setStatus({ tone: "error", text: result.message ?? "Gagal menyimpan foto profil." });
      return false;
    }
    const old = photoPath(current);
    setAvatar(next);
    if (old && old !== photoPath(next)) await createClient().storage.from(AVATAR_BUCKET).remove([old]);
    setStatus({ tone: "ok", text: "Foto profil tersimpan." });
    return true;
  }

  function pickLetter(key: string) {
    startBusy(async () => {
      if (await apply(`huruf:${key}`)) setOpen(false);
    });
  }

  function upload(file: File) {
    const problem = checkImageFile(file);
    if (problem) {
      setStatus({ tone: "error", text: problem });
      return;
    }
    startBusy(async () => {
      setStatus({ tone: "info", text: "Mengunggah…" });
      try {
        const blob = await resizeToSquare(file);
        const ext = blob.type === "image/webp" ? "webp" : "jpg";
        const path = `${userId}/${Date.now()}.${ext}`;
        const { error } = await createClient().storage.from(AVATAR_BUCKET).upload(path, blob, { contentType: blob.type });
        if (error) {
          console.error("avatar upload failed:", error.message);
          setStatus({ tone: "error", text: "Gagal mengunggah foto. Coba lagi." });
          return;
        }
        if (await apply(`foto:${path}`)) setOpen(false);
        else await createClient().storage.from(AVATAR_BUCKET).remove([path]);
      } catch (e) {
        setStatus({ tone: "error", text: e instanceof Error ? e.message : "Gagal memproses foto." });
      }
    });
  }

  const statusColor = { info: "text-slate-500", error: "text-red-600", ok: "text-brand-700" };

  return (
    <section className="mt-8 rounded-2xl border-2 border-slate-200 bg-white p-4 sm:p-6">
      <h2 className="text-lg font-extrabold">Edit profil</h2>

      <div className="mt-4 flex items-center gap-4">
        <AvatarBadge avatar={shown} size="lg" />
        <button type="button" className={btn.secondary} onClick={() => setOpen((v) => !v)} disabled={busy} aria-expanded={open}>
          {open ? "Tutup" : "Ganti foto"}
        </button>
      </div>
      {status && (
        <p className={`mt-2 text-sm font-semibold ${statusColor[status.tone]}`} role="status">
          {status.text}
        </p>
      )}

      {open && (
        <div className="mt-4 rounded-2xl bg-slate-50 p-3 sm:p-4">
          <p className="text-sm font-bold text-slate-600">Pilih huruf</p>
          <div className="mt-2 grid grid-cols-7 gap-2 sm:grid-cols-10">
            {LETTERS.map((letter) => {
              const value = `huruf:${letter.key}`;
              const selected = avatar === value || (!avatar && shown.kind === "huruf" && shown.letter.key === letter.key);
              return (
                <button
                  key={letter.key}
                  type="button"
                  disabled={busy}
                  onClick={() => pickLetter(letter.key)}
                  className={`flex justify-center rounded-full p-0.5 ring-offset-2 transition hover:scale-105 disabled:opacity-50 ${selected ? "ring-2 ring-brand-500" : ""}`}
                  aria-label={`Pakai huruf ${letter.name}`}
                  aria-pressed={selected}
                >
                  <AvatarBadge avatar={resolveAvatar(value, username, avatarUrl)} size="md" label={letter.name} />
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" className={btn.primary} disabled={busy} onClick={() => fileInput.current?.click()}>
              {busy ? "Memproses…" : "Upload foto"}
            </button>
            <span className="text-xs text-slate-500">JPG, PNG, atau WebP, maks 5 MB. Foto dipotong persegi otomatis.</span>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) upload(file);
              }}
            />
          </div>
        </div>
      )}

      <form action={saveName} className="mt-6">
        <label htmlFor="username" className="text-sm font-bold text-slate-600">
          Username
        </label>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <input
            id="username"
            name="username"
            defaultValue={nameState.value}
            key={nameState.value}
            autoComplete="username"
            autoCapitalize="none"
            maxLength={20}
            className={field}
            aria-describedby="username-help"
          />
          <button type="submit" className={btn.primary} disabled={savingName}>
            {savingName ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
        <p id="username-help" className={`mt-1 text-sm ${nameState.message ? (nameState.ok ? "font-semibold text-brand-700" : "font-semibold text-red-600") : "text-slate-500"}`} role="status">
          {nameState.message ?? USERNAME_HINT}
        </p>
      </form>
    </section>
  );
}
