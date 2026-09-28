-- Independent trainers use pt_* and explicit pt_links consent.
-- Historical 250010/250011 must not reopen group-owner access.
revoke all on function public.trainer_board(uuid, date, date) from public, anon, authenticated;
revoke all on function public.trainer_member_routine(uuid, uuid) from public, anon, authenticated;
revoke all on function public.trainer_assign_routine_day(uuid, uuid, int, text, int, text) from public, anon, authenticated;
revoke all on function public.trainer_prescribe_exercise(uuid, uuid, uuid, timestamptz, jsonb, text) from public, anon, authenticated;
revoke all on function public.trainer_member_report(uuid, uuid, date, date) from public, anon, authenticated;
revoke all on function public.leave_trainer_group(uuid) from public, anon, authenticated;
revoke all on function public.trainer_member_today_plan(uuid, uuid) from public, anon, authenticated;
revoke all on function public.trainer_prescribe_today(uuid, uuid, text, int, text, jsonb, text) from public, anon, authenticated;
drop policy if exists "trainer writes comment" on public.trainer_comments;
notify pgrst, 'reload schema';
