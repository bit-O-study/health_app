-- Qualify sharing columns to avoid PL/pgSQL variable name ambiguity.
create or replace function public.pt_member_detail(
  p_link uuid, p_member uuid, p_from date, p_to date)
returns jsonb language plpgsql security definer stable set search_path = public as $$
declare share_workout boolean; share_diet boolean; share_body boolean; can_prescribe boolean;
begin
  if not public.pt_has_pass() or not exists(select 1 from pt_links where id=p_link and trainer_id=auth.uid() and member_id=p_member and active) then return null; end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 365 then
    raise exception 'Invalid report period';
  end if;
  share_workout := (select l.share_workout from pt_links l where l.id=p_link);
  share_diet := (select l.share_diet from pt_links l where l.id=p_link);
  share_body := (select l.share_body from pt_links l where l.id=p_link);
  can_prescribe := (select l.allow_prescription from pt_links l where l.id=p_link);
  return jsonb_build_object(
    'sharing', jsonb_build_object('workout', share_workout, 'diet', share_diet, 'body', share_body, 'prescription', can_prescribe),
    'name', coalesce((select coalesce(nullif(trim(p.nickname), ''), nullif(trim(p.name), '')) from public.profiles p where p.user_id = p_member),
      (select member_name from pt_links where id=p_link), '회원'),
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
