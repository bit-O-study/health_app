-- Phase 1: food_logs category/photo + food-photos storage bucket
alter table public.food_logs add column if not exists category text;
alter table public.food_logs add column if not exists photo_url text;

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

notify pgrst, 'reload schema';
