-- Preserve an immutable, bounded coaching snapshot with prescription evidence.
create or replace function public.manual_coach_request(p_kind text,p_question text,p_request uuid,p_user uuid default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_user uuid:=coalesce(p_user,auth.uid()); v_date date:=(now() at time zone 'Asia/Seoul')::date; v_id uuid; v_context jsonb;
begin
 if auth.uid() is null or (p_user is not null and not public.is_admin()) then raise exception 'Forbidden' using errcode='42501'; end if;
 if p_kind is null or p_kind not in ('recommendation','habit-report','consultation') or p_question is null or length(trim(p_question))>2000 or p_request is null or (p_kind='consultation' and length(trim(p_question))<2) then raise exception 'Invalid request' using errcode='22023'; end if;
 if not exists(select 1 from subscriptions where user_id=v_user and product_id in ('helssu_coach_monthly','helssu_premium_monthly') and state in ('active','grace','canceled') and expires_at>now()) then raise exception 'Subscription required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
 select id into v_id from manual_coach_requests where id=p_request and user_id=v_user;
 if v_id is not null then return v_id; end if;
 if p_kind='habit-report' then v_date:=date_trunc('week',v_date)::date; end if;
 if p_kind<>'consultation' then
  select id into v_id from manual_coach_requests where user_id=v_user and kind=p_kind and for_date=v_date;
  if v_id is not null then return v_id; end if;
 elsif (select count(*) from manual_coach_requests where user_id=v_user and kind='consultation' and for_date=v_date)>=20 then raise exception 'Daily limit'; end if;
 select jsonb_build_object(
  'version',2,'period_days',30,'as_of',(now() at time zone 'Asia/Seoul')::date,
  'exercise_records',coalesce((select jsonb_agg(to_jsonb(r)) from (
   select exercise_id,for_date,equipment,sets,reps,weight_kg,set_details from exercise_completions
   where user_id=v_user and status='done' and for_date between ((now() at time zone 'Asia/Seoul')::date-29) and (now() at time zone 'Asia/Seoul')::date order by for_date desc,created_at desc,id limit 100
  ) r),'[]'::jsonb),
  'records_truncated',(select count(*)>100 from exercise_completions where user_id=v_user and status='done' and for_date between ((now() at time zone 'Asia/Seoul')::date-29) and (now() at time zone 'Asia/Seoul')::date),
  'routine_plan',coalesce((select jsonb_agg(to_jsonb(r)) from (
   select exercise_id,equipment,sets,reps,weight_kg,set_details,day_index from routine_exercises where user_id=v_user order by day_index,position,id limit 100
  ) r),'[]'::jsonb),
  'routine_truncated',(select count(*)>100 from routine_exercises where user_id=v_user),
  'today_plan',coalesce((select jsonb_agg(to_jsonb(r)) from (
   select exercise_id,equipment,sets,reps,weight_kg,set_details from daily_plan where user_id=v_user and for_date=(now() at time zone 'Asia/Seoul')::date order by position,id limit 100
  ) r),'[]'::jsonb),
  'today_truncated',(select count(*)>100 from daily_plan where user_id=v_user and for_date=(now() at time zone 'Asia/Seoul')::date)
 ) into v_context;
 insert into manual_coach_requests(id,user_id,kind,for_date,question,context) values(p_request,v_user,p_kind,v_date,trim(p_question),v_context);
 return p_request;
end $$;
revoke all on function public.manual_coach_request(text,text,uuid,uuid) from public,anon;
grant execute on function public.manual_coach_request(text,text,uuid,uuid) to authenticated;
notify pgrst,'reload schema';
