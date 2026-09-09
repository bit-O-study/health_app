import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { hasDbCreds, makeClient } from "./db";

/**
 * 트레이너 대시보드 접근 경계 가드(라이브 DB) — 2026-09-09.
 *
 * 🔴 이 화면은 **남의 몸 데이터**를 보여 준다(체중 추이·식단 기록 일수·운동 이력).
 * 필요한 값 중 `user_routines`·`weight_logs` 는 그룹원에게 열려 있지 않아서,
 * "그룹원이면 읽기" 정책으로 여는 대신 `trainer_board` 가 **그룹장인지 직접 확인**한다.
 *
 * 그 확인이 사라지면 같은 그룹의 아무나 남의 체중 이력을 보게 되는데, **화면은 똑같이
 * 동작한다** — 기능 테스트로는 절대 안 잡힌다. 그래서 권한 경계를 여기서 못 박는다.
 *
 * 자기 그룹을 만들어 검사하고 지운다(실데이터에 기대지 않는다).
 */
describe.skipIf(!hasDbCreds)("트레이너 대시보드 권한(라이브 DB)", () => {
  let client: ReturnType<typeof makeClient>;
  let groupId = "";
  let ownerId = "";
  let memberId = "";
  const STRANGER = "00000000-0000-0000-0000-000000000000";
  const NAME = `zztrainer${Date.now().toString(36)}`;

  beforeAll(async () => {
    client = makeClient();
    await client.connect();
    const users = await client.query(
      `select user_id from public.profiles order by created_at asc limit 2`,
    );
    if (users.rowCount !== null && users.rowCount >= 2) {
      ownerId = users.rows[0].user_id;
      memberId = users.rows[1].user_id;
      const g = await client.query(
        `insert into public.groups (name, owner_id) values ($1, $2) returning id`,
        [NAME, ownerId],
      );
      groupId = g.rows[0].id;
      await client.query(
        `insert into public.group_members (group_id, user_id, role)
         values ($1, $2, 'owner'), ($1, $3, 'member')`,
        [groupId, ownerId, memberId],
      );
    }
  }, 30_000);

  afterAll(async () => {
    if (!client) return;
    if (groupId) {
      await client.query(`delete from public.groups where id = $1`, [groupId]).catch(() => {});
    }
    await client.end();
  });

  /** 그 사용자로 로그인한 척하고(RLS 적용) 함수를 부른다. 트랜잭션은 되돌린다. */
  async function callAs(uid: string): Promise<number> {
    await client.query("begin");
    try {
      await client.query(`select set_config('role','authenticated',true)`);
      await client.query(`select set_config('request.jwt.claims',$1,true)`, [
        JSON.stringify({ sub: uid, role: "authenticated" }),
      ]);
      const r = await client.query(
        `select * from public.trainer_board($1, current_date - 6, current_date)`,
        [groupId],
      );
      return r.rowCount ?? 0;
    } finally {
      await client.query("rollback");
    }
  }

  it("그룹장은 담당 회원 전부를 받는다", async () => {
    expect(groupId, "검사용 그룹을 못 만들었다(프로필 2개 필요)").not.toBe("");
    expect(await callAs(ownerId)).toBe(2);
  });

  it("🔴 같은 그룹의 일반 멤버는 아무것도 못 받는다", async () => {
    expect(await callAs(memberId)).toBe(0);
  });

  it("🔴 남남은 아무것도 못 받는다", async () => {
    expect(await callAs(STRANGER)).toBe(0);
  });

  it("SECURITY DEFINER 다 — 그래야 그룹원에게 안 열린 표를 대신 읽는다", async () => {
    const r = await client.query(`
      select prosecdef from pg_proc
       where oid = 'public.trainer_board(uuid, date, date)'::regprocedure`);
    expect(r.rows[0]?.prosecdef).toBe(true);
  });

  it("🔴 search_path 가 고정돼 있다 — SECURITY DEFINER 에서는 필수다", async () => {
    // 고정하지 않으면 호출자가 search_path 를 바꿔 같은 이름의 가짜 표를 읽히게 할 수 있다.
    const r = await client.query(`
      select proconfig from pg_proc
       where oid = 'public.trainer_board(uuid, date, date)'::regprocedure`);
    expect((r.rows[0]?.proconfig ?? []).join(",")).toContain("search_path=");
  });

  it("익명에게는 실행 권한이 없다", async () => {
    const r = await client.query(`
      select has_function_privilege('anon',
        'public.trainer_board(uuid, date, date)', 'execute') as ok`);
    expect(r.rows[0]?.ok).toBe(false);
  });

  // ── 루틴 배정 ────────────────────────────────────────────────────────────────
  //
  // 🔴 이건 **읽기가 아니라 쓰기**다 — 남의 영구 루틴을 덮어쓴다. 권한이 새면
  // 아무나 남의 루틴을 지울 수 있는데, 당한 사람은 자기가 안 한 변경이라 원인조차
  // 못 찾는다. 화면은 어느 쪽이든 똑같이 동작한다.

  /** 배정 RPC 를 그 사용자로 호출한다. 반환값: 배정한 행 수, -1 = 권한 없음. */
  async function assignAs(uid: string, member: string): Promise<number> {
    await client.query("begin");
    try {
      await client.query(`select set_config('role','authenticated',true)`);
      await client.query(`select set_config('request.jwt.claims',$1,true)`, [
        JSON.stringify({ sub: uid, role: "authenticated" }),
      ]);
      const r = await client.query(
        `select public.trainer_assign_routine_day($1,$2,0,'chest',3,'back') as n`,
        [groupId, member],
      );
      return Number(r.rows[0].n);
    } finally {
      await client.query("rollback");
    }
  }

  it("🔴 같은 그룹의 일반 멤버는 남의 루틴을 배정할 수 없다", async () => {
    expect(await assignAs(memberId, ownerId)).toBe(-1);
  });

  it("🔴 남남은 배정할 수 없다", async () => {
    expect(await assignAs(STRANGER, memberId)).toBe(-1);
  });

  it("🔴 트레이너도 자기 자신에게는 못 한다 — 자기 루틴을 자기가 덮어쓴다", async () => {
    expect(await assignAs(ownerId, ownerId)).toBe(-1);
  });

  it("🔴 배정된 운동에 트레이너의 무게가 따라가지 않는다", async () => {
    // 트레이너의 100kg 스쿼트가 초보 회원 화면에 박히면 위험하고, 남의 신체 수치다.
    await client.query("begin");
    try {
      await client.query(`select set_config('role','authenticated',true)`);
      await client.query(`select set_config('request.jwt.claims',$1,true)`, [
        JSON.stringify({ sub: ownerId, role: "authenticated" }),
      ]);
      // 트레이너 루틴에 무게가 든 행을 하나 심는다(같은 트랜잭션 — 롤백된다).
      await client.query(`select set_config('role','postgres',true)`);
      await client.query(
        `insert into public.routine_exercises
           (user_id, focus, position, exercise_id, equipment, sets, reps, weight_kg, day_index)
         values ($1,'chest',0,'bench-press','barbell',5,5,100,0)`,
        [ownerId],
      );
      await client.query(`select set_config('role','authenticated',true)`);
      const n = await client.query(
        `select public.trainer_assign_routine_day($1,$2,0,'chest',3,'back') as n`,
        [groupId, memberId],
      );
      expect(Number(n.rows[0].n)).toBeGreaterThan(0);

      await client.query(`select set_config('role','postgres',true)`);
      const rows = await client.query(
        `select weight_kg, set_details, focus, day_index
           from public.routine_exercises where user_id = $1 and day_index = 3`,
        [memberId],
      );
      expect(rows.rowCount).toBeGreaterThan(0);
      for (const r of rows.rows) {
        expect(r.weight_kg, "트레이너 무게가 회원에게 넘어갔다").toBeNull();
        expect(r.set_details).toBeNull();
        // 부위는 **받는 쪽**으로 통일된다 — 아니면 회원 화면에 안 뜬다.
        expect(r.focus).toBe("back");
        expect(r.day_index).toBe(3);
      }
    } finally {
      await client.query("rollback");
    }
  });

  it("배정 RPC 도 익명에게는 실행 권한이 없다", async () => {
    const r = await client.query(`
      select has_function_privilege('anon',
        'public.trainer_assign_routine_day(uuid, uuid, int, text, int, text)',
        'execute') as ok`);
    expect(r.rows[0]?.ok).toBe(false);
  });

  it("회원 루틴 모양도 그룹장만 읽는다", async () => {
    async function shapeRows(uid: string): Promise<number> {
      await client.query("begin");
      try {
        await client.query(`select set_config('role','authenticated',true)`);
        await client.query(`select set_config('request.jwt.claims',$1,true)`, [
          JSON.stringify({ sub: uid, role: "authenticated" }),
        ]);
        const r = await client.query(
          `select * from public.trainer_member_routine($1,$2)`,
          [groupId, memberId],
        );
        return r.rowCount ?? 0;
      } finally {
        await client.query("rollback");
      }
    }
    expect(await shapeRows(memberId)).toBe(0);
    expect(await shapeRows(STRANGER)).toBe(0);
  });
});
