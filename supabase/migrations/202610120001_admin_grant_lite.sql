-- 관리자 수동 지급: 라이트(990원) 이용권을 결제 없이 넣는다(2026-10-12).
--
-- 🔴 subscriptions 는 사용자당 한 행이고 구글 구매 토큰으로 갱신 소식(RTDN)을 찾는다.
--    결제 중인 행을 덮으면 그 토큰을 잃어 갱신·환불 소식이 닿지 않는다 → 이용 중인
--    구글 구독이 있으면 지급을 거절한다. 지급 행은 purchase_token 이 'admin-grant:<user_id>'
--    (구글 토큰과 겹칠 수 없는 모양)이고 auto_renewing=false — 권한 판정은 expires_at 만 본다.
--    나중에 회원이 실제로 결제하면 앱의 구매 검증이 이 행을 그대로 덮는다(결제가 이긴다).
create or replace function public.admin_grant_lite(p_user uuid,p_months int) returns timestamptz
language plpgsql security definer set search_path=public as $$
declare v_row subscriptions; v_from timestamptz:=now(); v_until timestamptz;
begin
 if not public.is_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
 if p_user is null or p_months is null or p_months not between 1 and 12 then raise exception 'Invalid grant' using errcode='22023'; end if;
 if not exists(select 1 from auth.users where id=p_user) then raise exception 'User not found' using errcode='22023'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select * into v_row from subscriptions where user_id=p_user for update;
 if found and v_row.state in ('active','grace','canceled') and v_row.expires_at>now() then
  if v_row.purchase_token not like 'admin-grant:%' then raise exception 'Paid subscription active' using errcode='23505'; end if;
  -- 이미 지급한 기간이 남아 있으면 그 뒤에 이어 붙인다(연장).
  v_from:=v_row.expires_at;
 end if;
 v_until:=v_from+make_interval(months=>p_months);
 insert into subscriptions(user_id,platform,product_id,purchase_token,state,expires_at,auto_renewing,verified_at,updated_at)
 values(p_user,'google_play','helssu_lite_monthly','admin-grant:'||p_user,'active',v_until,false,now(),now())
 on conflict(user_id) do update set platform=excluded.platform,product_id=excluded.product_id,purchase_token=excluded.purchase_token,
  state=excluded.state,expires_at=excluded.expires_at,auto_renewing=false,verified_at=now(),updated_at=now();
 return v_until;
end $$;
revoke all on function public.admin_grant_lite(uuid,int) from public,anon;
grant execute on function public.admin_grant_lite(uuid,int) to authenticated;

-- 회수 — 지급한 행만. 결제한 구독은 여기서 끊지 못한다(환불·해지는 구글 플레이가 한다).
create or replace function public.admin_revoke_lite(p_user uuid) returns boolean
language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
 update subscriptions set state='expired',expires_at=now(),auto_renewing=false,updated_at=now()
 where user_id=p_user and purchase_token like 'admin-grant:%' and expires_at>now();
 return found;
end $$;
revoke all on function public.admin_revoke_lite(uuid) from public,anon;
grant execute on function public.admin_revoke_lite(uuid) to authenticated;

-- 회원정보 화면용: 지금 이용 중인 구독(결제·지급 모두). 구매 토큰은 내보내지 않는다.
create or replace function public.admin_member_subscriptions() returns table(user_id uuid,product_id text,expires_at timestamptz,granted boolean)
language sql stable security definer set search_path=public as $$
 select s.user_id,s.product_id,s.expires_at,s.purchase_token like 'admin-grant:%'
 from subscriptions s
 where public.is_admin() and s.state in ('active','grace','canceled') and s.expires_at>now()
$$;
revoke all on function public.admin_member_subscriptions() from public,anon;
grant execute on function public.admin_member_subscriptions() to authenticated;
notify pgrst,'reload schema';
