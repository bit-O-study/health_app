import { describe, expect, it } from "vitest";

import {
  ANALYSIS_KEEP_PER_KIND,
  ANALYSIS_KINDS,
  analysisDateLabel,
  isAnalysisKind,
  toStoredAnalysis,
} from "@/features/coach/analysis-history";

const NOW = new Date("2026-09-02T05:00:00Z"); // 서울 9/2 14:00

describe("종류", () => {
  it("표에 있는 것만 통과시킨다", () => {
    for (const k of ANALYSIS_KINDS) expect(isAnalysisKind(k)).toBe(true);
    expect(isAnalysisKind("commitments")).toBe(false);
    expect(isAnalysisKind(null)).toBe(false);
  });

  it("보관 개수는 흐름을 볼 만큼은 되고 무한히 쌓지는 않는다", () => {
    expect(ANALYSIS_KEEP_PER_KIND).toBeGreaterThan(1);
    expect(ANALYSIS_KEEP_PER_KIND).toBeLessThanOrEqual(50);
  });
});

describe("toStoredAnalysis — DB 값을 그대로 믿지 않는다", () => {
  const base = {
    summary: "이번 주 하체가 부족했어요.",
    points: [{ title: "스쿼트 추가", detail: "주 1회 더" }],
    subject: null,
    createdAt: "2026-09-02T05:00:00.000Z",
  };

  it("정상 행은 그대로 온다", () => {
    const r = toStoredAnalysis(base)!;
    expect(r.summary).toBe(base.summary);
    expect(r.points).toEqual(base.points);
    expect(r.subject).toBeNull();
  });

  it("총평이 없으면 null — 빈 카드를 만들지 않는다", () => {
    expect(toStoredAnalysis({ ...base, summary: "" })).toBeNull();
    expect(toStoredAnalysis({ ...base, summary: null })).toBeNull();
    expect(toStoredAnalysis({ ...base, summary: 3 })).toBeNull();
  });

  it("시각이 없으면 null — 언제 분석한 건지 모르면 못 보여준다", () => {
    expect(toStoredAnalysis({ ...base, createdAt: "" })).toBeNull();
    expect(toStoredAnalysis({ ...base, createdAt: null })).toBeNull();
  });

  it("Date 로 온 시각도 받는다(드라이버에 따라 다르다)", () => {
    const r = toStoredAnalysis({ ...base, createdAt: new Date(NOW) })!;
    expect(r.createdAt).toBe(NOW.toISOString());
  });

  it("🔴 points 가 배열이 아니면 빈 목록으로 — 화면이 통째로 깨지면 안 된다", () => {
    expect(toStoredAnalysis({ ...base, points: null })!.points).toEqual([]);
    expect(toStoredAnalysis({ ...base, points: "글자" })!.points).toEqual([]);
    expect(toStoredAnalysis({ ...base, points: { a: 1 } })!.points).toEqual([]);
  });

  it("제목 없는 항목은 버린다 — 화면에서 빈 줄이 된다", () => {
    const r = toStoredAnalysis({
      ...base,
      points: [
        { title: "", detail: "내용만" },
        { title: "정상", detail: "" },
        null,
        { detail: 3 },
      ],
    })!;
    expect(r.points).toEqual([{ title: "정상", detail: "" }]);
  });

  it("앞뒤 공백은 다듬는다", () => {
    const r = toStoredAnalysis({
      ...base,
      summary: "  총평  ",
      subject: "  스쿼트 ",
    })!;
    expect(r.summary).toBe("총평");
    expect(r.subject).toBe("스쿼트");
  });

  it("빈 subject 는 null 로", () => {
    expect(toStoredAnalysis({ ...base, subject: "   " })!.subject).toBeNull();
  });
});

describe("analysisDateLabel — 언제 분석한 것인가", () => {
  it("오늘 것은 '오늘 분석'", () => {
    expect(analysisDateLabel("2026-09-02T05:00:00Z", NOW)).toBe("오늘 분석");
  });

  it("🔴 서울 기준으로 오늘을 가린다 — UTC 로 보면 새벽 분석이 어제가 된다", () => {
    // 2026-09-02T00:30 KST = 2026-09-01T15:30Z. UTC 로 보면 9/1 이지만 서울로는 오늘.
    expect(analysisDateLabel("2026-09-01T15:30:00Z", NOW)).toBe("오늘 분석");
  });

  it("지난 것은 날짜로 — '3일 전'보다 또렷하다", () => {
    expect(analysisDateLabel("2026-08-30T05:00:00Z", NOW)).toBe("8월 30일 분석");
  });

  it("한 자리 월·일에 0을 붙이지 않는다", () => {
    expect(analysisDateLabel("2026-01-05T05:00:00Z", NOW)).toBe("1월 5일 분석");
  });

  it("깨진 시각이면 빈 문자열 — 아무 말도 안 하는 게 낫다", () => {
    expect(analysisDateLabel("아무말", NOW)).toBe("");
  });
});
