-- 트레이너 초대를 카카오톡 공유(무료)로도 보낸다(2026-10-14).
--
-- 지금까지는 알림톡(ATA)·문자(LMS)만 있어서 발송 업체 설정이 없으면 초대가 '대기'로만 남았다.
-- 그룹 초대처럼 트레이너가 카카오톡에서 회원을 골라 직접 보내는 방식('KAKAO')을 더한다.
--  · 휴대폰 번호가 없어도 된다(카카오톡이 받는 사람을 고른다).
--  · 발송 대기 행(pt_notifications)을 만들지 않는다 — 서버가 보낼 것이 없다.

alter table public.pt_invites alter column phone drop not null;

create or replace function public.pt_create_invite(p_hash text,p_phone text,p_channel text,p_url text) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_pass pt_passes; v_invite uuid; v_notification uuid; v_phone text := nullif(btrim(coalesce(p_phone,'')),'');
begin
 select * into v_pass from pt_passes where trainer_id=auth.uid() for update;
 if not public.pt_has_pass() then raise exception '활성 정액권이 필요해요.'; end if;
 if p_channel not in ('ATA','LMS','KAKAO') or length(p_url)>600 or p_url !~ '^https?://' then raise exception '초대 정보를 확인해 주세요.'; end if;
 -- 알림톡·문자는 번호가 있어야 보낸다. 카카오톡 공유는 번호가 없어도 되지만, 넣었으면 맞는 번호여야 한다.
 if (v_phone is null and p_channel <> 'KAKAO') or (v_phone is not null and v_phone !~ '^01[0-9]{8,9}$') then raise exception '초대 정보를 확인해 주세요.'; end if;
 if (select count(*) from pt_invites where trainer_id=auth.uid() and created_at>now()-interval '1 day') >= 50 then raise exception '오늘 초대 한도를 넘었어요.'; end if;
 if (select count(*) from pt_links where trainer_id=auth.uid() and active)>=v_pass.seats then raise exception '정액권의 회원 수 한도에 도달했어요.'; end if;
 if v_phone is not null then
  update pt_invites set canceled=true where trainer_id=auth.uid() and phone=v_phone and accepted_by is null;
 end if;
 insert into pt_invites(trainer_id,token_hash,phone) values(auth.uid(),p_hash,v_phone) returning id into v_invite;
 if p_channel = 'KAKAO' then return null; end if;
 insert into pt_notifications(created_by,trainer_id,invite_id,kind,channel,phone,payload)
 values(auth.uid(),auth.uid(),v_invite,'invite',p_channel,v_phone,jsonb_build_object('trainer',v_pass.name,'url',p_url)) returning id into v_notification;
 return v_notification;
end $$;
