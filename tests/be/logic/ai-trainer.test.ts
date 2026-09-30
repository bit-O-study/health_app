import { describe, expect, it } from "vitest";

import {
  CANDIDATES_PER_PART,
  PLAN_MAX,
  TRAINER_SYSTEM,
  buildCandidates,
  buildTrainerUserText,
  parseTodayPlan,
  readStoredPlan,
  todayPlanStorageKey,
  type Candidate,
} from "@/features/coach/ai-trainer";

const ex = (id: string, name = id) => ({ id, name, equipment: "barbell" as const });

describe("후보 운동", () => {
  it("부위당 최대 N개, 중복 없이", () => {
    const many = Array.from({ length: 20 }, (_, i) => ex(`c${i}`));
    const c = buildCandidates({ chest: many, back: [ex("c0"), ex("row")] });
    expect(c.filter((x) => x.part === "chest")).toHaveLength(CANDIDATES_PER_PART);
    // 가슴에서 이미 나온 c0 은 등에 다시 넣지 않는다.
    expect(c.filter((x) => x.part === "back").map((x) => x.exerciseId)).toEqual(["row"]);
  });

  it("아픈 부위는 통째로 뺀다", () => {
    const c = buildCandidates({ shoulder: [ex("ohp")], lower: [ex("squat")] }, ["shoulder"]);
    expect(c.map((x) => x.exerciseId)).toEqual(["squat"]);
  });
});

const CANDS: Candidate[] = [
  { exerciseId: "lat-pulldown", name: "랫풀다운", part: "back", equipment: "machine" },
  { exerciseId: "seated-cable-row", name: "시티드 케이블 로우", part: "back", equipment: "cable" },
  { exerciseId: "squat", name: "스쿼트", part: "lower", equipment: "barbell" },
];

describe("AI 답 읽기", () => {
  it("후보 안의 운동만 남기고 이름·부위·기구는 후보에서 가져온다", () => {
    const p = parseTodayPlan(
      '```json\n{"summary":"등이 부족해요.","items":[{"id":"lat-pulldown","reason":"등 주 6세트"},{"id":"made-up","reason":"x"},{"id":"squat","reason":"3주째 그대로"}],"tip":"천천히"}\n```',
      CANDS,
    );
    expect(p?.items.map((i) => i.exerciseId)).toEqual(["lat-pulldown", "squat"]);
    expect(p?.items[0]).toMatchObject({ name: "랫풀다운", part: "back", equipment: "machine", reason: "등 주 6세트" });
    expect(p?.summary).toBe("등이 부족해요.");
    expect(p?.tip).toBe("천천히");
  });

  it("🔴 목록 밖 운동만 고르면(2개 미만) 믿지 않는다", () => {
    expect(parseTodayPlan('{"summary":"","items":[{"id":"squat"},{"id":"nope"}]}', CANDS)).toBeNull();
  });

  it("중복은 한 번만, 최대 개수까지", () => {
    const p = parseTodayPlan('{"items":[{"id":"squat"},{"id":"squat"},{"id":"lat-pulldown"}]}', CANDS);
    expect(p?.items.map((i) => i.exerciseId)).toEqual(["squat", "lat-pulldown"]);
    expect(PLAN_MAX).toBe(6);
  });

  it("JSON 이 아니면 null", () => {
    expect(parseTodayPlan("죄송해요, 모르겠어요", CANDS)).toBeNull();
  });
});

describe("AI 에 보내는 글", () => {
  it("🔴 무게는 AI 가 정하지 않고, 목록 안에서만 고르라고 말한다", () => {
    expect(TRAINER_SYSTEM).toContain("목록의 id 로만");
    expect(TRAINER_SYSTEM).toContain("무게·세트·횟수는 쓰지 않는다");
  });

  it("상태 줄과 부위별 후보가 들어간다", () => {
    const t = buildTrainerUserText(["목표: 근육 증가"], CANDS);
    expect(t).toContain("목표: 근육 증가");
    expect(t).toContain("등: lat-pulldown(랫풀다운), seated-cable-row(시티드 케이블 로우)");
    expect(t).toContain("하체: squat(스쿼트)");
  });
});

describe("기기 보관", () => {
  it("사람·날짜별 키", () => {
    expect(todayPlanStorageKey("u1", "2026-09-30")).toBe("jimkkun.ai-trainer.u1.2026-09-30");
  });

  it("형식이 틀린 값은 버린다", () => {
    expect(readStoredPlan(null)).toBeNull();
    expect(readStoredPlan("{bad")).toBeNull();
    expect(readStoredPlan('{"summary":"x","items":[]}')).toBeNull();
    const ok = readStoredPlan(JSON.stringify({ summary: "s", items: [CANDS[0]], tip: "" }));
    expect(ok?.items).toHaveLength(1);
  });
});
