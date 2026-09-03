/**
 * 최소 Supabase 흉내 — 메모리 테이블에 select/insert/upsert/update/delete 를 건다.
 *
 * 크론처럼 "여러 테이블을 실제 필터로 읽고 쓰는" 경로를 단위테스트하려면 체이닝과
 * 필터 의미(eq/in/lt/gte/lte/range)를 그대로 흉내내야 한다. 그래야 중복 방지
 * (notification_sends 조회 → 제외)나 부분 실패 격리를 진짜로 검증할 수 있다.
 *
 * 테스트 전용(런타임 코드에서 import 하지 않는다).
 */

export type Row = Record<string, unknown>;

/**
 * @param store  테이블명 → 행 배열(호출 후 그대로 검사한다)
 * @param failOn 이 테이블에 접근하면 예외를 던진다(크론 실패 경로 검증용)
 */
export function fakeAdmin(store: Record<string, Row[]>, failOn?: string) {
  function builder(
    table: string,
    op: "select" | "delete" | "update",
    payload?: Row,
  ) {
    const filters: ((r: Row) => boolean)[] = [];
    let sliceArgs: [number, number] | null = null;
    const b = {
      select: () => b,
      order: () => b,
      limit: () => b,
      eq(col: string, v: unknown) {
        filters.push((r) => r[col] === v);
        return b;
      },
      in(col: string, vals: unknown[]) {
        filters.push((r) => vals.includes(r[col]));
        return b;
      },
      lt(col: string, v: string) {
        filters.push((r) => String(r[col]) < v);
        return b;
      },
      gte(col: string, v: string) {
        filters.push((r) => String(r[col]) >= v);
        return b;
      },
      lte(col: string, v: string) {
        filters.push((r) => String(r[col]) <= v);
        return b;
      },
      range(from: number, to: number) {
        sliceArgs = [from, to];
        return b;
      },
      then(resolve: (v: { data: Row[] | null }) => unknown) {
        const all = store[table] ?? [];
        const hit = (r: Row) => filters.every((f) => f(r));
        if (op === "delete") {
          store[table] = all.filter((r) => !hit(r));
          return Promise.resolve(resolve({ data: [] }));
        }
        if (op === "update") {
          for (const r of all) if (hit(r)) Object.assign(r, payload);
          return Promise.resolve(resolve({ data: [] }));
        }
        let rows = all.filter(hit);
        if (sliceArgs) rows = rows.slice(sliceArgs[0], sliceArgs[1] + 1);
        return Promise.resolve(resolve({ data: rows }));
      },
    };
    return b;
  }

  return {
    from(table: string) {
      if (failOn === table) {
        throw new Error(`relation "${table}" does not exist`);
      }
      return {
        select: () => builder(table, "select"),
        delete: () => builder(table, "delete"),
        update: (payload: Row) => builder(table, "update", payload),
        insert: (rows: Row | Row[]) => {
          const list = Array.isArray(rows) ? rows : [rows];
          (store[table] ??= []).push(...list.map((r) => ({ ...r })));
          return Promise.resolve({ data: null, error: null });
        },
        // 실제 upsert 처럼 (user_id, dedup_key) 충돌은 무시한다.
        upsert: (rows: Row[]) => {
          const cur = (store[table] ??= []);
          for (const r of rows) {
            const dup = cur.some(
              (e) => e.user_id === r.user_id && e.dedup_key === r.dedup_key,
            );
            if (!dup) cur.push({ ...r });
          }
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
  };
}
