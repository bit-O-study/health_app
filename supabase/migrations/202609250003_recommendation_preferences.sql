create table if not exists public.recommendation_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  days integer not null check (days between 2 and 6),
  minutes integer not null check (minutes in (30,45,60,75)),
  priority text not null check (priority in ('balanced','upper','lower')),
  equipment text not null check (equipment in ('mixed','machine','freeweight')),
  variety text not null check (variety in ('familiar','balanced'))
);
alter table public.recommendation_preferences enable row level security;
drop policy if exists "Users manage own recommendation preferences" on public.recommendation_preferences;
create policy "Users manage own recommendation preferences" on public.recommendation_preferences
  for all to authenticated using (auth.uid()=user_id) with check (auth.uid()=user_id);
revoke all on public.recommendation_preferences from anon;
grant select,insert,update,delete on public.recommendation_preferences to authenticated;