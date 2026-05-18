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
