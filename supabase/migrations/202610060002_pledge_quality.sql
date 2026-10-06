-- 다짐 결과 신뢰도(2026-10-06) — 학습에 쓸 수 있는 행인지(7일 평균 체중·기록 충실도·인바디 간격).
alter table public.commitment_outcomes add column if not exists data_quality jsonb;
notify pgrst, 'reload schema';
