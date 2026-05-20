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
alter table public.user_routines
  drop constraint if exists user_routines_splits_check;
alter table public.user_routines
  add constraint user_routines_splits_check check (splits between 0 and 6);

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

create index if not exists routine_exercises_user_focus_idx
  on public.routine_exercises (user_id, focus, position);

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
alter table public.conditioning_completions
  drop constraint if exists conditioning_completions_user_id_for_date_kind_item_id_key;
create unique index if not exists conditioning_completions_by_source_row_idx
  on public.conditioning_completions (user_id, for_date, kind, source_row_id)
  where source_row_id is not null;

create index if not exists conditioning_completions_user_date_idx
  on public.conditioning_completions (user_id, for_date desc);

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

alter table public.exercise_completions enable row level security;

drop policy if exists "Users can read own exercise completions" on public.exercise_completions;
create policy "Users can read own exercise completions"
  on public.exercise_completions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own exercise completions" on public.exercise_completions;
create policy "Users can insert own exercise completions"
  on public.exercise_completions for insert
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

notify pgrst, 'reload schema';
