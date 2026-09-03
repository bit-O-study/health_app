import { describe, expect, it } from "vitest";

import {
  AI_FEATURES,
  LOW_QUOTA_RATIO,
  MONTHLY_LIMITS,
  featureLabel,
  isAiFeatureId,
  limitFor,
  lowQuotaMessage,
  overLimitMessage,
  quotaState,
  shouldWarnLowQuota,
  usageMonth,
  type AiFeatureId,
} from "@/features/coach/ai-quota";

describe("한도 표", () => {
  it("모든 기능에 무료·프리미엄 한도가 둘 다 있다", () => {
    for (const f of AI_FEATURES) {
      expect(MONTHLY_LIMITS.free[f.id]).toBeGreaterThan(0);
      expect(MONTHLY_LIMITS.premium[f.id]).toBeGreaterThan(0);
    }
  });

  it("프리미엄이 무료보다 항상 넉넉하다 — 아니면 등급이 의미가 없다", () => {
    for (const f of AI_FEATURES) {
      expect(MONTHLY_LIMITS.premium[f.id]).toBeGreaterThan(
        MONTHLY_LIMITS.free[f.id],
      );
    }
  });

  it("표에 없는 기능 키가 한도 표에 남아 있지 않다", () => {
    const ids = new Set<string>(AI_FEATURES.map((f) => f.id));
    for (const key of Object.keys(MONTHLY_LIMITS.free)) {
      expect(ids.has(key)).toBe(true);
    }
    expect(Object.keys(MONTHLY_LIMITS.free).length).toBe(AI_FEATURES.length);
  });

  it("식단 사진은 하루 세 끼 × 30일(90)보다 넉넉하다 — 정상 사용을 막지 않는다", () => {
    expect(limitFor("free", "meal-scan")).toBeGreaterThanOrEqual(90);
  });

  it("모든 기능에 사람이 읽는 라벨이 있다", () => {
    for (const f of AI_FEATURES) expect(featureLabel(f.id).length).toBeGreaterThan(0);
  });

  it("isAiFeatureId 는 표에 있는 것만 통과시킨다", () => {
    expect(isAiFeatureId("coach")).toBe(true);
    expect(isAiFeatureId("meal-scan")).toBe(true);
    expect(isAiFeatureId("nope")).toBe(false);
    expect(isAiFeatureId(null)).toBe(false);
  });
});

describe("usageMonth — 서울 기준 달", () => {
  it("YYYY-MM 형식", () => {
    expect(usageMonth(new Date("2026-09-02T03:00:00Z"))).toBe("2026-09");
  });

  it("🔴 매월 1일 새벽은 이미 새 달이다 — UTC 로 세면 9시간 동안 지난달로 들어간다", () => {
    // 2026-09-01T00:30 KST = 2026-08-31T15:30Z
    expect(usageMonth(new Date("2026-08-31T15:30:00Z"))).toBe("2026-09");
  });

  it("말일 밤은 아직 이번 달이다", () => {
    // 2026-08-31T23:30 KST = 2026-08-31T14:30Z
    expect(usageMonth(new Date("2026-08-31T14:30:00Z"))).toBe("2026-08");
  });

  it("연말 경계", () => {
    // 2027-01-01T00:10 KST
    expect(usageMonth(new Date("2026-12-31T15:10:00Z"))).toBe("2027-01");
  });
});

describe("quotaState", () => {
  const F: AiFeatureId = "coach";

  it("안 썼으면 전부 남아 있다", () => {
    const s = quotaState(F, "free", 0);
    expect(s.remaining).toBe(s.limit);
    expect(s.allowed).toBe(true);
  });

  it("한도에 닿으면 막힌다(같아지는 순간부터)", () => {
    const limit = limitFor("free", F);
    expect(quotaState(F, "free", limit - 1).allowed).toBe(true);
    expect(quotaState(F, "free", limit).allowed).toBe(false);
  });

  it("남은 횟수는 음수로 안 내려간다 — '-3회 남음'을 보여줄 순 없다", () => {
    const s = quotaState(F, "free", limitFor("free", F) + 50);
    expect(s.remaining).toBe(0);
  });

  it("이상한 사용량(음수·소수)도 안전하게 다룬다", () => {
    expect(quotaState(F, "free", -5).used).toBe(0);
    expect(quotaState(F, "free", 3.7).used).toBe(3);
  });

  it("프리미엄은 같은 사용량에서 더 여유가 있다", () => {
    const used = limitFor("free", F);
    expect(quotaState(F, "free", used).allowed).toBe(false);
    expect(quotaState(F, "premium", used).allowed).toBe(true);
  });
});

describe("안내 문구", () => {
  it("🔴 초과 안내는 **언제 풀리는지**를 같이 말한다 — 아니면 고장으로 읽힌다", () => {
    const s = quotaState("meal-scan", "free", 999);
    const msg = overLimitMessage(s);
    expect(msg).toContain("다음 달");
    expect(msg).toContain(featureLabel("meal-scan"));
    expect(msg).toContain(String(s.limit));
  });

  it("얼마 안 남았을 때만 남은 횟수를 알린다", () => {
    const limit = limitFor("free", "coach");
    expect(shouldWarnLowQuota(quotaState("coach", "free", 0))).toBe(false);
    expect(
      shouldWarnLowQuota(quotaState("coach", "free", limit - 1)),
    ).toBe(true);
  });

  it("이미 다 쓴 상태는 '얼마 안 남음'이 아니다 — 초과 안내가 따로 있다", () => {
    const limit = limitFor("free", "coach");
    expect(shouldWarnLowQuota(quotaState("coach", "free", limit))).toBe(false);
  });

  it("경고 기준은 한도의 20%", () => {
    expect(LOW_QUOTA_RATIO).toBe(0.2);
    const limit = limitFor("free", "meal-scan");
    const justInside = quotaState("meal-scan", "free", limit - Math.ceil(limit * 0.2));
    expect(shouldWarnLowQuota(justInside)).toBe(true);
  });

  it("남은 횟수 안내에 숫자가 들어간다", () => {
    const s = quotaState("coach", "free", limitFor("free", "coach") - 3);
    expect(lowQuotaMessage(s)).toContain("3회");
  });
});
