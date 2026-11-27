-- Usernames may contain single spaces between words (e.g. "ahmad yusuf"), still 3–20 characters.
-- Run once in the Supabase SQL editor, after 0004_profile_edit.sql.

alter table public.profiles drop constraint if exists profiles_username_check;
alter table public.profiles add constraint profiles_username_check
  check (username ~ '^[a-z0-9_]+( [a-z0-9_]+)*$' and char_length(username) between 3 and 20);

-- Same clean-up as the app: trim, collapse inner whitespace to one space, lowercase.
create or replace function public.normalize_username(p_username text) returns text
language sql immutable set search_path = '' as $$
  select lower(regexp_replace(trim(coalesce(p_username, '')), '\s+', ' ', 'g'));
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username)
  values (new.id, public.normalize_username(new.raw_user_meta_data ->> 'username'));
  return new;
end;
$$;

create or replace function public.username_available(p_username text) returns boolean
language sql security definer set search_path = '' stable as $$
  select not exists (select 1 from public.profiles where username = public.normalize_username(p_username));
$$;

create or replace function public.update_username(p_username text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_name text := public.normalize_username(p_username);
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if v_name !~ '^[a-z0-9_]+( [a-z0-9_]+)*$' or char_length(v_name) not between 3 and 20 then
    raise exception 'username_invalid';
  end if;
  if exists (select 1 from public.profiles where username = v_name and id <> v_user) then
    raise exception 'username_taken';
  end if;
  update public.profiles set username = v_name where id = v_user;
  return v_name;
exception
  when unique_violation then
    raise exception 'username_taken';
end;
$$;
