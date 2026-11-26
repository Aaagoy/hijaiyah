-- Save exam progress item by item, so leaving an exam halfway keeps what was already read correctly.
-- Run once in the Supabase SQL editor, after 0002_grants.sql.

-- p_stars: stars earned on this correct reading (1..3).
-- Keeps the best stars per item, awards 10 XP per star of improvement, and marks the
-- sub-level complete (stars = floor(mean of best item stars)) once every item has been read correctly.
create function public.record_item(p_item_id uuid, p_stars int)
returns table (xp_gained int, total_xp int, sublevel_completed boolean, sublevel_stars int)
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_sublevel uuid;
  v_new int := least(3, greatest(1, p_stars));
  v_old int;
  v_gain int;
  v_total int;
  v_done int;
  v_sum int;
  v_stars int;
begin
  if v_user is null then
    raise exception 'not authenticated';
  end if;
  select sublevel_id into v_sublevel from public.items where id = p_item_id;
  if v_sublevel is null then
    raise exception 'unknown item %', p_item_id;
  end if;

  -- Serialise each user's saves so two tabs cannot both award the same improvement.
  perform 1 from public.profiles where id = v_user for update;

  select best_stars into v_old from public.item_progress where user_id = v_user and item_id = p_item_id;
  v_gain := greatest(0, v_new - coalesce(v_old, 0)) * 10;
  insert into public.item_progress (user_id, item_id, best_stars)
  values (v_user, p_item_id, v_new)
  on conflict (user_id, item_id) do update
    set best_stars = greatest(public.item_progress.best_stars, excluded.best_stars), updated_at = now();
  update public.profiles set xp = xp + v_gain where id = v_user;

  select count(*), count(ip.item_id), coalesce(sum(ip.best_stars), 0)
    into v_total, v_done, v_sum
  from public.items i
  left join public.item_progress ip on ip.item_id = i.id and ip.user_id = v_user
  where i.sublevel_id = v_sublevel;

  if v_done = v_total then
    v_stars := floor(v_sum::numeric / v_total);
    insert into public.sublevel_progress (user_id, sublevel_id, best_stars)
    values (v_user, v_sublevel, v_stars)
    on conflict (user_id, sublevel_id) do update
      set best_stars = greatest(public.sublevel_progress.best_stars, excluded.best_stars);
    select best_stars into v_stars from public.sublevel_progress where user_id = v_user and sublevel_id = v_sublevel;
  end if;

  return query select v_gain, (select xp from public.profiles where id = v_user), v_done = v_total, v_stars;
end;
$$;

revoke execute on function public.record_item(uuid, int) from public;
grant execute on function public.record_item(uuid, int) to authenticated;
