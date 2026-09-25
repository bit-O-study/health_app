-- Follow-up support guarantees: orphan cleanup and project storage safety ceiling.
create or replace function public.support_reserve_attachment(p_user uuid,p_ticket uuid,p_path text,p_bytes integer,p_limit bigint) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; v_total bigint;
begin
 perform pg_advisory_xact_lock(hashtextextended('support_storage',0));
 if not exists(select 1 from support_tickets where id=p_ticket and user_id=p_user) then raise exception '접근할 수 없어요.'; end if;
 if (select count(*) from support_attachments where ticket_id=p_ticket)>=3 then raise exception '사진은 최대 3장이에요.'; end if;
 select coalesce(sum(coalesce((metadata->>'size')::bigint,0)),0) into v_total from storage.objects;
 if p_limit<=0 or v_total+(select coalesce(sum(bytes),0) from support_attachments where not ready)+p_bytes>900000000 or
 (select coalesce(sum(bytes),0) from support_attachments)+p_bytes>least(p_limit,104857600) then raise exception '사진 저장 공간이 부족해요. 내용은 정상 접수됐어요.'; end if;
 insert into support_attachments(ticket_id,user_id,path,bytes) values(p_ticket,p_user,p_path,p_bytes) returning id into v_id; return v_id;
end $$;
create or replace function public.support_storage_garbage() returns table(path text)
language sql security definer set search_path=public,pg_temp as $$
 select o.name from storage.objects o where o.bucket_id='support-private' and (
 o.created_at<now()-interval '30 days' or
 (o.created_at<now()-interval '1 day' and not exists(select 1 from support_attachments a where a.path=o.name and a.ready))) limit 100;
$$;
revoke all on function public.support_storage_garbage() from public,anon,authenticated;
grant execute on function public.support_storage_garbage() to service_role;
