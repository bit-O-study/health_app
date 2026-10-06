-- Group-wide pledges: membership is captured at creation; only results are shared.
create table if not exists public.group_pledges (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  title text not null check (char_length(title) between 1 and 40),
  start_date date not null,
  days int not null check (days between 7 and 180),
  workout_days int check (workout_days between 1 and 7),
  meals_per_day int check (meals_per_day between 1 and 3),
  created_at timestamptz not null default now(),
  check (workout_days is not null or meals_per_day is not null)
);
create index if not exists group_pledges_group_idx on public.group_pledges(group_id, created_at desc);
create table if not exists public.group_pledge_members (
  pledge_id uuid not null references public.group_pledges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (pledge_id, user_id)
);
create table if not exists public.group_pledge_results (
  pledge_id uuid not null,
  user_id uuid not null,
  block_index int not null check (block_index >= 0),
  passed boolean not null,
  decided_on date not null,
  primary key (pledge_id, user_id, block_index),
  foreign key (pledge_id, user_id) references public.group_pledge_members(pledge_id, user_id) on delete cascade
);
alter table public.group_pledges enable row level security;
alter table public.group_pledge_members enable row level security;
alter table public.group_pledge_results enable row level security;
-- No direct writes/reads: authenticated RPCs below expose only authorized group summaries.
revoke all on public.group_pledges, public.group_pledge_members, public.group_pledge_results from anon, authenticated;

create or replace function public.create_group_pledge(
  p_group_id uuid, p_title text, p_start_date date, p_days int,
  p_workout_days int default null, p_meals_per_day int default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if auth.uid() is null or not public.is_group_member(p_group_id) or not exists (
    select 1 from public.groups where id = p_group_id and owner_id = auth.uid()
  ) then raise exception '그룹장만 전체 다짐을 만들 수 있어요.'; end if;
  if p_start_date is null or p_start_date < (now() at time zone 'Asia/Seoul')::date
    or p_start_date > (now() at time zone 'Asia/Seoul')::date + 365 then
    raise exception '시작일은 오늘부터 1년 이내로 정해 주세요.';
  end if;
  insert into public.group_pledges(group_id, created_by, title, start_date, days, workout_days, meals_per_day)
  values(p_group_id, auth.uid(), btrim(p_title), p_start_date, p_days, p_workout_days, p_meals_per_day)
  returning id into v_id;
  insert into public.group_pledge_members(pledge_id, user_id)
  select v_id, user_id from public.group_members where group_id = p_group_id;
  return v_id;
end;
$$;

create or replace function public.get_group_pledge_results(p_group_ids uuid[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_today date := (now() at time zone 'Asia/Seoul')::date; v_result jsonb;
begin
  if auth.uid() is null or exists (
    select 1 from unnest(p_group_ids) gid where not public.is_group_member(gid)
  ) then raise exception '그룹 멤버만 다짐을 볼 수 있어요.'; end if;

  -- Freeze closed blocks even when the participant has not visited the app.
  -- Late backdated records cannot turn a failed block into a success.
  with blocks as (
    select p.*, m.user_id, b.i,
      p.start_date + b.i * 7 as first_day,
      least(7, p.days - b.i * 7) as block_days,
      p.start_date + least(p.days, (b.i + 1) * 7) as check_day
    from public.group_pledges p
    join public.group_pledge_members m on m.pledge_id = p.id
    join public.group_members gm on gm.group_id = p.group_id and gm.user_id = m.user_id
    cross join lateral generate_series(0, (p.days - 1) / 7) b(i)
    where p.group_id = any(p_group_ids)
  ), closed as (
    select * from blocks b where b.check_day <= v_today and not exists (
      select 1 from public.group_pledge_results r
      where r.pledge_id = b.id and r.user_id = b.user_id and r.block_index = b.i
    )
  )
  insert into public.group_pledge_results(pledge_id, user_id, block_index, passed, decided_on)
  select c.id, c.user_id, c.i,
    (c.workout_days is null or (
      select count(distinct w.for_date) from (
        select e.for_date from public.exercise_completions e
        where e.user_id = c.user_id and e.status = 'done' and e.exercise_id is not null
          and e.for_date >= c.first_day and e.for_date < c.check_day
          and e.created_at < (c.check_day::timestamp at time zone 'Asia/Seoul')
        union all
        select e.for_date from public.conditioning_completions e
        where e.user_id = c.user_id and e.status = 'done' and e.item_id is not null
          and e.for_date >= c.first_day and e.for_date < c.check_day
          and e.created_at < (c.check_day::timestamp at time zone 'Asia/Seoul')
      ) w
    ) >= ceil(c.workout_days * c.block_days / 7.0))
    and (c.meals_per_day is null or (
      select count(*) from (
        select f.for_date from public.food_logs f
        where f.user_id = c.user_id and f.for_date >= c.first_day and f.for_date < c.check_day
          and f.created_at < (c.check_day::timestamp at time zone 'Asia/Seoul')
        group by f.for_date having count(distinct f.meal) >= c.meals_per_day
      ) fed
    ) = c.block_days), c.check_day
  from closed c on conflict do nothing;

  select coalesce(jsonb_agg(item order by created_at desc), '[]'::jsonb) into v_result
  from (
    select p.created_at, jsonb_build_object(
      'id', p.id, 'groupId', p.group_id, 'title', p.title, 'startDate', p.start_date,
      'endDate', p.start_date + p.days - 1, 'days', p.days,
      'workoutDays', p.workout_days, 'mealsPerDay', p.meals_per_day,
      'members', coalesce((
        select jsonb_agg(jsonb_build_object(
          'userId', m.user_id, 'name', coalesce(nullif(gm.display_name, ''), '멤버'),
          'status', case
            when exists(select 1 from public.group_pledge_results r where r.pledge_id=p.id and r.user_id=m.user_id and not r.passed) then 'failed'
            when p.start_date > v_today then 'upcoming'
            when p.start_date + p.days <= v_today then 'success'
            else 'active' end,
          'failedWeek', (select min(r.block_index)+1 from public.group_pledge_results r where r.pledge_id=p.id and r.user_id=m.user_id and not r.passed)
        ) order by gm.display_name nulls last, m.user_id)
        from public.group_pledge_members m
        join public.group_members gm on gm.group_id=p.group_id and gm.user_id=m.user_id
        where m.pledge_id=p.id
      ), '[]'::jsonb)
    ) as item from public.group_pledges p where p.group_id=any(p_group_ids)
  ) x;
  return v_result;
end;
$$;
revoke all on function public.create_group_pledge(uuid,text,date,int,int,int) from public, anon;
revoke all on function public.get_group_pledge_results(uuid[]) from public, anon;
grant execute on function public.create_group_pledge(uuid,text,date,int,int,int) to authenticated;
grant execute on function public.get_group_pledge_results(uuid[]) to authenticated;
notify pgrst, 'reload schema';
