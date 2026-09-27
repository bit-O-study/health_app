-- 2026-09-25 트레이너 코멘트 INSERT 정책 복구.
-- schema.sql 에는 "trainer writes comment" 가 있지만 라이브 DB 에는 없었다
-- → RLS 에 막혀 트레이너가 코멘트를 남길 수 없었다("이 회원에게는 코멘트를 남길 수 없어요").
-- 정책만 다시 만든다 — 테이블·데이터는 건드리지 않는다. 여러 번 실행해도 결과가 같다.
begin;

drop policy if exists "trainer writes comment" on public.trainer_comments;
create policy "trainer writes comment" on public.trainer_comments for insert
  with check (
    trainer_id = (select auth.uid())
    and member_id <> (select auth.uid())
    -- 바깥 행을 표 이름으로 못 박는다(서브쿼리 컬럼에 잘못 붙으면 항상 참이 된다).
    and exists (
      select 1 from public.groups g
       where g.id = trainer_comments.group_id
         and g.owner_id = (select auth.uid()))
    and exists (
      select 1 from public.group_members m
       where m.group_id = trainer_comments.group_id
         and m.user_id = trainer_comments.member_id)
  );

notify pgrst, 'reload schema';

commit;
