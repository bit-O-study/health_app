-- ⛔ 폐기(2026-09-28) — 적용 금지. 번호만 남겨 둔다.
-- 원래 내용: 옛 그룹장-트레이너 RPC 8개(trainer_board 등)에 authenticated 실행 권한을 다시 주는 것.
-- 그런데 이 RPC 들은 202609220002_independent_trainers 가 **의도적으로** 막았다
-- (독립 트레이너 pt_* 로 바뀌며, 회원 동의 없이 그룹장이 회원 데이터에 접근하던 경로를 닫음).
-- 이 파일은 그 전 설계 기준으로 만들어져 통합 머지로 들어왔고, 2026-09-28 운영 DB 에 잘못 적용됐다가
-- 곧바로 되돌렸다(scripts/revert-legacy-trainer-grants.mjs). schema-sync 가 이제 "막혀 있어야 함"을 검사한다.
select 1;
