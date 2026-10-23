-- Read-only aggregates: no XP writes, duplicate awards or separate score ledger.
create or replace function public.competition_totals(p_group_id uuid default null)
returns table(user_id uuid, week jsonb, today jsonb, lifetime jsonb)
language plpgsql stable security invoker set search_path = public
as $$
declare v_today date := (now() at time zone 'Asia/Seoul')::date;
begin
  if auth.uid() is null then raise insufficient_privilege; end if;
  if p_group_id is not null and not exists (
    select 1 from public.group_members m where m.group_id=p_group_id and m.user_id=auth.uid()
  ) then raise insufficient_privilege; end if;
  return query
  with members as (
    select auth.uid() as uid where p_group_id is null
    union all
    select m.user_id from public.group_members m where m.group_id=p_group_id
  ), strength as (
    select e.user_id uid,e.for_date,
      case when (case when jsonb_typeof(e.set_details)='array' then jsonb_array_length(e.set_details)>0 else false end)
        then coalesce(d.n,0) else case when e.reps>0 then least(20,greatest(0,coalesce(e.sets,0))) else 0 end end sets,
      case when (case when jsonb_typeof(e.set_details)='array' then jsonb_array_length(e.set_details)>0 else false end)
        then coalesce(d.reps,0) else least(20,greatest(0,coalesce(e.sets,0)))*least(100,greatest(0,coalesce(e.reps,0))) end reps
    from public.exercise_completions e join members m on m.uid=e.user_id
    left join lateral (
      select count(*) filter(where x.reps>0) n, sum(x.reps) reps from (
        select case when jsonb_typeof(item->'reps')='number'
          then least(100,greatest(0,trunc((item->>'reps')::numeric))) else 0 end reps
        from jsonb_array_elements(case when jsonb_typeof(e.set_details)='array' then e.set_details else '[]'::jsonb end)
          with ordinality a(item,ord) where ord<=20
      ) x
    ) d on true
    where e.status='done' and e.for_date<=v_today
  ), raw as (
    select s.uid,s.for_date,s.sets::numeric,s.reps::numeric,0::numeric minutes from strength s
    union all
    select c.user_id,c.for_date,0,0,least(60,greatest(0,coalesce(c.duration_min,0)))
    from public.conditioning_completions c join members m on m.uid=c.user_id
    where c.status='done' and c.for_date<=v_today
  ), daily as (
    select r.uid,r.for_date,
      least(120,sum(r.sets)*4) sets,
      least(60,floor(sum(r.reps)/5)) reps,
      least(120,sum(r.minutes)*2) conditioning,
      case when sum(r.sets)>0 or sum(r.minutes)>0 then 20 else 0 end attendance
    from raw r group by r.uid,r.for_date
  ), scopes as (
    select m.uid,scope,
      coalesce(sum(d.sets),0) sets,coalesce(sum(d.reps),0) reps,
      coalesce(sum(d.conditioning),0) conditioning,coalesce(sum(d.attendance),0) attendance
    from members m cross join (values ('week'),('today'),('lifetime')) s(scope)
    left join daily d on d.uid=m.uid and
      (s.scope='lifetime' or (s.scope='today' and d.for_date=v_today)
       or (s.scope='week' and d.for_date>=date_trunc('week',v_today::timestamp)::date))
    group by m.uid,scope
  ), totals as (
    select s.uid,s.scope,jsonb_build_object('sets',s.sets,'reps',s.reps,
      'conditioning',s.conditioning,'attendance',s.attendance,
      'total',s.sets+s.reps+s.conditioning+s.attendance) value from scopes s
  )
  select m.uid,w.value,t.value,l.value from members m
    join totals w on w.uid=m.uid and w.scope='week'
    join totals t on t.uid=m.uid and t.scope='today'
    join totals l on l.uid=m.uid and l.scope='lifetime';
end;
$$;
revoke all on function public.competition_totals(uuid) from public, anon;
grant execute on function public.competition_totals(uuid) to authenticated;

-- Existing RLS remains unchanged. Realtime only invalidates authorized snapshots.
do $$
declare target text;
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    foreach target in array array['exercise_completions','conditioning_completions','group_members'] loop
      if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=target) then
        execute format('alter publication supabase_realtime add table public.%I',target);
      end if;
    end loop;
  end if;
end $$;
