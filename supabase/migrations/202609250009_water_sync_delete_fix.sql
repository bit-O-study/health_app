-- 🔴 계정 삭제가 실패하던 문제 (2026-09-25).
--
-- water_entries 의 동기화 트리거가 DELETE 에서도 water_logs 를 **upsert** 했다.
-- 그래서 사용자를 지우면(auth.users → cascade) 지워지는 중인 user_id 로 다시
-- insert 를 시도해 FK 위반이 난다:
--   insert or update on table "water_logs" violates foreign key constraint
--   "water_logs_user_id_fkey"
-- (E2E 정리에서 실제로 터졌다.)
--
-- 삭제 쪽에서는 **있는 합계 행만 고친다.** 행이 이미 사라졌으면 고칠 것도 없다.
create or replace function public.sync_water_log() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := coalesce(new.user_id, old.user_id);
  v_date date := coalesce(new.for_date, old.for_date);
  v_sum int;
begin
  select coalesce(sum(ml), 0) into v_sum
    from public.water_entries where user_id = v_user and for_date = v_date;

  if tg_op = 'DELETE' then
    -- 지우는 중이면 새로 만들지 않는다(사용자가 통째로 삭제되는 중일 수 있다).
    update public.water_logs
       set ml = least(v_sum, 10000), updated_at = now()
     where user_id = v_user and for_date = v_date;
    return null;
  end if;

  insert into public.water_logs (user_id, for_date, ml, updated_at)
       values (v_user, v_date, least(v_sum, 10000), now())
  on conflict (user_id, for_date)
    do update set ml = least(excluded.ml, 10000), updated_at = now();
  return null;
end $$;

notify pgrst, 'reload schema';
