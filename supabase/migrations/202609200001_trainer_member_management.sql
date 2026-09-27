-- Trainer member reports and permanent routine prescriptions.
-- Requires member_share_prefs/member_shares from schema.sql. No broad cross-member RLS grants.
create or replace function public.trainer_member_report(
  p_group_id uuid, p_member uuid, p_from date, p_to date)
returns jsonb language plpgsql security definer stable set search_path = public as $$
declare share_workout boolean; share_diet boolean; share_body boolean; can_prescribe boolean;
begin
  if auth.uid() is null or p_member = auth.uid() or not exists (
    select 1 from public.groups where id = p_group_id and owner_id = auth.uid()
  ) or not exists (
    select 1 from public.group_members where group_id = p_group_id and user_id = p_member
  ) then return null; end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 365 then
    raise exception 'Invalid report period';
  end if;
  share_workout := public.member_shares(p_member, p_group_id, 'workout');
  share_diet := public.member_shares(p_member, p_group_id, 'diet');
  share_body := public.member_shares(p_member, p_group_id, 'body');
  can_prescribe := public.member_shares(p_member, p_group_id, 'prescription');
  return jsonb_build_object(
    'sharing', jsonb_build_object('workout', share_workout, 'diet', share_diet, 'body', share_body, 'prescription', can_prescribe),
    'name', coalesce((select coalesce(nullif(trim(p.nickname), ''), nullif(trim(p.name), '')) from public.profiles p where p.user_id = p_member),
      (select nullif(trim(m.display_name), '') from public.group_members m where m.group_id = p_group_id and m.user_id = p_member), '회원'),
    'exercises', coalesce((select jsonb_agg(jsonb_build_object(
      'id', r.id, 'day_index', r.day_index, 'focus', r.focus, 'exercise_id', r.exercise_id,
      'equipment', r.equipment, 'sets', r.sets, 'reps', r.reps, 'weight_kg', r.weight_kg,
      'set_details', r.set_details, 'updated_at', r.updated_at) order by r.day_index, r.position, r.id)
      from public.routine_exercises r where r.user_id = p_member and can_prescribe), '[]'::jsonb),
    'completions', coalesce((select jsonb_agg(jsonb_build_object(
      'for_date', e.for_date, 'exercise_id', e.exercise_id, 'sets', e.sets, 'reps', e.reps,
      'weight_kg', e.weight_kg, 'set_details', e.set_details))
      from public.exercise_completions e where e.user_id = p_member and share_workout and e.status = 'done'
      and e.for_date between p_from and p_to), '[]'::jsonb),
    'conditioning', coalesce((select jsonb_agg(jsonb_build_object('for_date', c.for_date))
      from (select distinct for_date from public.conditioning_completions where user_id = p_member and share_workout
      and status = 'done' and for_date between p_from and p_to) c), '[]'::jsonb),
    'sessions', coalesce((select jsonb_agg(jsonb_build_object('for_date', s.for_date, 'duration_sec', s.duration_sec))
      from public.workout_sessions s where s.user_id = p_member and share_workout and s.for_date between p_from and p_to), '[]'::jsonb),
    'diet', coalesce((select jsonb_agg(jsonb_build_object('for_date', f.for_date))
      from (select distinct for_date from public.food_logs where user_id = p_member and share_diet and for_date between p_from and p_to) f), '[]'::jsonb),
    'weights', coalesce((select jsonb_agg(jsonb_build_object('date', (w.created_at at time zone 'Asia/Seoul')::date, 'weight_kg', w.weight_kg) order by w.created_at)
      from public.weight_logs w where w.user_id = p_member and share_body and w.weight_kg is not null
      and w.created_at >= (p_from::timestamp at time zone 'Asia/Seoul')
      and w.created_at < ((p_to + 1)::timestamp at time zone 'Asia/Seoul')), '[]'::jsonb)
  );
end $$;
revoke all on function public.trainer_member_report(uuid, uuid, date, date) from public, anon;
grant execute on function public.trainer_member_report(uuid, uuid, date, date) to authenticated;

create or replace function public.trainer_prescribe_exercise(
  p_group_id uuid, p_member uuid, p_row uuid, p_expected_updated_at timestamptz,
  p_patch jsonb, p_note text)
returns boolean language plpgsql security definer set search_path = public as $$
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
    if jsonb_typeof(p_patch) <> 'object'
      or not (p_patch ?& array['exerciseId','equipment','sets','reps','weightKg'])
      or jsonb_typeof(p_patch->'exerciseId') <> 'string'
      or length(trim(p_patch->>'exerciseId')) not between 1 and 200
      or (p_patch->>'equipment') not in ('barbell','dumbbell','machine','cable','bodyweight','smith','kettlebell','band','trx','medicineball','landmine','sled','battlerope','bosu','ball','plate','other')
      or jsonb_typeof(p_patch->'equipment') <> 'string'
      or jsonb_typeof(p_patch->'sets') <> 'number' or jsonb_typeof(p_patch->'reps') <> 'number'
      or (p_patch->>'sets')::numeric not between 1 and 20 or (p_patch->>'sets')::numeric <> trunc((p_patch->>'sets')::numeric)
      or (p_patch->>'reps')::numeric not between 1 and 100 or (p_patch->>'reps')::numeric <> trunc((p_patch->>'reps')::numeric)
      or (jsonb_typeof(p_patch->'weightKg') not in ('null','number'))
      or (jsonb_typeof(p_patch->'weightKg') = 'number' and (
        (p_patch->>'weightKg')::numeric not between 0 and 9999.9
        or (p_patch->>'weightKg')::numeric <> round((p_patch->>'weightKg')::numeric, 1)))
    then raise exception 'Invalid prescription'; end if;
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
end $$;
revoke all on function public.trainer_prescribe_exercise(uuid, uuid, uuid, timestamptz, jsonb, text) from public, anon;
grant execute on function public.trainer_prescribe_exercise(uuid, uuid, uuid, timestamptz, jsonb, text) to authenticated;
