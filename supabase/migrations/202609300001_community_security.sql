-- 커뮤니티 보안 1단계(2026-09-30, docs/community-review-2026-09-30.html).
-- 앱을 거치지 않고 DB 에 직접 써도(REST) 막히도록, 확인을 데이터베이스로 옮긴다.

-- ── 정지·영구정지 회원은 쓰기 불가 ────────────────────────────────
-- 예전엔 화면 이동(미들웨어)에서만 막아, 직접 쓰면 정지 중에도 글·댓글을 쓸 수 있었다.
create or replace function public.is_active_member()
returns boolean language sql security definer stable set search_path = public as $$
  select not exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid()
      and (p.banned_at is not null or (p.suspended_until is not null and p.suspended_until > now()))
  );
$$;
revoke all on function public.is_active_member() from public, anon;
grant execute on function public.is_active_member() to authenticated;

-- ── 작성자 표시 이름은 프로필에서(닉네임 → 이름 → 회원) ──────────────
-- 앱의 resolveMemberName 과 같은 규칙. 클라이언트가 보낸 이름은 쓰지 않는다.
create or replace function public.community_author_name(uid uuid)
returns text language sql security definer stable set search_path = public as $$
  select coalesce(
    (select coalesce(nullif(btrim(p.nickname), ''), nullif(btrim(p.name), ''))
       from public.profiles p where p.user_id = uid),
    '회원'
  );
$$;
revoke all on function public.community_author_name(uuid) from public, anon, authenticated;

-- 앱 사용자 요청(REST·서버 액션이 사용자 권한으로 보낸 것)인가. 서비스 롤·DB 직접 접속
-- (마이그레이션·관리 작업·테스트 시드)은 믿는다 — 지킴이는 '사용자 권한 요청'에만 건다.
create or replace function public.is_client_request()
returns boolean language sql stable set search_path = public as $$
  select coalesce(auth.role(), '') in ('authenticated', 'anon');
$$;

-- ── 글 쓰기·수정 지킴이 ─────────────────────────────────────────
-- · 이름: 항상 프로필에서 채운다.
-- · 운동 기록 카드: 서버(서비스 롤)만 넣을 수 있다 — 서버가 완료 기록으로 만든 카드만 믿는다.
-- · 수정: 내용(한마디)만 바꿀 수 있다. 작성자·이름·카드·사진·공개 범위·그룹은 못 바꾼다
--   (그룹 이동으로 가입하지 않은 그룹에 글을 넣던 구멍).
create or replace function public.community_post_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if public.is_client_request() then
      new.author_name := public.community_author_name(new.user_id);
      if new.workout_snapshot is not null then
        raise exception '운동 기록 카드는 서버에서만 붙일 수 있어요.' using errcode = '42501';
      end if;
    end if;
    return new;
  end if;
  -- UPDATE
  if not public.is_client_request() then
    return new;
  end if;
  if new.user_id is distinct from old.user_id
     or new.author_name is distinct from old.author_name
     or new.workout_snapshot is distinct from old.workout_snapshot
     or new.photo_url is distinct from old.photo_url
     or new.group_id is distinct from old.group_id
     or new.visibility is distinct from old.visibility
     or new.created_at is distinct from old.created_at then
    raise exception '글은 한마디만 고칠 수 있어요.' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists community_post_guard on public.community_posts;
create trigger community_post_guard before insert or update on public.community_posts
  for each row execute function public.community_post_guard();

-- 운동 영상 글 — 이름은 프로필에서, 수정은 한마디만.
create or replace function public.teaching_post_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if public.is_client_request() then
      new.author_name := public.community_author_name(new.user_id);
    end if;
    return new;
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
drop trigger if exists teaching_post_guard on public.teaching_posts;
create trigger teaching_post_guard before insert or update on public.teaching_posts
  for each row execute function public.teaching_post_guard();

-- 댓글 — 이름은 프로필에서(피드·운동 영상 공통).
create or replace function public.comment_author_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_client_request() then
    new.author_name := public.community_author_name(new.user_id);
  end if;
  return new;
end;
$$;
drop trigger if exists community_comment_author_guard on public.community_comments;
create trigger community_comment_author_guard before insert on public.community_comments
  for each row execute function public.comment_author_guard();
drop trigger if exists teaching_comment_author_guard on public.teaching_comments;
create trigger teaching_comment_author_guard before insert on public.teaching_comments
  for each row execute function public.comment_author_guard();

-- ── 쓰기 정책에 '정지 아님' 추가 ────────────────────────────────
drop policy if exists "insert own community post" on public.community_posts;
create policy "insert own community post" on public.community_posts for insert
  with check (
    user_id = auth.uid()
    and public.is_active_member()
    and (visibility = 'public' or (group_id is not null and public.is_group_member(group_id)))
  );
drop policy if exists "like visible post" on public.community_likes;
create policy "like visible post" on public.community_likes for insert
  with check (user_id = auth.uid() and public.is_active_member() and public.can_see_community_post(post_id));
drop policy if exists "comment on visible post" on public.community_comments;
create policy "comment on visible post" on public.community_comments for insert
  with check (user_id = auth.uid() and public.is_active_member() and public.can_see_community_post(post_id));
drop policy if exists "insert own teaching post" on public.teaching_posts;
create policy "insert own teaching post" on public.teaching_posts for insert
  with check (
    user_id = auth.uid()
    and public.is_active_member()
    and (visibility = 'public' or (group_id is not null and public.is_group_member(group_id)))
  );

-- ── 운동 영상 좋아요·댓글에 공개 범위 적용 ─────────────────────────
-- 예전엔 using(true) 라 그룹 전용 영상의 댓글도 그룹 밖에서 읽고 쓸 수 있었다.
create or replace function public.can_see_teaching_post(pid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.teaching_posts p
    where p.id = pid
      and (
        p.user_id = auth.uid()
        or public.is_post_moderator()
        or p.visibility = 'public'
        or (p.visibility = 'group' and p.group_id is not null and public.is_group_member(p.group_id))
        or (p.visibility = 'public_except_group' and (p.group_id is null or not public.is_group_member(p.group_id)))
      )
  );
$$;
revoke all on function public.can_see_teaching_post(uuid) from public, anon;
grant execute on function public.can_see_teaching_post(uuid) to authenticated;

drop policy if exists "read teaching likes" on public.teaching_likes;
create policy "read teaching likes" on public.teaching_likes for select
  using (public.can_see_teaching_post(post_id));
drop policy if exists "like teaching" on public.teaching_likes;
create policy "like teaching" on public.teaching_likes for insert
  with check (user_id = auth.uid() and public.is_active_member() and public.can_see_teaching_post(post_id));
drop policy if exists "read teaching comments" on public.teaching_comments;
create policy "read teaching comments" on public.teaching_comments for select
  using (public.can_see_teaching_post(post_id));
drop policy if exists "comment teaching" on public.teaching_comments;
create policy "comment teaching" on public.teaching_comments for insert
  with check (user_id = auth.uid() and public.is_active_member() and public.can_see_teaching_post(post_id));

-- ── 신고: 루틴 신고 허용 + 같은 대상 중복 신고 막기 ─────────────────
-- 루틴 신고는 허용 종류에 없어 DB 가 거절하고 있었다(앱은 신고됐다고 보이는데 관리자에게 안 옴).
alter table public.post_reports drop constraint if exists post_reports_target_kind_check;
alter table public.post_reports add constraint post_reports_target_kind_check
  check (target_kind in ('community_post','community_comment','teaching_post','teaching_comment','routine_share'));
create unique index if not exists post_reports_reporter_target_uniq
  on public.post_reports (reporter_id, target_kind, target_id);
