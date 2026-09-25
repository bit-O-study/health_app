-- 다짐에 '하루 약속 + 주간 리듬' 을 붙인다 (2026-09-25 설계).
--
-- 지금 다짐은 "4주 동안 12일 운동하기" 같은 기간 목표뿐이라, 사람이 실제로 지키는
-- 단위(하루)와 무너지는 단위(주)가 없다. 그래서 둘을 더한다.
--  - weekly_target       : 이번 주 며칠 달성이 목표인지(매일 100% 를 요구하지 않는다)
--  - rest_pass_per_week  : '오늘 쉼' 주 N회 — 아픈 날·회식을 실패로 기록하지 않기 위해
--  - remind_at           : 그 시각에 아직 못 한 것만 알린다. null = 알림 없음
--
-- 그리고 앱이 판정할 수 없는 다짐(물·술·수면)을 담기 위해 하루 한 행을 둔다.
-- 자동 판정은 여기 저장하지 않는다 — 기록이 수정되면 결과도 바뀌어야 하므로 매번 계산한다.
-- 전부 추가형이라 기존 행·조회에 영향이 없다.

alter table public.commitments
  add column if not exists weekly_target int not null default 5
    check (weekly_target between 1 and 7);
alter table public.commitments
  add column if not exists rest_pass_per_week int not null default 1
    check (rest_pass_per_week between 0 and 3);
alter table public.commitments
  add column if not exists remind_at time;

create table if not exists public.commitment_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  commitment_id uuid not null references public.commitments(id) on delete cascade,
  for_date date not null,
  -- 체크한 수동 미션 id 목록. 자동 미션은 여기 넣지 않는다.
  checked_ids text[] not null default '{}',
  -- '오늘 쉼' — 그날은 판정에서 빠지고 주간 목표도 1 줄어든다.
  rest_pass boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, commitment_id, for_date)
);

create index if not exists commitment_days_lookup
  on public.commitment_days (user_id, commitment_id, for_date desc);

alter table public.commitment_days enable row level security;

drop policy if exists "own commitment days read" on public.commitment_days;
create policy "own commitment days read" on public.commitment_days
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "own commitment days insert" on public.commitment_days;
create policy "own commitment days insert" on public.commitment_days
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "own commitment days update" on public.commitment_days;
create policy "own commitment days update" on public.commitment_days
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own commitment days delete" on public.commitment_days;
create policy "own commitment days delete" on public.commitment_days
  for delete to authenticated using (user_id = auth.uid());

drop trigger if exists commitment_days_updated_at on public.commitment_days;
create trigger commitment_days_updated_at
  before update on public.commitment_days
  for each row execute function public.set_updated_at();

notify pgrst, 'reload schema';
