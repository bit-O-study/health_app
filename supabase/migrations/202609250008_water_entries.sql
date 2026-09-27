-- 물을 '하루 합계 한 숫자' 가 아니라 **마신 기록 하나하나**로 남긴다 (2026-09-25).
--
-- 지금은 water_logs 에 그날 누적 ml 한 줄뿐이라:
--  - 잘못 담은 걸 되돌리는 게 화면을 새로고침하면 안 된다(되돌릴 대상이 기억에만 있음)
--  - 언제 마셨는지 알 수 없어 "마지막으로 마신 지 3시간" 같은 안내를 못 한다
--  - 컵 크기가 다른 사람(텀블러 600, 물병 1L)이 정확히 기록할 수 없다
--
-- 그래서 기록을 water_entries 에 남기고, water_logs 는 **그날 합계 캐시**로 유지한다.
-- 기존 화면·통계(다짐 미션 포함)가 water_logs 를 읽고 있어 그 경로를 깨지 않기 위해서다.
-- 합계는 트리거가 맞춰 주므로 두 값이 어긋날 일이 없다.

create table if not exists public.water_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  for_date date not null,
  ml int not null check (ml > 0 and ml <= 3000),
  -- 마신 시각. 기록을 나중에 담아도 '언제' 를 남긴다.
  at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists water_entries_day
  on public.water_entries (user_id, for_date, at desc);

alter table public.water_entries enable row level security;

drop policy if exists "own water entries read" on public.water_entries;
create policy "own water entries read" on public.water_entries
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "own water entries insert" on public.water_entries;
create policy "own water entries insert" on public.water_entries
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "own water entries delete" on public.water_entries;
create policy "own water entries delete" on public.water_entries
  for delete to authenticated using (user_id = auth.uid());

-- 합계 캐시 동기화 — entries 가 바뀌면 water_logs 를 그날 합계로 맞춘다.
create or replace function public.sync_water_log() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := coalesce(new.user_id, old.user_id);
  v_date date := coalesce(new.for_date, old.for_date);
  v_sum int;
begin
  select coalesce(sum(ml), 0) into v_sum
    from public.water_entries where user_id = v_user and for_date = v_date;
  insert into public.water_logs (user_id, for_date, ml, updated_at)
       values (v_user, v_date, least(v_sum, 10000), now())
  on conflict (user_id, for_date)
    do update set ml = least(excluded.ml, 10000), updated_at = now();
  return null;
end $$;

drop trigger if exists water_entries_sync on public.water_entries;
create trigger water_entries_sync
  after insert or delete on public.water_entries
  for each row execute function public.sync_water_log();

-- 기존 하루 합계를 기록 하나로 옮긴다(오늘 이전 것도 그래프가 그대로 보이게).
-- 이미 옮긴 날은 건너뛴다 — 여러 번 돌려도 같은 결과.
insert into public.water_entries (user_id, for_date, ml, at)
select w.user_id, w.for_date, least(w.ml, 3000), w.updated_at
  from public.water_logs w
 where w.ml > 0
   and not exists (
     select 1 from public.water_entries e
      where e.user_id = w.user_id and e.for_date = w.for_date
   );

notify pgrst, 'reload schema';
