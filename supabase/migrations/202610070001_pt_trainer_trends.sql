-- 트레이너 대시보드 주별·월별 변화(2026-10-07) — 담당 회원 전체의 최근 190일 일별 값.
-- 권한은 pt_member_report 와 같다: 활성 이용권 + 내 활성 연결 + 회원이 공유한 칸만(아니면 null).
create or replace function public.pt_trainer_trends() returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare since date := (now() at time zone 'Asia/Seoul')::date - 190;
begin
 if auth.uid() is null or not public.pt_has_pass() then return '[]'::jsonb; end if;
 return coalesce((select jsonb_agg(jsonb_build_object(
   'link', l.id,
   'workout', case when l.share_workout then (
     select coalesce(jsonb_agg(jsonb_build_object('d', x.for_date, 'sets', x.sets) order by x.for_date), '[]'::jsonb)
       from (select for_date, sum(coalesce(sets, 0))::int sets from exercise_completions
              where user_id = l.member_id and status = 'done' and for_date >= since group by for_date) x) else null end,
   'diet', case when l.share_diet then (
     select coalesce(jsonb_agg(x.for_date order by x.for_date), '[]'::jsonb)
       from (select distinct for_date from food_logs where user_id = l.member_id and for_date >= since) x) else null end,
   'body', case when l.share_body then (
     select coalesce(jsonb_agg(jsonb_build_object('d', x.d, 'kg', x.kg) order by x.d), '[]'::jsonb)
       from (select (created_at at time zone 'Asia/Seoul')::date d, round(avg(weight_kg), 1) kg from weight_logs
              where user_id = l.member_id and weight_kg is not null
                and created_at >= (since::timestamp at time zone 'Asia/Seoul') group by 1) x) else null end
 ) order by l.created_at) from pt_links l where l.trainer_id = auth.uid() and l.active), '[]'::jsonb);
end $$;
revoke execute on function public.pt_trainer_trends() from public, anon;
grant execute on function public.pt_trainer_trends() to authenticated;
