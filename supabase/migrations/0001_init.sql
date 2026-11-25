-- Hijaiyah MVP schema. Run once in the Supabase SQL editor (or `supabase db push`).

-- ───────────── Content (filled by `npm run seed`) ─────────────
create table public.levels (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  ord int not null,
  title text not null,
  description text not null default '',
  coming_soon boolean not null default false
);

create table public.sublevels (
  id uuid primary key default gen_random_uuid(),
  level_id uuid not null references public.levels(id) on delete cascade,
  key text not null unique,
  ord int not null,
  title text not null
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  sublevel_id uuid not null references public.sublevels(id) on delete cascade,
  key text not null unique,
  ord int not null,
  arabic text not null,
  latin text not null,
  phonemes text not null,
  explanation text not null,
  candidates jsonb not null default '[]'::jsonb,
  audio_path text
);

-- ───────────── Users ─────────────
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  xp int not null default 0,
  created_at timestamptz not null default now()
);

create table public.item_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  best_stars int not null check (best_stars between 1 and 3),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

create table public.sublevel_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  sublevel_id uuid not null references public.sublevels(id) on delete cascade,
  best_stars int not null check (best_stars between 0 and 3),
  completed_at timestamptz not null default now(),
  primary key (user_id, sublevel_id)
);

-- One row per recognition attempt. No audio is ever stored.
create table public.attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  item_id uuid not null references public.items(id) on delete cascade,
  mode text not null check (mode in ('belajar', 'ujian')),
  attempt_no int not null,
  status text not null check (status in ('correct', 'wrong', 'silent')),
  heard_key text,
  score real,
  transcript text not null default '',
  created_at timestamptz not null default now()
);
create index attempts_user_idx on public.attempts (user_id, created_at desc);

-- ───────────── Row level security ─────────────
alter table public.levels enable row level security;
alter table public.sublevels enable row level security;
alter table public.items enable row level security;
alter table public.profiles enable row level security;
alter table public.item_progress enable row level security;
alter table public.sublevel_progress enable row level security;
alter table public.attempts enable row level security;

create policy "content readable" on public.levels for select to authenticated using (true);
create policy "content readable" on public.sublevels for select to authenticated using (true);
create policy "content readable" on public.items for select to authenticated using (true);
-- The landing page lists levels before login.
create policy "levels public" on public.levels for select to anon using (true);

create policy "own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "own item progress" on public.item_progress for select to authenticated using (user_id = auth.uid());
create policy "own sublevel progress" on public.sublevel_progress for select to authenticated using (user_id = auth.uid());
create policy "own attempts read" on public.attempts for select to authenticated using (user_id = auth.uid());
create policy "own attempts insert" on public.attempts for insert to authenticated with check (user_id = auth.uid());
-- Progress and XP only change through complete_sublevel() below.

-- ───────────── Signup: profile from user metadata ─────────────
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username)
  values (new.id, lower(new.raw_user_meta_data ->> 'username'));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.username_available(p_username text) returns boolean
language sql security definer set search_path = '' stable as $$
  select not exists (select 1 from public.profiles where username = lower(p_username));
$$;
grant execute on function public.username_available(text) to anon, authenticated;

-- ───────────── Finishing a sub-level ─────────────
-- p_item_stars: {"<item uuid>": 1..3, ...} covering every item of the sub-level.
-- Keeps the best stars per item and awards 10 XP per star of improvement only.
create function public.complete_sublevel(p_sublevel_id uuid, p_item_stars jsonb)
returns table (xp_gained int, total_xp int, sublevel_stars int)
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_item record;
  v_new int;
  v_old int;
  v_gain int := 0;
  v_sum int := 0;
  v_count int := 0;
  v_stars int;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;

  for v_item in select id from public.items where sublevel_id = p_sublevel_id loop
    if not (p_item_stars ? v_item.id::text) then
      raise exception 'missing stars for item %', v_item.id;
    end if;
    v_new := least(3, greatest(1, (p_item_stars ->> v_item.id::text)::int));
    select best_stars into v_old from public.item_progress where user_id = v_user and item_id = v_item.id;
    v_gain := v_gain + greatest(0, v_new - coalesce(v_old, 0)) * 10;
    insert into public.item_progress (user_id, item_id, best_stars)
    values (v_user, v_item.id, v_new)
    on conflict (user_id, item_id) do update
      set best_stars = greatest(public.item_progress.best_stars, excluded.best_stars), updated_at = now();
    v_sum := v_sum + v_new;
    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    raise exception 'unknown sublevel %', p_sublevel_id;
  end if;

  v_stars := floor(v_sum::numeric / v_count);
  insert into public.sublevel_progress (user_id, sublevel_id, best_stars)
  values (v_user, p_sublevel_id, v_stars)
  on conflict (user_id, sublevel_id) do update
    set best_stars = greatest(public.sublevel_progress.best_stars, excluded.best_stars);

  update public.profiles set xp = xp + v_gain where id = v_user;

  return query
    select v_gain, p.xp, sp.best_stars
    from public.profiles p
    join public.sublevel_progress sp on sp.user_id = p.id and sp.sublevel_id = p_sublevel_id
    where p.id = v_user;
end;
$$;
grant execute on function public.complete_sublevel(uuid, jsonb) to authenticated;

-- ───────────── Storage: example audio ─────────────
insert into storage.buckets (id, name, public) values ('audio', 'audio', true)
  on conflict (id) do nothing;
