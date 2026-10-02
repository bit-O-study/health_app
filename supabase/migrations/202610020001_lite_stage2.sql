-- 라이트 2단계 혜택 — 2026-10-02, docs/lite-stage2-design-2026-10-02.html
--  lift_goals  : 3개월 목표(종목·시작/목표 예상 1RM·날짜). 요금제별 개수(무료 1·라이트 3)는 서버 액션이 막고,
--                DB 는 진행 중 목표 3개를 넘지 못하게 최후 방어.
--  body_photos : 몸 사진(앞·옆·뒤). 파일은 비공개 버킷 body-photos 의 <userId>/... 경로.
--                요금제별 한도(무료 3장·라이트 하루 10장)는 서버 액션, DB 는 1인 500장 최후 방어.

create table if not exists public.lift_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_id text not null check (char_length(exercise_id) between 1 and 120),
  start_kg numeric(6, 1) not null check (start_kg >= 0 and start_kg <= 1000),
  target_kg numeric(6, 1) not null check (target_kg > 0 and target_kg <= 1000),
  start_date date not null default current_date,
  target_date date not null,
  achieved_at timestamptz,
  created_at timestamptz not null default now(),
  check (target_date > start_date),
  check (target_kg > start_kg)
);
create index if not exists lift_goals_user_idx on public.lift_goals (user_id, created_at desc);
alter table public.lift_goals enable row level security;
drop policy if exists "own lift goals" on public.lift_goals;
create policy "own lift goals" on public.lift_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.lift_goals_cap() returns trigger
  language plpgsql set search_path = public as $$
begin
  if (select count(*) from public.lift_goals where user_id = new.user_id and achieved_at is null) >= 3 then
    raise exception 'lift_goals_cap';
  end if;
  return new;
end;
$$;
drop trigger if exists lift_goals_cap on public.lift_goals;
create trigger lift_goals_cap before insert on public.lift_goals
  for each row execute function public.lift_goals_cap();

create table if not exists public.body_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  taken_on date not null default current_date,
  pose text not null check (pose in ('front', 'side', 'back')),
  path text not null check (char_length(path) between 1 and 300),
  consent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists body_photos_user_idx on public.body_photos (user_id, taken_on desc);
alter table public.body_photos enable row level security;
drop policy if exists "own body photos read" on public.body_photos;
create policy "own body photos read" on public.body_photos for select using (auth.uid() = user_id);
drop policy if exists "own body photos insert" on public.body_photos;
create policy "own body photos insert" on public.body_photos for insert
  with check (auth.uid() = user_id and split_part(path, '/', 1) = auth.uid()::text);
drop policy if exists "own body photos delete" on public.body_photos;
create policy "own body photos delete" on public.body_photos for delete using (auth.uid() = user_id);

create or replace function public.body_photos_cap() returns trigger
  language plpgsql set search_path = public as $$
begin
  if (select count(*) from public.body_photos where user_id = new.user_id) >= 500 then
    raise exception 'body_photos_cap';
  end if;
  return new;
end;
$$;
drop trigger if exists body_photos_cap on public.body_photos;
create trigger body_photos_cap before insert on public.body_photos
  for each row execute function public.body_photos_cap();

-- 비공개 버킷 — 체성분 분석지 버킷과 같은 규칙(본인 폴더만, 공개 URL 없음, 볼 때 서명 URL).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('body-photos', 'body-photos', false, 3145728, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users read own body photos" on storage.objects;
create policy "Users read own body photos" on storage.objects for select
  using (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users upload own body photos" on storage.objects;
create policy "Users upload own body photos" on storage.objects for insert
  with check (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "Users delete own body photos" on storage.objects;
create policy "Users delete own body photos" on storage.objects for delete
  using (bucket_id = 'body-photos' and (storage.foldername(name))[1] = auth.uid()::text);
