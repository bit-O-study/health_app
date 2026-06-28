-- 그룹 멤버 표시 이름(가입 시점 스냅샷) + 그룹원 식단 열람(오늘 공유용)
alter table public.group_members add column if not exists display_name text;

-- 참여 RPC: display_name 채우도록 갱신
create or replace function public.join_group_by_token(token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare gid uuid; nm text;
begin
  select id into gid from public.groups where invite_token = token;
  if gid is null then raise exception 'invalid_token'; end if;
  select coalesce(
    nullif((select name from public.profiles where user_id = auth.uid()), ''),
    nullif((select raw_user_meta_data->>'name' from auth.users where id = auth.uid()), ''),
    '회원'
  ) into nm;
  insert into public.group_members (group_id, user_id, role, display_name)
    values (gid, auth.uid(), 'member', nm)
    on conflict (group_id, user_id) do nothing;
  return gid;
end; $$;

-- 기존 멤버 표시 이름 백필
update public.group_members gm set display_name = coalesce(
  nullif((select name from public.profiles p where p.user_id = gm.user_id), ''),
  nullif((select raw_user_meta_data->>'name' from auth.users u where u.id = gm.user_id), ''),
  '회원'
) where gm.display_name is null;

-- 그룹원끼리 식단(food_logs) 열람 — 오늘 식단 공유용
drop policy if exists "group mates read food logs" on public.food_logs;
create policy "group mates read food logs" on public.food_logs
  for select using (public.shares_group_with(user_id));

notify pgrst, 'reload schema';
