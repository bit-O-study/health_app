-- 종목별 증량 단위(kg) — 헬스장마다 스택이 다르다.
--
-- 기본값은 기구와 종목 크기로 정한다(바벨 큰 종목 5kg / 작은 종목 2.5kg, 핀 스택
-- 5kg·2.5kg, 덤벨 2kg …). 그런데 같은 '머신' 이라도 1kg 씩 올라가는 기구가 있어
-- 사용자가 자기 헬스장 기준으로 종목별로 덮어쓸 수 있어야 한다.
--
-- {"pec-deck": 1, "squat": 2.5} 형태. 비어 있으면 전부 기본 규칙.
-- 추가형 컬럼이라 기존 행·조회에 영향 없음(기본값 '{}').
alter table public.profiles
  add column if not exists weight_steps jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
