-- Read-only aggregates: no XP writes, duplicate awards or separate score ledger.
create or replace function public.competition_totals_at(p_group_id uuid, p_asof date)
returns table(user_id uuid, week jsonb, today jsonb, lifetime jsonb)
language plpgsql stable security invoker set search_path = public
as $$
declare v_today date := least(p_asof,(now() at time zone 'Asia/Seoul')::date);
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
revoke all on function public.competition_totals_at(uuid,date) from public, anon;
grant execute on function public.competition_totals_at(uuid,date) to authenticated;

create table if not exists public.group_league_seasons (
  group_id uuid primary key references public.groups(id) on delete cascade,
  current_week date not null
);
create table if not exists public.group_league_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  tier int not null default 0 check(tier between 0 and 5),
  eligible_from date not null,
  primary key(group_id,user_id)
);
-- Retain settled awards across leave/rejoin; auth/group deletion still cascades.
create table if not exists public.group_league_results (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  week_from date not null,
  score int not null,
  old_tier int not null,
  new_tier int not null,
  result text not null check(result in ('promotion','demotion','stay')),
  primary key(group_id,user_id,week_from)
);
alter table public.group_league_seasons enable row level security;
alter table public.group_league_members enable row level security;
alter table public.group_league_results enable row level security;
-- All reads/writes go through the membership-checked RPC. No client write policy.
revoke all on public.group_league_seasons, public.group_league_members, public.group_league_results from anon, authenticated;

create or replace function public.group_league_snapshot(p_group_id uuid)
returns jsonb language plpgsql volatile security definer set search_path=public
as $$
declare
  v_week date := date_trunc('week',now() at time zone 'Asia/Seoul')::date;
  v_cursor date;
  v_person record;
  v_new int;
begin
  if auth.uid() is null or not exists(select 1 from public.group_members m where m.group_id=p_group_id and m.user_id=auth.uid()) then
    raise insufficient_privilege;
  end if;
  -- Serializes settlement and first-use initialization across concurrent requests.
  perform pg_advisory_xact_lock(hashtextextended(p_group_id::text,20261020));
  insert into public.group_league_seasons(group_id,current_week) values(p_group_id,v_week) on conflict do nothing;
  select current_week into v_cursor from public.group_league_seasons where group_id=p_group_id;
  insert into public.group_league_members(group_id,user_id,eligible_from)
    select m.group_id,m.user_id,greatest(v_cursor,
      date_trunc('week',m.joined_at at time zone 'Asia/Seoul')::date +
      case when (m.joined_at at time zone 'Asia/Seoul')::date=date_trunc('week',m.joined_at at time zone 'Asia/Seoul')::date then 0 else 7 end)
    from public.group_members m where m.group_id=p_group_id on conflict do nothing;
  -- Newly rejoined members cannot reuse pre-rejoin eligibility to influence a closed week.
  update public.group_league_members l set eligible_from=greatest(l.eligible_from,
    date_trunc('week',m.joined_at at time zone 'Asia/Seoul')::date +
    case when (m.joined_at at time zone 'Asia/Seoul')::date=date_trunc('week',m.joined_at at time zone 'Asia/Seoul')::date then 0 else 7 end)
    from public.group_members m where l.group_id=p_group_id and m.group_id=l.group_id and m.user_id=l.user_id;
  while v_cursor<v_week loop
    for v_person in
      with eligible as (
        select s.user_id,(s.week->>'total')::int score,l.tier
        from public.competition_totals_at(p_group_id,v_cursor+6) s
        join public.group_league_members l on l.group_id=p_group_id and l.user_id=s.user_id
        where l.eligible_from<=v_cursor
      ), places as (
        select e.*,(select count(*) from eligible)::int n,
          (select count(*) from eligible x where x.score>=e.score)::int at_least,
          (select count(*) from eligible x where x.score<=e.score)::int at_most
        from eligible e
      ) select *,case when n<3 then 0
        when score>0 and at_least<=greatest(1,ceil(n*.2)) then 1
        when score=0 or at_most<=greatest(1,ceil(n*.2)) then -1
        else 0 end delta from places
    loop
      v_new:=greatest(0,least(5,v_person.tier+v_person.delta));
      insert into public.group_league_results(group_id,user_id,week_from,score,old_tier,new_tier,result)
        values(p_group_id,v_person.user_id,v_cursor,v_person.score,v_person.tier,v_new,
          case when v_new>v_person.tier then 'promotion' when v_new<v_person.tier then 'demotion' else 'stay' end)
        on conflict do nothing;
      update public.group_league_members set tier=v_new where group_id=p_group_id and user_id=v_person.user_id;
    end loop;
    v_cursor:=v_cursor+7;
    update public.group_league_seasons set current_week=v_cursor where group_id=p_group_id;
  end loop;
  return (select coalesce(jsonb_agg(jsonb_build_object('user_id',l.user_id,'tier',l.tier,'eligible_from',l.eligible_from,
    'last_result',r.result,'last_week',r.week_from,'old_tier',r.old_tier)), '[]'::jsonb)
    from public.group_league_members l join public.group_members m on m.group_id=l.group_id and m.user_id=l.user_id
    left join public.group_league_results r on r.group_id=l.group_id and r.user_id=l.user_id and r.week_from=v_week-7
    where l.group_id=p_group_id);
end $$;
revoke all on function public.group_league_snapshot(uuid) from public,anon;
grant execute on function public.group_league_snapshot(uuid) to authenticated;

