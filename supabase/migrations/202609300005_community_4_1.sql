-- ════════════════════════════════════════════════════════════════
-- 커뮤니티 4-1(2026-09-30) — '댓글 단 글' 보기.
-- 내가 남의 글(사진·질문·운동 영상)에 댓글을 단 글을, 내 마지막 댓글 시각 순으로.
-- 이 보기에서는 커서 시각(created_at)이 '내 마지막 댓글 시각' 이다 — 정렬과 커서가 같은 값을 써야
-- 페이지가 겹치거나 빠지지 않는다. 보기 권한·숨김·차단은 기존 RLS 가 그대로 거른다(security invoker).
-- ════════════════════════════════════════════════════════════════
create or replace function public.community_feed_page(
  p_view text default 'workout', p_search text default '',
  p_as_of timestamptz default now(), p_before timestamptz default null,
  p_id uuid default null, p_kind text default '', p_score bigint default null
) returns table(id uuid, kind text, created_at timestamptz, score bigint)
language sql stable security invoker set search_path = public as $$
  with photo as (
    select p.id, 'photo'::text kind,
      case when p_view = 'commented' then
        (select max(cm.created_at) from public.community_comments cm where cm.post_id = p.id and cm.user_id = auth.uid())
        else p.created_at end created_at,
      case when p_view = 'popular' then
        (select count(*) from public.community_likes l where l.post_id = p.id)
        else 0::bigint end score
    from public.community_posts p
    where auth.uid() is not null and p_view in ('workout','mine','popular','question','question_open','saved','commented')
      and (p_view <> 'mine' or p.user_id = auth.uid())
      and (p_view not in ('workout','popular') or p.post_type = 'photo')
      and (p_view not in ('question','question_open') or p.post_type = 'question')
      and (p_view <> 'question_open' or p.resolved_at is null)
      and (p_view <> 'saved' or exists (select 1 from public.community_saves s where s.post_id = p.id and s.user_id = auth.uid()))
      and (p_view <> 'commented' or (p.user_id <> auth.uid()
        and exists (select 1 from public.community_comments cm where cm.post_id = p.id and cm.user_id = auth.uid())))
      and p.created_at <= p_as_of
      and (p_view <> 'popular' or p.created_at >= p_as_of - interval '7 days')
      and (p_search = '' or strpos(lower(coalesce(p.title,'') || ' ' || coalesce(p.caption,'') || ' ' ||
        coalesce((select string_agg(e->>'name', ' ') from jsonb_array_elements(case when jsonb_typeof(p.workout_snapshot->'exercises') = 'array' then p.workout_snapshot->'exercises' else '[]'::jsonb end) e), '')), lower(p_search)) > 0)
  ), teaching as (
    select p.id, 'teaching'::text kind,
      case when p_view = 'commented' then
        (select max(cm.created_at) from public.teaching_comments cm where cm.post_id = p.id and cm.user_id = auth.uid())
        else p.created_at end created_at,
      0::bigint score
    from public.teaching_posts p
    where auth.uid() is not null and p_view in ('teaching','mine','commented')
      and (p_view <> 'mine' or p.user_id = auth.uid())
      and (p_view <> 'commented' or (p.user_id <> auth.uid()
        and exists (select 1 from public.teaching_comments cm where cm.post_id = p.id and cm.user_id = auth.uid())))
      and p.created_at <= p_as_of
      and (p_search = '' or strpos(lower(coalesce(p.exercise_tag,'') || ' ' || coalesce(p.caption,'')), lower(p_search)) > 0)
  ), candidates as (
    select * from photo union all select * from teaching
  )
  select c.id, c.kind, c.created_at, c.score from candidates c
  where p_before is null or
    (c.score,c.created_at,c.id,c.kind) < (coalesce(p_score,0),p_before,p_id,p_kind)
  order by c.score desc,c.created_at desc,c.id desc,c.kind desc limit 21;
$$;
