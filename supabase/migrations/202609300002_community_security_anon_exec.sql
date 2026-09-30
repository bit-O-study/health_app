-- 커뮤니티 보안 1단계 후속(2026-09-30): RLS 정책이 부르는 함수는 익명도 실행할 수 있어야 한다
-- (tests/be/anon-execute-guard.test.ts). 막혀 있으면 비로그인 조회가 '권한 없음' 오류로 통째로 죽는다.
-- 익명에게는 is_active_member()=true(프로필 없음), can_see_teaching_post()=전체공개 글만 — 새로 드러나는 정보 없음.
grant execute on function public.is_active_member() to anon;
grant execute on function public.can_see_teaching_post(uuid) to anon;
