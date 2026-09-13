import { describe, expect, it } from "vitest";

import {
  PENDING_MAX_AGE_MS,
  PENDING_MAX_ITEMS,
  pendingKey,
  pendingLabel,
  removePending,
  splitExpired,
  upsertPending,
  type PendingWrite,
} from "@/lib/offline/pending-writes";
import { resolveForDate } from "@/lib/offline/queued-date";

const HOUR = 60 * 60 * 1000;

function main(
  rowId: string,
  overrides: Partial<Extract<PendingWrite, { kind: "main" }>> = {},
): PendingWrite {
  return {
    kind: "main",
    key: pendingKey({ kind: "main", rowId }),
    name: "벤치프레스",
    rowId,
    status: "done",
    snapshot: {
      exerciseId: "bench-press",
      equipment: "barbell",
      sets: 3,
      reps: 10,
      weightKg: 60,
      focus: "가슴",
    },
    forDate: "2026-09-13",
    queuedAt: 1_000,
    ...overrides,
  };
}

describe("대기 큐 키", () => {
  it("본운동은 행 id 로, 컨디셔닝은 종류·행·항목으로 구분한다", () => {
    expect(pendingKey({ kind: "main", rowId: "r1" })).toBe("main:r1");
    expect(
      pendingKey({
        kind: "conditioning",
        condKind: "warmup",
        rowId: "r1",
        itemId: "i1",
      }),
    ).toBe("warmup:r1:i1");
  });

  it("같은 행이라도 본운동과 컨디셔닝은 다른 키다", () => {
    expect(pendingKey({ kind: "main", rowId: "r1" })).not.toBe(
      pendingKey({
        kind: "conditioning",
        condKind: "warmup",
        rowId: "r1",
        itemId: "i1",
      }),
    );
  });
});

describe("담기 — 같은 항목은 덮어쓴다", () => {
  it("같은 행을 다시 누르면 마지막 값만 남는다", () => {
    // 🔴 이 쓰기들은 upsert 라 마지막 것만 올리면 결과가 같다. 쌓아 두면 왕복만 늘고
    //   중간 상태(넘기기 → 완료)가 잠깐 보인다.
    const one = upsertPending([], main("r1", { status: "skipped" }));
    const two = upsertPending(one, main("r1", { status: "done", queuedAt: 2000 }));
    expect(two).toHaveLength(1);
    expect(two[0].status).toBe("done");
    expect(two[0].queuedAt).toBe(2000);
  });

  it("다른 행은 따로 쌓이고 순서(최근이 뒤)가 유지된다", () => {
    const list = upsertPending(upsertPending([], main("r1")), main("r2"));
    expect(list.map((w) => w.rowId)).toEqual(["r1", "r2"]);
  });

  it("덮어쓰면 그 항목이 맨 뒤로 간다 — 방금 친 게 가장 최근이다", () => {
    let list = upsertPending([], main("r1"));
    list = upsertPending(list, main("r2"));
    list = upsertPending(list, main("r1", { queuedAt: 3000 }));
    expect(list.map((w) => w.rowId)).toEqual(["r2", "r1"]);
  });

  it("한도를 넘으면 오래된 쪽을 버린다 — 방금 친 세트는 절대 안 밀린다", () => {
    let list: PendingWrite[] = [];
    for (let i = 0; i < PENDING_MAX_ITEMS + 5; i++) {
      list = upsertPending(list, main(`r${i}`));
    }
    expect(list).toHaveLength(PENDING_MAX_ITEMS);
    expect(list[list.length - 1].rowId).toBe(`r${PENDING_MAX_ITEMS + 4}`);
    expect(list[0].rowId).toBe("r5");
  });
});

describe("빼기", () => {
  it("올린 것만 빠지고 나머지는 남는다", () => {
    const list = [main("r1"), main("r2"), main("r3")];
    const left = removePending(list, ["main:r2"]);
    expect(left.map((w) => w.rowId)).toEqual(["r1", "r3"]);
  });

  it("빈 목록을 주면 아무것도 안 지운다", () => {
    const list = [main("r1")];
    expect(removePending(list, [])).toHaveLength(1);
  });
});

describe("만료", () => {
  it("48시간을 넘긴 것만 버린다", () => {
    const now = 100 * HOUR;
    const fresh = main("r1", { queuedAt: now - HOUR });
    const old = main("r2", { queuedAt: now - PENDING_MAX_AGE_MS - 1 });
    const split = splitExpired([fresh, old], now);
    expect(split.fresh.map((w) => w.rowId)).toEqual(["r1"]);
    expect(split.expired.map((w) => w.rowId)).toEqual(["r2"]);
  });

  it("정확히 48시간은 아직 안 버린다(경계)", () => {
    const now = 100 * HOUR;
    const edge = main("r1", { queuedAt: now - PENDING_MAX_AGE_MS });
    expect(splitExpired([edge], now).expired).toHaveLength(0);
  });

  it("기기 시계가 앞서 있어도(미래 시각) 버리지 않는다", () => {
    // 버리는 쪽이 손해가 훨씬 크다 — 사용자가 실제로 친 세트다.
    const now = 100 * HOUR;
    const future = main("r1", { queuedAt: now + 10 * HOUR });
    expect(splitExpired([future], now).fresh).toHaveLength(1);
  });
});

describe("배너 문구", () => {
  it("무엇이 대기 중인지 이름으로 보여준다(개수만으로는 내 세트인지 모른다)", () => {
    const list = [main("r1"), main("r2", { name: "스쿼트" })];
    expect(pendingLabel(list)).toBe("벤치프레스, 스쿼트");
  });

  it("같은 운동이 여러 건이면 한 번만 쓴다", () => {
    expect(pendingLabel([main("r1"), main("r2")])).toBe("벤치프레스");
  });

  it("이름을 자르지 않는다 — 여섯 건이어도 전부 보여준다", () => {
    const list = ["가", "나", "다", "라", "마", "바"].map((n, i) =>
      main(`r${i}`, { name: n }),
    );
    expect(pendingLabel(list)).toBe("가, 나, 다, 라, 마, 바");
  });

  it("비어 있으면 빈 문자열", () => {
    expect(pendingLabel([])).toBe("");
  });
});

describe("올릴 때의 날짜 — 서버 판정", () => {
  // 🔴 이게 이 기능의 핵심이다. 23:55 에 친 세트가 00:05 에 올라가면 하루 밀린다.
  it("오늘은 그대로 쓴다", () => {
    expect(resolveForDate("2026-09-13", "2026-09-13")).toBe("2026-09-13");
  });

  it("어제는 그대로 쓴다 — 자정 넘겨 동기화된 세트가 밀리면 안 된다", () => {
    expect(resolveForDate("2026-09-12", "2026-09-13")).toBe("2026-09-12");
  });

  it("달을 넘긴 어제도 어제다", () => {
    expect(resolveForDate("2026-08-31", "2026-09-01")).toBe("2026-08-31");
  });

  it("그저께부터는 오늘로 떨어뜨린다 — 옛 날짜를 심을 수 없게", () => {
    expect(resolveForDate("2026-09-11", "2026-09-13")).toBe("2026-09-13");
    expect(resolveForDate("2026-01-01", "2026-09-13")).toBe("2026-09-13");
  });

  it("미래 날짜도 오늘로 — 기기 시계가 앞선 경우다", () => {
    expect(resolveForDate("2026-09-14", "2026-09-13")).toBe("2026-09-13");
  });

  it("안 넘기거나 모양이 틀리면 오늘", () => {
    expect(resolveForDate(undefined, "2026-09-13")).toBe("2026-09-13");
    expect(resolveForDate(null, "2026-09-13")).toBe("2026-09-13");
    expect(resolveForDate("", "2026-09-13")).toBe("2026-09-13");
    expect(resolveForDate("2026-9-13", "2026-09-13")).toBe("2026-09-13");
    expect(resolveForDate("어제", "2026-09-13")).toBe("2026-09-13");
    expect(resolveForDate("2026-09-13T00:00:00Z", "2026-09-13")).toBe(
      "2026-09-13",
    );
  });
});
