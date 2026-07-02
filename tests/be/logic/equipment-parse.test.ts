import { describe, expect, it } from "vitest";

import { parseVisionResult } from "@/features/equipment/parse";

const FULL = JSON.stringify({
  equipmentName: "레그프레스 머신",
  equipmentNameEn: "Leg Press Machine",
  confidence: "high",
  summary: "하체를 미는 머신입니다.",
  muscles: ["대퇴사두", "둔근"],
  exercises: [
    { name: "레그프레스", description: "발판을 밀어낸다." },
    { name: "카프레이즈", description: "발끝으로 민다." },
  ],
});

describe("parseVisionResult", () => {
  it("parses plain JSON", () => {
    const r = parseVisionResult(FULL);
    expect(r?.equipmentName).toBe("레그프레스 머신");
    expect(r?.confidence).toBe("high");
    expect(r?.exercises).toHaveLength(2);
    expect(r?.muscles).toEqual(["대퇴사두", "둔근"]);
  });

  it("parses JSON wrapped in code fences + prose", () => {
    const wrapped = "여기 결과입니다:\n```json\n" + FULL + "\n```\n감사합니다.";
    const r = parseVisionResult(wrapped);
    expect(r?.equipmentName).toBe("레그프레스 머신");
  });

  it("defaults confidence to medium when invalid", () => {
    const r = parseVisionResult(
      JSON.stringify({ equipmentName: "덤벨", confidence: "정확" }),
    );
    expect(r?.confidence).toBe("medium");
  });

  it("drops malformed exercises but keeps valid ones", () => {
    const r = parseVisionResult(
      JSON.stringify({
        equipmentName: "케이블",
        exercises: [{ description: "이름 없음" }, { name: "케이블 로우" }, 5],
      }),
    );
    expect(r?.exercises).toHaveLength(1);
    expect(r?.exercises[0]).toEqual({ name: "케이블 로우", description: "" });
  });

  it("returns null when equipmentName missing", () => {
    expect(parseVisionResult(JSON.stringify({ summary: "x" }))).toBeNull();
  });

  it("returns null on non-JSON", () => {
    expect(parseVisionResult("죄송하지만 분석할 수 없습니다.")).toBeNull();
  });
});
