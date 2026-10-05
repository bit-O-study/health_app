-- ════════════════════════════════════════════════════════════════
-- 커뮤니티 3단계(2026-09-30) — 다시 오게: 알림 · 차단 · 신고 누적 숨김 · 저장 · 질문 글.
-- (운동 영상 공유 링크는 화면만 — DB 변경 없음.)
--
-- 정한 기준(사용자 "추천대로"):
--   · 신고 누적 숨김 — 서로 다른 3명이 신고(미처리)하면 관리자가 볼 때까지 숨김. 작성자·관리자에게는 보인다.
--   · 알림 — 댓글은 매번(앱 안 알림 + 푸시), 좋아요는 하루 한 번 묶어서.
-- ════════════════════════════════════════════════════════════════

-- ── 차단 ────────────────────────────────────────────────────────────
-- 🔴 서로 안 보인다(내가 막은 사람 글도, 나를 막은 사람에게 내 글도). 한쪽만 막으면
--    막힌 사람이 계속 댓글을 달 수 있어 차단의 의미가 없다.
create table if not exists public.user_blocks (
  blocker_id uuid not null references auth.users(id) on delete cascade,
  blocked_id uuid not null references auth.users(id) on delete cascade,
  -- 차단 목록에 보일 이름(막은 순간의 닉네임). 남의 프로필은 읽을 수 없어 따로 남긴다.
  blocked_name text,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index if not exists user_blocks_blocked_idx on public.user_blocks (blocked_id);
alter table public.user_blocks enable row level security;
drop policy if exists "own blocks read" on public.user_blocks;
create policy "own blocks read" on public.user_blocks for select
  using (blocker_id = (select auth.uid()));
drop policy if exists "own blocks insert" on public.user_blocks;
create policy "own blocks insert" on public.user_blocks for insert
  with check (blocker_id = (select auth.uid()));
drop policy if exists "own blocks delete" on public.user_blocks;
create policy "own blocks delete" on public.user_blocks for delete
  using (blocker_id = (select auth.uid()));

create or replace function public.user_block_name()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.blocked_name := public.community_author_name(new.blocked_id);
  return new;
end;
$$;
drop trigger if exists user_blocks_name on public.user_blocks;
create trigger user_blocks_name before insert on public.user_blocks
  for each row execute function public.user_block_name();

-- 나와 이 사람 사이에 차단이 있나(어느 쪽이든). 정책에서 부르므로 익명도 실행 가능해야 한다.
create or replace function public.blocked_between(other uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select other is not null and auth.uid() is not null and other <> auth.uid() and exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = auth.uid() and b.blocked_id = other)
       or (b.blocker_id = other and b.blocked_id = auth.uid())
  );
$$;
grant execute on function public.blocked_between(uuid) to anon, authenticated;

-- ── 신고 누적 숨김 ─────────────────────────────────────────────────
alter table public.community_posts add column if not exists hidden_at timestamptz;
alter table public.teaching_posts add column if not exists hidden_at timestamptz;

-- ── 질문 글 ─────────────────────────────────────────────────────────
-- 사진 없이 제목 + 본문(1000자). 작성자가 '해결됨' 표시.
alter table public.community_posts add column if not exists post_type text not null default 'photo';
alter table public.community_posts add column if not exists title text;
alter table public.community_posts add column if not exists resolved_at timestamptz;
alter table public.community_posts drop constraint if exists community_posts_post_type_check;
alter table public.community_posts add constraint community_posts_post_type_check
  check (post_type in ('photo', 'question'));
alter table public.community_posts drop constraint if exists community_posts_title_check;
alter table public.community_posts add constraint community_posts_title_check
  check (case when post_type = 'question' then char_length(btrim(coalesce(title, ''))) between 1 and 60 else title is null end);
alter table public.community_posts drop constraint if exists community_posts_resolved_check;
alter table public.community_posts add constraint community_posts_resolved_check
  check (post_type = 'question' or resolved_at is null);
alter table public.community_posts drop constraint if exists community_posts_caption_check;
alter table public.community_posts add constraint community_posts_caption_check
  check (caption is null or char_length(caption) <= case when post_type = 'question' then 1000 else 200 end);
alter table public.community_posts drop constraint if exists community_posts_content_check;
alter table public.community_posts add constraint community_posts_content_check
  check (post_type = 'question' or (nullif(btrim(photo_url), '') is not null)
    or coalesce((jsonb_typeof(workout_snapshot) = 'object') and (workout_snapshot ? 'exercises'), false));

-- 글 지킴이 — 1단계 규칙 + 숨김·종류는 사용자가 못 바꾼다(제목·해결됨·한마디만).
-- 🔴 숨김(hidden_at)은 신고 트리거(안쪽 트리거 깊이 2 이상)만 바꾼다. 작성자가 스스로 풀면 안 된다.
create or replace function public.community_post_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if public.is_client_request() then
      new.author_name := public.community_author_name(new.user_id);
      new.hidden_at := null;
      new.resolved_at := null;
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

create or replace function public.teaching_post_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if public.is_client_request() then
      new.author_name := public.community_author_name(new.user_id);
      new.hidden_at := null;
    end if;
    return new;
  end if;
  if new.hidden_at is distinct from old.hidden_at and pg_trigger_depth() <= 1 and public.is_client_request() then
    raise exception '글은 한마디만 고칠 수 있어요.' using errcode = '42501';
  end if;
  if not public.is_client_request() then
    return new;
  end if;
  if new.user_id is distinct from old.user_id
     or new.author_name is distinct from old.author_name
     or new.video_url is distinct from old.video_url
     or new.group_id is distinct from old.group_id
     or new.visibility is distinct from old.visibility
     or new.created_at is distinct from old.created_at then
    raise exception '글은 한마디만 고칠 수 있어요.' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- 서로 다른 사람의 '미처리' 신고가 3건 이상이면 숨김, 아래로 내려가면(관리자가 처리완료) 다시 보임.
create or replace function public.report_reevaluate_hidden()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  r record;
  n int;
begin
  r := coalesce(new, old);
  if r.target_kind not in ('community_post', 'teaching_post') then
    return null;
  end if;
  select count(distinct reporter_id) into n from public.post_reports
    where target_kind = r.target_kind and target_id = r.target_id and status = 'open';
  if r.target_kind = 'community_post' then
    update public.community_posts
      set hidden_at = case when n >= 3 then coalesce(hidden_at, now()) else null end
      where id = r.target_id and (hidden_at is null) = (n >= 3);
  else
    update public.teaching_posts
      set hidden_at = case when n >= 3 then coalesce(hidden_at, now()) else null end
      where id = r.target_id and (hidden_at is null) = (n >= 3);
  end if;
  return null;
end;
$$;
drop trigger if exists post_reports_auto_hide on public.post_reports;
create trigger post_reports_auto_hide after insert or delete or update of status on public.post_reports
  for each row execute function public.report_reevaluate_hidden();

-- ── 보이는 글 = 숨김·차단 반영(피드·검색·상세·직접 링크·댓글·좋아요 전부 이 규칙) ──
create or replace function public.can_see_community_post(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.community_posts p
    where p.id = pid
      and (
        p.user_id = auth.uid()
        or public.is_post_moderator()
        or (p.hidden_at is null and not public.blocked_between(p.user_id) and (
          p.visibility = 'public'
          or (p.visibility = 'group' and public.is_group_member(p.group_id))
          or (p.visibility = 'public_except_group' and (p.group_id is null or not public.is_group_member(p.group_id)))
        ))
      )
  );
$$;

create or replace function public.can_see_teaching_post(pid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.teaching_posts p
    where p.id = pid
      and (
        p.user_id = auth.uid()
        or public.is_post_moderator()
        or (p.hidden_at is null and not public.blocked_between(p.user_id) and (
          p.visibility = 'public'
          or (p.visibility = 'group' and p.group_id is not null and public.is_group_member(p.group_id))
          or (p.visibility = 'public_except_group' and (p.group_id is null or not public.is_group_member(p.group_id)))
        ))
      )
  );
$$;

drop policy if exists "read visible community posts" on public.community_posts;
create policy "read visible community posts" on public.community_posts for select
  using (
    user_id = auth.uid() or public.is_post_moderator()
    or (hidden_at is null and not public.blocked_between(user_id) and (
      visibility = 'public'
      or (visibility = 'group' and group_id is not null and public.is_group_member(group_id))
      or (visibility = 'public_except_group' and (group_id is null or not public.is_group_member(group_id)))
    ))
  );

drop policy if exists "read teaching posts" on public.teaching_posts;
create policy "read teaching posts" on public.teaching_posts for select
  using (
    user_id = auth.uid() or public.is_post_moderator()
    or (hidden_at is null and not public.blocked_between(user_id) and (
      visibility = 'public'
      or (visibility = 'group' and group_id is not null and public.is_group_member(group_id))
      or (visibility = 'public_except_group' and (group_id is null or not public.is_group_member(group_id)))
    ))
  );

-- 차단한(차단된) 사람의 댓글은 안 보인다(내 글에 달린 것도).
drop policy if exists "read comments on visible posts" on public.community_comments;
create policy "read comments on visible posts" on public.community_comments for select
  using (public.can_see_community_post(post_id)
    and (user_id = auth.uid() or public.is_post_moderator() or not public.blocked_between(user_id)));
drop policy if exists "read teaching comments" on public.teaching_comments;
create policy "read teaching comments" on public.teaching_comments for select
  using (public.can_see_teaching_post(post_id)
    and (user_id = auth.uid() or public.is_post_moderator() or not public.blocked_between(user_id)));

-- ── 저장(북마크) — 피드 글만(설계 문서: 영상·루틴 저장은 별도 설계) ─────────
create table if not exists public.community_saves (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  post_id uuid not null references public.community_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index if not exists community_saves_post_idx on public.community_saves (post_id);
alter table public.community_saves enable row level security;
-- 🔴 남의 저장 목록은 못 본다.
drop policy if exists "own saves read" on public.community_saves;
create policy "own saves read" on public.community_saves for select
  using (user_id = (select auth.uid()));
drop policy if exists "own saves insert" on public.community_saves;
create policy "own saves insert" on public.community_saves for insert
  with check (user_id = (select auth.uid()) and public.can_see_community_post(post_id));
drop policy if exists "own saves delete" on public.community_saves;
create policy "own saves delete" on public.community_saves for delete
  using (user_id = (select auth.uid()));

-- ── 앱 안 알림(댓글 매번 · 좋아요 하루 묶음) ────────────────────────
create table if not exists public.community_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('comment', 'teaching_comment', 'likes')),
  actor_id uuid references auth.users(id) on delete cascade,
  actor_name text,
  post_id uuid references public.community_posts(id) on delete cascade,
  teaching_post_id uuid references public.teaching_posts(id) on delete cascade,
  -- 댓글 id(같은 댓글로 두 번 안 만든다 · 댓글이 지워지면 알림도 지운다).
  source_id uuid,
  preview text,
  like_count int,
  digest_day date,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create unique index if not exists community_notifications_source_uniq
  on public.community_notifications (kind, source_id) where source_id is not null;
create unique index if not exists community_notifications_digest_uniq
  on public.community_notifications (user_id, digest_day) where kind = 'likes';
create index if not exists community_notifications_user_idx
  on public.community_notifications (user_id, created_at desc);
alter table public.community_notifications enable row level security;
-- 본인 것만 읽고 지운다. 쓰기는 트리거·서버만(읽음 표시는 아래 함수).
drop policy if exists "own community notifications read" on public.community_notifications;
create policy "own community notifications read" on public.community_notifications for select
  using (user_id = (select auth.uid()));
drop policy if exists "own community notifications delete" on public.community_notifications;
create policy "own community notifications delete" on public.community_notifications for delete
  using (user_id = (select auth.uid()));

-- 댓글이 달리면 글쓴이에게(자기 댓글·차단 사이는 제외).
create or replace function public.community_comment_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  owner uuid;
  is_teaching boolean := tg_table_name = 'teaching_comments';
begin
  if is_teaching then
    select user_id into owner from public.teaching_posts where id = new.post_id;
  else
    select user_id into owner from public.community_posts where id = new.post_id;
  end if;
  if owner is null or owner = new.user_id then
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
drop trigger if exists community_comments_notify on public.community_comments;
create trigger community_comments_notify after insert on public.community_comments
  for each row execute function public.community_comment_notify();
drop trigger if exists teaching_comments_notify on public.teaching_comments;
create trigger teaching_comments_notify after insert on public.teaching_comments
  for each row execute function public.community_comment_notify();

create or replace function public.community_comment_unnotify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.community_notifications
    where source_id = old.id
      and kind = case when tg_table_name = 'teaching_comments' then 'teaching_comment' else 'comment' end;
  return null;
end;
$$;
drop trigger if exists community_comments_unnotify on public.community_comments;
create trigger community_comments_unnotify after delete on public.community_comments
  for each row execute function public.community_comment_unnotify();
drop trigger if exists teaching_comments_unnotify on public.teaching_comments;
create trigger teaching_comments_unnotify after delete on public.teaching_comments
  for each row execute function public.community_comment_unnotify();

create or replace function public.mark_community_notifications_read(ids uuid[] default null)
returns void language sql security definer set search_path = public as $$
  update public.community_notifications set read_at = now()
  where user_id = auth.uid() and read_at is null and (ids is null or id = any(ids));
$$;
revoke execute on function public.mark_community_notifications_read(uuid[]) from public, anon;
grant execute on function public.mark_community_notifications_read(uuid[]) to authenticated;

-- 좋아요 하루 묶음 — 하루 한 번 도는 크론(서비스 롤)만. 최근 24시간 좋아요를 글쓴이별로 묶어
-- '오늘(서울)' 알림 한 건씩. 같은 날 다시 돌아도 새로 만든 것만 돌려준다(푸시 중복 없음).
create or replace function public.community_like_digest(p_until timestamptz default now())
returns table(user_id uuid, like_count int, post_id uuid, teaching_post_id uuid)
language sql volatile security definer set search_path = public as $$
  with likes as (
    select p.user_id owner, l.user_id liker, l.post_id pid, null::uuid tid
      from public.community_likes l join public.community_posts p on p.id = l.post_id
      where l.created_at > p_until - interval '24 hours' and l.created_at <= p_until
    union all
    select p.user_id, l.user_id, null::uuid, l.post_id
      from public.teaching_likes l join public.teaching_posts p on p.id = l.post_id
      where l.created_at > p_until - interval '24 hours' and l.created_at <= p_until
  ), counted as (
    select owner, pid, tid, count(*) n from likes
    where owner <> liker and not exists (
      select 1 from public.user_blocks b
      where (b.blocker_id = owner and b.blocked_id = liker) or (b.blocker_id = liker and b.blocked_id = owner))
    group by owner, pid, tid
  ), ranked as (
    select owner, pid, tid, sum(n) over (partition by owner) total,
      row_number() over (partition by owner order by n desc, pid, tid) rn
    from counted
  ), ins as (
    insert into public.community_notifications (user_id, kind, post_id, teaching_post_id, like_count, digest_day)
    select owner, 'likes', pid, tid, total::int, (p_until at time zone 'Asia/Seoul')::date
      from ranked where rn = 1
    on conflict do nothing
    returning community_notifications.user_id, community_notifications.like_count,
      community_notifications.post_id, community_notifications.teaching_post_id
  )
  select * from ins;
$$;
revoke execute on function public.community_like_digest(timestamptz) from public, anon, authenticated;
grant execute on function public.community_like_digest(timestamptz) to service_role;

-- 알림 설정 — 커뮤니티 반응(댓글·좋아요 묶음) 푸시. 앱 안 알림 목록은 설정과 무관하게 쌓인다.
alter table public.notification_preferences
  add column if not exists community_activity boolean not null default true;

-- ── 피드 조회 — 질문·답변 기다리는 질문·저장한 글 보기 추가, 검색에 질문 제목 ──
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
    where auth.uid() is not null and p_view in ('workout','mine','popular','question','question_open','saved')
      and (p_view <> 'mine' or p.user_id = auth.uid())
      and (p_view not in ('workout','popular') or p.post_type = 'photo')
      and (p_view not in ('question','question_open') or p.post_type = 'question')
      and (p_view <> 'question_open' or p.resolved_at is null)
      and (p_view <> 'saved' or exists (select 1 from public.community_saves s where s.post_id = p.id and s.user_id = auth.uid()))
      and p.created_at <= p_as_of
      and (p_view <> 'popular' or p.created_at >= p_as_of - interval '7 days')
      and (p_search = '' or strpos(lower(coalesce(p.title,'') || ' ' || coalesce(p.caption,'') || ' ' ||
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
