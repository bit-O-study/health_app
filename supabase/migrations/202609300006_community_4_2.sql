-- ════════════════════════════════════════════════════════════════
-- 커뮤니티 4-2(2026-09-30) — 대화가 이어지게: 답글 · 답변 채택 · 질문 운동 태그 · 작성자 프로필.
-- 정한 기준(사용자 "추천대로"): 채택하면 자동으로 '해결됨'.
-- ════════════════════════════════════════════════════════════════

-- ── 답글(한 단계) ───────────────────────────────────────────────────
-- 답글의 답글은 같은 부모로 붙인다(폰 화면에서 들여쓰기가 깊어지지 않게).
-- 부모가 지워지면 답글은 일반 댓글로 남는다(on delete set null).
alter table public.community_comments
  add column if not exists parent_id uuid references public.community_comments(id) on delete set null;
create index if not exists community_comments_parent_idx on public.community_comments (parent_id) where parent_id is not null;

create or replace function public.community_comment_parent_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  p record;
begin
  if new.parent_id is null then
    return new;
  end if;
  select id, post_id, parent_id into p from public.community_comments where id = new.parent_id;
  -- 🔴 다른 글의 댓글에 답글을 달 수 없다(알림을 엉뚱한 사람에게 보내는 통로가 된다).
  if p.id is null or p.post_id <> new.post_id then
    raise exception '답글을 달 댓글을 찾을 수 없어요.' using errcode = '23503';
  end if;
  new.parent_id := coalesce(p.parent_id, p.id);
  return new;
end;
$$;
drop trigger if exists community_comments_parent_guard on public.community_comments;
create trigger community_comments_parent_guard before insert on public.community_comments
  for each row execute function public.community_comment_parent_guard();

-- ── 답변 채택 · 질문 운동 태그 ──────────────────────────────────────
alter table public.community_posts
  add column if not exists accepted_comment_id uuid references public.community_comments(id) on delete set null;
alter table public.community_posts add column if not exists exercise_tag text;
alter table public.community_posts drop constraint if exists community_posts_accepted_check;
alter table public.community_posts add constraint community_posts_accepted_check
  check (post_type = 'question' or accepted_comment_id is null);
alter table public.community_posts drop constraint if exists community_posts_exercise_tag_check;
alter table public.community_posts add constraint community_posts_exercise_tag_check
  check (exercise_tag is null or (post_type = 'question' and char_length(btrim(exercise_tag)) between 1 and 40));

-- 글 지킴이 — 3단계 규칙 + 채택은 그 글의 댓글만, 채택하면 자동 해결됨.
create or replace function public.community_post_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if public.is_client_request() then
      new.author_name := public.community_author_name(new.user_id);
      new.hidden_at := null;
      new.resolved_at := null;
      new.accepted_comment_id := null;
      if new.workout_snapshot is not null then
        raise exception '운동 기록 카드는 서버에서만 붙일 수 있어요.' using errcode = '42501';
      end if;
    end if;
    return new;
  end if;
  -- UPDATE
  if new.hidden_at is distinct from old.hidden_at and pg_trigger_depth() <= 1 and public.is_client_request() then
    raise exception '글은 한마디만 고칠 수 있어요.' using errcode = '42501';
  end if;
  if new.accepted_comment_id is distinct from old.accepted_comment_id and new.accepted_comment_id is not null then
    -- 🔴 다른 글의 댓글·내 댓글은 채택할 수 없다.
    if not exists (select 1 from public.community_comments c
                   where c.id = new.accepted_comment_id and c.post_id = new.id and c.user_id <> new.user_id) then
      raise exception '이 질문의 다른 사람 답변만 채택할 수 있어요.' using errcode = '42501';
    end if;
    new.resolved_at := coalesce(new.resolved_at, now());
  end if;
  if not public.is_client_request() then
    return new;
  end if;
  if new.user_id is distinct from old.user_id
     or new.author_name is distinct from old.author_name
     or new.workout_snapshot is distinct from old.workout_snapshot
     or new.photo_url is distinct from old.photo_url
     or new.group_id is distinct from old.group_id
     or new.visibility is distinct from old.visibility
     or new.created_at is distinct from old.created_at
     or new.post_type is distinct from old.post_type then
    raise exception '글은 한마디만 고칠 수 있어요.' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- ── 알림: 답글 · 채택 ───────────────────────────────────────────────
alter table public.community_notifications drop constraint if exists community_notifications_kind_check;
alter table public.community_notifications add constraint community_notifications_kind_check
  check (kind in ('comment', 'teaching_comment', 'likes', 'reply', 'accepted'));

-- 댓글 알림 — 글쓴이에게 'comment', 답글이면 부모 댓글 쓴 사람에게 'reply'
-- (글쓴이가 부모 댓글 쓴 사람이면 'reply' 하나만). 자기 자신·차단 사이는 없음.
create or replace function public.community_comment_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  owner uuid;
  parent_author uuid;
  is_teaching boolean := tg_table_name = 'teaching_comments';
  blocked_pair boolean;
begin
  if is_teaching then
    select user_id into owner from public.teaching_posts where id = new.post_id;
  else
    select user_id into owner from public.community_posts where id = new.post_id;
    if new.parent_id is not null then
      select user_id into parent_author from public.community_comments where id = new.parent_id;
    end if;
  end if;

  if parent_author is not null and parent_author <> new.user_id then
    select exists (select 1 from public.user_blocks b
                   where (b.blocker_id = parent_author and b.blocked_id = new.user_id)
                      or (b.blocker_id = new.user_id and b.blocked_id = parent_author)) into blocked_pair;
    if not blocked_pair then
      insert into public.community_notifications
        (user_id, kind, actor_id, actor_name, post_id, source_id, preview)
      values (parent_author, 'reply', new.user_id, new.author_name, new.post_id, new.id, left(new.body, 80))
      on conflict do nothing;
    end if;
  end if;

  if owner is null or owner = new.user_id or owner = parent_author then
    return null;
  end if;
  if exists (select 1 from public.user_blocks b
             where (b.blocker_id = owner and b.blocked_id = new.user_id)
                or (b.blocker_id = new.user_id and b.blocked_id = owner)) then
    return null;
  end if;
  insert into public.community_notifications
    (user_id, kind, actor_id, actor_name, post_id, teaching_post_id, source_id, preview)
  values (owner, case when is_teaching then 'teaching_comment' else 'comment' end,
    new.user_id, new.author_name,
    case when is_teaching then null else new.post_id end,
    case when is_teaching then new.post_id else null end,
    new.id, left(new.body, 80))
  on conflict do nothing;
  return null;
end;
$$;

-- 댓글이 지워지면 그 댓글로 만든 알림(댓글·답글·채택)을 모두 지운다.
create or replace function public.community_comment_unnotify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_table_name = 'teaching_comments' then
    delete from public.community_notifications where source_id = old.id and kind = 'teaching_comment';
  else
    delete from public.community_notifications where source_id = old.id and kind in ('comment', 'reply', 'accepted');
  end if;
  return null;
end;
$$;

-- 채택되면 답변 쓴 사람에게 한 번.
create or replace function public.community_accept_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  c record;
begin
  if new.accepted_comment_id is null or new.accepted_comment_id is not distinct from old.accepted_comment_id then
    return null;
  end if;
  select id, user_id, body into c from public.community_comments where id = new.accepted_comment_id;
  if c.id is null or c.user_id = new.user_id then
    return null;
  end if;
  insert into public.community_notifications (user_id, kind, actor_id, actor_name, post_id, source_id, preview)
  values (c.user_id, 'accepted', new.user_id, new.author_name, new.id, c.id, left(coalesce(new.title, ''), 80))
  on conflict do nothing;
  return null;
end;
$$;
drop trigger if exists community_posts_accept_notify on public.community_posts;
create trigger community_posts_accept_notify after update of accepted_comment_id on public.community_posts
  for each row execute function public.community_accept_notify();

-- ── 질문 태그 칩 — 최근 90일 내가 볼 수 있는 질문에서 많이 쓴 태그 ──────
create or replace function public.community_question_tags(p_limit int default 8)
returns table(tag text, n bigint)
language sql stable security invoker set search_path = public as $$
  select btrim(p.exercise_tag), count(*)
  from public.community_posts p
  where auth.uid() is not null and p.post_type = 'question' and p.exercise_tag is not null
    and p.created_at > now() - interval '90 days'
  group by btrim(p.exercise_tag)
  order by count(*) desc, btrim(p.exercise_tag)
  limit least(greatest(p_limit, 1), 20);
$$;
revoke execute on function public.community_question_tags(int) from public, anon;
grant execute on function public.community_question_tags(int) to authenticated;

-- ── 작성자 프로필 — 그 사람 글 중 '내가 볼 수 있는' 것만(security invoker = 기존 RLS) ──
create or replace function public.community_author_posts(p_author uuid, p_limit int default 30)
returns table(id uuid, kind text, created_at timestamptz, score bigint)
language sql stable security invoker set search_path = public as $$
  select * from (
    select p.id, 'photo'::text, p.created_at, 0::bigint from public.community_posts p
      where auth.uid() is not null and p.user_id = p_author
    union all
    select t.id, 'teaching'::text, t.created_at, 0::bigint from public.teaching_posts t
      where auth.uid() is not null and t.user_id = p_author
  ) x
  order by 3 desc
  limit least(greatest(p_limit, 1), 60);
$$;
revoke execute on function public.community_author_posts(uuid, int) from public, anon;
grant execute on function public.community_author_posts(uuid, int) to authenticated;

-- 프로필 숫자 — 이번 달(서울) 볼 수 있는 글 수, 채택된 답변 수.
create or replace function public.community_author_stats(p_author uuid)
returns table(month_posts bigint, accepted_answers bigint)
language sql stable security invoker set search_path = public as $$
  select
    (select count(*) from public.community_posts p
      where p.user_id = p_author
        and (p.created_at at time zone 'Asia/Seoul') >= date_trunc('month', now() at time zone 'Asia/Seoul'))
    + (select count(*) from public.teaching_posts t
      where t.user_id = p_author
        and (t.created_at at time zone 'Asia/Seoul') >= date_trunc('month', now() at time zone 'Asia/Seoul')),
    (select count(*) from public.community_posts q
      join public.community_comments c on c.id = q.accepted_comment_id
      where c.user_id = p_author)
  where auth.uid() is not null;
$$;
revoke execute on function public.community_author_stats(uuid) from public, anon;
grant execute on function public.community_author_stats(uuid) to authenticated;

-- ── 피드 조회 — 질문 검색에 운동 태그, '답변 기다리는'은 답변 0개 먼저 ──────
-- ('답변 기다리는' 보기에서만 score = 답변 없음 1 / 있음 0. 커서가 score 를 같이 쓰므로 페이지가 섞이지 않는다.)
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
        when p_view = 'question_open' then
        (case when exists (select 1 from public.community_comments cm where cm.post_id = p.id and cm.user_id <> p.user_id) then 0 else 1 end)::bigint
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
      and (p_search = '' or strpos(lower(coalesce(p.title,'') || ' ' || coalesce(p.exercise_tag,'') || ' ' || coalesce(p.caption,'') || ' ' ||
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
