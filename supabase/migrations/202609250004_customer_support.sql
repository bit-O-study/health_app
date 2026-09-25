-- Customer support: owner/admin access, atomic ticket/outbox, free Kakao memo.
create table public.support_tickets (
 id uuid primary key default gen_random_uuid(), number bigint generated always as identity unique,
 user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null, category text not null check(category in ('bug','feedback','idea','other')),
 title text not null check(length(trim(title)) between 1 and 100),
 status text not null default 'new' check(status in ('new','in_progress','waiting_user','resolved','closed')),
 priority text not null default 'normal' check(priority in ('normal','high','urgent')),
 assignee uuid references auth.users(id) on delete set null,
 diagnostics jsonb not null default '{}', created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(), admin_read_at timestamptz, user_read_at timestamptz,
 unique(user_id,request_id)
);
create table public.support_messages (
 id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.support_tickets(id) on delete cascade,
 author_id uuid references auth.users(id) on delete set null, request_id uuid not null,
 body text not null check(length(trim(body)) between 1 and 5000), is_admin boolean not null default false,
 created_at timestamptz not null default now(), unique(ticket_id,request_id)
);
create table public.support_internal_notes (
 id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.support_tickets(id) on delete cascade,
 author_id uuid references auth.users(id) on delete set null, request_id uuid not null, body text not null check(length(trim(body)) between 1 and 5000), created_at timestamptz not null default now(), unique(ticket_id,request_id)
);
create table public.support_events (
 id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.support_tickets(id) on delete cascade,
 actor_id uuid references auth.users(id) on delete set null, kind text not null, detail text, created_at timestamptz not null default now()
);
create table public.support_attachments (
 id uuid primary key default gen_random_uuid(), ticket_id uuid not null references public.support_tickets(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade, path text not null unique,
 bytes integer not null check(bytes between 1 and 512000), ready boolean not null default false, created_at timestamptz not null default now()
);
create table public.support_kakao_connections (
 user_id uuid primary key references auth.users(id) on delete cascade, kakao_id text,
 tokens text, state text not null default 'disconnected' check(state in ('connected','disconnected','needs_reconnect')),
 enabled boolean not null default true, push_enabled boolean not null default false,
 token_expires_at timestamptz, refresh_expires_at timestamptz,
 lease_id uuid, lease_until timestamptz, updated_at timestamptz not null default now()
);
create table public.support_oauth_states (
 hash text primary key, user_id uuid not null references auth.users(id) on delete cascade,
 expires_at timestamptz not null, created_at timestamptz not null default now()
);
create table public.support_notification_outbox (
 id uuid primary key default gen_random_uuid(), ticket_id uuid references public.support_tickets(id) on delete cascade,
 event_id uuid not null, recipient_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('new','reply','test')),
 status text not null default 'queued' check(status in ('queued','processing','api_succeeded','failed','unknown','quota_deferred','needs_reconnect','canceled')),
 error_code text, batch_id uuid, push_attempted_at timestamptz, created_at timestamptz not null default now(), attempted_at timestamptz,
 unique(event_id,recipient_id)
);
create table public.support_notification_attempts (
 id uuid primary key, recipient_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now()
);
create index support_tickets_updated on public.support_tickets(updated_at desc);
create index support_messages_ticket on public.support_messages(ticket_id,created_at);
create index support_outbox_status on public.support_notification_outbox(recipient_id,status,created_at);

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;
alter table public.support_internal_notes enable row level security;
alter table public.support_events enable row level security;
alter table public.support_attachments enable row level security;
alter table public.support_kakao_connections enable row level security;
alter table public.support_oauth_states enable row level security;
alter table public.support_notification_outbox enable row level security;
alter table public.support_notification_attempts enable row level security;
revoke all on public.support_tickets, public.support_messages, public.support_internal_notes, public.support_events, public.support_attachments, public.support_kakao_connections, public.support_oauth_states, public.support_notification_outbox, public.support_notification_attempts from anon,authenticated;
grant select on public.support_tickets, public.support_messages, public.support_internal_notes, public.support_events, public.support_attachments, public.support_notification_outbox to authenticated;
grant all on public.support_tickets, public.support_messages, public.support_internal_notes, public.support_events, public.support_attachments, public.support_kakao_connections, public.support_oauth_states, public.support_notification_outbox, public.support_notification_attempts to service_role;
grant usage,select on sequence public.support_tickets_number_seq to service_role;
create policy support_ticket_read on public.support_tickets for select to authenticated using(user_id=(select auth.uid()) or public.is_admin());
create policy support_message_read on public.support_messages for select to authenticated using(exists(select 1 from public.support_tickets t where t.id=ticket_id));
create policy support_attachment_read on public.support_attachments for select to authenticated using(ready and exists(select 1 from public.support_tickets t where t.id=ticket_id));
create policy support_note_read on public.support_internal_notes for select to authenticated using(public.is_admin());
create policy support_event_read on public.support_events for select to authenticated using(public.is_admin());
create policy support_outbox_read on public.support_notification_outbox for select to authenticated using(public.is_admin());

create or replace function public.support_create(p_request uuid,p_category text,p_title text,p_body text,p_diagnostics jsonb default '{}') returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; v_event uuid:=gen_random_uuid(); v_user uuid:=auth.uid();
begin
 if v_user is null then raise exception '로그인이 필요해요.'; end if;
 perform pg_advisory_xact_lock(hashtextextended('support:'||v_user::text,0));
 select id into v_id from support_tickets where user_id=v_user and request_id=p_request;
 if v_id is not null then return v_id; end if;
 if (select count(*) from support_tickets where user_id=v_user and created_at>now()-interval '1 minute')>=3 or
 (select count(*) from support_tickets where user_id=v_user and created_at>now()-interval '24 hours')>=20 then raise exception '잠시 후 다시 접수해 주세요.'; end if;
 if jsonb_typeof(p_diagnostics)<>'object' or length(p_diagnostics::text)>2000 then raise exception '진단 정보가 올바르지 않아요.'; end if;
 insert into support_tickets(user_id,request_id,category,title,diagnostics) values(v_user,p_request,p_category,trim(p_title),p_diagnostics) returning id into v_id;
 insert into support_messages(ticket_id,author_id,request_id,body) values(v_id,v_user,p_request,trim(p_body));
 insert into support_events(id,ticket_id,actor_id,kind) values(v_event,v_id,v_user,'created');
 insert into support_notification_outbox(ticket_id,event_id,recipient_id,kind)
 select v_id,v_event,u.id,'new' from auth.users u join admins a on lower(a.email)=lower(u.email);
 return v_id;
end $$;

create or replace function public.support_reply(p_ticket uuid,p_request uuid,p_body text,p_internal boolean default false) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
declare t support_tickets; v_admin boolean:=public.is_admin(); v_event uuid:=gen_random_uuid();
begin
 select * into t from support_tickets where id=p_ticket for update;
 if auth.uid() is null or t.id is null or (t.user_id<>auth.uid() and not v_admin) or (p_internal and not v_admin) then raise exception '접근할 수 없어요.'; end if;
 if exists(select 1 from support_messages where ticket_id=p_ticket and request_id=p_request) or exists(select 1 from support_internal_notes where ticket_id=p_ticket and request_id=p_request) then return; end if;
 if (select count(*) from support_messages where ticket_id=p_ticket)>=200 then raise exception '대화가 많아 새 문의로 이어 주세요.'; end if;
 if (select count(*) from support_messages where author_id=auth.uid() and created_at>now()-interval '1 minute')>=10 then raise exception '잠시 후 다시 보내 주세요.'; end if;
 if p_internal then
 insert into support_internal_notes(ticket_id,author_id,request_id,body) values(p_ticket,auth.uid(),p_request,trim(p_body));
 else
 insert into support_messages(ticket_id,author_id,request_id,body,is_admin) values(p_ticket,auth.uid(),p_request,trim(p_body),v_admin);
 update support_tickets set updated_at=now(),admin_read_at=case when v_admin then now() else null end,user_read_at=case when v_admin then null else now() end,
 status=case when not v_admin and status in ('resolved','closed','waiting_user') then 'in_progress' else status end where id=p_ticket;
 end if;
 insert into support_events(id,ticket_id,actor_id,kind) values(v_event,p_ticket,auth.uid(),case when p_internal then 'note' else 'reply' end);
 if not v_admin then
 insert into support_notification_outbox(ticket_id,event_id,recipient_id,kind)
 select p_ticket,v_event,u.id,'reply' from auth.users u join admins a on lower(a.email)=lower(u.email);
 end if;
end $$;
create or replace function public.support_manage(p_ticket uuid,p_status text,p_priority text,p_assign boolean default false) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if not public.is_admin() then raise exception '관리자만 변경할 수 있어요.'; end if;
 update support_tickets set status=p_status,priority=p_priority,assignee=case when p_assign then auth.uid() else assignee end,updated_at=now() where id=p_ticket;
 insert into support_events(ticket_id,actor_id,kind,detail) values(p_ticket,auth.uid(),'status',p_status||' / '||p_priority);
end $$;
create or replace function public.support_read(p_ticket uuid) returns void
language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if public.is_admin() then update support_tickets set admin_read_at=now() where id=p_ticket;
 else update support_tickets set user_read_at=now() where id=p_ticket and user_id=auth.uid(); end if;
end $$;

-- Service-only worker: recipient lock serializes token refresh and reserves rolling budget.
create or replace function public.support_claim(p_user uuid,p_test boolean default false) returns jsonb
language plpgsql security definer set search_path=public,pg_temp as $$
declare c support_kakao_connections; b uuid:=gen_random_uuid(); ids uuid[]; n integer;
begin
 select * into c from support_kakao_connections where user_id=p_user for update;
 if not exists(select 1 from auth.users u join admins a on lower(a.email)=lower(u.email) where u.id=p_user) then
 delete from support_kakao_connections where user_id=p_user;
 update support_notification_outbox set status='canceled' where recipient_id=p_user and status in ('queued','quota_deferred','needs_reconnect'); return null; end if;
 if c.user_id is null or not c.enabled or c.state<>'connected' then return null; end if;
 if c.lease_until>now() then return null; end if;
 update support_notification_outbox set status='unknown',error_code='worker_interrupted' where recipient_id=p_user and status='processing';
 update support_notification_outbox o set status='canceled' where recipient_id=p_user and status in ('queued','quota_deferred','needs_reconnect') and exists(select 1 from support_tickets t where t.id=o.ticket_id and t.status in ('resolved','closed'));
 if (select count(*) from support_notification_attempts where recipient_id=p_user and created_at>now()-interval '24 hours')>=15 then
 update support_notification_outbox set status='quota_deferred' where recipient_id=p_user and status in ('queued','needs_reconnect'); return null; end if;
 -- A provider quota error blocks the entire recipient for 24 hours.
 if exists(select 1 from support_notification_outbox where recipient_id=p_user and error_code='quota' and attempted_at>now()-interval '24 hours') then return null; end if;
 select array_agg(id) into ids from (select id from support_notification_outbox where recipient_id=p_user and status in ('queued','quota_deferred','needs_reconnect') and (not p_test or kind='test') order by created_at limit 100) q;
 n:=coalesce(array_length(ids,1),0); if n=0 then return null; end if;
 update support_kakao_connections set lease_id=b,lease_until=now()+interval '2 minutes' where user_id=p_user;
 insert into support_notification_attempts(id,recipient_id) values(b,p_user);
 update support_notification_outbox set status='processing',batch_id=b,attempted_at=now(),error_code=null where id=any(ids);
 return jsonb_build_object('batch',b,'count',n,'connection',to_jsonb(c));
end $$;
create or replace function public.support_reserve_attachment(p_user uuid,p_ticket uuid,p_path text,p_bytes integer,p_limit bigint) returns uuid
language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;
begin
 perform pg_advisory_xact_lock(hashtextextended('support_storage',0));
 if not exists(select 1 from support_tickets where id=p_ticket and user_id=p_user) then raise exception '접근할 수 없어요.'; end if;
 if (select count(*) from support_attachments where ticket_id=p_ticket)>=3 then raise exception '사진은 최대 3장이에요.'; end if;
 if p_limit<=0 or (select coalesce(sum(bytes),0) from support_attachments)+p_bytes>least(p_limit,104857600) then raise exception '사진 저장 공간이 부족해요. 내용은 정상 접수됐어요.'; end if;
 insert into support_attachments(ticket_id,user_id,path,bytes) values(p_ticket,p_user,p_path,p_bytes) returning id into v_id; return v_id;
end $$;

revoke all on function public.support_create(uuid,text,text,text,jsonb),public.support_reply(uuid,uuid,text,boolean),public.support_manage(uuid,text,text,boolean),public.support_read(uuid),public.support_claim(uuid,boolean),public.support_reserve_attachment(uuid,uuid,text,integer,bigint) from public,anon,authenticated;
grant execute on function public.support_create(uuid,text,text,text,jsonb),public.support_reply(uuid,uuid,text,boolean),public.support_manage(uuid,text,text,boolean),public.support_read(uuid) to authenticated;
grant execute on function public.support_claim(uuid,boolean),public.support_reserve_attachment(uuid,uuid,text,integer,bigint) to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('support-private','support-private',false,512000,array['image/webp']) on conflict(id) do nothing;
