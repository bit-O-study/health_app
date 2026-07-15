-- Health Platform MVP Supabase schema.
--
-- Applied on 2026-05-18 with the Supabase connection pooler from the local
-- development machine. This file is intentionally idempotent: it can be run
-- again to recreate policies, upsert the Storage bucket configuration, and
-- refresh the seeded exercise records without duplicating them.
--
-- Creates:
-- - public.exercises
-- - public.exercise_videos
-- - public.video_comments
-- - storage bucket: exercise-videos
-- - public read policies plus anonymous insert policies for MVP testing

create extension if not exists "pgcrypto";

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  summary text not null,
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  equipment text not null,
  target_muscles text[] not null default '{}',
  cues text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.exercise_videos (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  title text not null,
  video_url text not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.video_comments (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.exercise_videos(id) on delete cascade,
  nickname text not null default '익명',
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.exercises enable row level security;
alter table public.exercise_videos enable row level security;
alter table public.video_comments enable row level security;

drop policy if exists "Exercises are publicly readable" on public.exercises;
create policy "Exercises are publicly readable"
  on public.exercises for select
  using (true);

drop policy if exists "Videos are publicly readable" on public.exercise_videos;
create policy "Videos are publicly readable"
  on public.exercise_videos for select
  using (true);

drop policy if exists "Anyone can add exercise videos" on public.exercise_videos;
create policy "Anyone can add exercise videos"
  on public.exercise_videos for insert
  with check (true);

drop policy if exists "Comments are publicly readable" on public.video_comments;
create policy "Comments are publicly readable"
  on public.video_comments for select
  using (true);

drop policy if exists "Anyone can add comments" on public.video_comments;
create policy "Anyone can add comments"
  on public.video_comments for insert
  with check (length(trim(body)) > 0);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exercise-videos',
  'exercise-videos',
  true,
  104857600,
  array['video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Exercise videos are publicly readable" on storage.objects;
create policy "Exercise videos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'exercise-videos');

drop policy if exists "Anyone can upload exercise videos" on storage.objects;
create policy "Anyone can upload exercise videos"
  on storage.objects for insert
  with check (bucket_id = 'exercise-videos');

-- 음식 사진 버킷(food-photos) — 식단 기록에 사진 첨부.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'food-photos',
  'food-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Food photos are publicly readable" on storage.objects;
create policy "Food photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'food-photos');

drop policy if exists "Users can upload own food photos" on storage.objects;
create policy "Users can upload own food photos"
  on storage.objects for insert
  with check (bucket_id = 'food-photos' and owner = auth.uid());

drop policy if exists "Users can delete own food photos" on storage.objects;
create policy "Users can delete own food photos"
  on storage.objects for delete
  using (bucket_id = 'food-photos' and owner = auth.uid());

insert into public.exercises
  (slug, name, summary, difficulty, equipment, target_muscles, cues)
values
  (
    'squat',
    '스쿼트',
    '하체 전반과 코어 안정성을 함께 확인하기 좋은 기본 운동입니다.',
    'beginner',
    '바벨 또는 맨몸',
    array['대퇴사두근', '둔근', '햄스트링', '코어'],
    array['무릎과 발끝 방향을 맞추기', '허리를 과하게 꺾지 않기', '발 전체로 바닥 밀기']
  ),
  (
    'deadlift',
    '데드리프트',
    '힙 힌지와 등 고정, 바 경로를 점검하기 좋은 전신 근력 운동입니다.',
    'intermediate',
    '바벨',
    array['둔근', '햄스트링', '척추기립근', '광배근'],
    array['바를 몸 가까이 유지하기', '등을 먼저 말아 올리지 않기', '엉덩이와 가슴을 함께 세우기']
  ),
  (
    'bench-press',
    '벤치프레스',
    '상체 밀기 패턴과 견갑 안정성을 확인하는 대표적인 가슴 운동입니다.',
    'intermediate',
    '바벨, 벤치',
    array['대흉근', '삼두근', '전면 삼각근'],
    array['견갑을 고정하기', '손목을 세워 바를 받치기', '가슴 위에서 일정한 경로 유지하기']
  )
on conflict (slug) do update set
  name = excluded.name,
  summary = excluded.summary,
  difficulty = excluded.difficulty,
  equipment = excluded.equipment,
  target_muscles = excluded.target_muscles,
  cues = excluded.cues;

-- Per-user weekly routine selection.
--
-- One row per user (upsert on user_id). `splits` + `variant_id` reference the
-- preset catalog in src/features/routine/data.ts. `start_date` records when the
-- routine began; the home page maps the current date's weekday onto the
-- variant's Mon~Sun plan. Protected by Supabase Auth (email/password) RLS so a
-- user can only read/write their own routine.
--
-- Custom split: when `variant_id = 'custom'`, `splits = 0` and `custom_week`
-- holds 7 block ids (Mon~Sun) from DAY_BLOCKS in src/features/routine/data.ts.

create table if not exists public.user_routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  splits int not null check (splits between 0 and 6),
  variant_id text not null,
  custom_week jsonb,
  start_date date not null default current_date,
  rest_date date,
  override_date date,
  override_block text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Idempotent migration for tables created before later features.
-- `start_date` is the routine anchor (day 0). `rest_date` = the date the user
-- converted "today" to rest; converting also bumps start_date +1 so the missed
-- workout slides to the next day. `override_date`/`override_block` = a
-- today-only focus swap (does NOT shift the routine).
alter table public.user_routines
  add column if not exists custom_week jsonb;
alter table public.user_routines
  add column if not exists rest_date date;
alter table public.user_routines
  add column if not exists override_date date;
alter table public.user_routines
  add column if not exists override_block text;
-- 기준(설정) 루틴 스냅샷 {splits, variant_id, custom_week}. '설정>루틴 설정'/온보딩/
-- 프리셋 로드에서만 갱신되고, '다가오는 7일' 드래그/오늘만 변경 같은 임시 변경은
-- 건드리지 않는다. '오늘부터 다시 시작하기'가 이걸로 루틴을 복원한다.
alter table public.user_routines
  add column if not exists baseline_routine jsonb;
-- 일차별(day_index) 마이그레이션 완료 플래그. true 면 매 페이지 로드마다 돌던
-- 백필 count 쿼리를 건너뛴다(성능). 마이그레이션이 끝나면 true 로 세팅.
alter table public.user_routines
  add column if not exists day_index_migrated boolean not null default false;
-- '오늘만 변경(전체 바꾸기/직접 담기)'으로 하루 민 날짜. 이 날짜가 오늘이면 화면에서
-- 원래 루틴 운동을 숨긴다(변경된 빈 날). 재클릭해도 하루만 밀리게 하는 멱등 마커.
alter table public.user_routines
  add column if not exists last_deferred_date date;
-- 그 날 defer 를 만든 방식 — 'direct'(직접 담기) 또는 부위 목록('chest,back').
-- 밀린 빈 날의 '운동 등록하기' 링크를 원래 흐름(직접/부위)으로 되돌려주기 위함.
alter table public.user_routines
  add column if not exists deferred_target text;
alter table public.user_routines
  drop constraint if exists user_routines_splits_check;
alter table public.user_routines
  add constraint user_routines_splits_check check (splits between 0 and 7);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_routines_set_updated_at on public.user_routines;
create trigger user_routines_set_updated_at
  before update on public.user_routines
  for each row execute function public.set_updated_at();

alter table public.user_routines enable row level security;

drop policy if exists "Users can read own routine" on public.user_routines;
create policy "Users can read own routine"
  on public.user_routines for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own routine" on public.user_routines;
create policy "Users can insert own routine"
  on public.user_routines for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own routine" on public.user_routines;
create policy "Users can update own routine"
  on public.user_routines for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own routine" on public.user_routines;
create policy "Users can delete own routine"
  on public.user_routines for delete
  using (auth.uid() = user_id);

-- Onboarding profile.
--
-- One row per user (upsert on user_id), written right after sign-up. `gender`
-- and `experience` drive the code-based routine recommendation in
-- src/features/profile/data.ts. RLS so a user only reads/writes their own row.

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  gender text not null check (gender in ('male', 'female')),
  experience text not null
    check (experience in ('beginner', 'intermediate', 'advanced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Body metrics for personalized set/rep/weight prescription.
-- body_type: 'lean' | 'average' | 'heavy' (validated in code).
alter table public.profiles add column if not exists height_cm int;
alter table public.profiles add column if not exists weight_kg numeric(5, 1);
alter table public.profiles add column if not exists body_type text;
alter table public.profiles add column if not exists body_fat_pct numeric(4, 1);
alter table public.profiles add column if not exists muscle_mass_kg numeric(5, 1);

-- 개인설정: 운동영상(가이드 오버레이) 안 보기. true 면 '운동 시작' 시 영상 가이드 대신
-- 타이머(중지/시작/저장)만 표시. 기본 false(영상 보기).
alter table public.profiles
  add column if not exists hide_exercise_videos boolean not null default false;

-- 개인설정(운동 모드 표시·휴식 알림). 모두 기본 켜짐.
-- show_exercise_guide:     자세 잡기·자극 부위·핵심 포인트·초보 팁 상세 카드 표시.
-- rest_sound / rest_haptic: 휴식 종료 시 비프음 / 진동.
alter table public.profiles
  add column if not exists show_exercise_guide boolean not null default true;
alter table public.profiles
  add column if not exists rest_sound boolean not null default true;
alter table public.profiles
  add column if not exists rest_haptic boolean not null default true;
-- lock_weight_reps: 무게·횟수를 미리 '고정'으로 정할지. 기본 false(끔) = 메인·편집·등록에
-- 무게/횟수 숨기고 운동모드에서 그때그때 설정. true 면 미리 정해 메인에 표시/수정.
alter table public.profiles
  add column if not exists lock_weight_reps boolean not null default false;

-- Registered workout plan per user, grouped by focus (DayPlan tone).
--
-- "추천 운동들로 등록" fills this from the recommendation; "직접 등록" lets the
-- user add rows manually. The home "오늘의 운동" reads the rows for today's
-- focus. exercise_id/equipment reference src/features/routine/exercise-catalog.ts.

create table if not exists public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  focus text not null,
  position int not null default 0,
  exercise_id text not null,
  equipment text not null,
  sets int not null default 3 check (sets between 1 and 20),
  reps int not null default 10 check (reps between 1 and 100),
  weight_kg numeric(5, 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 세트별 무게·횟수(드롭세트·피라미드). null = 균일(sets×reps@weight_kg). 하위호환.
-- 형식: [{"weightKg": 15, "reps": 12}, {"weightKg": 20, "reps": 10}, ...]
alter table public.routine_exercises add column if not exists set_details jsonb;

-- 운동별 메모 (자세 주의점 등). 운동별 고정 — 매일 같은 메모가 표시된다.
alter table public.routine_exercises add column if not exists memo text;

-- 주기 N일차(0~6). 같은 focus 가 여러 일차에 나와도(PPL×2 등) 일차별로 독립
-- 보관해 한 일차 편집이 다른 날에 새지 않게 한다. NULL = 미마이그레이션(앱이 백필).
alter table public.routine_exercises add column if not exists day_index int;
alter table public.routine_exercises
  drop constraint if exists routine_exercises_day_index_check;
alter table public.routine_exercises
  add constraint routine_exercises_day_index_check
  check (day_index is null or day_index between 0 and 6);

create index if not exists routine_exercises_user_focus_idx
  on public.routine_exercises (user_id, focus, position);

create index if not exists routine_exercises_user_day_focus_idx
  on public.routine_exercises (user_id, day_index, focus, position);

drop trigger if exists routine_exercises_set_updated_at on public.routine_exercises;
create trigger routine_exercises_set_updated_at
  before update on public.routine_exercises
  for each row execute function public.set_updated_at();

alter table public.routine_exercises enable row level security;

drop policy if exists "Users can read own routine exercises" on public.routine_exercises;
create policy "Users can read own routine exercises"
  on public.routine_exercises for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own routine exercises" on public.routine_exercises;
create policy "Users can insert own routine exercises"
  on public.routine_exercises for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own routine exercises" on public.routine_exercises;
create policy "Users can update own routine exercises"
  on public.routine_exercises for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own routine exercises" on public.routine_exercises;
create policy "Users can delete own routine exercises"
  on public.routine_exercises for delete
  using (auth.uid() = user_id);

-- Weight log history (one row per weigh-in). The latest also mirrors into
-- public.profiles.weight_kg. Drives the weight graph on /settings/profile.

create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight_kg numeric(5, 1) check (weight_kg between 30 and 250),
  height_cm int,
  body_fat_pct numeric(4, 1),
  muscle_mass_kg numeric(5, 1),
  created_at timestamptz not null default now()
);

create index if not exists weight_logs_user_idx
  on public.weight_logs (user_id, created_at);

-- Idempotent: original table had only a NOT NULL weight_kg.
alter table public.weight_logs alter column weight_kg drop not null;
alter table public.weight_logs add column if not exists height_cm int;
alter table public.weight_logs add column if not exists body_fat_pct numeric(4, 1);
alter table public.weight_logs
  add column if not exists muscle_mass_kg numeric(5, 1);

alter table public.weight_logs enable row level security;

drop policy if exists "Users can read own weight logs" on public.weight_logs;
create policy "Users can read own weight logs"
  on public.weight_logs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own weight logs" on public.weight_logs;
create policy "Users can insert own weight logs"
  on public.weight_logs for insert
  with check (auth.uid() = user_id);

-- Per-user warmup/cooldown selection per focus (running/stairs/stretches).
-- item_id references src/features/routine/conditioning-catalog.ts.
-- speed/incline carry meaning per item (e.g., 런닝 km/h, 천국의 계단 단계).

create table if not exists public.routine_conditioning (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  focus text not null,
  kind text not null check (kind in ('warmup', 'cooldown')),
  position int not null default 0,
  item_id text not null,
  duration_min int check (duration_min between 0 and 300),
  speed numeric(5, 1),
  incline numeric(4, 1),
  created_at timestamptz not null default now()
);

create index if not exists routine_conditioning_user_idx
  on public.routine_conditioning (user_id, focus, kind, position);

-- 워밍업/마무리 개인 메모
alter table public.routine_conditioning add column if not exists memo text;
-- 비유산소(모빌리티·스트레칭)는 시간 대신 세트/횟수로 입력 — 유산소는 그대로 시간/속도/경사.
alter table public.routine_conditioning add column if not exists sets int check (sets between 1 and 20);
alter table public.routine_conditioning add column if not exists reps int check (reps between 1 and 100);

alter table public.routine_conditioning enable row level security;

drop policy if exists "Users can read own conditioning" on public.routine_conditioning;
create policy "Users can read own conditioning"
  on public.routine_conditioning for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own conditioning" on public.routine_conditioning;
create policy "Users can insert own conditioning"
  on public.routine_conditioning for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own conditioning" on public.routine_conditioning;
create policy "Users can update own conditioning"
  on public.routine_conditioning for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own conditioning" on public.routine_conditioning;
create policy "Users can delete own conditioning"
  on public.routine_conditioning for delete
  using (auth.uid() = user_id);

-- Per-date main-exercise override (오늘만 본운동 변경).
-- When present for today, home uses these rows instead of routine_exercises.
create table if not exists public.daily_plan (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  for_date date not null,
  focus text not null,
  position int not null default 0,
  exercise_id text not null,
  equipment text not null,
  sets int not null default 3 check (sets between 1 and 20),
  reps int not null default 10 check (reps between 1 and 100),
  weight_kg numeric(5, 1),
  created_at timestamptz not null default now()
);

-- 세트별 무게·횟수 오버라이드 (routine_exercises.set_details 와 동일 형식)
alter table public.daily_plan add column if not exists set_details jsonb;

-- 운동별 메모 (오늘만 오버라이드 행에도 보존)
alter table public.daily_plan add column if not exists memo text;

create index if not exists daily_plan_user_date_idx
  on public.daily_plan (user_id, for_date, focus, position);

alter table public.daily_plan enable row level security;

drop policy if exists "Users can read own daily plan" on public.daily_plan;
create policy "Users can read own daily plan"
  on public.daily_plan for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own daily plan" on public.daily_plan;
create policy "Users can insert own daily plan"
  on public.daily_plan for insert
  with check (auth.uid() = user_id);

-- ⚠ UPDATE 정책 필수 — updateExerciseAction(메모/세트/무게 수정)·reorderPlanAction(순서)
-- 이 daily_plan(오늘만 변경 오버라이드) 행을 update 한다. 없으면 RLS 가 조용히 막아
-- 오버라이드 행의 인라인 수정·정렬이 반영 안 됨.
drop policy if exists "Users can update own daily plan" on public.daily_plan;
create policy "Users can update own daily plan"
  on public.daily_plan for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own daily plan" on public.daily_plan;
create policy "Users can delete own daily plan"
  on public.daily_plan for delete
  using (auth.uid() = user_id);

-- Per-date warmup/cooldown override. When present for today, the home screen
-- uses these instead of the per-focus default in routine_conditioning. Lets
-- the user vary today's conditioning without changing the default.

create table if not exists public.daily_conditioning (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  for_date date not null,
  kind text not null check (kind in ('warmup', 'cooldown')),
  position int not null default 0,
  item_id text not null,
  duration_min int check (duration_min between 0 and 300),
  speed numeric(5, 1),
  incline numeric(4, 1),
  created_at timestamptz not null default now()
);

create index if not exists daily_conditioning_user_date_idx
  on public.daily_conditioning (user_id, for_date, kind, position);

-- 워밍업/마무리 개인 메모 (오늘만 오버라이드 행에도 보존)
alter table public.daily_conditioning add column if not exists memo text;
alter table public.daily_conditioning add column if not exists sets int check (sets between 1 and 20);
alter table public.daily_conditioning add column if not exists reps int check (reps between 1 and 100);

alter table public.daily_conditioning enable row level security;

drop policy if exists "Users can read own daily conditioning" on public.daily_conditioning;
create policy "Users can read own daily conditioning"
  on public.daily_conditioning for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own daily conditioning" on public.daily_conditioning;
create policy "Users can insert own daily conditioning"
  on public.daily_conditioning for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own daily conditioning" on public.daily_conditioning;
create policy "Users can update own daily conditioning"
  on public.daily_conditioning for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own daily conditioning" on public.daily_conditioning;
create policy "Users can delete own daily conditioning"
  on public.daily_conditioning for delete
  using (auth.uid() = user_id);

-- Workout completions (one row per user per date). Used to score 운동 점수
-- with time decay on /settings/score.

create table if not exists public.workout_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  for_date date not null,
  focus text not null,
  calories int,
  created_at timestamptz not null default now(),
  unique (user_id, for_date)
);

create index if not exists workout_completions_user_date_idx
  on public.workout_completions (user_id, for_date desc);

alter table public.workout_completions enable row level security;

drop policy if exists "Users can read own completions" on public.workout_completions;
create policy "Users can read own completions"
  on public.workout_completions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own completions" on public.workout_completions;
create policy "Users can insert own completions"
  on public.workout_completions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own completions" on public.workout_completions;
create policy "Users can update own completions"
  on public.workout_completions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own completions" on public.workout_completions;
create policy "Users can delete own completions"
  on public.workout_completions for delete
  using (auth.uid() = user_id);

-- Per-exercise completion log. One row per (user, date, routine_exercise).
-- Drives both the per-row checkbox and the decayed score on /settings/score.

create table if not exists public.exercise_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  for_date date not null,
  exercise_row_id uuid not null references public.routine_exercises(id) on delete cascade,
  status text not null default 'done',
  created_at timestamptz not null default now(),
  unique (user_id, for_date, exercise_row_id)
);

-- Idempotent: add status column for older databases + ensure check constraint
alter table public.exercise_completions add column if not exists status text not null default 'done';
alter table public.exercise_completions drop constraint if exists exercise_completions_status_check;
alter table public.exercise_completions
  add constraint exercise_completions_status_check check (status in ('done', 'skipped'));

-- exercise_row_id 는 routine_exercises.id 또는 daily_plan.id 를 모두 가리킬 수
-- 있어야 하므로 외래키 제약을 제거하고 앱에서 처리한다.
alter table public.exercise_completions
  drop constraint if exists exercise_completions_exercise_row_id_fkey;

-- 완료 시점 스냅샷 (계획이 바뀌어도 기록 손실 없이 표시 가능)
alter table public.exercise_completions add column if not exists exercise_id text;
alter table public.exercise_completions add column if not exists equipment text;
alter table public.exercise_completions add column if not exists sets int;
alter table public.exercise_completions add column if not exists reps int;
alter table public.exercise_completions add column if not exists weight_kg numeric(5, 1);
alter table public.exercise_completions add column if not exists focus text;
-- 완료 시점 세트별 무게·횟수 스냅샷 (set_details, null = 균일)
alter table public.exercise_completions add column if not exists set_details jsonb;

-- Per-day done/skipped status for warmup/cooldown items.
-- Keyed by source_row_id (routine_conditioning.id 또는 daily_conditioning.id)
-- 동일 item 이 두 번 들어 있어도 행별로 독립 추적 가능.
create table if not exists public.conditioning_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  for_date date not null,
  kind text not null check (kind in ('warmup', 'cooldown')),
  item_id text not null,
  source_row_id uuid,
  status text not null default 'done' check (status in ('done', 'skipped')),
  created_at timestamptz not null default now()
);

-- 마이그레이션: 옛 (item_id) 유니크 제거 후, (source_row_id) 기반 유니크
alter table public.conditioning_completions
  add column if not exists source_row_id uuid;
-- 완료 시점 스냅샷 (시간/속도/경사)
alter table public.conditioning_completions
  add column if not exists duration_min int;
alter table public.conditioning_completions
  add column if not exists speed numeric(5, 1);
alter table public.conditioning_completions
  add column if not exists incline numeric(4, 1);
alter table public.conditioning_completions
  add column if not exists sets int;
alter table public.conditioning_completions
  add column if not exists reps int;
alter table public.conditioning_completions
  drop constraint if exists conditioning_completions_user_id_for_date_kind_item_id_key;
create unique index if not exists conditioning_completions_by_source_row_idx
  on public.conditioning_completions (user_id, for_date, kind, source_row_id)
  where source_row_id is not null;

create index if not exists conditioning_completions_user_date_idx
  on public.conditioning_completions (user_id, for_date desc);
-- 그룹 랭킹 카운트(status='done' 만 스캔) 가속용 부분 인덱스.
create index if not exists conditioning_completions_done_idx
  on public.conditioning_completions (user_id, for_date) where status = 'done';

alter table public.conditioning_completions enable row level security;

drop policy if exists "Users can read own conditioning completions" on public.conditioning_completions;
create policy "Users can read own conditioning completions"
  on public.conditioning_completions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own conditioning completions" on public.conditioning_completions;
create policy "Users can insert own conditioning completions"
  on public.conditioning_completions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own conditioning completions" on public.conditioning_completions;
create policy "Users can update own conditioning completions"
  on public.conditioning_completions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own conditioning completions" on public.conditioning_completions;
create policy "Users can delete own conditioning completions"
  on public.conditioning_completions for delete
  using (auth.uid() = user_id);

create index if not exists exercise_completions_user_date_idx
  on public.exercise_completions (user_id, for_date desc);
-- 그룹 랭킹 카운트(status='done' 만 스캔) 가속용 부분 인덱스.
create index if not exists exercise_completions_done_idx
  on public.exercise_completions (user_id, for_date) where status = 'done';

alter table public.exercise_completions enable row level security;

drop policy if exists "Users can read own exercise completions" on public.exercise_completions;
create policy "Users can read own exercise completions"
  on public.exercise_completions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own exercise completions" on public.exercise_completions;
create policy "Users can insert own exercise completions"
  on public.exercise_completions for insert
  with check (auth.uid() = user_id);

-- upsert(onConflict) 가 conflict 시 UPDATE 경로를 타므로 update 정책 필수.
-- 누락 시 이미 완료 행이 있는 운동의 재완료/상태변경이 RLS 에 막혀 "완료 안 됨" 증상.
drop policy if exists "Users can update own exercise completions" on public.exercise_completions;
create policy "Users can update own exercise completions"
  on public.exercise_completions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own exercise completions" on public.exercise_completions;
create policy "Users can delete own exercise completions"
  on public.exercise_completions for delete
  using (auth.uid() = user_id);

-- Body composition snapshots (체성분 분석지 등록).
-- 민감정보(건강) 수집에 대한 별도 동의(consent_at)를 행마다 기록한다.
-- image_path 는 storage 버킷 body-composition-images 안의 private 경로.

create table if not exists public.body_compositions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  measured_at date not null default current_date,
  weight_kg numeric(5, 1),
  skeletal_muscle_kg numeric(5, 1),
  body_fat_kg numeric(5, 1),
  body_fat_pct numeric(4, 1),
  muscle_right_arm numeric(4, 1),
  muscle_left_arm numeric(4, 1),
  muscle_trunk numeric(4, 1),
  muscle_right_leg numeric(4, 1),
  muscle_left_leg numeric(4, 1),
  fat_right_arm numeric(4, 1),
  fat_left_arm numeric(4, 1),
  fat_trunk numeric(4, 1),
  fat_right_leg numeric(4, 1),
  fat_left_leg numeric(4, 1),
  image_path text,
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists body_compositions_user_idx
  on public.body_compositions (user_id, measured_at desc);

alter table public.body_compositions enable row level security;

drop policy if exists "Users can read own body composition" on public.body_compositions;
create policy "Users can read own body composition"
  on public.body_compositions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own body composition" on public.body_compositions;
create policy "Users can insert own body composition"
  on public.body_compositions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own body composition" on public.body_compositions;
create policy "Users can delete own body composition"
  on public.body_compositions for delete
  using (auth.uid() = user_id);

-- Storage bucket — private, 사용자 자신의 폴더(<userId>/...) 에만 접근.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'body-composition-images',
  'body-composition-images',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users read own body comp images" on storage.objects;
create policy "Users read own body comp images"
  on storage.objects for select
  using (
    bucket_id = 'body-composition-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users upload own body comp images" on storage.objects;
create policy "Users upload own body comp images"
  on storage.objects for insert
  with check (
    bucket_id = 'body-composition-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users delete own body comp images" on storage.objects;
create policy "Users delete own body comp images"
  on storage.objects for delete
  using (
    bucket_id = 'body-composition-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ────────────────────────────────────────────────────────────────
-- 일자별 누적 운동 시간. 운동시작 → 정지/일시정지/저장 사이 경과 시간을 누적.
-- 같은 날 여러 세션 가능(오전+저녁 등) → 같은 (user, for_date) 행에 누적.
create table if not exists public.workout_sessions (
  user_id uuid not null references auth.users(id) on delete cascade,
  for_date date not null,
  duration_sec integer not null default 0 check (duration_sec >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, for_date)
);

create index if not exists workout_sessions_date_idx
  on public.workout_sessions (user_id, for_date desc);

alter table public.workout_sessions enable row level security;

drop policy if exists "Users read own workout sessions" on public.workout_sessions;
create policy "Users read own workout sessions"
  on public.workout_sessions for select
  using (auth.uid() = user_id);

drop policy if exists "Users insert own workout sessions" on public.workout_sessions;
create policy "Users insert own workout sessions"
  on public.workout_sessions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users update own workout sessions" on public.workout_sessions;
create policy "Users update own workout sessions"
  on public.workout_sessions for update
  using (auth.uid() = user_id);

-- ────────────────────────────────────────────────────────────────
-- 헬스장 마스터 (크라우드소싱 시드).
-- 같은 헬스장이라도 일단은 행 중복 허용 — 사용자가 자기 정보만 관리.
-- 추후 크라우드소싱으로 확장 시 dedup 로직 추가.
create table if not exists public.gyms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  equipment_ids text[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gyms_name_idx on public.gyms (lower(name));

alter table public.gyms enable row level security;

-- 헬스장은 공개 정보 — 누구나 읽음 (나중에 다른 사용자가 같은 헬스장 찾을 수 있게)
drop policy if exists "Anyone reads gyms" on public.gyms;
create policy "Anyone reads gyms"
  on public.gyms for select using (true);

drop policy if exists "Authenticated insert gyms" on public.gyms;
create policy "Authenticated insert gyms"
  on public.gyms for insert
  with check (auth.uid() is not null);

-- 본인이 등록한 헬스장만 수정 가능
drop policy if exists "Creator updates gym" on public.gyms;
create policy "Creator updates gym"
  on public.gyms for update
  using (auth.uid() = created_by);

-- 사용자 프로필에 현재 헬스장 연결
alter table public.profiles
  add column if not exists gym_id uuid references public.gyms(id) on delete set null;

-- ─────────────────────────────────────────────────────────────
-- 운동별 미디어 (영상/움짤 URL) — 전역 공용. 관리자(어드민 페이지)만 등록.
-- 운동 시작(가이드)·상세에서 모든 사용자에게 표출. 운동별 1개.
-- url 은 youtube/vimeo 링크 또는 직접 mp4/gif/이미지 URL.
create table if not exists public.exercise_media (
  exercise_id text primary key,
  url text not null,
  kind text not null default 'video' check (kind in ('video', 'gif', 'image')),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.exercise_media enable row level security;

-- 운동 미디어는 공용 정보 — 로그인 사용자 누구나 읽음
drop policy if exists "anyone reads exercise media" on public.exercise_media;
create policy "anyone reads exercise media" on public.exercise_media
  for select using (true);

-- 쓰기는 관리자 이메일만 (JWT email 클레임 기준). 새 관리자 추가 시 이 목록을 갱신.
drop policy if exists "admin writes exercise media" on public.exercise_media;
create policy "admin writes exercise media" on public.exercise_media
  for all
  using (lower(auth.jwt() ->> 'email') in ('jyg@elonsoft.co.kr', 'bong94688@gmail.com'))
  with check (lower(auth.jwt() ->> 'email') in ('jyg@elonsoft.co.kr', 'bong94688@gmail.com'));

-- ─────────────────────────────────────────────────────────────
-- 루틴 프리셋 (이름 붙여 저장 → 루틴설정에서 불러오기).
-- exercises: routine_exercises 스냅샷 배열.
create table if not exists public.routine_presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  splits int not null,
  variant_id text not null,
  custom_week jsonb,
  exercises jsonb not null default '[]'::jsonb,
  conditioning jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
-- 기존 DB 호환: 컬럼 없으면 추가
alter table public.routine_presets add column if not exists conditioning jsonb not null default '[]'::jsonb;

create index if not exists routine_presets_user_idx
  on public.routine_presets (user_id, created_at desc);

alter table public.routine_presets enable row level security;

drop policy if exists "read own routine presets" on public.routine_presets;
create policy "read own routine presets" on public.routine_presets
  for select using (auth.uid() = user_id);
drop policy if exists "insert own routine presets" on public.routine_presets;
create policy "insert own routine presets" on public.routine_presets
  for insert with check (auth.uid() = user_id);
drop policy if exists "update own routine presets" on public.routine_presets;
create policy "update own routine presets" on public.routine_presets
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "delete own routine presets" on public.routine_presets;
create policy "delete own routine presets" on public.routine_presets
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 관리자 — 이메일 기반. 회원 중에서 지정 가능(런타임 관리).
-- 첫 관리자: simbonggyo@gmail.com (seed). 관리자는 일반 화면 접근 차단, /admin 만.
create table if not exists public.admins (
  email text primary key,
  created_at timestamptz not null default now()
);
insert into public.admins (email) values ('simbonggyo@gmail.com')
  on conflict (email) do nothing;

-- SECURITY DEFINER — admins RLS 재귀를 피하면서 현재 사용자가 관리자인지 판정.
create or replace function public.is_admin() returns boolean
  language sql security definer stable set search_path = public as $$
  select exists(
    select 1 from public.admins where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

alter table public.admins enable row level security;
drop policy if exists "read admins" on public.admins;
create policy "read admins" on public.admins for select
  using (public.is_admin() or lower(email) = lower(auth.jwt() ->> 'email'));
drop policy if exists "admin inserts admins" on public.admins;
create policy "admin inserts admins" on public.admins for insert
  with check (public.is_admin());
drop policy if exists "admin deletes admins" on public.admins;
create policy "admin deletes admins" on public.admins for delete
  using (public.is_admin());

-- 관리자는 모든 회원 프로필 조회 가능 (회원정보 페이지)
drop policy if exists "admin reads all profiles" on public.profiles;
create policy "admin reads all profiles" on public.profiles for select
  using (public.is_admin());

-- exercise_media 쓰기 정책을 is_admin() 기반으로 (하드코딩 이메일 → DB 관리)
drop policy if exists "admin writes exercise media" on public.exercise_media;
create policy "admin writes exercise media" on public.exercise_media for all
  using (public.is_admin()) with check (public.is_admin());

-- 앱 설정(key-value). 관리자만 읽고 쓴다.
--   key='debug.<featureId>'  value=jsonb(boolean)  → 디버그 기능 '기능별 온오프'
--   key='debug.accounts'     value=jsonb(string[]) → '디버그 계정'(이메일) 목록
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null default 'null'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
drop policy if exists "admin reads app settings" on public.app_settings;
create policy "admin reads app settings" on public.app_settings for select
  using (public.is_admin());
drop policy if exists "admin writes app settings" on public.app_settings;
create policy "admin writes app settings" on public.app_settings for all
  using (public.is_admin()) with check (public.is_admin());

-- 디버그 계정 — 관리자(is_admin) 이거나 app_settings['debug.accounts'](이메일 배열)에 든 계정.
-- SECURITY DEFINER 라 비관리자 테스트 계정도 '자기 자신'이 디버그 계정인지 확인 가능(목록 자체는 노출 안 됨).
create or replace function public.is_debug_account() returns boolean
  language sql security definer stable set search_path = public as $$
  select public.is_admin() or exists(
    select 1
    from public.app_settings s
    cross join lateral jsonb_array_elements_text(
      case when jsonb_typeof(s.value) = 'array' then s.value else '[]'::jsonb end
    ) as e(email)
    where s.key = 'debug.accounts'
      and lower(e.email) = lower(auth.jwt() ->> 'email')
  );
$$;

-- 특정 기능이 '이 사용자에게' 보이나 — 노출 범위 3단계로 판정.
--   app_settings['debug.<id>'] 값:
--     '"public"'          → 전체 공개(모든 사용자 true)
--     'false' / '"hidden"' → 숨김(모두 false)
--     그 외/미설정         → 디버그 계정만(is_debug_account)  ← 기본
-- SECURITY DEFINER 라 비관리자 디버그 계정도 debug.<id> 상태를 확인할 수 있다.
create or replace function public.debug_feature_enabled(p_feature text) returns boolean
  language sql security definer stable set search_path = public as $$
  select case (
      select value from public.app_settings where key = 'debug.' || p_feature
    )
    when '"public"'::jsonb then true
    when 'false'::jsonb then false
    when '"hidden"'::jsonb then false
    else public.is_debug_account()
  end;
$$;

-- 회원 이름/전화번호 (회원가입 시 수집). 회원정보(관리자) 화면에 표시.
alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists phone text;
-- 닉네임(선택) — 그룹·마이페이지 등 공개 표시 이름. 없으면 이름으로 폴백.
alter table public.profiles add column if not exists nickname text;

-- 운동 목표(회원가입 설문) + 목표치 — 운동탭 체형기록 '남은 양' 표시에 사용.
--   weight_loss(체중감량)  → target_weight_kg 까지 몇 kg 남음
--   fat_loss(체지방감소)   → target_body_fat_pct 까지 몇 % 남음
--   muscle_gain(근육증가)  → target_muscle_kg 까지 몇 kg 남음
--   maintain(유지)         → 목표치 없음
alter table public.profiles add column if not exists goal text
  check (goal is null or goal in ('weight_loss', 'fat_loss', 'muscle_gain', 'maintain'));
alter table public.profiles add column if not exists target_weight_kg numeric;
alter table public.profiles add column if not exists target_body_fat_pct numeric;
alter table public.profiles add column if not exists target_muscle_kg numeric;

-- 회원 정지/영구정지 (관리자). suspended_until = 기간정지 만료시각(지나면 자동 해제),
-- banned_at = 영구정지 시각(수동 해제 전까지), ban_reason = 사유.
alter table public.profiles add column if not exists suspended_until timestamptz;
alter table public.profiles add column if not exists banned_at timestamptz;
alter table public.profiles add column if not exists ban_reason text;

-- 회원탈퇴(소프트). withdrawn_at 이 있으면 탈퇴 상태 — 데이터는 유지하되 앱 접근 차단.
-- 본인이 자기 프로필을 update(본인-only RLS)로 설정. 관리자가 null 로 되돌리면 복구.
alter table public.profiles add column if not exists withdrawn_at timestamptz;

-- 관리자 전용 회원 목록 — 이메일은 auth.users 소관이라 SECURITY DEFINER 로 join.
-- 내부 is_admin() 게이트로 비관리자는 0행. authenticated 만 execute.
-- 반환 타입에 정지/차단 컬럼을 추가하므로 기존 함수를 drop 후 재생성한다.
drop function if exists public.admin_members();
create or replace function public.admin_members()
returns table(
  user_id uuid, email text, name text, phone text,
  gender text, experience text, height_cm int,
  weight_kg numeric, created_at timestamptz,
  suspended_until timestamptz, banned_at timestamptz, ban_reason text,
  withdrawn_at timestamptz
)
language sql security definer stable set search_path = public, auth as $$
  select p.user_id, u.email::text, p.name, p.phone, p.gender, p.experience,
         p.height_cm, p.weight_kg, p.created_at,
         p.suspended_until, p.banned_at, p.ban_reason, p.withdrawn_at
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where public.is_admin()
  order by p.created_at desc
$$;
revoke all on function public.admin_members() from public, anon;
grant execute on function public.admin_members() to authenticated;

-- 관리자 전용: 특정 회원의 정지/차단 값 설정 (profiles 의 본인-only UPDATE RLS 우회).
-- 내부 is_admin() 게이트로 비관리자는 예외 발생.
create or replace function public.admin_set_user_ban(
  p_user_id uuid,
  p_suspended_until timestamptz,
  p_banned_at timestamptz,
  p_reason text
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden: admin only';
  end if;
  update public.profiles
    set suspended_until = p_suspended_until,
        banned_at = p_banned_at,
        ban_reason = p_reason
    where user_id = p_user_id;
end;
$$;
revoke all on function public.admin_set_user_ban(uuid, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.admin_set_user_ban(uuid, timestamptz, timestamptz, text) to authenticated;

-- 관리자 전용: 회원 탈퇴 복구(withdrawn_at = null). 본인 자가탈퇴는 본인-only update RLS 로.
create or replace function public.admin_restore_user(p_user_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden: admin only';
  end if;
  update public.profiles set withdrawn_at = null where user_id = p_user_id;
end;
$$;
revoke all on function public.admin_restore_user(uuid) from public, anon;
grant execute on function public.admin_restore_user(uuid) to authenticated;

-- 일별 활동(접속) 로그 — 접속유저수 통계용. 하루에 한 번 (user_id, active_date) 1행.
-- 미들웨어가 로그인 사용자의 매 네비게이션마다 upsert(on conflict do nothing) 한다.
create table if not exists public.user_activity (
  user_id uuid not null references auth.users(id) on delete cascade,
  active_date date not null,
  primary key (user_id, active_date)
);
alter table public.user_activity enable row level security;

drop policy if exists "Users insert own activity" on public.user_activity;
create policy "Users insert own activity"
  on public.user_activity for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users read own activity" on public.user_activity;
create policy "Users read own activity"
  on public.user_activity for select
  using (auth.uid() = user_id);

-- 관리자 전용: 활동(접속) 유저수 시계열. p_gran = 'day'|'month'|'year'.
-- distinct 는 버킷 단위로 DB 에서 계산해야 정확하다(월 distinct ≠ 일 distinct 합).
drop function if exists public.admin_active_users(text);
create or replace function public.admin_active_users(p_gran text)
returns table(bucket date, users int)
language sql security definer stable set search_path = public as $$
  select date_trunc(
           case when p_gran in ('day','month','year') then p_gran else 'day' end,
           a.active_date
         )::date as bucket,
         count(distinct a.user_id)::int as users
  from public.user_activity a
  where public.is_admin()
  group by 1
  order by 1
$$;
revoke all on function public.admin_active_users(text) from public, anon;
grant execute on function public.admin_active_users(text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 비밀번호 초기화 / 아이디·비밀번호 찾기
--   • 관리자: 회원 비밀번호 초기화(임시 비번 발급) → 이메일 발송 + 화면 표시
--   • 임시 비번으로 로그인하면 must_change_password=true 라 강제로 변경 화면으로
--   • 아이디 찾기: 이름 + 휴대폰 → 이메일 반환
--   • 비밀번호 찾기: 이메일 + 휴대폰 OTP 인증 후 화면에서 새 비번 직접 설정
--     (이메일/임시비번 발송 없음 — 도메인·비용 불필요)
-- ⚠ service_role 키 없이 동작하도록 SECURITY DEFINER 함수로 auth.users 를 직접
--   갱신한다(pgcrypto bcrypt). 익명 호출 함수(find/ reset_by_identity)는 휴대폰
--   OTP 인증을 실질적 게이트로 사용한다 — 운영에선 Supabase SMS OTP 활성화 권장.
-- ─────────────────────────────────────────────────────────────

-- 임시 비밀번호로 로그인하면 강제로 비밀번호 변경 화면으로 보내기 위한 플래그.
alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

-- 휴대폰 정규화 — auth-form 의 normalizePhone 과 동일 규칙(0→+82, 기호 제거).
-- 가입 시 +82… 로 저장되지만 찾기 화면 입력은 010-… 일 수 있어 양쪽을 맞춘다.
create or replace function public.norm_phone(p text) returns text
  language sql immutable set search_path = public as $$
  select case
    when p is null then null
    when regexp_replace(p, '[^0-9+]', '', 'g') like '+%'
      then regexp_replace(p, '[^0-9+]', '', 'g')
    when regexp_replace(p, '[^0-9]', '', 'g') like '0%'
      then '+82' || substring(regexp_replace(p, '[^0-9]', '', 'g') from 2)
    else regexp_replace(p, '[^0-9]', '', 'g')
  end;
$$;

-- 관리자 전용: 회원 비밀번호를 임시 비밀번호로 초기화.
-- auth.users.encrypted_password 를 bcrypt(pgcrypto) 로 갱신 + must_change_password=true.
create or replace function public.admin_reset_user_password(
  p_user_id uuid, p_password text
) returns void
language plpgsql security definer set search_path = public, auth, extensions as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden: admin only';
  end if;
  if length(coalesce(p_password, '')) < 6 then
    raise exception 'password too short';
  end if;
  update auth.users
    set encrypted_password = crypt(p_password, gen_salt('bf')),
        updated_at = now()
    where id = p_user_id;
  if not found then
    raise exception 'user not found';
  end if;
  update public.profiles set must_change_password = true where user_id = p_user_id;
end;
$$;
revoke all on function public.admin_reset_user_password(uuid, text) from public, anon;
grant execute on function public.admin_reset_user_password(uuid, text) to authenticated;

-- 아이디(이메일) 찾기: 이름 + 휴대폰 일치 시 이메일 반환(없으면 null). 탈퇴 회원 제외.
-- 익명 호출 허용 — 로그인 전 화면에서 사용. 휴대폰 OTP 가 실질적 게이트.
create or replace function public.find_login_email(p_name text, p_phone text)
returns text
language plpgsql security definer stable set search_path = public, auth as $$
declare v_email text;
begin
  select u.email::text into v_email
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where p.withdrawn_at is null
    and lower(btrim(coalesce(p.name, ''))) = lower(btrim(coalesce(p_name, '')))
    and public.norm_phone(p.phone) = public.norm_phone(p_phone)
  limit 1;
  return v_email;
end;
$$;
revoke all on function public.find_login_email(text, text) from public;
grant execute on function public.find_login_email(text, text) to anon, authenticated;

-- 비밀번호 찾기: 이메일 + 휴대폰 일치 시 사용자가 화면에서 입력한 새 비번으로 설정
-- (성공 시 true). 탈퇴 회원 제외. 본인이 정한 진짜 비번이므로 강제변경 플래그는 내린다
-- (관리자 임시비번으로 true 였더라도 여기서 해제). 익명 호출 허용 — 휴대폰 OTP 가 게이트.
create or replace function public.reset_password_by_identity(
  p_email text, p_phone text, p_new_password text
) returns boolean
language plpgsql security definer set search_path = public, auth, extensions as $$
declare v_uid uuid;
begin
  if length(coalesce(p_new_password, '')) < 6 then
    raise exception 'password too short';
  end if;
  select p.user_id into v_uid
  from public.profiles p
  join auth.users u on u.id = p.user_id
  where p.withdrawn_at is null
    and lower(u.email) = lower(btrim(coalesce(p_email, '')))
    and public.norm_phone(p.phone) = public.norm_phone(p_phone)
  limit 1;
  if v_uid is null then
    return false;
  end if;
  update auth.users
    set encrypted_password = crypt(p_new_password, gen_salt('bf')),
        updated_at = now()
    where id = v_uid;
  update public.profiles set must_change_password = false where user_id = v_uid;
  return true;
end;
$$;
revoke all on function public.reset_password_by_identity(text, text, text) from public;
-- 직접 초기화는 이메일 인증번호(OTP) 흐름으로 대체 — 익명/로그인 클라이언트 호출 차단해
-- 계정 탈취 표면을 줄인다(관리자용 admin_reset_user_password 와는 별개로 유지).
revoke execute on function public.reset_password_by_identity(text, text, text)
  from anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 비밀번호 찾기 — 이메일 인증번호(OTP). 휴대폰 SMS 없이 무료(Gmail/Resend)로 본인확인.
--   1) request_password_otp: 이메일+휴대폰 일치 시 6자리 코드 생성·저장(5분) → 코드 반환
--      (서버 액션이 이메일로 발송)
--   2) verify_otp_and_reset: 코드 검증(5회 제한) 통과 시 새 비번 설정
-- RLS 로 잠근 password_otps 테이블에 코드를 두고 SECURITY DEFINER 함수로만 접근.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.password_otps (
  email text primary key,
  code text not null,
  expires_at timestamptz not null,
  attempts int not null default 0
);
alter table public.password_otps enable row level security;
-- 정책 없음 → anon/authenticated 직접 접근 불가(아래 SECURITY DEFINER 함수로만).

-- 인증번호 발급: 이메일+휴대폰 일치 시 6자리 코드 생성·저장 후 반환(불일치 null).
-- ⚠ 익명 호출 함수라 코드가 호출자에게 반환된다 — service_role 키 없이 동작시키기 위한
--    절충. 완전 차단하려면 추후 service_role 로 서버에서만 코드를 다루도록 변경 권장.
create or replace function public.request_password_otp(p_email text, p_phone text)
returns text
language plpgsql security definer set search_path = public, auth as $$
declare v_uid uuid; v_code text;
begin
  select p.user_id into v_uid
  from public.profiles p join auth.users u on u.id = p.user_id
  where p.withdrawn_at is null
    and lower(u.email) = lower(btrim(coalesce(p_email, '')))
    and public.norm_phone(p.phone) = public.norm_phone(p_phone)
  limit 1;
  if v_uid is null then return null; end if;
  v_code := lpad((floor(random() * 1000000))::int::text, 6, '0');
  insert into public.password_otps(email, code, expires_at, attempts)
    values (lower(btrim(p_email)), v_code, now() + interval '5 minutes', 0)
    on conflict (email) do update
      set code = excluded.code, expires_at = excluded.expires_at, attempts = 0;
  return v_code;
end;
$$;
revoke all on function public.request_password_otp(text, text) from public;
grant execute on function public.request_password_otp(text, text) to anon, authenticated;

-- 인증번호 검증 + 새 비밀번호 설정. 반환: 'ok'|'invalid'|'expired'|'locked'|'nomatch'.
create or replace function public.verify_otp_and_reset(
  p_email text, p_phone text, p_code text, p_new_password text
) returns text
language plpgsql security definer set search_path = public, auth, extensions as $$
declare v_uid uuid; v_code text; v_exp timestamptz; v_att int; v_key text;
begin
  if length(coalesce(p_new_password, '')) < 6 then
    raise exception 'password too short';
  end if;
  select p.user_id into v_uid
  from public.profiles p join auth.users u on u.id = p.user_id
  where p.withdrawn_at is null
    and lower(u.email) = lower(btrim(coalesce(p_email, '')))
    and public.norm_phone(p.phone) = public.norm_phone(p_phone)
  limit 1;
  if v_uid is null then return 'nomatch'; end if;
  v_key := lower(btrim(coalesce(p_email, '')));
  select code, expires_at, attempts into v_code, v_exp, v_att
    from public.password_otps where email = v_key;
  if not found then return 'invalid'; end if;
  if v_att >= 5 then return 'locked'; end if;
  if v_exp < now() then return 'expired'; end if;
  if v_code <> btrim(coalesce(p_code, '')) then
    update public.password_otps set attempts = attempts + 1 where email = v_key;
    return 'invalid';
  end if;
  update auth.users
    set encrypted_password = crypt(p_new_password, gen_salt('bf')), updated_at = now()
    where id = v_uid;
  update public.profiles set must_change_password = false where user_id = v_uid;
  delete from public.password_otps where email = v_key;
  return 'ok';
end;
$$;
revoke all on function public.verify_otp_and_reset(text, text, text, text) from public;
grant execute on function public.verify_otp_and_reset(text, text, text, text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 식단 기록(food_logs) — 날짜·끼니별 음식 + 칼로리/탄단지. 끼니: 아침/점심/저녁/간식.
-- 같은 음식 중복 로깅 허용(유니크 없음).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  for_date date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  position int not null default 0,
  name text not null,
  kcal numeric(7, 1) not null default 0,
  protein_g numeric(6, 1),
  carbs_g numeric(6, 1),
  fat_g numeric(6, 1),
  amount text,
  category text,
  photo_url text,
  eaten_at time,
  created_at timestamptz not null default now()
);

-- 기존 DB 보정(컬럼 추가)
alter table public.food_logs add column if not exists category text;
alter table public.food_logs add column if not exists photo_url text;
alter table public.food_logs add column if not exists eaten_at time;

create index if not exists food_logs_user_date_idx
  on public.food_logs (user_id, for_date desc, meal, position);

alter table public.food_logs enable row level security;

drop policy if exists "Users can read own food logs" on public.food_logs;
create policy "Users can read own food logs"
  on public.food_logs for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own food logs" on public.food_logs;
create policy "Users can insert own food logs"
  on public.food_logs for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own food logs" on public.food_logs;
create policy "Users can update own food logs"
  on public.food_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own food logs" on public.food_logs;
create policy "Users can delete own food logs"
  on public.food_logs for delete
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 커스텀 음식(custom_foods) — 자동 성장 카탈로그. 정적 카탈로그(food-catalog.ts)에
-- 없는 음식을 AI 사진분석이 감지하면 여기에 자동 저장 → 다음부터 검색으로 잡힌다.
-- 전역 공유(누가 올리든 모두 검색 가능). norm_name(공백·소문자 정규화)로 중복 방지.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.custom_foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  norm_name text not null unique,
  category text,
  cuisine text,
  amount text not null default '1인분',
  kcal numeric(7, 1) not null default 0,
  protein_g numeric(6, 1) not null default 0,
  carbs_g numeric(6, 1) not null default 0,
  fat_g numeric(6, 1) not null default 0,
  source text not null default 'ai',
  created_by uuid references auth.users(id) on delete set null,
  hits int not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists custom_foods_name_idx on public.custom_foods (norm_name);
alter table public.custom_foods enable row level security;
-- 로그인 사용자면 누구나 읽기(공유 카탈로그) + 추가. 수정/삭제는 막는다(관리자 SQL로만).
drop policy if exists "authed read custom foods" on public.custom_foods;
create policy "authed read custom foods" on public.custom_foods for select
  using (auth.uid() is not null);
drop policy if exists "authed insert custom foods" on public.custom_foods;
create policy "authed insert custom foods" on public.custom_foods for insert
  with check (auth.uid() is not null);
notify pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────────
-- 월경(생리) 기록(cycle_logs) — 날짜별 생리여부·출혈량·증상·메모. 예측은 앱에서 계산.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.cycle_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  for_date date not null,
  is_period boolean not null default false,
  flow text check (flow in ('spotting', 'light', 'medium', 'heavy')),
  symptoms text[] not null default '{}',
  note text,
  created_at timestamptz not null default now(),
  unique (user_id, for_date)
);

create index if not exists cycle_logs_user_date_idx
  on public.cycle_logs (user_id, for_date desc);

alter table public.cycle_logs enable row level security;

drop policy if exists "Users can read own cycle logs" on public.cycle_logs;
create policy "Users can read own cycle logs"
  on public.cycle_logs for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own cycle logs" on public.cycle_logs;
create policy "Users can insert own cycle logs"
  on public.cycle_logs for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own cycle logs" on public.cycle_logs;
create policy "Users can update own cycle logs"
  on public.cycle_logs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own cycle logs" on public.cycle_logs;
create policy "Users can delete own cycle logs"
  on public.cycle_logs for delete using (auth.uid() = user_id);

notify pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────────
-- 그룹(groups) + 멤버(group_members) — 운동 랭킹대전. 공유 링크(invite_token)로 참여.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references auth.users(id) on delete cascade,
  invite_token text not null unique default encode(gen_random_bytes(9), 'hex'),
  created_at timestamptz not null default now()
);

create table if not exists public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  display_name text,
  unique (group_id, user_id)
);

alter table public.group_members add column if not exists display_name text;

create index if not exists group_members_user_idx on public.group_members (user_id);
create index if not exists group_members_group_idx on public.group_members (group_id);

-- 보안 정의자 헬퍼 — group_members RLS 재귀 방지용.
create or replace function public.is_group_member(gid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;

create or replace function public.shares_group_with(other uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.group_members a
    join public.group_members b on a.group_id = b.group_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

-- 토큰으로 그룹 참여(보안 정의자) / 가입 전 이름 미리보기.
create or replace function public.join_group_by_token(token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare gid uuid; nm text;
begin
  select id into gid from public.groups where invite_token = token;
  if gid is null then raise exception 'invalid_token'; end if;
  -- 표시 이름: 닉네임 → 이름 → 메타데이터 → 이메일 앞부분 → '회원'.
  select coalesce(
    nullif((select nickname from public.profiles where user_id = auth.uid()), ''),
    nullif((select name from public.profiles where user_id = auth.uid()), ''),
    nullif((select raw_user_meta_data->>'nickname' from auth.users where id = auth.uid()), ''),
    nullif((select raw_user_meta_data->>'name' from auth.users where id = auth.uid()), ''),
    nullif(split_part((select email from auth.users where id = auth.uid()), '@', 1), ''),
    '회원'
  ) into nm;
  insert into public.group_members (group_id, user_id, role, display_name)
    values (gid, auth.uid(), 'member', nm)
    on conflict (group_id, user_id) do nothing;
  return gid;
end; $$;

create or replace function public.group_name_by_token(token text)
returns text language sql security definer stable set search_path = public as $$
  select name from public.groups where invite_token = token;
$$;

alter table public.groups enable row level security;
alter table public.group_members enable row level security;

drop policy if exists "members read groups" on public.groups;
create policy "members read groups" on public.groups for select
  using (public.is_group_member(id) or owner_id = auth.uid() or public.is_post_moderator());
drop policy if exists "owner creates group" on public.groups;
create policy "owner creates group" on public.groups for insert
  with check (owner_id = auth.uid());
drop policy if exists "owner updates group" on public.groups;
create policy "owner updates group" on public.groups for update
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists "owner deletes group" on public.groups;
create policy "owner deletes group" on public.groups for delete
  using (owner_id = auth.uid());

drop policy if exists "members read members" on public.group_members;
create policy "members read members" on public.group_members for select
  using (public.is_group_member(group_id));
drop policy if exists "join self" on public.group_members;
create policy "join self" on public.group_members for insert
  with check (user_id = auth.uid());
drop policy if exists "leave self" on public.group_members;
create policy "leave self" on public.group_members for delete
  using (user_id = auth.uid());

-- 그룹원끼리 운동 기록·프로필 열람(랭킹 계산용). 기존 본인 전용 정책과 OR.
drop policy if exists "group mates read exercise completions" on public.exercise_completions;
create policy "group mates read exercise completions" on public.exercise_completions
  for select using (public.shares_group_with(user_id));
drop policy if exists "group mates read conditioning completions" on public.conditioning_completions;
create policy "group mates read conditioning completions" on public.conditioning_completions
  for select using (public.shares_group_with(user_id));
drop policy if exists "group mates read profiles" on public.profiles;
create policy "group mates read profiles" on public.profiles
  for select using (public.shares_group_with(user_id));
drop policy if exists "group mates read food logs" on public.food_logs;
create policy "group mates read food logs" on public.food_logs
  for select using (public.shares_group_with(user_id));

notify pgrst, 'reload schema';

-- 끼니별 식단 사진(meal_photos) — 끼니(아침/점심/저녁/간식)당 여러 장 가능.
-- position 오름차순이 등록 순서이며, 가장 앞(=먼저 등록한) 사진이 대표사진.
create table if not exists public.meal_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  for_date date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  photo_url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

-- 기존 DB 보정: 끼니당 1장 유니크 제거 + 정렬용 position 추가(여러 장 허용)
alter table public.meal_photos drop constraint if exists meal_photos_user_id_for_date_meal_key;
alter table public.meal_photos add column if not exists position int not null default 0;

create index if not exists meal_photos_user_date_idx
  on public.meal_photos (user_id, for_date);

alter table public.meal_photos enable row level security;

drop policy if exists "Users can read own meal photos" on public.meal_photos;
create policy "Users can read own meal photos" on public.meal_photos
  for select using (auth.uid() = user_id);
drop policy if exists "Users can insert own meal photos" on public.meal_photos;
create policy "Users can insert own meal photos" on public.meal_photos
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own meal photos" on public.meal_photos;
create policy "Users can update own meal photos" on public.meal_photos
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "Users can delete own meal photos" on public.meal_photos;
create policy "Users can delete own meal photos" on public.meal_photos
  for delete using (auth.uid() = user_id);

-- 그룹원끼리 끼니 사진 열람(오늘 식단 공유)
drop policy if exists "group mates read meal photos" on public.meal_photos;
create policy "group mates read meal photos" on public.meal_photos
  for select using (public.shares_group_with(user_id));

-- 그룹 응원 문구(group_cheers) — 그룹원이 다른 멤버의 '그날 기록'에 짧은 응원(≤10자)을 남긴다.
-- (group_id, from_user, to_user, for_date) 유니크 → 한 사람당 하루 한 문구(수정 가능).
create table if not exists public.group_cheers (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  from_user uuid not null references auth.users(id) on delete cascade,
  to_user uuid not null references auth.users(id) on delete cascade,
  for_date date not null,
  message text not null check (char_length(message) between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, from_user, to_user, for_date)
);
create index if not exists group_cheers_group_date_idx
  on public.group_cheers (group_id, for_date);
alter table public.group_cheers enable row level security;
drop policy if exists "members read cheers" on public.group_cheers;
create policy "members read cheers" on public.group_cheers for select
  using (public.is_group_member(group_id));
drop policy if exists "cheer mates" on public.group_cheers;
create policy "cheer mates" on public.group_cheers for insert
  with check (
    from_user = auth.uid()
    and public.is_group_member(group_id)
    and public.shares_group_with(to_user)
  );
drop policy if exists "edit own cheer" on public.group_cheers;
create policy "edit own cheer" on public.group_cheers for update
  using (from_user = auth.uid()) with check (from_user = auth.uid());
drop policy if exists "delete own cheer" on public.group_cheers;
create policy "delete own cheer" on public.group_cheers for delete
  using (from_user = auth.uid());

-- 주간 그룹 챌린지/목표(group_challenges) — 그룹장이 주간 목표 설정, 그룹 합산 진행률.
-- 주(week_from=월요일)당 하나. metric: 합산 kcal / 합산 운동횟수 / 합산 운동일수.
create table if not exists public.group_challenges (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  metric text not null check (metric in ('kcal', 'workouts', 'days')),
  target int not null check (target > 0),
  week_from date not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, week_from)
);
alter table public.group_challenges enable row level security;
drop policy if exists "members read challenge" on public.group_challenges;
create policy "members read challenge" on public.group_challenges for select
  using (public.is_group_member(group_id));
drop policy if exists "owner writes challenge" on public.group_challenges;
create policy "owner writes challenge" on public.group_challenges for all
  using (
    exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid())
  );
notify pgrst, 'reload schema';

-- 그룹 공유 펫(group_pets) — 그룹당 1마리(늑대/강아지). 그룹원들이 운동으로 코인을 모아
-- 함께 레벨업시킨다. Lv0 시작. coins: 사용가능 코인, synced_workouts: 코인 환산 완료한 그룹 누적 운동 수.
create table if not exists public.group_pets (
  group_id uuid primary key references public.groups(id) on delete cascade,
  name text not null default '',
  level int not null default 0,
  coins int not null default 0,
  progress int not null default 0, -- 다음 레벨에 넣은(투입한) 코인
  synced_workouts int not null default 0,
  owned jsonb not null default '[]'::jsonb,     -- 보유 꾸미기 아이템 id[]
  equipped jsonb not null default '{}'::jsonb,  -- slot -> itemId
  updated_at timestamptz not null default now()
);
alter table public.group_pets add column if not exists progress int not null default 0;
alter table public.group_pets add column if not exists owned jsonb not null default '[]'::jsonb;
alter table public.group_pets add column if not exists equipped jsonb not null default '{}'::jsonb;
alter table public.group_pets enable row level security;
drop policy if exists "members read group pet" on public.group_pets;
create policy "members read group pet" on public.group_pets for select
  using (public.is_group_member(group_id));
drop policy if exists "members write group pet" on public.group_pets;
create policy "members write group pet" on public.group_pets for all
  using (public.is_group_member(group_id)) with check (public.is_group_member(group_id));
notify pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────────
-- 그룹탭 전역 모드(group.mode) — 관리자가 /admin/settings 에서 전환.
--   'gym'   → 기존 공유펫 헬스장(랭킹/챌린지/응원)  ← 기본
--   'proof' → 오늘 운동 인증 움짤(3초 무음영상) 피드
-- app_settings['group.mode'] 는 관리자만 read/write(RLS) 라, 일반 사용자도 현재 모드를
-- 읽을 수 있도록 SECURITY DEFINER 함수로 노출한다(값 미설정이면 'gym').
create or replace function public.group_mode() returns text
  language sql security definer stable set search_path = public as $$
  select case (select value from public.app_settings where key = 'group.mode')
      when '"proof"'::jsonb then 'proof'
      else 'gym'
    end;
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 오늘 운동 인증 움짤(group_proofs) — 그룹원이 '오늘 운동했다'는 3초 무음영상을 올린다.
-- (group_id, user_id, for_date) 유니크 → 멤버당 하루 1개(다시 올리면 교체=upsert).
create table if not exists public.group_proofs (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  for_date date not null,
  media_url text not null,
  -- 'video'(무음 루프 영상, 기본) / 'gif'(정적 gif) — 표시 방식 구분용.
  media_type text not null default 'video' check (media_type in ('video', 'gif')),
  caption text check (caption is null or char_length(caption) <= 40),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, user_id, for_date)
);
create index if not exists group_proofs_group_date_idx
  on public.group_proofs (group_id, for_date);
alter table public.group_proofs enable row level security;
drop policy if exists "members read proofs" on public.group_proofs;
create policy "members read proofs" on public.group_proofs for select
  using (public.is_group_member(group_id));
drop policy if exists "insert own proof" on public.group_proofs;
create policy "insert own proof" on public.group_proofs for insert
  with check (user_id = auth.uid() and public.is_group_member(group_id));
drop policy if exists "update own proof" on public.group_proofs;
create policy "update own proof" on public.group_proofs for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "delete own proof" on public.group_proofs;
create policy "delete own proof" on public.group_proofs for delete
  using (user_id = auth.uid());

-- 인증 움짤 버킷(group-proofs) — 공개 읽기, 본인만 업로드/삭제. (URL은 추측불가 UUID)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'group-proofs',
  'group-proofs',
  true,
  20971520,
  array['video/mp4', 'video/webm', 'video/quicktime', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Group proofs are publicly readable" on storage.objects;
create policy "Group proofs are publicly readable"
  on storage.objects for select
  using (bucket_id = 'group-proofs');

drop policy if exists "Users can upload own group proofs" on storage.objects;
create policy "Users can upload own group proofs"
  on storage.objects for insert
  with check (bucket_id = 'group-proofs' and owner = auth.uid());

drop policy if exists "Users can delete own group proofs" on storage.objects;
create policy "Users can delete own group proofs"
  on storage.objects for delete
  using (bucket_id = 'group-proofs' and owner = auth.uid());
notify pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────────
-- 다짐(commitments) — 사용자가 정한 목표. 시작일~데드라인 기간 동안 기존 운동/식단
-- 기록으로 진행률을 '자동 집계'한다. 캘린더에 기간·데드라인을 표시.
-- metric: 운동한 날/운동 횟수/소비 kcal/식단기록한 날(이상 달성), 하루평균섭취(이하 달성).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  tag text not null default 'custom',
  metric text not null check (metric in (
    'workout_days', 'workout_count', 'burn_kcal', 'diet_days', 'intake_avg_max'
  )),
  target numeric not null check (target > 0),
  start_date date not null,
  deadline date not null,
  archived boolean not null default false,
  -- 생성 방식: manual(직접 설정) / survey(설문 기반 미션).
  mode text not null default 'manual' check (mode in ('manual', 'survey')),
  -- 설문 기반 다짐의 하루 미션 목록(MissionSpec[] JSON). 캘린더 ○△✕ 자동 판정에 씀.
  missions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
-- 기존 DB 보정
alter table public.commitments add column if not exists mode text
  not null default 'manual' check (mode in ('manual', 'survey'));
alter table public.commitments add column if not exists missions jsonb
  not null default '[]'::jsonb;
create index if not exists commitments_user_idx on public.commitments (user_id);
alter table public.commitments enable row level security;
drop policy if exists "own commitments" on public.commitments;
create policy "own commitments" on public.commitments for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
notify pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────────
-- 늑대 펫(pets) — 운동으로 Lv업 + 포인트 획득 → 아이템(옷) 구매/착용(싸이월드 미니미).
--   points: 사용가능 포인트, synced_workouts: 이미 포인트로 환산한 누적 운동 수(중복지급 방지)
--   owned: 보유 아이템 id[], equipped: slot→itemId
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.pets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  points int not null default 0,
  synced_workouts int not null default 0,
  owned jsonb not null default '[]'::jsonb,
  equipped jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.pets enable row level security;
drop policy if exists "own pet" on public.pets;
create policy "own pet" on public.pets for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
notify pgrst, 'reload schema';

-- ─────────────────────────────────────────────────────────────────────────────
-- 웹푸시 구독(push_subscriptions) — 사용자별 브라우저 푸시 엔드포인트(여러 기기 가능).
-- 앱이 닫혀 있어도 30분 무활동 종료 알림을 보내기 위함(Vercel Cron + web-push).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists "Users manage own push subs (select)" on public.push_subscriptions;
create policy "Users manage own push subs (select)" on public.push_subscriptions
  for select using (auth.uid() = user_id);
drop policy if exists "Users manage own push subs (insert)" on public.push_subscriptions;
create policy "Users manage own push subs (insert)" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
drop policy if exists "Users manage own push subs (delete)" on public.push_subscriptions;
create policy "Users manage own push subs (delete)" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 진행 중 운동 세션 상태(workout_active_state) — 서버가 '무활동'을 판정하기 위한 1인 1행.
-- 클라이언트가 시작/활동/스누즈/종료 때 갱신한다. remaining 에 '남은 운동' 스냅샷을 담아
-- 앱이 닫혀 있어도(푸시 버튼/cron) 휴식 처리를 할 수 있게 한다.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.workout_active_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  for_date date not null,
  active boolean not null default true,
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  prompted_at timestamptz,
  remaining jsonb not null default '{"planRows":[],"warmup":[],"cooldown":[]}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists workout_active_state_scan_idx
  on public.workout_active_state (active, last_activity_at);

alter table public.workout_active_state enable row level security;

drop policy if exists "Users manage own active state (select)" on public.workout_active_state;
create policy "Users manage own active state (select)" on public.workout_active_state
  for select using (auth.uid() = user_id);
drop policy if exists "Users manage own active state (write)" on public.workout_active_state;
create policy "Users manage own active state (write)" on public.workout_active_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 일일 걸음수(daily_steps) — 네이티브 앱(Health Connect/HealthKit)에서 읽어 동기화.
-- 1인 1일 1행(upsert). source = 'health-connect' | 'healthkit' | 'manual'.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.daily_steps (
  user_id uuid not null references auth.users(id) on delete cascade,
  for_date date not null,
  steps int not null default 0 check (steps >= 0 and steps <= 200000),
  source text,
  updated_at timestamptz not null default now(),
  primary key (user_id, for_date)
);

alter table public.daily_steps enable row level security;

drop policy if exists "Users manage own steps (select)" on public.daily_steps;
create policy "Users manage own steps (select)" on public.daily_steps
  for select using (auth.uid() = user_id);
drop policy if exists "Users manage own steps (write)" on public.daily_steps;
create policy "Users manage own steps (write)" on public.daily_steps
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 커뮤니티(오운완 인증) — 사진 + 한 줄 캡션. group_id 가 null 이면 전체 공개,
-- 값이 있으면 그 그룹 멤버에게만 보인다(그룹별 탭에서 그룹 이름 태그와 함께).
-- ─────────────────────────────────────────────────────────────────────────────
-- 인증 사진 버킷(community-photos) — 공개 읽기, 본인만 업로드/삭제.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-photos',
  'community-photos',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Community photos are publicly readable" on storage.objects;
create policy "Community photos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'community-photos');

drop policy if exists "Users can upload own community photos" on storage.objects;
create policy "Users can upload own community photos"
  on storage.objects for insert
  with check (bucket_id = 'community-photos' and owner = auth.uid());

drop policy if exists "Users can delete own community photos" on storage.objects;
create policy "Users can delete own community photos"
  on storage.objects for delete
  using (bucket_id = 'community-photos' and owner = auth.uid());

-- 게시물 관리자(모더레이터) — 관리자가 이메일로 지정. 모든 게시물 삭제/수정 가능.
create table if not exists public.post_moderators (
  email text primary key,
  created_at timestamptz not null default now()
);
alter table public.post_moderators enable row level security;
drop policy if exists "read post_moderators" on public.post_moderators;
create policy "read post_moderators" on public.post_moderators for select
  using (public.is_admin() or lower(email) = lower(auth.jwt() ->> 'email'));
drop policy if exists "admin inserts post_moderators" on public.post_moderators;
create policy "admin inserts post_moderators" on public.post_moderators for insert
  with check (public.is_admin());
drop policy if exists "admin deletes post_moderators" on public.post_moderators;
create policy "admin deletes post_moderators" on public.post_moderators for delete
  using (public.is_admin());

-- 게시물 모더레이터 — 디버그 계정(is_debug_account, admin 포함) 이거나 post_moderators.
-- 디버그 계정도 커뮤니티 전체(미가입 그룹글 포함) 열람·정리할 수 있어야 한다.
create or replace function public.is_post_moderator() returns boolean
  language sql security definer stable set search_path = public as $$
  select public.is_debug_account() or exists(
    select 1 from public.post_moderators
    where lower(email) = lower(auth.jwt() ->> 'email')
  );
$$;

create table if not exists public.community_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  -- 공개범위: group(그 그룹만) / public(전체) / public_except_group(그룹 제외 전체).
  -- group·public_except_group 은 group_id(기준 그룹) 필수.
  visibility text not null default 'public'
    check (visibility in ('group', 'public', 'public_except_group')),
  -- 작성 시점 표시 이름 스냅샷(공개 피드엔 모르는 사람 글도 떠서 프로필 조인이 RLS로 막힘).
  author_name text not null default '회원',
  photo_url text not null,
  caption text check (caption is null or char_length(caption) <= 200),
  created_at timestamptz not null default now()
);
-- 기존 DB 보정 + 백필(group_id 있으면 group, 없으면 public).
alter table public.community_posts add column if not exists visibility text
  not null default 'public'
  check (visibility in ('group', 'public', 'public_except_group'));
update public.community_posts
  set visibility = case when group_id is not null then 'group' else 'public' end
  where visibility is null or visibility = 'public' and group_id is not null;
create index if not exists community_posts_created_idx
  on public.community_posts (created_at desc);
create index if not exists community_posts_group_idx
  on public.community_posts (group_id, created_at desc);

alter table public.community_posts enable row level security;

-- 읽기: 본인 글 / 전체공개 / (그룹공개 & 그룹멤버) / (그룹제외공개 & 그룹멤버 아님).
-- 게시물 관리자(디버깅 계정)는 모든 그룹 글을 볼 수 있다.
drop policy if exists "read visible community posts" on public.community_posts;
create policy "read visible community posts" on public.community_posts for select
  using (
    user_id = auth.uid()
    or public.is_post_moderator()
    or visibility = 'public'
    or (visibility = 'group' and group_id is not null and public.is_group_member(group_id))
    or (visibility = 'public_except_group' and (group_id is null or not public.is_group_member(group_id)))
  );

-- 쓰기: 본인 글. 전체공개면 그룹 불필요, 그 외(group/except)는 기준 그룹 멤버여야 한다.
drop policy if exists "insert own community post" on public.community_posts;
create policy "insert own community post" on public.community_posts for insert
  with check (
    user_id = auth.uid()
    and (
      visibility = 'public'
      or (group_id is not null and public.is_group_member(group_id))
    )
  );

-- 삭제/수정: 본인 글 또는 게시물 관리자(모더레이터).
drop policy if exists "delete own community post" on public.community_posts;
create policy "delete own community post" on public.community_posts for delete
  using (user_id = auth.uid() or public.is_post_moderator());

drop policy if exists "update own or moderator community post" on public.community_posts;
create policy "update own or moderator community post" on public.community_posts for update
  using (user_id = auth.uid() or public.is_post_moderator())
  with check (user_id = auth.uid() or public.is_post_moderator());

-- 글을 볼 수 있는지(좋아요/댓글 RLS 공통) — 공개글이거나 그 그룹 멤버.
create or replace function public.can_see_community_post(pid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.community_posts p
    where p.id = pid
      and (
        p.user_id = auth.uid()
        or public.is_post_moderator()
        or p.visibility = 'public'
        or (p.visibility = 'group' and public.is_group_member(p.group_id))
        or (p.visibility = 'public_except_group' and (p.group_id is null or not public.is_group_member(p.group_id)))
      )
  );
$$;

-- 좋아요(한 사람당 글 하나에 하나).
create table if not exists public.community_likes (
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists community_likes_post_idx
  on public.community_likes (post_id);
alter table public.community_likes enable row level security;
drop policy if exists "read likes on visible posts" on public.community_likes;
create policy "read likes on visible posts" on public.community_likes for select
  using (public.can_see_community_post(post_id));
drop policy if exists "like visible post" on public.community_likes;
create policy "like visible post" on public.community_likes for insert
  with check (user_id = auth.uid() and public.can_see_community_post(post_id));
drop policy if exists "unlike own" on public.community_likes;
create policy "unlike own" on public.community_likes for delete
  using (user_id = auth.uid());

-- 댓글.
create table if not exists public.community_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.community_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default '회원',
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists community_comments_post_idx
  on public.community_comments (post_id, created_at);
alter table public.community_comments enable row level security;
drop policy if exists "read comments on visible posts" on public.community_comments;
create policy "read comments on visible posts" on public.community_comments for select
  using (public.can_see_community_post(post_id));
drop policy if exists "comment on visible post" on public.community_comments;
create policy "comment on visible post" on public.community_comments for insert
  with check (user_id = auth.uid() and public.can_see_community_post(post_id));
drop policy if exists "delete own comment" on public.community_comments;
create policy "delete own comment" on public.community_comments for delete
  using (user_id = auth.uid() or public.is_post_moderator());

-- 피드 카운트 집계 RPC — 여러 글의 좋아요/댓글 수를 한 번에(행 전체를 안 가져옴).
create or replace function public.community_post_counts(pids uuid[])
returns table(post_id uuid, like_count int, comment_count int)
language sql stable security definer set search_path = public as $$
  select x.pid,
    coalesce(l.n, 0)::int,
    coalesce(cm.n, 0)::int
  from unnest(pids) as x(pid)
  left join (
    select post_id, count(*) n from public.community_likes
    where post_id = any(pids) group by post_id
  ) l on l.post_id = x.pid
  left join (
    select post_id, count(*) n from public.community_comments
    where post_id = any(pids) group by post_id
  ) cm on cm.post_id = x.pid;
$$;
grant execute on function public.community_post_counts(uuid[]) to authenticated;

-- ── 운동 티칭 커뮤니티 ─────────────────────────────────────────────
-- 운동모드에서 30초씩 찍은 시범 영상을 운동별 태그로 올려 공유. 공개 피드(전체 열람).
-- 상단에서 태그(운동명)로 검색, 게시물 하단에 태그 노출.

-- 티칭 영상 버킷(teaching-videos) — 공개 읽기, 본인만 업로드/삭제.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'teaching-videos',
  'teaching-videos',
  true,
  62914560,
  array['video/mp4', 'video/webm', 'video/quicktime', 'video/3gpp', 'video/x-matroska']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Teaching videos are publicly readable" on storage.objects;
create policy "Teaching videos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'teaching-videos');

drop policy if exists "Users can upload own teaching videos" on storage.objects;
create policy "Users can upload own teaching videos"
  on storage.objects for insert
  with check (bucket_id = 'teaching-videos' and owner = auth.uid());

drop policy if exists "Users can delete own teaching videos" on storage.objects;
create policy "Users can delete own teaching videos"
  on storage.objects for delete
  using (bucket_id = 'teaching-videos' and owner = auth.uid());

create table if not exists public.teaching_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  -- 공개범위 기준 그룹(그룹공개/그룹제외 공개일 때). 전체공개면 null.
  group_id uuid references public.groups(id) on delete set null,
  -- 공개범위: group / public / public_except_group (community_posts 와 동일 규칙).
  visibility text not null default 'public'
    check (visibility in ('group', 'public', 'public_except_group')),
  author_name text not null default '회원',
  -- 앱 카탈로그 운동 slug(있으면). 검색/필터의 태그는 exercise_tag(운동 이름).
  exercise_slug text,
  exercise_tag text not null check (char_length(exercise_tag) between 1 and 40),
  video_url text not null,
  caption text check (caption is null or char_length(caption) <= 200),
  created_at timestamptz not null default now()
);
-- 기존 DB 보정(컬럼 추가). 기존 티칭 글은 전체공개로 둔다.
alter table public.teaching_posts add column if not exists group_id uuid
  references public.groups(id) on delete set null;
alter table public.teaching_posts add column if not exists visibility text
  not null default 'public'
  check (visibility in ('group', 'public', 'public_except_group'));
create index if not exists teaching_posts_created_idx
  on public.teaching_posts (created_at desc);
create index if not exists teaching_posts_tag_idx
  on public.teaching_posts (lower(exercise_tag), created_at desc);

alter table public.teaching_posts enable row level security;

-- 읽기: community_posts 와 동일 — 본인 / 전체 / 그룹 / 그룹제외 + 관리자(디버깅) 전체.
drop policy if exists "read teaching posts" on public.teaching_posts;
create policy "read teaching posts" on public.teaching_posts for select
  using (
    user_id = auth.uid()
    or public.is_post_moderator()
    or visibility = 'public'
    or (visibility = 'group' and group_id is not null and public.is_group_member(group_id))
    or (visibility = 'public_except_group' and (group_id is null or not public.is_group_member(group_id)))
  );

-- 쓰기: 본인 글. 전체공개면 그룹 불필요, 그 외는 기준 그룹 멤버여야 한다.
drop policy if exists "insert own teaching post" on public.teaching_posts;
create policy "insert own teaching post" on public.teaching_posts for insert
  with check (
    user_id = auth.uid()
    and (
      visibility = 'public'
      or (group_id is not null and public.is_group_member(group_id))
    )
  );

-- 삭제/수정: 본인 또는 게시물 관리자(모더레이터).
drop policy if exists "delete own teaching post" on public.teaching_posts;
create policy "delete own teaching post" on public.teaching_posts for delete
  using (user_id = auth.uid() or public.is_post_moderator());

drop policy if exists "update own or moderator teaching post" on public.teaching_posts;
create policy "update own or moderator teaching post" on public.teaching_posts for update
  using (user_id = auth.uid() or public.is_post_moderator())
  with check (user_id = auth.uid() or public.is_post_moderator());

-- ── 운동(티칭) 게시판 소셜 — 좋아요/댓글 ──────────────────────────────
-- community_* 는 community_posts(id) FK 라 티칭 글에 못 쓴다. 티칭 전용 테이블.
create table if not exists public.teaching_likes (
  post_id uuid not null references public.teaching_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
create index if not exists teaching_likes_post_idx
  on public.teaching_likes (post_id);
alter table public.teaching_likes enable row level security;
drop policy if exists "read teaching likes" on public.teaching_likes;
create policy "read teaching likes" on public.teaching_likes for select using (true);
drop policy if exists "like teaching" on public.teaching_likes;
create policy "like teaching" on public.teaching_likes for insert
  with check (user_id = auth.uid());
drop policy if exists "unlike teaching own" on public.teaching_likes;
create policy "unlike teaching own" on public.teaching_likes for delete
  using (user_id = auth.uid());

create table if not exists public.teaching_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.teaching_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default '회원',
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);
create index if not exists teaching_comments_post_idx
  on public.teaching_comments (post_id, created_at);
alter table public.teaching_comments enable row level security;
drop policy if exists "read teaching comments" on public.teaching_comments;
create policy "read teaching comments" on public.teaching_comments for select using (true);
drop policy if exists "comment teaching" on public.teaching_comments;
create policy "comment teaching" on public.teaching_comments for insert
  with check (user_id = auth.uid());
drop policy if exists "delete teaching comment own" on public.teaching_comments;
create policy "delete teaching comment own" on public.teaching_comments for delete
  using (user_id = auth.uid() or public.is_post_moderator());

create or replace function public.teaching_post_counts(pids uuid[])
returns table(post_id uuid, like_count int, comment_count int, liked_by_me boolean)
language sql stable security definer set search_path = public as $$
  select x.pid,
    coalesce(l.n, 0)::int,
    coalesce(cm.n, 0)::int,
    coalesce(me.mine, false)
  from unnest(pids) as x(pid)
  left join (select post_id, count(*) n from public.teaching_likes where post_id = any(pids) group by post_id) l on l.post_id = x.pid
  left join (select post_id, count(*) n from public.teaching_comments where post_id = any(pids) group by post_id) cm on cm.post_id = x.pid
  left join (select post_id, true mine from public.teaching_likes where post_id = any(pids) and user_id = auth.uid()) me on me.post_id = x.pid;
$$;
grant execute on function public.teaching_post_counts(uuid[]) to authenticated;

-- ── 게시판/댓글 신고 ──────────────────────────────────────────────
-- 누구나 신고 등록(본인 명의). 모더레이터만 열람/처리(글·댓글 삭제, 작성자 정지).
create table if not exists public.post_reports (
  id uuid primary key default gen_random_uuid(),
  target_kind text not null check (target_kind in ('community_post','community_comment','teaching_post','teaching_comment')),
  target_id uuid not null,
  target_user_id uuid,
  target_author text,
  target_preview text,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 500),
  status text not null default 'open' check (status in ('open','resolved')),
  created_at timestamptz not null default now()
);
create index if not exists post_reports_status_idx
  on public.post_reports (status, created_at desc);
alter table public.post_reports enable row level security;
drop policy if exists "insert own report" on public.post_reports;
create policy "insert own report" on public.post_reports for insert
  with check (reporter_id = auth.uid());
drop policy if exists "moderator read reports" on public.post_reports;
create policy "moderator read reports" on public.post_reports for select
  using (public.is_post_moderator());
drop policy if exists "moderator update reports" on public.post_reports;
create policy "moderator update reports" on public.post_reports for update
  using (public.is_post_moderator());
drop policy if exists "moderator delete reports" on public.post_reports;
create policy "moderator delete reports" on public.post_reports for delete
  using (public.is_post_moderator());

notify pgrst, 'reload schema';
