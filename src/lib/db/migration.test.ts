import { readFileSync, readdirSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

/** Minimal stand-ins for the Supabase-provided auth and storage schemas. */
const SUPABASE_STUBS = `
  create role anon; create role authenticated; create role service_role;
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
  for (const file of readdirSync("supabase/migrations").sort()) {
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  }
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

describe("table privileges (new Supabase projects grant nothing by default)", () => {
  const can = async (role: string, table: string, priv: string) =>
    (await db.query<{ ok: boolean }>("select has_table_privilege($1, $2, $3) as ok", [role, table, priv])).rows[0].ok;

  it("lets visitors read the level list for the landing page", async () => {
    expect(await can("anon", "public.levels", "select")).toBe(true);
  });
  it("lets signed-in users read content and their progress", async () => {
    for (const t of ["levels", "sublevels", "items", "profiles", "item_progress", "sublevel_progress", "attempts"]) {
      expect(await can("authenticated", `public.${t}`, "select"), t).toBe(true);
    }
  });
  it("lets signed-in users log attempts but not write progress or XP directly", async () => {
    expect(await can("authenticated", "public.attempts", "insert")).toBe(true);
    expect(await can("authenticated", "public.profiles", "update")).toBe(false);
    expect(await can("authenticated", "public.item_progress", "insert")).toBe(false);
  });
  it("lets the seed script (service role) write content", async () => {
    for (const t of ["levels", "sublevels", "items"]) {
      expect(await can("service_role", `public.${t}`, "insert"), t).toBe(true);
    }
  });
  it("keeps content hidden from visitors", async () => {
    expect(await can("anon", "public.items", "select")).toBe(false);
  });
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
