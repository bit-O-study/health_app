import { describe, expect, it } from "vitest";

import {
  extractJsonObject,
  parseCoachAnalysis,
  parseCommitmentSuggestions,
} from "@/features/coach/parse";

describe("extractJsonObject", () => {
  it("pulls JSON out of code fences and prose", () => {
    const o = extractJsonObject('설명\n```json\n{"a":1}\n```\n끝') as {
      a: number;
    };
    expect(o.a).toBe(1);
  });
  it("returns null on no/invalid json", () => {
    expect(extractJsonObject("없음")).toBeNull();
    expect(extractJsonObject("{broken")).toBeNull();
  });
});

describe("parseCoachAnalysis", () => {
  it("normalizes summary + points, drops titleless points", () => {
    const r = parseCoachAnalysis(
      JSON.stringify({
        summary: "총평",
        points: [
          { title: "하체 부족", detail: "스쿼트 추가" },
          { detail: "제목없음" },
        ],
      }),
    );
    expect(r?.summary).toBe("총평");
    expect(r?.points).toHaveLength(1);
    expect(r?.points[0].title).toBe("하체 부족");
  });
  it("returns null without summary", () => {
    expect(parseCoachAnalysis(JSON.stringify({ points: [] }))).toBeNull();
  });
});

describe("parseCommitmentSuggestions", () => {
  it("keeps only valid metric/target/days", () => {
    const out = parseCommitmentSuggestions(
      JSON.stringify({
        suggestions: [
          { title: "주 4회 운동", metric: "workout_days", target: 16, days: 28 },
          { title: "나쁜지표", metric: "steps", target: 1000, days: 30 },
          { title: "음수", metric: "burn_kcal", target: -1, days: 30 },
          { title: "기간과다", metric: "burn_kcal", target: 5000, days: 900 },
        ],
      }),
    );
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      metric: "workout_days",
      target: 16,
      days: 28,
    });
  });
  it("returns [] on missing suggestions", () => {
    expect(parseCommitmentSuggestions("{}")).toEqual([]);
    expect(parseCommitmentSuggestions("없음")).toEqual([]);
  });
});
