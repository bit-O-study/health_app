import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { hasDbCreds, makeClient } from "./db";

/**
 * DATA INTEGRITY GUARD — "화면엔 보이는데 조작이 안 되는" 부류의 버그를 잡는다.
 *
 * 오늘 실제로 터진 버그들이 전부 같은 모양이었다:
 *  - 완료기록이 **사라진 계획 행 id** 를 가리킴 → 화면은 완료로 보이는데 완료 취소가 0건 삭제.
 *  - 계획을 통째로 다시 저장하면서 행 UUID 만 바뀌고 기록이 안 따라옴.
 * 스키마(컬럼 존재)만 보는 schema-sync 가드로는 못 잡히는, **데이터 정합성** 문제라
 * 여기서 라이브 DB 를 읽어 불변식(invariant)을 검사한다. 읽기 전용.
 *
 * 실패하면 코드 회귀이거나 이미 어긋난 데이터가 남아 있다는 뜻 —
 * 메시지의 SQL 로 어느 행인지 바로 확인할 수 있다.
 */
const SEOUL_TODAY = `(now() at time zone 'Asia/Seoul')::date`;

describe.skipIf(!hasDbCreds)("데이터 정합성(라이브 DB, 읽기 전용)", () => {
  let client: ReturnType<typeof makeClient>;

  beforeAll(async () => {
    client = makeClient();
    await client.connect();
  }, 30_000);
  afterAll(async () => {
    await client?.end();
  });

  async function rows<T = Record<string, unknown>>(sql: string): Promise<T[]> {
    const res = await client.query(sql);
    return res.rows as T[];
  }

  it("오늘 완료기록은 모두 살아있는 계획 행을 가리킨다(완료 취소가 먹어야 함)", async () => {
    const dangling = await rows(`
      select ec.user_id, ec.focus, ec.exercise_id
        from public.exercise_completions ec
       where ec.for_date = ${SEOUL_TODAY}
         and not exists (select 1 from public.daily_plan dp where dp.id = ec.exercise_row_id)
         and not exists (select 1 from public.routine_exercises re where re.id = ec.exercise_row_id)
       limit 20`);
    expect(
      dangling,
      `완료기록이 사라진 행 id 를 가리킨다(= 완료 취소 0건 삭제 버그).\n` +
        `계획 저장 시 carryOverCompletions 로 새 행 id 에 이어줘야 한다.\n` +
        JSON.stringify(dangling, null, 2),
    ).toEqual([]);
  });

  it("오늘 완료기록에는 표시용 스냅샷(운동/부위)이 들어있다", async () => {
    const missing = await rows(`
      select user_id, exercise_row_id
        from public.exercise_completions
       where for_date = ${SEOUL_TODAY}
         and (exercise_id is null or focus is null)
       limit 20`);
    expect(
      missing,
      `스냅샷이 없으면 계획이 바뀌었을 때 완료 운동을 화면에 못 그린다(고스트 불가).\n` +
        JSON.stringify(missing, null, 2),
    ).toEqual([]);
  });

  it("오늘 워밍업/마무리 완료기록도 살아있는 행을 가리킨다", async () => {
    const dangling = await rows(`
      select cc.user_id, cc.kind, cc.item_id
        from public.conditioning_completions cc
       where cc.for_date = ${SEOUL_TODAY}
         and cc.source_row_id is not null
         and not exists (select 1 from public.daily_conditioning dc where dc.id = cc.source_row_id)
         and not exists (select 1 from public.routine_conditioning rc where rc.id = cc.source_row_id)
       limit 20`);
    expect(dangling, JSON.stringify(dangling, null, 2)).toEqual([]);
  });

  it("daily_plan/routine_exercises 의 부위(focus)는 알려진 값만 쓴다", async () => {
    const known = [
      "chest", "back", "shoulder", "arm", "lower", "core",
      "fullbody", "upper", "push", "pull", "cardio",
    ]
      .map((f) => `'${f}'`)
      .join(",");
    const weird = await rows(`
      select 'daily_plan' as tbl, focus, count(*)::int n
        from public.daily_plan where focus not in (${known}) group by focus
      union all
      select 'routine_exercises', focus, count(*)::int
        from public.routine_exercises where focus not in (${known}) group by focus`);
    expect(
      weird,
      `모르는 부위 값이 저장돼 있으면 오늘 화면에서 그 행이 통째로 사라진다.\n` +
        JSON.stringify(weird, null, 2),
    ).toEqual([]);
  });

  it("한 사람의 같은 날 같은 행에 완료기록이 중복되지 않는다", async () => {
    const dup = await rows(`
      select user_id, for_date, exercise_row_id, count(*)::int n
        from public.exercise_completions
       group by 1,2,3 having count(*) > 1 limit 20`);
    expect(dup, JSON.stringify(dup, null, 2)).toEqual([]);
  });

  it("프로필 이름이 비었는데 소셜 메타데이터엔 이름이 있는 계정이 없다", async () => {
    const unfilled = await rows(`
      select u.email
        from public.profiles p join auth.users u on u.id = p.user_id
       where coalesce(trim(p.name), '') = ''
         and coalesce(trim(coalesce(
               u.raw_user_meta_data->>'name',
               u.raw_user_meta_data->>'full_name',
               u.raw_user_meta_data->>'user_name',
               u.raw_user_meta_data->'kakao_account'->'profile'->>'nickname', '')), '') <> ''
       limit 20`);
    expect(
      unfilled,
      `소셜 가입자 이름이 프로필에 안 들어갔다(커뮤니티/관리자에서 "회원"으로만 보임).\n` +
        JSON.stringify(unfilled, null, 2),
    ).toEqual([]);
  });

  it("신고는 모두 실재하는 신고자에 연결돼 있다", async () => {
    const orphan = await rows(`
      select r.id from public.post_reports r
       where not exists (select 1 from auth.users u where u.id = r.reporter_id)
       limit 20`);
    expect(orphan, JSON.stringify(orphan, null, 2)).toEqual([]);
  });
});
