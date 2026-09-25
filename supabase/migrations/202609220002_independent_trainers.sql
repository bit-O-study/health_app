-- Independent trainer passes and explicitly accepted member connections. No group membership grants access.
create table if not exists public.pt_passes (
  trainer_id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  phone text not null check (phone ~ '^01[0-9]{8,9}$'),
  status text not null default 'requested' check (status in ('requested','active','canceled')),
  starts_on date, ends_on date, seats integer not null default 15 check (seats between 1 and 1000),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);
create table if not exists public.pt_links (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.pt_passes(trainer_id) on delete cascade,
  member_id uuid not null references auth.users(id) on delete cascade,
  member_name text not null,
  active boolean not null default true,
  share_workout boolean not null default false,
  share_diet boolean not null default false,
  share_body boolean not null default false,
  allow_prescription boolean not null default false,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique(trainer_id,member_id), check(trainer_id <> member_id)
);
create table if not exists public.pt_invites (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.pt_passes(trainer_id) on delete cascade,
  token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
  phone text not null check(phone ~ '^01[0-9]{8,9}$'),
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_by uuid references auth.users(id) on delete cascade,
  canceled boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.pt_notifications (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id) on delete cascade,
  trainer_id uuid not null references public.pt_passes(trainer_id) on delete cascade,
  invite_id uuid references public.pt_invites(id) on delete cascade,
  kind text not null check(kind in ('invite','disconnect')),
  channel text not null check(channel in ('ATA','LMS')),
  phone text not null,
  payload jsonb not null,
  status text not null default 'queued' check(status in ('queued','processing','submitted','failed','unknown')),
  provider_id text,
  created_at timestamptz not null default now()
);
create index if not exists pt_links_member_idx on public.pt_links(member_id);
create index if not exists pt_invites_trainer_idx on public.pt_invites(trainer_id,created_at);
alter table public.pt_passes enable row level security;
alter table public.pt_links enable row level security;
alter table public.pt_invites enable row level security;
alter table public.pt_notifications enable row level security;
revoke all on public.pt_passes, public.pt_links, public.pt_invites, public.pt_notifications from anon, authenticated;
grant select on public.pt_passes, public.pt_links, public.pt_notifications to authenticated;
grant all on public.pt_passes, public.pt_links, public.pt_invites, public.pt_notifications to service_role;

create or replace function public.pt_has_pass(p_trainer uuid default auth.uid()) returns boolean
language sql stable security definer set search_path=public as $$
 select exists(select 1 from pt_passes where trainer_id=p_trainer and status='active'
 and (now() at time zone 'Asia/Seoul')::date between starts_on and ends_on);
$$;
drop policy if exists "pt pass owner or admin" on public.pt_passes;
create policy "pt pass owner or admin" on public.pt_passes for select to authenticated
 using(trainer_id=auth.uid() or public.is_admin() or exists(select 1 from pt_links where trainer_id=pt_passes.trainer_id and member_id=auth.uid() and active));
drop policy if exists "pt accepted connections" on public.pt_links;
create policy "pt accepted connections" on public.pt_links for select to authenticated
 using(member_id=auth.uid() or (trainer_id=auth.uid() and active and public.pt_has_pass()));
drop policy if exists "pt own notification status" on public.pt_notifications;
create policy "pt own notification status" on public.pt_notifications for select to authenticated
 using(created_by=auth.uid() or public.is_admin());

create or replace function public.pt_request_pass(p_name text,p_phone text) returns void
language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null then raise exception '로그인이 필요해요.'; end if;
 if length(trim(p_name)) not between 1 and 80 or p_phone !~ '^01[0-9]{8,9}$' then raise exception '이름과 휴대폰 번호를 확인해 주세요.'; end if;
 insert into pt_passes(trainer_id,name,phone) values(auth.uid(),trim(p_name),p_phone)
 on conflict(trainer_id) do update set name=excluded.name,phone=excluded.phone,status='requested',updated_at=now()
 where pt_passes.status <> 'active' or pt_passes.ends_on < (now() at time zone 'Asia/Seoul')::date;
 if not found then raise exception '이미 이용 중인 정액권이 있어요.'; end if;
end $$;
create or replace function public.pt_admin_pass(p_trainer uuid,p_start date,p_end date,p_seats integer,p_active boolean) returns void
language plpgsql security definer set search_path=public as $$
begin
 if not public.is_admin() then raise exception '관리자만 변경할 수 있어요.'; end if;
 if p_start is null or p_end is null or p_end<p_start or p_seats is null or p_seats not between 1 and 1000 then raise exception '기간과 회원 수를 확인해 주세요.'; end if;
 update pt_passes set status=case when p_active then 'active' else 'canceled' end,starts_on=p_start,ends_on=p_end,seats=p_seats,updated_at=now() where trainer_id=p_trainer;
 if not found then raise exception '신청 내역이 없어요.'; end if;
end $$;
create or replace function public.pt_create_invite(p_hash text,p_phone text,p_channel text,p_url text) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_pass pt_passes; v_invite uuid; v_notification uuid;
begin
 select * into v_pass from pt_passes where trainer_id=auth.uid() for update;
 if not public.pt_has_pass() then raise exception '활성 정액권이 필요해요.'; end if;
 if p_phone !~ '^01[0-9]{8,9}$' or p_channel not in ('ATA','LMS') or length(p_url)>600 or p_url !~ '^https?://' then raise exception '초대 정보를 확인해 주세요.'; end if;
 if (select count(*) from pt_invites where trainer_id=auth.uid() and created_at>now()-interval '1 day') >= 50 then raise exception '오늘 초대 한도를 넘었어요.'; end if;
 if (select count(*) from pt_links where trainer_id=auth.uid() and active)>=v_pass.seats then raise exception '정액권의 회원 수 한도에 도달했어요.'; end if;
 update pt_invites set canceled=true where trainer_id=auth.uid() and phone=p_phone and accepted_by is null;
 insert into pt_invites(trainer_id,token_hash,phone) values(auth.uid(),p_hash,p_phone) returning id into v_invite;
 insert into pt_notifications(created_by,trainer_id,invite_id,kind,channel,phone,payload)
 values(auth.uid(),auth.uid(),v_invite,'invite',p_channel,p_phone,jsonb_build_object('trainer',v_pass.name,'url',p_url)) returning id into v_notification;
 return v_notification;
end $$;
create or replace function public.pt_preview_invite(p_hash text) returns jsonb
language sql stable security definer set search_path=public as $$
 select jsonb_build_object('trainer',p.name,'expires_at',i.expires_at) from pt_invites i join pt_passes p on p.trainer_id=i.trainer_id
 where auth.uid() is not null and i.token_hash=p_hash and i.accepted_by is null and not i.canceled and i.expires_at>now() and public.pt_has_pass(i.trainer_id);
$$;
create or replace function public.pt_accept_invite(p_hash text,p_workout boolean,p_diet boolean,p_body boolean,p_prescription boolean) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_i pt_invites; v_pass pt_passes; v_id uuid; v_name text;
begin
 if auth.uid() is null then raise exception '로그인이 필요해요.'; end if;
 select * into v_i from pt_invites where token_hash=p_hash;
 if v_i.id is null then raise exception '유효하지 않은 초대예요.'; end if;
 -- All changes lock the pass first, then invitation/link, preventing acceptance/disconnect races.
 select * into v_pass from pt_passes where trainer_id=v_i.trainer_id for update;
 select * into v_i from pt_invites where token_hash=p_hash for update;
 if v_i.canceled or v_i.accepted_by is not null or v_i.expires_at<=now() or not public.pt_has_pass(v_i.trainer_id) or v_i.trainer_id=auth.uid() then raise exception '만료되었거나 사용할 수 없는 초대예요.'; end if;
 if exists(select 1 from pt_links where trainer_id=v_i.trainer_id and member_id=auth.uid() and active) then raise exception '이미 연결된 트레이너예요.'; end if;
 if (select count(*) from pt_links where trainer_id=v_i.trainer_id and active)>=v_pass.seats then raise exception '트레이너의 회원 수 한도가 찼어요.'; end if;
 select coalesce(nullif(nickname,''),nullif(name,''),'회원') into v_name from profiles where user_id=auth.uid();
 insert into pt_links(trainer_id,member_id,member_name,share_workout,share_diet,share_body,allow_prescription)
 values(v_i.trainer_id,auth.uid(),coalesce(v_name,'회원'),p_workout,p_diet,p_body,p_prescription)
 on conflict(trainer_id,member_id) do update set active=true,revoked_at=null,member_name=excluded.member_name,
 share_workout=excluded.share_workout,share_diet=excluded.share_diet,share_body=excluded.share_body,allow_prescription=excluded.allow_prescription
 returning id into v_id;
 update pt_invites set accepted_by=auth.uid() where id=v_i.id;
 return v_id;
end $$;
create or replace function public.pt_update_sharing(p_link uuid,p_workout boolean,p_diet boolean,p_body boolean,p_prescription boolean) returns void
language plpgsql security definer set search_path=public as $$
begin
 update pt_links set share_workout=p_workout,share_diet=p_diet,share_body=p_body,allow_prescription=p_prescription
 where id=p_link and member_id=auth.uid() and active;
 if not found then raise exception '내 트레이너 연결만 변경할 수 있어요.'; end if;
end $$;
create or replace function public.pt_disconnect(p_link uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_link pt_links; v_pass pt_passes; v_id uuid;
begin
 select * into v_link from pt_links where id=p_link and member_id=auth.uid();
 if not found then raise exception '연결을 찾을 수 없어요.'; end if;
 select * into v_pass from pt_passes where trainer_id=v_link.trainer_id for update;
 update pt_links set active=false,revoked_at=now(),share_workout=false,share_diet=false,share_body=false,allow_prescription=false
 where id=p_link and member_id=auth.uid() and active returning * into v_link;
 if not found then return null; end if;
 -- Invalidate earlier outstanding invitations to the phone used by this member.
 update pt_invites set canceled=true where trainer_id=v_link.trainer_id and accepted_by is null
 and phone in (select phone from pt_invites where trainer_id=v_link.trainer_id and accepted_by=auth.uid());
 insert into pt_notifications(created_by,trainer_id,kind,channel,phone,payload)
 values(auth.uid(),v_link.trainer_id,'disconnect','ATA',v_pass.phone,jsonb_build_object('member',v_link.member_name,'trainer',v_pass.name)) returning id into v_id;
 return v_id;
end $$;
create or replace function public.pt_member_report(p_link uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare l pt_links; since date := (now() at time zone 'Asia/Seoul')::date - 29;
begin
 select * into l from pt_links where id=p_link and trainer_id=auth.uid() and active;
 if not found or not public.pt_has_pass() then return null; end if;
 return jsonb_build_object('name',l.member_name,
 'workout',case when l.share_workout then jsonb_build_object(
 'days',(select count(distinct for_date) from exercise_completions where user_id=l.member_id and status='done' and for_date>=since),
 'sets',(select coalesce(sum(sets),0) from exercise_completions where user_id=l.member_id and status='done' and for_date>=since),
 'minutes',(select coalesce(sum(duration_sec),0)/60 from workout_sessions where user_id=l.member_id and for_date>=since)) else null end,
 'diet',case when l.share_diet then (select count(distinct for_date) from food_logs where user_id=l.member_id and for_date>=since) else null end,
 'body',case when l.share_body then jsonb_build_object('weight_kg',(select weight_kg from weight_logs where user_id=l.member_id order by created_at desc limit 1),
 'body_fat_pct',(select body_fat_pct from body_compositions where user_id=l.member_id order by measured_at desc limit 1)) else null end,
 'prescription',l.allow_prescription);
end $$;

create table if not exists public.pt_notes (
 id uuid primary key default gen_random_uuid(), link_id uuid not null references public.pt_links(id) on delete cascade,
 body text not null check(length(body) between 1 and 500), created_at timestamptz not null default now()
);
alter table public.pt_notes enable row level security;
revoke all on public.pt_notes from anon,authenticated;
grant select on public.pt_notes to authenticated;
grant all on public.pt_notes to service_role;
drop policy if exists "pt notes for accepted participants" on public.pt_notes;
create policy "pt notes for accepted participants" on public.pt_notes for select to authenticated using(exists(
 select 1 from pt_links where id=pt_notes.link_id and (member_id=auth.uid() or (trainer_id=auth.uid() and active and public.pt_has_pass()))));
create or replace function public.valid_prescription_patch(p_patch jsonb)
returns boolean language sql immutable set search_path = public as $fn$
  select p_patch is not null
    and jsonb_typeof(p_patch) = 'object'
    and (p_patch ?& array['exerciseId','equipment','sets','reps','weightKg'])
    and jsonb_typeof(p_patch->'exerciseId') = 'string'
    and length(trim(p_patch->>'exerciseId')) between 1 and 200
    and jsonb_typeof(p_patch->'equipment') = 'string'
    and (p_patch->>'equipment') in ('barbell','dumbbell','machine','cable','bodyweight','smith','kettlebell','band','trx','medicineball','landmine','sled','battlerope','bosu','ball','plate','other')
    and jsonb_typeof(p_patch->'sets') = 'number'
    and (p_patch->>'sets')::numeric between 1 and 20
    and (p_patch->>'sets')::numeric = trunc((p_patch->>'sets')::numeric)
    and jsonb_typeof(p_patch->'reps') = 'number'
    and (p_patch->>'reps')::numeric between 1 and 100
    and (p_patch->>'reps')::numeric = trunc((p_patch->>'reps')::numeric)
    and jsonb_typeof(p_patch->'weightKg') in ('null','number')
    and (jsonb_typeof(p_patch->'weightKg') = 'null' or (
      (p_patch->>'weightKg')::numeric between 0 and 9999.9
      and (p_patch->>'weightKg')::numeric = round((p_patch->>'weightKg')::numeric, 1)));
$fn$;
revoke all on function public.valid_prescription_patch(jsonb) from public, anon;
grant execute on function public.valid_prescription_patch(jsonb) to authenticated;

-- ─── 영구 루틴 처방 — 검증만 위 함수로 옮긴다(동작 동일) ────────────────────

create or replace function public.pt_prescribe_exercise(
  p_link uuid, p_member uuid, p_row uuid, p_expected_updated_at timestamptz,
  p_patch jsonb, p_note text)
returns boolean language plpgsql security definer set search_path = public as $fn$
declare
  current_row public.routine_exercises%rowtype;
  next_id uuid;
begin
  perform 1 from public.pt_passes where trainer_id=auth.uid() for share;
  if not found or not public.pt_has_pass() then return false; end if;
  perform 1 from public.pt_links where id=p_link and trainer_id=auth.uid() and member_id=p_member and active and allow_prescription for share;
  if not found then return false; end if;
  select * into current_row from public.routine_exercises
    where id = p_row and user_id = p_member for update;
  if not found or p_expected_updated_at is null or current_row.updated_at <> p_expected_updated_at then return false; end if;
  if p_note is null or length(trim(p_note)) = 0 or length(p_note) > 500 then raise exception 'Invalid note'; end if;
  if p_patch is null then
    delete from public.routine_exercises where id = p_row and user_id = p_member;
  else
    if not public.valid_prescription_patch(p_patch) then raise exception 'Invalid prescription'; end if;
    -- A replaced exercise must not inherit the previous exercise's completion for today.
    next_id := case when current_row.exercise_id <> p_patch->>'exerciseId'
      or current_row.equipment <> p_patch->>'equipment' then gen_random_uuid() else current_row.id end;
    update public.routine_exercises set id = next_id,
      exercise_id = p_patch->>'exerciseId', equipment = p_patch->>'equipment',
      sets = (p_patch->>'sets')::int, reps = (p_patch->>'reps')::int,
      weight_kg = (p_patch->>'weightKg')::numeric, set_details = null, updated_at = clock_timestamp()
      where id = p_row and user_id = p_member;
  end if;
  -- An in-app record visible to both parties, committed together with the prescription.
  insert into public.pt_notes(link_id,body) values(p_link,p_note);
  -- Never edit daily_plan, daily_conditioning or completion snapshots here.
  return true;
end $fn$;

create or replace function public.pt_prescribe_today(
  p_link uuid, p_member uuid, p_focus text, p_position int,
  p_expected_exercise_id text, p_patch jsonb, p_note text)
returns boolean language plpgsql security definer set search_path = public as $fn$
declare
  today date := (now() at time zone 'Asia/Seoul')::date;
  r public.user_routines%rowtype;
  d_index int;
  copied int := 0;
  target uuid;
begin
  perform 1 from public.pt_passes where trainer_id=auth.uid() for share;
  if not found or not public.pt_has_pass() then return false; end if;
  perform 1 from public.pt_links where id=p_link and trainer_id=auth.uid() and member_id=p_member and active and allow_prescription for share;
  if not found then return false; end if;
  if p_note is null or length(trim(p_note)) = 0 or length(p_note) > 500 then raise exception 'Invalid note'; end if;
  if p_patch is not null and not public.valid_prescription_patch(p_patch) then
    raise exception 'Invalid prescription';
  end if;
  if p_focus is null or length(trim(p_focus)) = 0 or length(p_focus) > 50
     or p_position is null or p_position < 0 or p_expected_exercise_id is null then
    return false;
  end if;

  select * into r from public.user_routines where user_id = p_member;
  -- null-safe — 휴식일이 아닌 날(rest_date is null)에 NULL 로 흘러가지 않게.
  if not found or r.rest_date is not distinct from today then return false; end if;

  -- 이 부위가 아직 '오늘만' 으로 고정되지 않았으면 **부위 전체**를 루틴에서 복사해 고정한다.
  if not exists (select 1 from public.daily_plan
                  where user_id = p_member and for_date = today and focus = p_focus) then
    -- 회원이 오늘 부위를 갈아끼운 날은 루틴에서 복사하면 그 선택을 덮어쓴다 → 손대지 않는다.
    if r.override_date is not distinct from today then return false; end if;
    d_index := ((today - r.start_date) % 7 + 7) % 7;
    insert into public.daily_plan
      (user_id, for_date, focus, position, exercise_id, equipment, sets, reps,
       weight_kg, set_details, memo, superset_group)
    select p_member, today, e.focus, e.position, e.exercise_id, e.equipment, e.sets, e.reps,
           e.weight_kg, e.set_details, e.memo, e.superset_group
      from public.routine_exercises e
     where e.user_id = p_member and e.day_index = d_index and e.focus = p_focus;
    get diagnostics copied = row_count;
    if copied = 0 then return false; end if;
  end if;

  select id into target from public.daily_plan
   where user_id = p_member and for_date = today and focus = p_focus
     and position = p_position and exercise_id = p_expected_exercise_id
   order by id limit 1
   for update;
  if not found then return false; end if;

  if p_patch is null then
    delete from public.daily_plan where id = target;
  else
    update public.daily_plan
       set exercise_id = p_patch->>'exerciseId', equipment = p_patch->>'equipment',
           sets = (p_patch->>'sets')::int, reps = (p_patch->>'reps')::int,
           weight_kg = (p_patch->>'weightKg')::numeric, set_details = null
     where id = target;
  end if;

  insert into public.pt_notes(link_id,body) values(p_link,p_note);
  return true;
end $fn$;

create or replace function public.pt_member_today_plan(
  p_link uuid, p_member uuid)
returns jsonb language plpgsql security definer stable set search_path = public as $fn$
declare
  today date := (now() at time zone 'Asia/Seoul')::date;
  r public.user_routines%rowtype;
  d_index int;
  is_rest boolean := false;
  swapped boolean := false;
  rows_json jsonb;
begin
  if not public.pt_has_pass() or not exists(select 1 from pt_links where id=p_link and trainer_id=auth.uid() and member_id=p_member and active and allow_prescription) then return null; end if;

  select * into r from public.user_routines where user_id = p_member;
  if found then
    d_index := ((today - r.start_date) % 7 + 7) % 7;
    -- 🔴 `=` 로 비교하면 값이 없을 때(NULL) 결과가 NULL 이 되고, 뒤의 `not is_rest` 가
    --    NULL 이 되어 **오늘 운동이 통째로 사라진다**(실제로 그랬다). null-safe 비교로 둔다.
    is_rest := (r.rest_date is not distinct from today);
    swapped := (r.override_date is not distinct from today);
  end if;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.focus, t.position), '[]'::jsonb)
    into rows_json
    from (
      select d.focus, d.position, d.exercise_id, d.equipment, d.sets, d.reps,
             d.weight_kg, 'daily'::text as source
        from public.daily_plan d
       where d.user_id = p_member and d.for_date = today
      union all
      select e.focus, e.position, e.exercise_id, e.equipment, e.sets, e.reps,
             e.weight_kg, 'routine'::text as source
        from public.routine_exercises e
       where not is_rest and not swapped and d_index is not null
         and e.user_id = p_member and e.day_index = d_index
         and not exists (
           select 1 from public.daily_plan x
            where x.user_id = p_member and x.for_date = today and x.focus = e.focus)
    ) t;

  return jsonb_build_object(
    'date', today, 'dayIndex', d_index, 'rest', is_rest, 'swapped', swapped,
    'rows', case when is_rest then '[]'::jsonb else rows_json end);
end $fn$;

create or replace function public.pt_member_detail(
  p_link uuid, p_member uuid, p_from date, p_to date)
returns jsonb language plpgsql security definer stable set search_path = public as $$
declare share_workout boolean; share_diet boolean; share_body boolean; can_prescribe boolean;
begin
  if not public.pt_has_pass() or not exists(select 1 from pt_links where id=p_link and trainer_id=auth.uid() and member_id=p_member and active) then return null; end if;
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 365 then
    raise exception 'Invalid report period';
  end if;
  share_workout := (select share_workout from pt_links where id=p_link);
  share_diet := (select share_diet from pt_links where id=p_link);
  share_body := (select share_body from pt_links where id=p_link);
  can_prescribe := (select allow_prescription from pt_links where id=p_link);
  return jsonb_build_object(
    'sharing', jsonb_build_object('workout', share_workout, 'diet', share_diet, 'body', share_body, 'prescription', can_prescribe),
    'name', coalesce((select coalesce(nullif(trim(p.nickname), ''), nullif(trim(p.name), '')) from public.profiles p where p.user_id = p_member),
      (select member_name from pt_links where id=p_link), '회원'),
    'exercises', coalesce((select jsonb_agg(jsonb_build_object(
      'id', r.id, 'day_index', r.day_index, 'focus', r.focus, 'exercise_id', r.exercise_id,
      'equipment', r.equipment, 'sets', r.sets, 'reps', r.reps, 'weight_kg', r.weight_kg,
      'set_details', r.set_details, 'updated_at', r.updated_at) order by r.day_index, r.position, r.id)
      from public.routine_exercises r where r.user_id = p_member and can_prescribe), '[]'::jsonb),
    'completions', coalesce((select jsonb_agg(jsonb_build_object(
      'for_date', e.for_date, 'exercise_id', e.exercise_id, 'sets', e.sets, 'reps', e.reps,
      'weight_kg', e.weight_kg, 'set_details', e.set_details))
      from public.exercise_completions e where e.user_id = p_member and share_workout and e.status = 'done'
      and e.for_date between p_from and p_to), '[]'::jsonb),
    'conditioning', coalesce((select jsonb_agg(jsonb_build_object('for_date', c.for_date))
      from (select distinct for_date from public.conditioning_completions where user_id = p_member and share_workout
      and status = 'done' and for_date between p_from and p_to) c), '[]'::jsonb),
    'sessions', coalesce((select jsonb_agg(jsonb_build_object('for_date', s.for_date, 'duration_sec', s.duration_sec))
      from public.workout_sessions s where s.user_id = p_member and share_workout and s.for_date between p_from and p_to), '[]'::jsonb),
    'diet', coalesce((select jsonb_agg(jsonb_build_object('for_date', f.for_date))
      from (select distinct for_date from public.food_logs where user_id = p_member and share_diet and for_date between p_from and p_to) f), '[]'::jsonb),
    'weights', coalesce((select jsonb_agg(jsonb_build_object('date', (w.created_at at time zone 'Asia/Seoul')::date, 'weight_kg', w.weight_kg) order by w.created_at)
      from public.weight_logs w where w.user_id = p_member and share_body and w.weight_kg is not null
      and w.created_at >= (p_from::timestamp at time zone 'Asia/Seoul')
      and w.created_at < ((p_to + 1)::timestamp at time zone 'Asia/Seoul')), '[]'::jsonb)
  );
end $$;

-- Only explicitly exposed RPCs. Direct writes cannot bypass consent or entitlement.
do $$ declare f record; begin
 for f in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and proname like 'pt\_%' escape '\' loop
 execute format('revoke all on function %s from public, anon',f.signature);
 execute format('grant execute on function %s to authenticated, service_role',f.signature);
 end loop;
 -- Disable legacy group-owner trainer RPCs without deleting historical data or social groups.
 for f in select oid::regprocedure as signature from pg_proc where pronamespace='public'::regnamespace and proname in
 ('leave_trainer_group','trainer_board','trainer_member_routine','trainer_assign_routine_day','trainer_prescribe_exercise','trainer_member_report','trainer_member_today_plan','trainer_prescribe_today') loop
 execute format('revoke all on function %s from public, anon, authenticated',f.signature);
 end loop;
end $$;
drop policy if exists "trainer writes comment" on public.trainer_comments;
notify pgrst, 'reload schema';