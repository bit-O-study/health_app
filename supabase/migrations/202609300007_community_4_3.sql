-- ════════════════════════════════════════════════════════════════
-- 커뮤니티 4-3(2026-09-30) — 운영·넓히기: 금칙어 · 영상·루틴 저장 · 댓글 공감.
-- 정한 기준(사용자 "추천대로"): 금칙어에 걸리면 올리기를 막고 이유를 안내한다.
-- ════════════════════════════════════════════════════════════════

-- ── 금칙어 ──────────────────────────────────────────────────────────
-- 앱(서버)이 올리기 전에 같은 목록으로 먼저 걸러 이유를 알려 주고(src/features/community/banned-words.ts),
-- 🔴 앱을 거치지 않은 직접 쓰기도 여기 트리거가 막는다. 목록은 이 표 하나 — 관리자가 늘린다.
-- category 'allow' 는 예외 단어(운동 글에 흔한데 금칙어를 품은 말). 비교 전에 먼저 지운다.
create table if not exists public.community_banned_words (
  word text primary key check (char_length(word) between 1 and 40 and word = lower(word)),
  category text not null check (category in ('abuse', 'sexual', 'contact', 'gambling', 'allow')),
  created_at timestamptz not null default now()
);
alter table public.community_banned_words enable row level security;
-- 서버가 사용자 권한으로 읽어 미리 걸러야 하므로 로그인 사용자는 읽기 가능. 쓰기는 관리자만.
drop policy if exists "read banned words" on public.community_banned_words;
create policy "read banned words" on public.community_banned_words for select to authenticated using (true);
drop policy if exists "admin writes banned words" on public.community_banned_words;
create policy "admin writes banned words" on public.community_banned_words for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

insert into public.community_banned_words (word, category) values
  ('시발', 'abuse'), ('씨발', 'abuse'), ('씨바', 'abuse'), ('시바', 'abuse'), ('ㅅㅂ', 'abuse'), ('ㅆㅂ', 'abuse'),
  ('병신', 'abuse'), ('ㅂㅅ', 'abuse'), ('좆', 'abuse'), ('개새끼', 'abuse'), ('개새', 'abuse'),
  ('미친놈', 'abuse'), ('미친년', 'abuse'), ('지랄', 'abuse'), ('ㅈㄹ', 'abuse'), ('느금마', 'abuse'),
  ('니애미', 'abuse'), ('엠창', 'abuse'),
  ('섹스', 'sexual'), ('야동', 'sexual'), ('조건만남', 'sexual'), ('성매매', 'sexual'),
  ('openkakao', 'contact'), ('오픈채팅', 'contact'), ('오픈카톡', 'contact'), ('오픈톡', 'contact'),
  ('텔레그램', 'contact'), ('telegram', 'contact'), ('카톡아이디', 'contact'), ('라인아이디', 'contact'),
  ('토토사이트', 'gambling'), ('카지노', 'gambling'), ('바카라', 'gambling'), ('먹튀', 'gambling'), ('슬롯사이트', 'gambling'),
  ('시발점', 'allow'), ('시바견', 'allow')
on conflict (word) do nothing;

-- 앱의 normalizeForFilter 와 같은 규칙: 소문자, 한글·자모·영문·숫자만 남긴다(띄어쓰기·기호 끼워 넣기 무시).
create or replace function public.community_normalize_text(t text)
returns text language sql immutable set search_path = public as $$
  select regexp_replace(lower(coalesce(t, '')), '[^가-힣ㄱ-ㅎa-z0-9]', '', 'g');
$$;

create or replace function public.community_find_banned(t text)
returns text language plpgsql stable security definer set search_path = public as $$
declare
  norm text := public.community_normalize_text(t);
  w record;
begin
  if norm = '' then
    return null;
  end if;
  for w in select word from public.community_banned_words where category = 'allow' loop
    norm := replace(norm, w.word, '');
  end loop;
  for w in select word, category from public.community_banned_words where category <> 'allow' loop
    if strpos(norm, w.word) > 0 then
      return w.category;
    end if;
  end loop;
  return null;
end;
$$;

-- 글·댓글·영상·루틴 소개의 글자 칸을 검사한다. 인자 = 검사할 칸 이름들.
create or replace function public.community_text_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  col text;
  cat text;
begin
  foreach col in array tg_argv loop
    cat := public.community_find_banned(to_jsonb(new) ->> col);
    if cat is not null then
      raise exception '%', case cat
        when 'contact' then '연락처나 채팅방 링크는 올릴 수 없어요.'
        when 'sexual' then '성적인 표현은 올릴 수 없어요.'
        when 'gambling' then '도박·광고 문구는 올릴 수 없어요.'
        else '욕설이나 비하 표현은 올릴 수 없어요.' end
        using errcode = 'P0001';
    end if;
  end loop;
  return new;
end;
$$;
drop trigger if exists community_posts_text_guard on public.community_posts;
create trigger community_posts_text_guard before insert or update of caption, title, exercise_tag on public.community_posts
  for each row execute function public.community_text_guard('caption', 'title', 'exercise_tag');
drop trigger if exists community_comments_text_guard on public.community_comments;
create trigger community_comments_text_guard before insert on public.community_comments
  for each row execute function public.community_text_guard('body');
drop trigger if exists teaching_posts_text_guard on public.teaching_posts;
create trigger teaching_posts_text_guard before insert or update of caption, exercise_tag on public.teaching_posts
  for each row execute function public.community_text_guard('caption', 'exercise_tag');
drop trigger if exists teaching_comments_text_guard on public.teaching_comments;
create trigger teaching_comments_text_guard before insert on public.teaching_comments
  for each row execute function public.community_text_guard('body');
drop trigger if exists routine_shares_text_guard on public.routine_shares;
create trigger routine_shares_text_guard before insert or update of title, caption on public.routine_shares
  for each row execute function public.community_text_guard('title', 'caption');

-- ── 루틴 소개도 차단 반영(3단계에서 빠졌던 곳) ─────────────────────────
drop policy if exists "read routine shares" on public.routine_shares;
create policy "read routine shares" on public.routine_shares for select
  using (
    user_id = auth.uid() or public.is_post_moderator()
    or (not public.blocked_between(user_id) and (
      visibility = 'public'
      or (visibility = 'group' and group_id is not null and public.is_group_member(group_id))
      or (visibility = 'public_except_group' and (group_id is null or not public.is_group_member(group_id)))
    ))
  );

-- ── 영상·루틴 저장 ─────────────────────────────────────────────────
create table if not exists public.teaching_saves (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  post_id uuid not null references public.teaching_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);
create index if not exists teaching_saves_post_idx on public.teaching_saves (post_id);
alter table public.teaching_saves enable row level security;
drop policy if exists "own teaching saves read" on public.teaching_saves;
create policy "own teaching saves read" on public.teaching_saves for select using (user_id = (select auth.uid()));
drop policy if exists "own teaching saves insert" on public.teaching_saves;
create policy "own teaching saves insert" on public.teaching_saves for insert
  with check (user_id = (select auth.uid()) and public.can_see_teaching_post(post_id));
drop policy if exists "own teaching saves delete" on public.teaching_saves;
create policy "own teaching saves delete" on public.teaching_saves for delete using (user_id = (select auth.uid()));

create table if not exists public.routine_share_saves (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  share_id uuid not null references public.routine_shares(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, share_id)
);
create index if not exists routine_share_saves_share_idx on public.routine_share_saves (share_id);
alter table public.routine_share_saves enable row level security;
drop policy if exists "own routine saves read" on public.routine_share_saves;
create policy "own routine saves read" on public.routine_share_saves for select using (user_id = (select auth.uid()));
drop policy if exists "own routine saves insert" on public.routine_share_saves;
-- 볼 수 있는 루틴만(하위 조회는 사용자의 RLS 로 거른다).
create policy "own routine saves insert" on public.routine_share_saves for insert
  with check (user_id = (select auth.uid()) and exists (select 1 from public.routine_shares r where r.id = share_id));
drop policy if exists "own routine saves delete" on public.routine_share_saves;
create policy "own routine saves delete" on public.routine_share_saves for delete using (user_id = (select auth.uid()));

-- ── 댓글 공감 ──────────────────────────────────────────────────────
create table if not exists public.comment_likes (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  comment_id uuid not null references public.community_comments(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, comment_id)
);
create index if not exists comment_likes_comment_idx on public.comment_likes (comment_id);
alter table public.comment_likes enable row level security;
drop policy if exists "own comment likes read" on public.comment_likes;
create policy "own comment likes read" on public.comment_likes for select using (user_id = (select auth.uid()));
drop policy if exists "like visible comment" on public.comment_likes;
-- 볼 수 있는 댓글만(댓글 RLS 가 글 공개 범위·숨김·차단을 이미 본다), 정지 중이면 못 함.
create policy "like visible comment" on public.comment_likes for insert
  with check (user_id = (select auth.uid()) and public.is_active_member()
    and exists (select 1 from public.community_comments c where c.id = comment_id));
drop policy if exists "unlike own comment" on public.comment_likes;
create policy "unlike own comment" on public.comment_likes for delete using (user_id = (select auth.uid()));

-- 공감 수 + 내가 눌렀나(누가 눌렀는지는 안 보인다).
create or replace function public.comment_like_counts(cids uuid[])
returns table(comment_id uuid, like_count int, liked_by_me boolean)
language sql stable security definer set search_path = public as $$
  select x.cid, coalesce(n.n, 0)::int, coalesce(me.mine, false)
  from unnest(cids) as x(cid)
  left join (select l.comment_id, count(*) n from public.comment_likes l where l.comment_id = any(cids) group by l.comment_id) n on n.comment_id = x.cid
  left join (select l.comment_id, true mine from public.comment_likes l where l.comment_id = any(cids) and l.user_id = auth.uid()) me on me.comment_id = x.cid;
$$;
revoke execute on function public.comment_like_counts(uuid[]) from public, anon;
grant execute on function public.comment_like_counts(uuid[]) to authenticated;

-- ── 피드 조회 — '저장한 글'에 운동 영상도 ─────────────────────────────
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
    where auth.uid() is not null and p_view in ('teaching','mine','commented','saved')
      and (p_view <> 'mine' or p.user_id = auth.uid())
      and (p_view <> 'commented' or (p.user_id <> auth.uid()
        and exists (select 1 from public.teaching_comments cm where cm.post_id = p.id and cm.user_id = auth.uid())))
      and (p_view <> 'saved' or exists (select 1 from public.teaching_saves s where s.post_id = p.id and s.user_id = auth.uid()))
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
