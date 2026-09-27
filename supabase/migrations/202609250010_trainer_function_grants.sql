-- 2026-09-25 트레이너 함수 실행 권한 복구.
-- schema.sql 에는 grant 가 있지만 라이브 DB 에는 authenticated 실행 권한이 빠져 있었다
-- → 트레이너 회원 관리 목록이 늘 비어 보였다(permission denied 를 호출부가 빈 결과로 처리).
-- 권한만 추가한다 — 함수 본문·데이터는 건드리지 않는다. 여러 번 실행해도 결과가 같다.
begin;

grant execute on function public.trainer_board(uuid, date, date) to authenticated;
grant execute on function public.trainer_member_routine(uuid, uuid) to authenticated;
grant execute on function public.trainer_assign_routine_day(uuid, uuid, int, text, int, text) to authenticated;
grant execute on function public.trainer_prescribe_exercise(uuid, uuid, uuid, timestamptz, jsonb, text) to authenticated;
grant execute on function public.trainer_member_report(uuid, uuid, date, date) to authenticated;
grant execute on function public.leave_trainer_group(uuid) to authenticated;
grant execute on function public.trainer_member_today_plan(uuid, uuid) to authenticated;
grant execute on function public.trainer_prescribe_today(uuid, uuid, text, int, text, jsonb, text) to authenticated;

commit;
