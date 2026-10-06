-- ─────────────────────────────────────────────────────────────────────────────
-- 행동 다짐 개편(2026-10-06) — 설문 제거, 행동 다짐 + 예상 결과 + 결과 데이터(AI 학습용).
--   commitments.pledge      : 행동 다짐 스펙(jsonb). mode = 'pledge'.
--   commitment_outcomes     : 다짐 1건당 1행 — 생성 시 예상·기준 체성분, 종료 시 실측(성공·실패 모두).
--   commitment_shares       : 그룹 공유(제목·항목·기간·상태만 — 체중·체성분·식단은 공유하지 않는다).
--   meal_skips              : 끼니 '안 먹었어요' 체크 — 기록 누락과 '안 먹음'을 구분한다.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.commitments add column if not exists pledge jsonb;
alter table public.commitments drop constraint if exists commitments_mode_check;
alter table public.commitments add constraint commitments_mode_check
  check (mode in ('manual', 'survey', 'pledge'));

create table if not exists public.commitment_outcomes (
  id uuid primary key default gen_random_uuid(),
  -- 다짐을 지워도 결과는 남긴다(AI 학습 데이터).
  commitment_id uuid unique references public.commitments(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free', 'lite', 'basic', 'plus', 'pro')),
  direction text not null default 'forward' check (direction in ('forward', 'reverse')),
  goal_input jsonb,
  pledge_snapshot jsonb not null,
  start_date date not null,
  end_date date not null,
  baseline jsonb not null default '{}'::jsonb,
  predicted_weight_change_kg numeric(5, 2),
  predicted_fat_change_kg numeric(5, 2),
  predicted_muscle_change_kg numeric(5, 2),
  prediction jsonb not null default '{}'::jsonb,
  formula_version text not null,
  status text not null default 'active' check (status in ('active', 'success', 'failed')),
  failed_reason text[],
  failed_at date,
  failed_block int,
  adherence jsonb,
  end_measure jsonb,
  actual_weight_change_kg numeric(5, 2),
  actual_muscle_change_kg numeric(5, 2),
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists commitment_outcomes_user_idx
  on public.commitment_outcomes (user_id, created_at desc);
drop trigger if exists commitment_outcomes_set_updated_at on public.commitment_outcomes;
create trigger commitment_outcomes_set_updated_at
  before update on public.commitment_outcomes
  for each row execute function public.set_updated_at();
alter table public.commitment_outcomes enable row level security;
drop policy if exists "own commitment outcomes" on public.commitment_outcomes;
create policy "own commitment outcomes" on public.commitment_outcomes for all
  to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table if not exists public.commitment_shares (
  id uuid primary key default gen_random_uuid(),
  commitment_id uuid not null references public.commitments(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  lines jsonb not null default '[]'::jsonb,
  start_date date not null,
  end_date date not null,
  status text not null default 'active' check (status in ('upcoming', 'active', 'success', 'failed')),
  week int not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (commitment_id, group_id)
);
create index if not exists commitment_shares_group_idx
  on public.commitment_shares (group_id, created_at desc);
drop trigger if exists commitment_shares_set_updated_at on public.commitment_shares;
create trigger commitment_shares_set_updated_at
  before update on public.commitment_shares
  for each row execute function public.set_updated_at();
alter table public.commitment_shares enable row level security;
drop policy if exists "group members read commitment shares" on public.commitment_shares;
create policy "group members read commitment shares" on public.commitment_shares for select
  to authenticated
  using (user_id = (select auth.uid()) or public.is_group_member(group_id));
drop policy if exists "own commitment shares insert" on public.commitment_shares;
create policy "own commitment shares insert" on public.commitment_shares for insert
  to authenticated
  with check (user_id = (select auth.uid()) and public.is_group_member(group_id));
drop policy if exists "own commitment shares update" on public.commitment_shares;
create policy "own commitment shares update" on public.commitment_shares for update
  to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
drop policy if exists "own commitment shares delete" on public.commitment_shares;
create policy "own commitment shares delete" on public.commitment_shares for delete
  to authenticated
  using (user_id = (select auth.uid()));

create table if not exists public.meal_skips (
  user_id uuid not null references auth.users(id) on delete cascade,
  for_date date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  created_at timestamptz not null default now(),
  primary key (user_id, for_date, meal)
);
alter table public.meal_skips enable row level security;
drop policy if exists "own meal skips" on public.meal_skips;
create policy "own meal skips" on public.meal_skips for all
  to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

notify pgrst, 'reload schema';
