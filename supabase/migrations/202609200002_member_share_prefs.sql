
-- ─────────────────────────────────────────────────────────────────────────────
-- 회원의 정보 제공 동의(member_share_prefs) — 2026-09-20.
-- 트레이너(그룹장)에게 **무엇을 보여줄지 회원이 정한다.** 항목별 on/off + 처방 허용.
--
-- 🔴 **왜 그룹별인가.** 한 사람이 헬스장 그룹과 친구 그룹에 동시에 있을 수 있다.
--    "식단은 헬스장 트레이너에게만" 같은 선택이 되어야 하므로 (user_id, group_id) 단위다.
--
-- 🔴 **기본값은 전부 true(= 지금까지의 동작).** 행이 없으면 켜진 것으로 본다.
--    기존 회원 수만큼 행을 미리 만들지 않아도 되고, 끄는 사람만 행이 생긴다.
--
-- 🔴 **이건 트레이너 전용 화면에만 적용한다.** 그룹 랭킹(운동 kcal·일수)은 그룹원
--    전체가 서로 보는 기능이라 여기서 끄지 않는다 — 끄고 싶으면 그룹을 나가면 된다
--    (그게 아래 '트레이너 제거' 다). 랭킹까지 이 스위치로 막으면 남들 화면에서 이 사람만
--    사라져 "버그" 로 읽힌다.
create table if not exists public.member_share_prefs (
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  -- 운동 기록(완료 종목·세트·시간). 끄면 트레이너 화면에서 '비공개' 로 보인다.
  share_workout boolean not null default true,
  -- 식단 기록(먹은 것·사진).
  share_diet boolean not null default true,
  -- 체중·체성분.
  share_body boolean not null default true,
  -- 트레이너가 내 루틴(운동 처방)을 바꿀 수 있는가.
  allow_prescription boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, group_id)
);

create index if not exists member_share_prefs_group_idx
  on public.member_share_prefs (group_id, user_id);

drop trigger if exists member_share_prefs_set_updated_at on public.member_share_prefs;
create trigger member_share_prefs_set_updated_at
  before update on public.member_share_prefs
  for each row execute function public.set_updated_at();

alter table public.member_share_prefs enable row level security;

-- 본인은 읽고 쓴다.
drop policy if exists "member reads own share prefs" on public.member_share_prefs;
create policy "member reads own share prefs" on public.member_share_prefs for select
  using (user_id = (select auth.uid()));
drop policy if exists "member writes own share prefs" on public.member_share_prefs;
create policy "member writes own share prefs" on public.member_share_prefs for insert
  with check (user_id = (select auth.uid()));
drop policy if exists "member updates own share prefs" on public.member_share_prefs;
create policy "member updates own share prefs" on public.member_share_prefs for update
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "member deletes own share prefs" on public.member_share_prefs;
create policy "member deletes own share prefs" on public.member_share_prefs for delete
  using (user_id = (select auth.uid()));

-- 그룹장(트레이너)은 **읽기만** — 화면에 '회원이 식단을 비공개로 했어요' 를 띄우려면
-- 필요하다. 쓰기는 못 한다(트레이너가 남의 동의를 대신 켜면 동의가 아니다).
drop policy if exists "trainer reads member share prefs" on public.member_share_prefs;
create policy "trainer reads member share prefs" on public.member_share_prefs for select
  using (exists (
    select 1 from public.groups g
     where g.id = member_share_prefs.group_id
       and g.owner_id = (select auth.uid())));

/**
 * 이 회원이 이 그룹의 트레이너에게 해당 항목을 제공하는가. **행이 없으면 true.**
 *
 * 트레이너 화면·처방 함수는 남의 표를 대신 읽는 SECURITY DEFINER 라 RLS 가 안 걸린다 —
 * 그래서 동의 확인은 **부르는 쪽이 이 함수로 직접** 해야 한다. 한 곳에 모아 두면
 * 새 트레이너 기능이 늘어도 같은 판정을 쓴다.
 */
create or replace function public.member_shares(
  p_member uuid, p_group uuid, p_kind text)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((
    select case p_kind
             when 'workout' then s.share_workout
             when 'diet' then s.share_diet
             when 'body' then s.share_body
             when 'prescription' then s.allow_prescription
           end
      from public.member_share_prefs s
     where s.user_id = p_member and s.group_id = p_group
  ), true);
$$;
revoke all on function public.member_shares(uuid, uuid, text) from public;
revoke all on function public.member_shares(uuid, uuid, text) from anon;
grant execute on function public.member_shares(uuid, uuid, text) to authenticated;

/**
 * 트레이너 연결 끊기(= 그룹 탈퇴) — 회원이 자기 손으로 트레이너를 제거한다.
 *
 * `group_members` 의 "leave self" 정책으로도 지울 수 있지만, 여기로 모으는 이유는
 * **같이 지워야 할 것**이 있기 때문이다: 그 그룹에서 받은 트레이너 코멘트와 동의 설정.
 * 나간 뒤에도 코멘트가 남으면 "연결을 끊었는데 그 사람 글이 내 화면에 있다" 가 된다.
 *
 * ⚠ 그룹장 자신은 못 나간다(그룹이 주인 없이 남는다). 그룹을 지우는 건 그룹 관리 화면.
 * 루틴은 건드리지 않는다 — 트레이너가 짜 준 운동이라도 **이미 내 루틴**이다.
 */
create or replace function public.leave_trainer_group(p_group_id uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then return false; end if;
  if exists (select 1 from public.groups where id = p_group_id and owner_id = me) then
    return false; -- 그룹장은 탈퇴가 아니라 그룹 삭제다.
  end if;
  if not exists (
    select 1 from public.group_members
     where group_id = p_group_id and user_id = me) then
    return false;
  end if;

  delete from public.trainer_comments
   where group_id = p_group_id and member_id = me;
  delete from public.member_share_prefs
   where group_id = p_group_id and user_id = me;
  delete from public.group_members
   where group_id = p_group_id and user_id = me;
  return true;
end $$;
revoke all on function public.leave_trainer_group(uuid) from public;
revoke all on function public.leave_trainer_group(uuid) from anon;
grant execute on function public.leave_trainer_group(uuid) to authenticated;

notify pgrst, 'reload schema';

-- 기존 루틴 배정 함수에 '처방 허용' 동의 확인을 더한다(본문은 schema.sql 과 같다).
create or replace function public.trainer_assign_routine_day(
  p_group_id uuid, p_member uuid,
  p_from_day int, p_from_focus text,
  p_to_day int, p_to_focus text)
returns int
language plpgsql security definer set search_path = public as $$
declare
  me uuid := (select auth.uid());
  n int := 0;
begin
  -- 그룹장 + 대상이 그 그룹 회원. 둘 중 하나라도 아니면 아무 일도 안 한다.
  if not exists (
    select 1 from public.groups g
     where g.id = p_group_id and g.owner_id = me
  ) or not exists (
    select 1 from public.group_members m
     where m.group_id = p_group_id and m.user_id = p_member
  ) then
    return -1;
  end if;
  -- 자기 자신에게 배정하는 건 막는다(트레이너 루틴이 자기 루틴을 덮어쓴다).
  if p_member = me then
    return -1;
  end if;
  -- 🔴 회원이 '운동 처방 허용' 을 끄면(설정 → 트레이너 연결) 루틴을 못 바꾼다.
  --    화면에서만 막으면 주소를 아는 사람은 그대로 부를 수 있다 — 동의는 여기서 지킨다.
  if not public.member_shares(p_member, p_group_id, 'prescription') then
    return -1;
  end if;

  delete from public.routine_exercises
   where user_id = p_member and day_index = p_to_day;

  insert into public.routine_exercises
    (user_id, focus, position, exercise_id, equipment, sets, reps,
     weight_kg, set_details, memo, day_index)
  select p_member, p_to_focus, s.position, s.exercise_id, s.equipment, s.sets, s.reps,
         -- 🔴 무게는 넘기지 않는다. 트레이너의 100kg 스쿼트가 초보 회원 화면에 박히면
         --    위험하고, 애초에 남의 신체 수치다. 회원이 운동하며 자기 무게를 넣는다.
         null, null, s.memo, p_to_day
    from public.routine_exercises s
   where s.user_id = me and s.day_index = p_from_day;
  get diagnostics n = row_count;

  -- 워밍업/마무리는 부위 단위라 대상 부위로 갈아끼운다.
  delete from public.routine_conditioning
   where user_id = p_member and focus = p_to_focus;

  insert into public.routine_conditioning
    (user_id, focus, kind, position, item_id, duration_min, speed, incline)
  select p_member, p_to_focus, s.kind, s.position, s.item_id, s.duration_min, s.speed, s.incline
    from public.routine_conditioning s
   where s.user_id = me and s.focus = p_from_focus;

  return n;
end
$$;
revoke all on function public.trainer_assign_routine_day(uuid, uuid, int, text, int, text) from public;
revoke all on function public.trainer_assign_routine_day(uuid, uuid, int, text, int, text) from anon;
grant execute on function public.trainer_assign_routine_day(uuid, uuid, int, text, int, text) to authenticated;

notify pgrst, 'reload schema';
