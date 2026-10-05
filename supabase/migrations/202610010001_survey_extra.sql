-- 가입 설문 3문항 + 몸 목표 스타일 — 2026-10-01, docs/lite-app-ui-2026-10-01.html '가입 설문에 더할 것'
--  age_group      : 나이대(칼로리·체지방 추정에 쓴다 — 예전엔 30세로 가정)
--  body_style     : 몸 목표 스타일(상체 위주·하체 위주·고르게). null = 성별 기본 표
--  session_minutes: 1회 운동 시간(분) — 추천 개수·AI 트레이너 기본 시간
alter table public.profiles add column if not exists age_group text;
alter table public.profiles drop constraint if exists profiles_age_group_check;
alter table public.profiles add constraint profiles_age_group_check
  check (age_group is null or age_group in ('10s','20s','30s','40s','50plus'));

alter table public.profiles add column if not exists body_style text;
alter table public.profiles drop constraint if exists profiles_body_style_check;
alter table public.profiles add constraint profiles_body_style_check
  check (body_style is null or body_style in ('upper','lower','balanced'));

alter table public.profiles add column if not exists session_minutes smallint;
alter table public.profiles drop constraint if exists profiles_session_minutes_check;
alter table public.profiles add constraint profiles_session_minutes_check
  check (session_minutes is null or session_minutes in (30,45,60));
