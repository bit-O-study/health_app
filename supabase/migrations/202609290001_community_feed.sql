-- Additive community upgrade; existing posts and visibility policies stay intact.
alter table public.community_posts alter column photo_url drop not null;
alter table public.community_posts add column if not exists workout_snapshot jsonb;
alter table public.community_posts drop constraint if exists community_posts_content_check;
alter table public.community_posts add constraint community_posts_content_check
  check (nullif(btrim(photo_url), '') is not null or
    coalesce(jsonb_typeof(workout_snapshot) = 'object' and workout_snapshot ? 'exercises', false));
create index if not exists community_posts_author_cursor_idx
  on public.community_posts(user_id, created_at desc, id desc);

-- Invoker security deliberately preserves the caller's visibility policies.
create or replace function public.community_feed_page(
  p_view text default 'workout', p_search text default '',
  p_as_of timestamptz default now(), p_before timestamptz default null,
  p_id uuid default null, p_kind text default '', p_score bigint default null
) returns table(id uuid, kind text, created_at timestamptz, score bigint)
language sql stable security invoker set search_path = public as $$
  with candidates as (
    select p.id, 'photo'::text kind, p.created_at,
      case when p_view = 'popular' then
        (select count(*) from public.community_likes l where l.post_id = p.id)
        else 0::bigint end score
    from public.community_posts p
    where auth.uid() is not null and p_view in ('workout','mine','popular')
      and (p_view <> 'mine' or p.user_id = auth.uid())
      and p.created_at <= p_as_of
      and (p_view <> 'popular' or p.created_at >= p_as_of - interval '7 days')
      and (p_search = '' or strpos(lower(coalesce(p.caption,'') || ' ' ||
        coalesce(p.workout_snapshot->'exercises','[]'::jsonb)::text), lower(p_search)) > 0)
    union all
    select p.id, 'teaching'::text, p.created_at, 0::bigint
    from public.teaching_posts p
    where auth.uid() is not null and p_view in ('teaching','mine')
      and (p_view <> 'mine' or p.user_id = auth.uid())
      and p.created_at <= p_as_of
      and (p_search = '' or strpos(lower(coalesce(p.exercise_tag,'') || ' ' || coalesce(p.caption,'')), lower(p_search)) > 0)
  )
  select c.id, c.kind, c.created_at, c.score from candidates c
  where p_before is null or
    (c.score,c.created_at,c.id,c.kind) < (coalesce(p_score,0),p_before,p_id,p_kind)
  order by c.score desc,c.created_at desc,c.id desc,c.kind desc limit 21;
$$;
revoke all on function public.community_feed_page(text,text,timestamptz,timestamptz,uuid,text,bigint) from public, anon;
grant execute on function public.community_feed_page(text,text,timestamptz,timestamptz,uuid,text,bigint) to authenticated;
