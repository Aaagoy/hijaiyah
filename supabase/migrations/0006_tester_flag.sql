-- Test accounts see every sub-level unlocked (progress and stars stay real).
-- Run once in the Supabase SQL editor, after 0005_username_spaces.sql.
-- Users have no update grant on profiles, so only the SQL editor can turn this on:
--   update public.profiles set is_tester = true where username = 'tester';

alter table public.profiles add column if not exists is_tester boolean not null default false;
