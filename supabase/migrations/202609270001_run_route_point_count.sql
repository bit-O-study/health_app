-- 런닝 기록 목록은 경로 점 "개수"만 필요하다. 예전엔 개수를 세려고 route_points(최대 2,000점 jsonb)
-- 전체를 목록마다 받아왔다 → DB 가 계산해 두는 생성 열로 대체. 전체 경로는 상세 화면에서 한 건만 읽는다.
alter table public.run_sessions add column if not exists route_point_count integer generated always as (jsonb_array_length(route_points)) stored;
