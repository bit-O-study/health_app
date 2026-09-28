-- Account-scoped favorites; browser clients can only access their own rows.
create table if not exists public.food_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  food_key text not null check (length(food_key) between 1 and 240),
  food jsonb not null check (jsonb_typeof(food) = 'object' and octet_length(food::text) <= 4096),
  created_at timestamptz not null default now(),
  primary key (user_id, food_key)
);
alter table public.food_favorites enable row level security;
revoke all on public.food_favorites from anon;
grant select, insert, update, delete on public.food_favorites to authenticated;
grant all on public.food_favorites to service_role;
drop policy if exists food_favorites_owner on public.food_favorites;
create policy food_favorites_owner on public.food_favorites
  for all to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
