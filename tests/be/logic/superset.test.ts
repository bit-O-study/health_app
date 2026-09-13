import { describe, expect, it } from "vitest";

import {
  MAX_SUPERSET_GROUP,
  isSupersetGroup,
  linkWithNext,
  nextInSuperset,
  normalizeGroups,
  restReturnIndex,
  supersetBlock,
  splitAfter,
  supersetLabel,
  unlink,
} from "@/features/workout-timer/superset";

type Item = { rowId: string; supersetGroup: number | null };

/** "a1 b1 c" → rowId a·b·c, 그룹 1·1·null */
function items(spec: string): Item[] {
  return spec.split(" ").map((s) => {
    const g = s.slice(1);
    return { rowId: s[0], supersetGroup: g === "" ? null : Number(g) };
  });
}

const none = new Set<string>();

describe("isSupersetGroup", () => {
  it("1~99 정수만", () => {
    expect(isSupersetGroup(1)).toBe(true);
    expect(isSupersetGroup(MAX_SUPERSET_GROUP)).toBe(true);
    for (const v of [0, -1, 100, 1.5, "1", null, undefined, NaN]) {
      expect(isSupersetGroup(v)).toBe(false);
    }
  });
});

describe("supersetBlock", () => {
  it("붙어 있는 같은 그룹만 한 묶음", () => {
    expect(supersetBlock(items("a1 b1 c"), 0)).toEqual([0, 1]);
    expect(supersetBlock(items("a1 b1 c"), 1)).toEqual([0, 1]);
    expect(supersetBlock(items("a1 b1 c"), 2)).toEqual([]);
  });

  it("셋 묶음(트라이세트)도 된다", () => {
    expect(supersetBlock(items("a1 b1 c1"), 1)).toEqual([0, 1, 2]);
  });

  it("🔴 사이에 다른 운동이 끼면 묶음이 끊긴다 — 그건 슈퍼세트가 아니다", () => {
    // 같은 그룹 번호라도 붙어 있지 않으면 각자 혼자다.
    expect(supersetBlock(items("a1 b c1"), 0)).toEqual([]);
    expect(supersetBlock(items("a1 b c1"), 2)).toEqual([]);
  });

  it("혼자 남은 그룹은 묶음이 아니다", () => {
    expect(supersetBlock(items("a1 b2 c"), 0)).toEqual([]);
  });

  it("묶음이 둘이면 서로 안 섞인다", () => {
    const q = items("a1 b1 c2 d2");
    expect(supersetBlock(q, 0)).toEqual([0, 1]);
    expect(supersetBlock(q, 3)).toEqual([2, 3]);
  });
});

describe("nextInSuperset / restReturnIndex", () => {
  it("A1 → B 로 쉬지 않고 넘어가고, B 끝에서 쉰 뒤 A 로 돌아온다", () => {
    const q = items("a1 b1 c");
    expect(nextInSuperset(q, none, 0)).toBe(1); // A 세트 끝 → 바로 B
    expect(restReturnIndex(q, none, 0)).toBeNull(); // A 는 이미 첫 멤버

    expect(nextInSuperset(q, none, 1)).toBeNull(); // B 는 마지막 → 여기서 쉰다
    expect(restReturnIndex(q, none, 1)).toBe(0); // 쉬고 나면 A 로
  });

  it("트라이세트는 A→B→C 로 돌고 C 에서 쉰다", () => {
    const q = items("a1 b1 c1");
    expect(nextInSuperset(q, none, 0)).toBe(1);
    expect(nextInSuperset(q, none, 1)).toBe(2);
    expect(nextInSuperset(q, none, 2)).toBeNull();
    expect(restReturnIndex(q, none, 2)).toBe(0);
  });

  it("묶이지 않은 운동은 평소대로 — 바로 쉰다", () => {
    const q = items("a1 b1 c");
    expect(nextInSuperset(q, none, 2)).toBeNull();
    expect(restReturnIndex(q, none, 2)).toBeNull();
  });

  it("🔴 짝이 먼저 끝나면 건너뛴다 — 완료한 운동으로 돌려보내지 않는다", () => {
    const q = items("a1 b1 c1");
    const done = new Set(["b"]); // B 를 먼저 다 끝냄
    expect(nextInSuperset(q, done, 0)).toBe(2); // A → (B 건너뛰고) C
    expect(restReturnIndex(q, done, 2)).toBe(0);
  });

  it("짝이 전부 끝나면 혼자 남아 평소대로 쉰다", () => {
    const q = items("a1 b1");
    const done = new Set(["b"]);
    expect(nextInSuperset(q, done, 0)).toBeNull();
    expect(restReturnIndex(q, done, 0)).toBeNull();
  });
});

describe("supersetLabel", () => {
  it("묶음 순서대로 A·B·C", () => {
    const q = items("a1 b1 c1 d");
    expect(supersetLabel(q, 0)).toBe("A");
    expect(supersetLabel(q, 1)).toBe("B");
    expect(supersetLabel(q, 2)).toBe("C");
    expect(supersetLabel(q, 3)).toBeNull();
  });
});

describe("linkWithNext", () => {
  const rows = (spec: string) =>
    items(spec).map((r) => ({ id: r.rowId, supersetGroup: r.supersetGroup }));

  it("붙어 있는 두 줄을 새 번호로 묶는다", () => {
    const out = linkWithNext(rows("a b c"), 0);
    expect(out.map((r) => r.supersetGroup)).toEqual([1, 1, null]);
  });

  it("이미 쓰는 번호는 피한다", () => {
    const out = linkWithNext(rows("a1 b1 c d"), 2);
    expect(out.map((r) => r.supersetGroup)).toEqual([1, 1, 2, 2]);
  });

  it("묶음에 한 줄 더 붙이면 같은 번호로 이어진다", () => {
    const out = linkWithNext(rows("a1 b1 c"), 1);
    expect(out.map((r) => r.supersetGroup)).toEqual([1, 1, 1]);
  });

  it("두 묶음을 이으면 하나로 합쳐진다", () => {
    const out = linkWithNext(rows("a1 b1 c2 d2"), 1);
    expect(out.map((r) => r.supersetGroup)).toEqual([1, 1, 1, 1]);
  });

  it("마지막 줄에는 붙일 다음이 없다", () => {
    const before = rows("a b");
    expect(linkWithNext(before, 1)).toEqual(before);
  });
});

describe("unlink", () => {
  const rows = (spec: string) =>
    items(spec).map((r) => ({ id: r.rowId, supersetGroup: r.supersetGroup }));

  it("🔴 둘짜리 묶음을 풀면 둘 다 풀린다 — 혼자는 묶음이 아니다", () => {
    const out = unlink(rows("a1 b1 c"), 0);
    expect(out.map((r) => r.supersetGroup)).toEqual([null, null, null]);
  });

  it("셋짜리에서 하나만 빼면 나머지 둘은 그대로 묶여 있다", () => {
    const out = unlink(rows("a1 b1 c1"), 2);
    expect(out.map((r) => r.supersetGroup)).toEqual([1, 1, null]);
  });

  it("묶이지 않은 줄은 아무 일도 일어나지 않는다", () => {
    const before = rows("a b");
    expect(unlink(before, 0)).toEqual(before);
  });
});

describe("splitAfter — 줄 '사이'를 끊는다", () => {
  const rows = (spec: string) =>
    items(spec).map((r) => ({ id: r.rowId, supersetGroup: r.supersetGroup }));

  it("둘짜리를 끊으면 양쪽 다 풀린다", () => {
    const out = splitAfter(rows("a1 b1 c"), 0);
    expect(out.map((r) => r.supersetGroup)).toEqual([null, null, null]);
  });

  it("🔴 넷짜리 가운데를 끊으면 두 묶음이 된다", () => {
    const out = splitAfter(rows("a1 b1 c1 d1"), 1);
    const g = out.map((r) => r.supersetGroup);
    expect(g[0]).toBe(g[1]); // A-B 는 그대로 한 묶음
    expect(g[2]).toBe(g[3]); // C-D 가 새 묶음
    expect(g[0]).not.toBe(g[2]); // 서로 다른 번호
    expect(g.every((v) => v !== null)).toBe(true);
  });

  it("셋짜리 끝을 끊으면 앞 둘만 남고 끝은 풀린다", () => {
    const out = splitAfter(rows("a1 b1 c1"), 1);
    expect(out.map((r) => r.supersetGroup)).toEqual([1, 1, null]);
  });

  it("셋짜리 앞을 끊으면 앞이 풀리고 뒤 둘이 남는다", () => {
    const out = splitAfter(rows("a1 b1 c1"), 0);
    const g = out.map((r) => r.supersetGroup);
    expect(g[0]).toBeNull();
    expect(g[1]).toBe(g[2]);
    expect(g[1]).not.toBeNull();
  });

  it("새 번호는 남아 있는 묶음과 안 겹친다", () => {
    // e-f 가 이미 2번을 쓰고 있으니 새 묶음은 2번이 아니어야 한다.
    const out = splitAfter(rows("a1 b1 c1 d1 e2 f2"), 1);
    const g = out.map((r) => r.supersetGroup);
    expect(g[2]).not.toBe(2);
    expect(g[2]).toBe(g[3]);
  });

  it("묶이지 않은 자리는 아무 일도 없다", () => {
    const before = rows("a b1 c1");
    expect(splitAfter(before, 0)).toEqual(before);
  });
});

describe("normalizeGroups — 큐를 만들 때 번호를 다시 매긴다", () => {
  const rows = (spec: string) =>
    spec.split(" ").map((t) => {
      const [focus, g] = t.split(":");
      return { focus, supersetGroup: g === "-" ? null : Number(g) };
    });

  it("🔴 부위가 다르면 번호가 같아도 안 묶인다", () => {
    // 가슴의 1번과 등의 1번은 남남인데 큐에서 맞닿는다.
    expect(
      normalizeGroups(rows("chest:1 chest:1 back:1 back:1")),
    ).toEqual([1, 1, 2, 2]);
  });

  it("혼자 남은 번호는 묶음이 아니다", () => {
    expect(normalizeGroups(rows("chest:1 back:1"))).toEqual([null, null]);
  });

  it("붙어 있지 않으면 끊긴다", () => {
    expect(normalizeGroups(rows("chest:1 chest:- chest:1"))).toEqual([
      null,
      null,
      null,
    ]);
  });

  it("단독 운동은 그대로 null", () => {
    expect(normalizeGroups(rows("chest:- chest:1 chest:1 chest:-"))).toEqual([
      null,
      1,
      1,
      null,
    ]);
  });

  it("트라이세트도 한 묶음으로 남는다", () => {
    expect(normalizeGroups(rows("a:3 a:3 a:3"))).toEqual([1, 1, 1]);
  });

  it("빈 목록", () => {
    expect(normalizeGroups([])).toEqual([]);
  });
});
