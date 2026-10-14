-- 관리자 수동 지급: 신청하지 않은 회원에게도 트레이너 이용권을 넣는다(2026-10-12).
-- pt_admin_pass 는 신청 행이 있어야만 승인할 수 있었다. 여기는 행이 없으면 만들고 바로 이용 중으로 둔다.
-- 지급한 뒤의 기간 변경·해지는 기존 pt_admin_pass 그대로 쓴다.
create or replace function public.pt_admin_grant_pass(p_trainer uuid,p_name text,p_phone text,p_start date,p_end date,p_seats integer) returns void
language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin() then raise exception '관리자만 변경할 수 있어요.'; end if;
 if p_trainer is null or not exists(select 1 from auth.users where id=p_trainer) then raise exception '회원을 확인해 주세요.'; end if;
 if p_name is null or length(trim(p_name)) not between 1 and 80 or p_phone is null or p_phone !~ '^01[0-9]{8,9}$' then raise exception '이름과 휴대폰 번호를 확인해 주세요.'; end if;
 if p_start is null or p_end is null or p_end<p_start or p_seats is null or p_seats not between 1 and 1000 then raise exception '기간과 회원 수를 확인해 주세요.'; end if;
 insert into pt_passes(trainer_id,name,phone,status,starts_on,ends_on,seats) values(p_trainer,trim(p_name),p_phone,'active',p_start,p_end,p_seats)
 on conflict(trainer_id) do update set name=excluded.name,phone=excluded.phone,status='active',starts_on=excluded.starts_on,ends_on=excluded.ends_on,seats=excluded.seats,updated_at=now();
end $$;
revoke all on function public.pt_admin_grant_pass(uuid,text,text,date,date,integer) from public,anon;
grant execute on function public.pt_admin_grant_pass(uuid,text,text,date,date,integer) to authenticated;
notify pgrst,'reload schema';
