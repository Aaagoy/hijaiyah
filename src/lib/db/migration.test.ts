import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

/** Minimal stand-ins for the Supabase-provided auth and storage schemas. */
const SUPABASE_STUBS = `
  create role anon; create role authenticated;
  create schema auth;
  create table auth.users (id uuid primary key, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('test.uid', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean);
`;

const USER = "11111111-1111-1111-1111-111111111111";
let db: PGlite;
let sublevelId: string;
let itemIds: string[];

async function complete(stars: number[]) {
  const map = Object.fromEntries(itemIds.map((id, i) => [id, stars[i]]));
  const res = await db.query<{ xp_gained: number; total_xp: number; sublevel_stars: number }>(
    "select * from public.complete_sublevel($1, $2)",
    [sublevelId, JSON.stringify(map)],
  );
  return res.rows[0];
}

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUBS);
  await db.exec(readFileSync("supabase/migrations/0001_init.sql", "utf8"));
  await db.exec(`select set_config('test.uid', '${USER}', false)`);
  await db.query("insert into auth.users (id, raw_user_meta_data) values ($1, $2)", [USER, { username: "Ahmad_23" }]);
  const level = await db.query<{ id: string }>("insert into public.levels (key, ord, title) values ('huruf', 1, 'Huruf') returning id");
  const sub = await db.query<{ id: string }>(
    "insert into public.sublevels (level_id, key, ord, title) values ($1, 'huruf-1', 1, 'ا ب') returning id",
    [level.rows[0].id],
  );
  sublevelId = sub.rows[0].id;
  itemIds = [];
  for (const [i, key] of ["huruf-alif", "huruf-ba"].entries()) {
    const item = await db.query<{ id: string }>(
      "insert into public.items (sublevel_id, key, ord, arabic, latin, phonemes, explanation) values ($1, $2, $3, 'x', 'x', 'x', 'x') returning id",
      [sublevelId, key, i + 1],
    );
    itemIds.push(item.rows[0].id);
  }
});

describe("0001_init migration", () => {
  it("creates a lower-cased profile on signup", async () => {
    const res = await db.query<{ username: string; xp: number }>("select username, xp from public.profiles");
    expect(res.rows).toEqual([{ username: "ahmad_23", xp: 0 }]);
  });

  it("reports usernames as taken case-insensitively", async () => {
    const res = await db.query<{ ok: boolean }>("select public.username_available('AHMAD_23') as ok");
    expect(res.rows[0].ok).toBe(false);
  });

  it("awards 10 XP per star on the first completion", async () => {
    expect(await complete([3, 2])).toEqual({ xp_gained: 50, total_xp: 50, sublevel_stars: 2 });
  });

  it("never lowers stars or XP on a worse replay", async () => {
    expect(await complete([1, 1])).toEqual({ xp_gained: 0, total_xp: 50, sublevel_stars: 2 });
    const best = await db.query<{ best_stars: number }>("select best_stars from public.item_progress order by best_stars desc");
    expect(best.rows.map((r) => r.best_stars)).toEqual([3, 2]);
  });

  it("awards only the improvement on a better replay", async () => {
    expect(await complete([3, 3])).toEqual({ xp_gained: 10, total_xp: 60, sublevel_stars: 3 });
  });

  it("rejects a completion that leaves out an item", async () => {
    await expect(
      db.query("select * from public.complete_sublevel($1, $2)", [sublevelId, JSON.stringify({ [itemIds[0]]: 3 })]),
    ).rejects.toThrow(/missing stars/);
  });
});
