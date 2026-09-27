-- ─────────────────────────────────────────────────────────────────────────────
-- 트레이너 '오늘만' 처방 — 2026-09-20.
--
-- 결정(2026-09-20): 처방 축은 **영구 루틴 + 오늘만 둘 다**. 지금까지는 영구 루틴만
-- 있었다(`trainer_prescribe_exercise`). 여기서 오늘만 축을 더한다.
--
-- 🔴 **원칙 #2 — 오늘만은 루틴에 절대 영향을 주면 안 된다.** 이 파일의 함수는
--    `routine_exercises` / `user_routines` 를 **읽기만** 한다. 쓰는 곳은 `daily_plan` 뿐이다.
--    내일이 되면 회원의 루틴은 원래대로 돌아온다.
--
-- 🔴 **오늘만 오버라이드는 '부위 단위 통째 교체'** 다(앱의 판정: 그 부위에 daily_plan 행이
--    하나라도 있으면 그 부위는 daily_plan 이 전부다 — `today-exercises.tsx` 참고).
--    그래서 운동 한 개만 바꾸려 해도 **그 부위 전체를 먼저 복사해 고정**해야 한다.
--    한 줄만 넣으면 나머지 운동이 오늘 화면에서 사라진다.

-- ─── 처방 패치 검증(한 곳) ──────────────────────────────────────────────────
-- 영구 루틴 처방과 오늘만 처방이 **같은 판정**을 쓰도록 꺼내 둔다. 두 함수에 각각
-- 복사해 두면 기구 목록 하나만 늘어나도 한쪽이 조용히 뒤처진다.
create or replace function public.valid_prescription_patch(p_patch jsonb)
returns boolean language sql immutable set search_path = public as $fn$
  select p_patch is not null
    and jsonb_typeof(p_patch) = 'object'
    and (p_patch ?& array['exerciseId','equipment','sets','reps','weightKg'])
    and jsonb_typeof(p_patch->'exerciseId') = 'string'
    and length(trim(p_patch->>'exerciseId')) between 1 and 200
    and jsonb_typeof(p_patch->'equipment') = 'string'
    and (p_patch->>'equipment') in ('barbell','dumbbell','machine','cable','bodyweight','smith','kettlebell','band','trx','medicineball','landmine','sled','battlerope','bosu','ball','plate','other')
    and jsonb_typeof(p_patch->'sets') = 'number'
    and (p_patch->>'sets')::numeric between 1 and 20
    and (p_patch->>'sets')::numeric = trunc((p_patch->>'sets')::numeric)
    and jsonb_typeof(p_patch->'reps') = 'number'
    and (p_patch->>'reps')::numeric between 1 and 100
    and (p_patch->>'reps')::numeric = trunc((p_patch->>'reps')::numeric)
    and jsonb_typeof(p_patch->'weightKg') in ('null','number')
    and (jsonb_typeof(p_patch->'weightKg') = 'null' or (
      (p_patch->>'weightKg')::numeric between 0 and 9999.9
      and (p_patch->>'weightKg')::numeric = round((p_patch->>'weightKg')::numeric, 1)));
$fn$;
revoke all on function public.valid_prescription_patch(jsonb) from public, anon;
grant execute on function public.valid_prescription_patch(jsonb) to authenticated;

-- ─── 영구 루틴 처방 — 검증만 위 함수로 옮긴다(동작 동일) ────────────────────
create or replace function public.trainer_prescribe_exercise(
  p_group_id uuid, p_member uuid, p_row uuid, p_expected_updated_at timestamptz,
  p_patch jsonb, p_note text)
returns boolean language plpgsql security definer set search_path = public as $fn$
declare
  current_row public.routine_exercises%rowtype;
  next_id uuid;
begin
  if auth.uid() is null or p_member = auth.uid() then return false; end if;
  -- Hold the relationship while changing the prescription; removal/ownership transfer waits.
  perform 1 from public.groups where id = p_group_id and owner_id = auth.uid() for share;
  if not found then return false; end if;
  perform 1 from public.group_members where group_id = p_group_id and user_id = p_member for share;
  if not found then return false; end if;
  perform 1 from public.member_share_prefs where user_id = p_member and group_id = p_group_id for share;
  if not public.member_shares(p_member, p_group_id, 'prescription') then return false; end if;
  select * into current_row from public.routine_exercises
    where id = p_row and user_id = p_member for update;
  if not found or p_expected_updated_at is null or current_row.updated_at <> p_expected_updated_at then return false; end if;
  if p_note is null or length(trim(p_note)) = 0 or length(p_note) > 500 then raise exception 'Invalid note'; end if;
  if p_patch is null then
    delete from public.routine_exercises where id = p_row and user_id = p_member;
  else
    if not public.valid_prescription_patch(p_patch) then raise exception 'Invalid prescription'; end if;
    -- A replaced exercise must not inherit the previous exercise's completion for today.
    next_id := case when current_row.exercise_id <> p_patch->>'exerciseId'
      or current_row.equipment <> p_patch->>'equipment' then gen_random_uuid() else current_row.id end;
    update public.routine_exercises set id = next_id,
      exercise_id = p_patch->>'exerciseId', equipment = p_patch->>'equipment',
      sets = (p_patch->>'sets')::int, reps = (p_patch->>'reps')::int,
      weight_kg = (p_patch->>'weightKg')::numeric, set_details = null, updated_at = clock_timestamp()
      where id = p_row and user_id = p_member;
  end if;
  -- An in-app record visible to both parties, committed together with the prescription.
  insert into public.trainer_comments (group_id, trainer_id, member_id, body)
    values (p_group_id, auth.uid(), p_member, p_note);
  -- Never edit daily_plan, daily_conditioning or completion snapshots here.
  return true;
end $fn$;
revoke all on function public.trainer_prescribe_exercise(uuid, uuid, uuid, timestamptz, jsonb, text) from public, anon;
grant execute on function public.trainer_prescribe_exercise(uuid, uuid, uuid, timestamptz, jsonb, text) to authenticated;

-- ─── 회원의 '오늘' 운동(트레이너가 오늘만 고칠 대상) ────────────────────────
/**
 * 회원의 오늘 본운동 — 오늘만 오버라이드(daily_plan)가 있으면 그것, 없으면 루틴의 오늘 일차.
 *
 * 🔴 **일차 계산은 `routineDayOffset` 와 같은 식**이다: (오늘 - start_date) mod 7.
 *    (앱: `src/features/routine/data.ts`)
 *
 * 🔴 **손대면 안 되는 날이 둘 있다.**
 *    - `rest_date = 오늘`  → 회원이 오늘을 휴식으로 바꿨다. 오늘 할 운동이 없다.
 *    - `override_date = 오늘` → 회원이 오늘만 **부위를 갈아끼웠다**. 이 경우 루틴에서
 *      부위를 복사해 오면 회원이 고른 부위를 덮어쓴다. 그래서 그런 날은 이미 고정된
 *      (daily_plan 에 있는) 운동만 보여주고 고친다.
 *
 * 반환: null = 권한 없음/동의 없음. 그 외 { date, dayIndex, rest, swapped, rows[] }.
 */
create or replace function public.trainer_member_today_plan(
  p_group_id uuid, p_member uuid)
returns jsonb language plpgsql security definer stable set search_path = public as $fn$
declare
  today date := (now() at time zone 'Asia/Seoul')::date;
  r public.user_routines%rowtype;
  d_index int;
  is_rest boolean := false;
  swapped boolean := false;
  rows_json jsonb;
begin
  if auth.uid() is null or p_member = auth.uid()
     or not exists (select 1 from public.groups where id = p_group_id and owner_id = auth.uid())
     or not exists (select 1 from public.group_members where group_id = p_group_id and user_id = p_member)
  then return null; end if;
  if not public.member_shares(p_member, p_group_id, 'prescription') then return null; end if;

  select * into r from public.user_routines where user_id = p_member;
  if found then
    d_index := ((today - r.start_date) % 7 + 7) % 7;
    -- 🔴 `=` 로 비교하면 값이 없을 때(NULL) 결과가 NULL 이 되고, 뒤의 `not is_rest` 가
    --    NULL 이 되어 **오늘 운동이 통째로 사라진다**(실제로 그랬다). null-safe 비교로 둔다.
    is_rest := (r.rest_date is not distinct from today);
    swapped := (r.override_date is not distinct from today);
  end if;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.focus, t.position), '[]'::jsonb)
    into rows_json
    from (
      select d.focus, d.position, d.exercise_id, d.equipment, d.sets, d.reps,
             d.weight_kg, 'daily'::text as source
        from public.daily_plan d
       where d.user_id = p_member and d.for_date = today
      union all
      select e.focus, e.position, e.exercise_id, e.equipment, e.sets, e.reps,
             e.weight_kg, 'routine'::text as source
        from public.routine_exercises e
       where not is_rest and not swapped and d_index is not null
         and e.user_id = p_member and e.day_index = d_index
         and not exists (
           select 1 from public.daily_plan x
            where x.user_id = p_member and x.for_date = today and x.focus = e.focus)
    ) t;

  return jsonb_build_object(
    'date', today, 'dayIndex', d_index, 'rest', is_rest, 'swapped', swapped,
    'rows', case when is_rest then '[]'::jsonb else rows_json end);
end $fn$;
revoke all on function public.trainer_member_today_plan(uuid, uuid) from public, anon;
grant execute on function public.trainer_member_today_plan(uuid, uuid) to authenticated;

-- ─── 오늘만 처방 ────────────────────────────────────────────────────────────
/**
 * 오늘 하루치 운동 하나를 바꾸거나(p_patch) 뺀다(p_patch = null).
 *
 * 대상은 `(부위, position)` 으로 찾는다 — 루틴에서 온 줄은 아직 daily_plan 에 id 가
 * 없기 때문이다(고정되는 순간 생긴다). 트레이너가 화면에서 본 것과 같은 줄인지는
 * `p_expected_exercise_id` 로 확인한다(그 사이 회원이 오늘 운동을 바꿨으면 실패).
 *
 * 🔴 `routine_exercises` 는 한 줄도 안 건드린다(원칙 #2).
 */
create or replace function public.trainer_prescribe_today(
  p_group_id uuid, p_member uuid, p_focus text, p_position int,
  p_expected_exercise_id text, p_patch jsonb, p_note text)
returns boolean language plpgsql security definer set search_path = public as $fn$
declare
  today date := (now() at time zone 'Asia/Seoul')::date;
  r public.user_routines%rowtype;
  d_index int;
  copied int := 0;
  target uuid;
begin
  if auth.uid() is null or p_member = auth.uid() then return false; end if;
  perform 1 from public.groups where id = p_group_id and owner_id = auth.uid() for share;
  if not found then return false; end if;
  perform 1 from public.group_members where group_id = p_group_id and user_id = p_member for share;
  if not found then return false; end if;
  perform 1 from public.member_share_prefs where user_id = p_member and group_id = p_group_id for share;
  if not public.member_shares(p_member, p_group_id, 'prescription') then return false; end if;
  if p_note is null or length(trim(p_note)) = 0 or length(p_note) > 500 then raise exception 'Invalid note'; end if;
  if p_patch is not null and not public.valid_prescription_patch(p_patch) then
    raise exception 'Invalid prescription';
  end if;
  if p_focus is null or length(trim(p_focus)) = 0 or length(p_focus) > 50
     or p_position is null or p_position < 0 or p_expected_exercise_id is null then
    return false;
  end if;

  select * into r from public.user_routines where user_id = p_member;
  -- null-safe — 휴식일이 아닌 날(rest_date is null)에 NULL 로 흘러가지 않게.
  if not found or r.rest_date is not distinct from today then return false; end if;

  -- 이 부위가 아직 '오늘만' 으로 고정되지 않았으면 **부위 전체**를 루틴에서 복사해 고정한다.
  if not exists (select 1 from public.daily_plan
                  where user_id = p_member and for_date = today and focus = p_focus) then
    -- 회원이 오늘 부위를 갈아끼운 날은 루틴에서 복사하면 그 선택을 덮어쓴다 → 손대지 않는다.
    if r.override_date is not distinct from today then return false; end if;
    d_index := ((today - r.start_date) % 7 + 7) % 7;
    insert into public.daily_plan
      (user_id, for_date, focus, position, exercise_id, equipment, sets, reps,
       weight_kg, set_details, memo, superset_group)
    select p_member, today, e.focus, e.position, e.exercise_id, e.equipment, e.sets, e.reps,
           e.weight_kg, e.set_details, e.memo, e.superset_group
      from public.routine_exercises e
     where e.user_id = p_member and e.day_index = d_index and e.focus = p_focus;
    get diagnostics copied = row_count;
    if copied = 0 then return false; end if;
  end if;

  select id into target from public.daily_plan
   where user_id = p_member and for_date = today and focus = p_focus
     and position = p_position and exercise_id = p_expected_exercise_id
   order by id limit 1
   for update;
  if not found then return false; end if;

  if p_patch is null then
    delete from public.daily_plan where id = target;
  else
    update public.daily_plan
       set exercise_id = p_patch->>'exerciseId', equipment = p_patch->>'equipment',
           sets = (p_patch->>'sets')::int, reps = (p_patch->>'reps')::int,
           weight_kg = (p_patch->>'weightKg')::numeric, set_details = null
     where id = target;
  end if;

  insert into public.trainer_comments (group_id, trainer_id, member_id, body)
    values (p_group_id, auth.uid(), p_member, p_note);
  return true;
end $fn$;
revoke all on function public.trainer_prescribe_today(uuid, uuid, text, int, text, jsonb, text) from public, anon;
grant execute on function public.trainer_prescribe_today(uuid, uuid, text, int, text, jsonb, text) to authenticated;

notify pgrst, 'reload schema';
