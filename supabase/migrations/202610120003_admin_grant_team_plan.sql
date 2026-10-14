-- 관리자 수동 지급: 신청하지 않은 그룹에도 팀 요금제를 넣는다(2026-10-12).
-- 지금까지는 그룹장이 신청한 행만 승인할 수 있었다(관리자 정책이 update 뿐).
-- 지급 행은 price_krw=0 — 받은 돈이 없으니 어드민의 '월 합계'에 잡히면 안 된다.
-- 지급한 뒤의 기간·금액 변경과 해지는 기존 승인 화면(관리자 update 정책) 그대로 쓴다.
create or replace function public.admin_grant_team_plan(p_group uuid,p_plan text,p_start date,p_end date,p_seats int,p_memo text default null) returns void
language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
 if p_group is null or not exists(select 1 from groups where id=p_group) then raise exception 'Group not found' using errcode='22023'; end if;
 if p_plan is null or p_plan not in ('trainer','gym') or p_start is null or p_end is null or p_end<p_start or p_seats is null or p_seats not between 0 and 100000 or length(coalesce(p_memo,''))>500 then raise exception 'Invalid grant' using errcode='22023'; end if;
 insert into team_subscriptions(group_id,plan,status,seats,price_krw,period_start,period_end,approved_at,memo,updated_at)
 values(p_group,p_plan,'active',p_seats,0,p_start,p_end,now(),nullif(trim(coalesce(p_memo,'')),''),now())
 on conflict(group_id) do update set plan=excluded.plan,status='active',seats=excluded.seats,price_krw=0,
  period_start=excluded.period_start,period_end=excluded.period_end,approved_at=now(),memo=excluded.memo,updated_at=now();
end $$;
revoke all on function public.admin_grant_team_plan(uuid,text,date,date,int,text) from public,anon;
grant execute on function public.admin_grant_team_plan(uuid,text,date,date,int,text) to authenticated;

-- 지급 대상 고르기: 팀 요금제 내역이 아직 없는 그룹(관리자는 groups 를 RLS 로 읽지 못한다).
create or replace function public.admin_team_grant_candidates() returns table(group_id uuid,name text,owner_name text,owner_email text,members int)
language sql stable security definer set search_path=public as $$
 select g.id,g.name,coalesce(nullif(p.name,''),'이름 미입력'),u.email::text,(select count(*)::int from group_members m where m.group_id=g.id)
 from groups g join auth.users u on u.id=g.owner_id left join profiles p on p.user_id=g.owner_id
 where public.is_admin() and not exists(select 1 from team_subscriptions t where t.group_id=g.id)
 order by g.created_at desc limit 500
$$;
revoke all on function public.admin_team_grant_candidates() from public,anon;
grant execute on function public.admin_team_grant_candidates() to authenticated;
notify pgrst,'reload schema';
