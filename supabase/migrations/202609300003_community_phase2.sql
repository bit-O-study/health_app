-- 커뮤니티 2단계(2026-09-30, docs/community-review-2026-09-30.html).

-- ── 검색: 운동 기록 카드는 '운동 이름' 만 ─────────────────────────────
-- 예전엔 카드 JSON 글자 전체를 검색해 "name"·"sets" 를 치면 운동 기록 글이 전부 나왔다.
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
        coalesce((select string_agg(e->>'name', ' ') from jsonb_array_elements(case when jsonb_typeof(p.workout_snapshot->'exercises') = 'array' then p.workout_snapshot->'exercises' else '[]'::jsonb end) e), '')), lower(p_search)) > 0)
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


-- ── 쓰기 속도 제한(도배 막기) ──────────────────────────────────────
-- 사용자 권한 요청에만(서비스 롤 저장은 서버 코드가 같은 한도를 먼저 확인한다).
-- 인자: 한도(개), 기간. 예) 글 10분에 5개, 댓글 5분에 20개.
create or replace function public.community_rate_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  n int;
  lim int := tg_argv[0]::int;
  win interval := tg_argv[1]::interval;
begin
  if not public.is_client_request() then
    return new;
  end if;
  execute format('select count(*) from %I.%I where user_id = $1 and created_at > now() - $2', tg_table_schema, tg_table_name)
    into n using new.user_id, win;
  if n >= lim then
    raise exception '너무 자주 올리고 있어요. 잠시 후 다시 시도해 주세요.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists community_posts_rate on public.community_posts;
create trigger community_posts_rate before insert on public.community_posts
  for each row execute function public.community_rate_guard('5', '10 minutes');
drop trigger if exists community_comments_rate on public.community_comments;
create trigger community_comments_rate before insert on public.community_comments
  for each row execute function public.community_rate_guard('20', '5 minutes');
drop trigger if exists teaching_posts_rate on public.teaching_posts;
create trigger teaching_posts_rate before insert on public.teaching_posts
  for each row execute function public.community_rate_guard('5', '10 minutes');
drop trigger if exists teaching_comments_rate on public.teaching_comments;
create trigger teaching_comments_rate before insert on public.teaching_comments
  for each row execute function public.community_rate_guard('20', '5 minutes');
