import { describe, expect, it } from "vitest";

import { pledgeDateLabel, pledgeRangeLabel } from "@/features/commitments/pledge-date-label";

describe("다짐 기간 표기", () => {
  it("올해 날짜는 월·일만", () => {
    expect(pledgeDateLabel("2026-11-16", 2026)).toBe("11월 16일");
  });
  it("다른 해는 연도를 붙인다", () => {
    expect(pledgeDateLabel("2027-01-10", 2026)).toBe("2027년 1월 10일");
  });
  it("기간", () => {
    expect(pledgeRangeLabel("2026-11-16", "2027-01-10", 2026)).toBe("11월 16일 ~ 2027년 1월 10일");
  });
  it("형식이 아니면 그대로", () => {
    expect(pledgeDateLabel("bad", 2026)).toBe("bad");
  });
});
