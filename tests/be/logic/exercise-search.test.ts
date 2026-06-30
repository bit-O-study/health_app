import { describe, expect, it } from "vitest";

import { searchExercises, tokenize } from "@/features/routine/exercise-search";

describe("tokenize — 질의에서 키워드 추출", () => {
  it("불용어·조사 제거", () => {
    const t = tokenize("덤벨 쓰고 머리 뒤로 왔다갔다 하는 운동이 있는데 머지");
    expect(t).toContain("덤벨");
    expect(t).toContain("머리");
    expect(t).toContain("뒤로");
    expect(t).not.toContain("운동");
    expect(t).not.toContain("있는데");
    expect(t).not.toContain("머지");
  });
});

describe("searchExercises — 자연어 묘사로 운동 추론", () => {
  it("'덤벨 머리 뒤로' → 오버헤드 트라이셉스 익스텐션이 상위", () => {
    const hits = searchExercises("덤벨 쓰고 머리 뒤로 왔다갔다 하는 운동");
    const ids = hits.map((h) => h.id);
    expect(ids).toContain("overhead-triceps-extension");
    expect(hits[0].id).toBe("overhead-triceps-extension");
  });

  it("'앉아서 다리 펴' → 레그 익스텐션", () => {
    const ids = searchExercises("앉아서 다리 펴는 운동").map((h) => h.id);
    expect(ids).toContain("leg-extension");
  });

  it("'턱걸이' → 풀업/친업", () => {
    const ids = searchExercises("철봉에 매달려 턱걸이").map((h) => h.id);
    expect(ids.some((id) => id === "pull-up" || id === "chin-up")).toBe(true);
  });

  it("이름 직접 검색도 동작(풀네임이 상위권에)", () => {
    // 1,300 확장 카탈로그엔 '벤치' 변형이 많으므로 풀네임으로 검색해 상위권 포함 확인.
    const ids = searchExercises("바벨 벤치프레스", 10).map((h) => h.id);
    expect(ids).toContain("bench-press");
  });

  it("매칭 없으면 빈 배열", () => {
    expect(searchExercises("@@@@")).toEqual([]);
    expect(searchExercises("")).toEqual([]);
  });

  it("limit 개수 제한", () => {
    expect(searchExercises("덤벨", 3).length).toBeLessThanOrEqual(3);
  });
});
