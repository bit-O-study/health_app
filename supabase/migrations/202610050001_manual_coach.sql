-- Manual coaching: published answers and private drafts have separate access.
create table if not exists public.manual_coach_requests (
 id uuid primary key, user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('recommendation','habit-report','consultation')),
 for_date date not null, question text not null check(length(question)<=2000),
 context jsonb not null default '{}'::jsonb,
 answer text check(length(answer) between 1 and 12000), answered_at timestamptz,
 answered_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create unique index if not exists manual_coach_period on public.manual_coach_requests(user_id,kind,for_date) where kind<>'consultation';
create index if not exists manual_coach_owner on public.manual_coach_requests(user_id,created_at desc);
create table if not exists public.manual_coach_drafts (
 request_id uuid primary key references public.manual_coach_requests(id) on delete cascade,
 body text not null check(length(body)<=12000), updated_at timestamptz not null default now()
);
alter table public.manual_coach_requests enable row level security;
alter table public.manual_coach_drafts enable row level security;
drop policy if exists manual_coach_read on public.manual_coach_requests;
drop policy if exists manual_coach_draft_read on public.manual_coach_drafts;
create policy manual_coach_read on public.manual_coach_requests for select to authenticated using(user_id=(select auth.uid()) or public.is_admin());
create policy manual_coach_draft_read on public.manual_coach_drafts for select to authenticated using(public.is_admin());
revoke all on public.manual_coach_requests, public.manual_coach_drafts from anon, authenticated;
grant select on public.manual_coach_requests, public.manual_coach_drafts to authenticated;

create or replace function public.manual_coach_request(p_kind text,p_question text,p_request uuid,p_user uuid default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_user uuid:=coalesce(p_user,auth.uid()); v_date date:=(now() at time zone 'Asia/Seoul')::date; v_id uuid; v_context jsonb;
begin
 if auth.uid() is null or (p_user is not null and not public.is_admin()) then raise exception 'Forbidden' using errcode='42501'; end if;
 if p_kind is null or p_kind not in ('recommendation','habit-report','consultation') or p_question is null or length(trim(p_question))>2000 or p_request is null or (p_kind='consultation' and length(trim(p_question))<2) then raise exception 'Invalid request' using errcode='22023'; end if;
 if not exists(select 1 from subscriptions where user_id=v_user and product_id in ('helssu_lite_monthly','helssu_coach_monthly','helssu_premium_monthly','helssu_plus_monthly','helssu_pro_monthly') and state in ('active','grace','canceled') and expires_at>now()) then raise exception 'Subscription required' using errcode='42501'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_user::text,0));
 select id into v_id from manual_coach_requests where id=p_request and user_id=v_user;
 if v_id is not null then return v_id; end if;
 if p_kind='habit-report' then v_date:=date_trunc('week',v_date)::date; end if;
 if p_kind<>'consultation' then
  select id into v_id from manual_coach_requests where user_id=v_user and kind=p_kind and for_date=v_date;
  if v_id is not null then return v_id; end if;
 elsif (select count(*) from manual_coach_requests where user_id=v_user and kind='consultation' and for_date=v_date)>=20 then raise exception 'Daily limit'; end if;
 select jsonb_build_object('period_days',30,'exercise_records',coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb)) into v_context
 from (select exercise_id,for_date from exercise_completions where user_id=v_user and status='done' and for_date between ((now() at time zone 'Asia/Seoul')::date-29) and (now() at time zone 'Asia/Seoul')::date order by for_date desc limit 100) r;
 insert into manual_coach_requests(id,user_id,kind,for_date,question,context) values(p_request,v_user,p_kind,v_date,trim(p_question),v_context);
 return p_request;
end $$;
revoke all on function public.manual_coach_request(text,text,uuid,uuid) from public,anon;
grant execute on function public.manual_coach_request(text,text,uuid,uuid) to authenticated;

create or replace function public.manual_coach_save(p_request uuid,p_body text,p_publish boolean) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_row manual_coach_requests;
begin
 if not public.is_admin() then raise exception 'Forbidden' using errcode='42501'; end if;
 if p_body is null or length(trim(p_body))>12000 or p_publish is null or (p_publish and length(trim(p_body))=0) then raise exception 'Invalid body' using errcode='22023'; end if;
 select * into v_row from manual_coach_requests where id=p_request for update;
 if not found then raise exception 'Not found' using errcode='22023'; end if;
 if v_row.answered_at is not null then
  if p_publish and v_row.answer=trim(p_body) then return p_request; end if;
  raise exception 'Already published' using errcode='22023';
 end if;
 if p_publish then
  update manual_coach_requests set answer=trim(p_body),answered_at=now(),answered_by=auth.uid() where id=p_request;
  delete from manual_coach_drafts where request_id=p_request;
 else
  insert into manual_coach_drafts(request_id,body) values(p_request,trim(p_body)) on conflict(request_id) do update set body=excluded.body,updated_at=now();
 end if;
 return p_request;
end $$;
revoke all on function public.manual_coach_save(uuid,text,boolean) from public,anon;
grant execute on function public.manual_coach_save(uuid,text,boolean) to authenticated;

create or replace function public.manual_coach_members() returns table(user_id uuid,name text,expires_at timestamptz)
language sql stable security definer set search_path=public as $$
 select s.user_id,coalesce(u.raw_user_meta_data->>'name',u.raw_user_meta_data->>'full_name','회원'),s.expires_at
 from subscriptions s join auth.users u on u.id=s.user_id
 where public.is_admin() and s.product_id in ('helssu_lite_monthly','helssu_coach_monthly','helssu_premium_monthly','helssu_plus_monthly','helssu_pro_monthly') and s.state in ('active','grace','canceled') and s.expires_at>now()
 order by s.expires_at limit 500
$$;
revoke all on function public.manual_coach_members() from public,anon;
grant execute on function public.manual_coach_members() to authenticated;
notify pgrst,'reload schema';
