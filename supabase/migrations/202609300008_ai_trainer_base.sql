-- AI 트레이너 요금제 1단계(기반) — 2026-09-30, docs/ai-trainer-plans-2026-09-30.html
--  ① AI 맞춤 추천 동의 시각(기록 요약을 외부 AI 로 보내기 전에 한 번 받는다. null = 동의 안 함)
--  ② 아픈 부위(추천에서 그 부위 운동을 뺀다). 앱 부위 id 와 같은 값만.
--  ③ 운동 전 컨디션 체크인(하루 한 행). 1=나쁨 2=보통 3=좋음.

alter table public.profiles
  add column if not exists ai_consent_at timestamptz;

alter table public.profiles
  add column if not exists pain_areas text[] not null default '{}';
alter table public.profiles drop constraint if exists profiles_pain_areas_check;
alter table public.profiles add constraint profiles_pain_areas_check
  check (pain_areas <@ array['chest','back','shoulder','arm','lower','core']::text[]);

create table if not exists public.daily_checkins (
  user_id uuid not null references auth.users(id) on delete cascade,
  for_date date not null,
  sleep smallint not null check (sleep between 1 and 3),
  soreness smallint not null check (soreness between 1 and 3),
  energy smallint not null check (energy between 1 and 3),
  created_at timestamptz not null default now(),
  primary key (user_id, for_date)
);
alter table public.daily_checkins enable row level security;
drop policy if exists "own daily checkins" on public.daily_checkins;
create policy "own daily checkins" on public.daily_checkins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
