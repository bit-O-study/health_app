-- ⛔ 폐기(2026-09-28) — 적용 금지. 번호만 남겨 둔다.
-- 원래 내용: trainer_comments 의 "trainer writes comment" INSERT 정책을 다시 만드는 것.
-- 이 정책은 202609220002_independent_trainers 가 옛 그룹장-트레이너 구조를 닫으며 **의도적으로** 지웠다.
-- 2026-09-28 운영 DB 에 잘못 적용됐다가 곧바로 되돌렸다(scripts/revert-legacy-trainer-grants.mjs).
select 1;
