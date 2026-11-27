-- Edit profile: change username and choose an avatar (a hijaiyah letter or an uploaded photo).
-- Run once in the Supabase SQL editor, after 0003_record_item.sql.

-- 'huruf:<letter key>' or 'foto:<user id>/<file>'; null = default letter picked from the username.
alter table public.profiles add column avatar text;

-- Users still cannot update profiles directly (XP stays server-side); these functions are the only way in.
create function public.update_username(p_username text) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_name text := lower(trim(p_username));
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if v_name !~ '^[a-z0-9_]{3,20}$' then
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

create function public.set_avatar(p_avatar text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  if not (
    p_avatar ~ '^huruf:(alif|ba|ta|tsa|jim|hha|kho|dal|dzal|ro|zai|sin|syin|shod|dhod|tho|zho|ain|ghoin|fa|qof|kaf|lam|mim|nun|wau|ha|ya)$'
    or p_avatar ~ ('^foto:' || v_user::text || '/[A-Za-z0-9_-]+\.(webp|jpg)$')
  ) then
    raise exception 'avatar_invalid';
  end if;
  update public.profiles set avatar = p_avatar where id = v_user;
end;
$$;

revoke execute on function public.update_username(text) from public;
revoke execute on function public.set_avatar(text) from public;
grant execute on function public.update_username(text) to authenticated;
grant execute on function public.set_avatar(text) to authenticated;

-- ───────────── Storage: profile photos ─────────────
-- Photos are resized in the browser to 256×256 (about 20 KB); the bucket refuses anything bigger than 200 KB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 204800, array['image/webp', 'image/jpeg'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Each user may only write inside the folder named after their own id.
create policy "avatar upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar update own folder" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar delete own folder" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatar read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars');
