-- 끼니별 식단 사진(meal_photos) — 음식별이 아니라 아침/점심/저녁/간식 단위 1장.
create table if not exists public.meal_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  for_date date not null,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  photo_url text not null,
  created_at timestamptz not null default now(),
  unique (user_id, for_date, meal)
);

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

notify pgrst, 'reload schema';
