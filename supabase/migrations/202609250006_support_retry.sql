-- Explicit manual retry preserves the old attempt and records a new event.
create or replace function public.support_retry(p_id uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare n support_notification_outbox; e uuid:=gen_random_uuid();
begin
 if not public.is_admin() then raise exception '관리자 권한이 필요해요.'; end if;
 select * into n from support_notification_outbox where id=p_id and recipient_id=auth.uid() for update;
 if n.id is null or n.status not in ('failed','unknown') then raise exception '재전송 대상이 아니에요.'; end if;
 if n.ticket_id is not null and exists(select 1 from support_tickets where id=n.ticket_id and status in ('resolved','closed')) then raise exception '처리된 문의예요.'; end if;
 update support_notification_outbox set status='canceled',error_code='manual_retry:'||n.status where id=n.id;
 insert into support_notification_outbox(ticket_id,event_id,recipient_id,kind) values(n.ticket_id,e,n.recipient_id,n.kind);
 if n.ticket_id is not null then insert into support_events(ticket_id,actor_id,kind,detail) values(n.ticket_id,auth.uid(),'notification_retry',n.status); end if;
end $$;
revoke all on function public.support_retry(uuid) from public,anon;
grant execute on function public.support_retry(uuid) to authenticated;
