import { describe, expect, it } from "vitest";

import {
  applyTargetNote,
  applyWeightPolicy,
  previewLine,
  sortApplyTargets,
  toConditioningRows,
  toRoutineRows,
  validateShareText,
  type ShareConditioning,
  type ShareExercise,
} from "@/features/routine-share/share";

const ex = (over: Partial<ShareExercise> = {}): ShareExercise => ({
  focus: "back",
  position: 0,
  exercise_id: "lat-pulldown",
  equipment: "machine",
  sets: 4,
  reps: 12,
  weight_kg: 50,
  memo: null,
  ...over,
});

describe("validateShareText", () => {
  it("제목이 비면 막는다", () => {
    expect(validateShareText("   ", "")).toBe("제목을 입력하세요.");
  });
  it("제목·한마디 길이 제한", () => {
    expect(validateShareText("a".repeat(61), "")).toContain("제목은");
    expect(validateShareText("등 루틴", "b".repeat(201))).toContain("한마디는");
  });
  it("정상이면 null", () => {
    expect(validateShareText(" 등 파괴 1일차 ", "초보도 가능")).toBeNull();
  });
});

describe("applyWeightPolicy — 무게는 기본 제외", () => {
  it("includeWeight=false 면 무게를 전부 지운다", () => {
    const rows = applyWeightPolicy([ex(), ex({ weight_kg: 100 })], false);
    expect(rows.map((r) => r.weight_kg)).toEqual([null, null]);
    // 나머지 값은 그대로.
    expect(rows[0].sets).toBe(4);
    expect(rows[0].reps).toBe(12);
  });
  it("includeWeight=true 면 그대로 둔다", () => {
    expect(applyWeightPolicy([ex()], true)[0].weight_kg).toBe(50);
  });
});

describe("toRoutineRows — 담을 때 대상 일차로 붙인다", () => {
  it("day_index 를 붙이고 position 을 0부터 다시 매긴다", () => {
    const rows = toRoutineRows(
      [
        ex({ position: 7, exercise_id: "deadlift" }),
        ex({ position: 3, exercise_id: "seated-row" }),
      ],
      "user-1",
      4,
    );
    expect(rows.map((r) => r.exercise_id)).toEqual(["seated-row", "deadlift"]);
    expect(rows.map((r) => r.position)).toEqual([0, 1]);
    expect(rows.every((r) => r.day_index === 4)).toBe(true);
    expect(rows.every((r) => r.user_id === "user-1")).toBe(true);
  });

  it("메모는 그대로 따라간다 (소개의 핵심)", () => {
    const rows = toRoutineRows([ex({ memo: "견갑 먼저 내리기" })], "u", 0);
    expect(rows[0].memo).toBe("견갑 먼저 내리기");
  });

  it("부위가 여러 개면 부위별로 position 을 따로 센다", () => {
    const rows = toRoutineRows(
      [
        ex({ focus: "back", position: 0 }),
        ex({ focus: "biceps", position: 1 }),
        ex({ focus: "back", position: 2 }),
      ],
      "u",
      1,
    );
    expect(rows.map((r) => [r.focus, r.position])).toEqual([
      ["back", 0],
      ["biceps", 0],
      ["back", 1],
    ]);
  });
});

describe("toConditioningRows — 워밍업/마무리는 담는 쪽 부위로", () => {
  const cond = (over: Partial<ShareConditioning> = {}): ShareConditioning => ({
    focus: "back",
    kind: "warmup",
    position: 0,
    item_id: "running",
    duration_min: 5,
    speed: 6,
    incline: null,
    sets: null,
    reps: null,
    memo: null,
    ...over,
  });

  it("원본 부위가 아니라 대상 일차의 부위로 갈아끼운다", () => {
    // 원본이 back 이어도 내 3일차가 chest 면 chest 로 들어가야 화면에 뜬다.
    const rows = toConditioningRows([cond()], "u", "chest");
    expect(rows[0].focus).toBe("chest");
  });

  it("원본 position 순으로 정렬한 뒤, kind 별로 0부터 다시 매긴다", () => {
    const rows = toConditioningRows(
      [
        cond({ kind: "cooldown", position: 6 }),
        cond({ kind: "이상한값", position: 9 }),
        cond({ kind: "cooldown", position: 5 }),
      ],
      "u",
      "back",
    );
    // position 5 → 6 → 9 순으로 정렬. 모르는 kind 는 warmup 으로 정규화.
    expect(rows.map((r) => [r.kind, r.position])).toEqual([
      ["cooldown", 0],
      ["cooldown", 1],
      ["warmup", 0],
    ]);
  });
});

describe("previewLine — 카드 한 줄 미리보기", () => {
  it("3개까지 잇고 더 있으면 말줄임", () => {
    expect(previewLine(["A", "B"])).toBe("A → B");
    expect(previewLine(["A", "B", "C"])).toBe("A → B → C");
    expect(previewLine(["A", "B", "C", "D"])).toBe("A → B → C …");
  });
  it("비면 안내 문구", () => {
    expect(previewLine([])).toBe("운동 없음");
  });
});

describe("담기 일차 고르기", () => {
  it("비어 있으면 바로 담고, 차 있으면 덮어쓰기 확인", () => {
    expect(applyTargetNote(0)).toEqual({
      note: "그대로 채워집니다",
      overwrites: false,
    });
    expect(applyTargetNote(5)).toEqual({
      note: "운동 5개 — 덮어씁니다",
      overwrites: true,
    });
  });

  it("비어 있는 일차를 위로, 같은 그룹 안에선 일차 순서 유지", () => {
    const sorted = sortApplyTargets([
      { dayIndex: 0, exerciseCount: 5 },
      { dayIndex: 1, exerciseCount: 0 },
      { dayIndex: 2, exerciseCount: 6 },
      { dayIndex: 3, exerciseCount: 0 },
    ]);
    expect(sorted.map((t) => t.dayIndex)).toEqual([1, 3, 0, 2]);
  });
});
