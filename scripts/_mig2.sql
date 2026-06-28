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
  unique (group_id, user_id)
);

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
declare gid uuid;
begin
  select id into gid from public.groups where invite_token = token;
  if gid is null then raise exception 'invalid_token'; end if;
  insert into public.group_members (group_id, user_id, role)
    values (gid, auth.uid(), 'member')
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
  using (public.is_group_member(id) or owner_id = auth.uid());
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

notify pgrst, 'reload schema';
