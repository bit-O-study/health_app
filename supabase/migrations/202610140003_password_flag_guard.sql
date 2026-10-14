-- 관리자가 초기화한 뒤의 '비밀번호 바꾸기'를 건너뛸 수 없게(2026-10-14).
--
-- 예전엔 회원이 자기 profiles 행을 고칠 수 있는 권한(본인 update RLS)으로 must_change_password 를
-- 직접 false 로 내릴 수 있었다 — 비밀번호를 실제로 바꿨는지 확인하지 않았다.
--  · 초기화할 때 임시 비밀번호의 지문(md5(encrypted_password))을 남긴다.
--  · 플래그는 clear_must_change_password() 로만 내린다 — 비밀번호가 그 지문과 달라졌을 때만.
--  · 회원 권한(authenticated/anon)으로는 두 칸을 고칠 수 없다(트리거가 옛 값을 지킨다).

alter table public.profiles add column if not exists password_reset_fp text;

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
  update public.profiles
     set must_change_password = true,
         password_reset_fp = (select md5(encrypted_password) from auth.users where id = p_user_id)
   where user_id = p_user_id;
end;
$$;
revoke all on function public.admin_reset_user_password(uuid, text) from public, anon;
grant execute on function public.admin_reset_user_password(uuid, text) to authenticated;

create or replace function public.clear_must_change_password() returns boolean
language plpgsql security definer set search_path = public, auth as $$
declare v_fp text; v_now text;
begin
  if auth.uid() is null then return false; end if;
  select password_reset_fp into v_fp from public.profiles where user_id = auth.uid();
  select md5(encrypted_password) into v_now from auth.users where id = auth.uid();
  -- 아직 임시 비밀번호 그대로면 내리지 않는다.
  if v_fp is not null and v_now is not distinct from v_fp then return false; end if;
  update public.profiles set must_change_password = false, password_reset_fp = null where user_id = auth.uid();
  return true;
end;
$$;
revoke all on function public.clear_must_change_password() from public, anon;
grant execute on function public.clear_must_change_password() to authenticated;

create or replace function public.profiles_guard_password_flag() returns trigger
language plpgsql as $$
begin
  if current_user in ('authenticated', 'anon') then
    new.must_change_password := old.must_change_password;
    new.password_reset_fp := old.password_reset_fp;
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_guard_password_flag on public.profiles;
create trigger profiles_guard_password_flag
  before update on public.profiles
  for each row execute function public.profiles_guard_password_flag();
