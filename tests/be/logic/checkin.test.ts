import { describe, expect, it } from "vitest";

import {
  adviceFor,
  checkinLine,
  cleanPainAreas,
  emptiedByPain,
  isCheckin,
  lightenRow,
  painConflicts,
  painLine,
  withoutPainExercises,
} from "@/features/routine/checkin";

describe("오늘 컨디션 → 권하는 강도", () => {
  it("🔴 하나라도 '나쁨'이면 가볍게 — 잠만 못 자도 무거운 세트에서 다치기 쉽다", () => {
    expect(adviceFor({ sleep: 1, soreness: 3, energy: 3 }).kind).toBe("light");
    expect(adviceFor({ sleep: 3, soreness: 1, energy: 3 }).kind).toBe("light");
  });

  it("합이 5 이하면 가볍게, 8 이상이면 좋음, 그 사이는 보통", () => {
    expect(adviceFor({ sleep: 2, soreness: 2, energy: 2 }).kind).toBe("normal");
    expect(adviceFor({ sleep: 3, soreness: 3, energy: 2 }).kind).toBe("good");
    expect(adviceFor({ sleep: 3, soreness: 3, energy: 3 }).kind).toBe("good");
  });

  it("값 검사", () => {
    expect(isCheckin({ sleep: 1, soreness: 2, energy: 3 })).toBe(true);
    expect(isCheckin({ sleep: 0, soreness: 2, energy: 3 })).toBe(false);
    expect(isCheckin({ sleep: 1, soreness: 2 })).toBe(false);
    expect(isCheckin(null)).toBe(false);
  });

  it("AI 가 보는 한 줄", () => {
    expect(checkinLine({ sleep: 1, soreness: 2, energy: 3 })).toBe("오늘 컨디션: 잠 못 잤어요, 근육통 조금, 기운 좋아요");
  });
});

describe("오늘만 세트 줄이기", () => {
  it("세트를 하나 줄이되 1 밑으로는 안 간다", () => {
    expect(lightenRow({ sets: 4, setDetails: null })).toEqual({ sets: 3, setDetails: null });
    expect(lightenRow({ sets: 1, setDetails: null })).toEqual({ sets: 1, setDetails: null });
  });

  it("세트별 기록이면 마지막 세트를 뺀다", () => {
    const d = [{ weightKg: 60, reps: 8 }, { weightKg: 60, reps: 8 }, { weightKg: 50, reps: 10 }];
    expect(lightenRow({ sets: 3, setDetails: d })).toEqual({ sets: 2, setDetails: d.slice(0, 2) });
    expect(lightenRow({ sets: 1, setDetails: [d[0]] })).toEqual({ sets: 1, setDetails: [d[0]] });
  });
});

describe("아픈 부위", () => {
  it("모르는 값·중복은 버린다", () => {
    expect(cleanPainAreas(["shoulder", "shoulder", "knee", 3])).toEqual(["shoulder"]);
    expect(cleanPainAreas("shoulder")).toEqual([]);
  });

  it("오늘 운동 중 아픈 부위 운동 수", () => {
    expect(painConflicts(["ohp", "lateral-raise", "squat"], ["shoulder"])).toEqual([{ part: "shoulder", count: 2 }]);
    expect(painConflicts(["squat"], ["shoulder"])).toEqual([]);
    expect(painConflicts(["ohp"], [])).toEqual([]);
  });

  it("AI 가 보는 한 줄 — 사람이 떠올리는 말로", () => {
    expect(painLine(["shoulder", "lower"])).toBe("아픈 부위(추천에서 뺌): 어깨, 다리·무릎");
  });
});

describe("AI 트레이너가 보는 줄", () => {
  it("내 상태 + 오늘 컨디션 + 아픈 부위(있을 때만)", async () => {
    const { trainerStateLines } = await import("@/features/routine/checkin");
    expect(trainerStateLines(["목표: 근육 증가"], { sleep: 1, soreness: 2, energy: 3 }, ["shoulder"])).toEqual([
      "목표: 근육 증가",
      "오늘 컨디션: 잠 못 잤어요, 근육통 조금, 기운 좋아요",
      "아픈 부위(추천에서 뺌): 어깨",
    ]);
    expect(trainerStateLines(["a"], null, [])).toEqual(["a"]);
  });
});

describe("규칙 추천에서 아픈 부위 빼기(2026-10-01)", () => {
  const list = [{ id: "bench-press" }, { id: "lat-pulldown" }, { id: "squat" }, { id: "ohp" }];

  it("🔴 아픈 부위가 주로 쓰는 운동만 빠지고 나머지는 순서 그대로", () => {
    expect(withoutPainExercises(list, ["chest"]).map((e) => e.id)).toEqual(["lat-pulldown", "squat", "ohp"]);
    expect(withoutPainExercises(list, ["lower", "shoulder"]).map((e) => e.id)).toEqual(["bench-press", "lat-pulldown"]);
  });

  it("아픈 곳이 없으면 그대로(복사본)", () => {
    const out = withoutPainExercises(list, []);
    expect(out).toEqual(list);
    expect(out).not.toBe(list);
  });

  it("🔴 원래 있던 칸이 아파서 0개가 되면 쉬는 칸 — 처음부터 없던 칸(기구 부족)은 아니다", () => {
    expect(emptiedByPain(5, 0)).toBe(true);
    expect(emptiedByPain(0, 0)).toBe(false);
    expect(emptiedByPain(5, 2)).toBe(false);
  });
});
