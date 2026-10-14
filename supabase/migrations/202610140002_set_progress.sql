-- 세트 완료마다 기록한다(2026-10-14).
--
-- 지금까지는 마지막 세트까지 끝내야 완료 기록이 생겼다 — 4세트 중 2세트만 하고 넘기거나 끝내면
-- 한 세트도 안 남았다. 진행 중인 운동을 'partial'(진행 중)로 남기고, 넘기거나 운동을 끝내면
-- 한 만큼만 'done' 으로 굳힌다. 세트 완료를 취소하면 그 기록도 줄어든다(0세트면 지운다).
--
-- 'partial' 은 통계·목록에 안 잡힌다(읽는 쪽은 done/skipped 만 본다) — 굳힌 뒤에야 기록이다.

alter table public.exercise_completions drop constraint if exists exercise_completions_status_check;
alter table public.exercise_completions
  add constraint exercise_completions_status_check check (status in ('done', 'skipped', 'partial'));
