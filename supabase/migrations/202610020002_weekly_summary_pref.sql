-- 이번 주 정리 알림(라이트 2단계 혜택 2, 2026-10-02) — 일요일 저녁 한 통. 설정에서 따로 끈다.
alter table public.notification_preferences
  add column if not exists weekly_summary boolean not null default true;
