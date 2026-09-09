import { describe, expect, it } from "vitest";

import {
  AI_FEATURES,
  COST_PER_CALL_KRW,
  MONTHLY_LIMITS,
  worstCaseMonthlyCostKrw,
} from "@/features/coach/ai-quota";
import {
  PLAY_FEE_RATE,
  PREMIUM_PRICE_KRW,
  VAT_RATE,
  netRevenueKrw,
} from "@/features/billing/products";

/**
 * 구독 단가 가드 — 2026-09-09.
 *
 * 🔴 이 앱에서 **돈이 새는 방향은 하나**다: AI 한도를 올리는 것. 한도는 숫자 하나라
 * 올리기 쉽고, 올려도 화면은 멀쩡하고 테스트도 다 통과한다. 그러다 구독자 한 명이
 * 한도를 다 쓰면 **받은 돈보다 나가는 돈이 많아진다** — 그때는 이미 가격을 올릴 수 없다
 * (이미 구독 중인 사람의 가격을 올리는 건 해지 사유다).
 *
 * 그래서 "한도 × 원가 < 실수령" 이라는 관계를 여기서 못 박는다. 한도만 올리면 실패한다.
 *
 * 예전 한도(식단 1000·기구 400·자세 400·코치 300·체성분 100 = 2,200회)는 최악 원가가
 * 13,200원이었다 — **얼마를 받아도 적자가 날 수 있는 표**였다.
 */
describe("구독 단가", () => {
  it("실수령은 부가세를 뺀 뒤 플레이 수수료를 뗀 값이다", () => {
    // 순서가 바뀌면 몇 백 원이 틀리는데, 흑자·적자를 가르는 숫자라 순서까지 못 박는다.
    const expected = Math.floor(
      (PREMIUM_PRICE_KRW / (1 + VAT_RATE)) * (1 - PLAY_FEE_RATE),
    );
    expect(netRevenueKrw()).toBe(expected);
    expect(netRevenueKrw()).toBe(3013);
  });

  it("🔴 프리미엄 한도를 전부 써도 실수령을 넘지 않는다", () => {
    const worst = worstCaseMonthlyCostKrw("premium");
    expect(worst).toBeLessThan(netRevenueKrw());
  });

  it("🔴 최악 원가가 실수령의 70% 를 넘지 않는다 — 고정비 몫이 남아야 한다", () => {
    // 서버비(Vercel·Supabase)는 구독료에서 같이 나온다. 원가가 실수령에 바싹 붙으면
    // '적자는 아닌데 아무것도 안 남는' 상태가 된다.
    const ratio = worstCaseMonthlyCostKrw("premium") / netRevenueKrw();
    expect(ratio).toBeLessThanOrEqual(0.7);
  });

  it("무료 사용자 한 명의 최악 원가는 구독 한 명 실수령보다 작다", () => {
    // 무료는 수익이 0이라 이건 순수 마케팅 비용이다. 유료 한 명이 무료 여러 명을
    // 떠받쳐야 하므로, 최소한 '유료 1명 < 무료 1명' 이 되는 일은 없어야 한다.
    expect(worstCaseMonthlyCostKrw("free")).toBeLessThan(netRevenueKrw());
  });

  it("모든 AI 기능에 원가와 등급별 한도가 빠짐없이 있다", () => {
    // 기능을 새로 추가하면서 원가만 안 적으면 위 계산이 그 기능을 **공짜로 친다**.
    for (const f of AI_FEATURES) {
      expect(COST_PER_CALL_KRW[f.id], `${f.id} 원가 누락`).toBeGreaterThan(0);
      expect(MONTHLY_LIMITS.free[f.id], `${f.id} 무료 한도 누락`).toBeGreaterThan(0);
      expect(MONTHLY_LIMITS.premium[f.id], `${f.id} 프리미엄 한도 누락`).toBeGreaterThan(0);
    }
  });

  it("프리미엄 한도는 모든 기능에서 무료보다 크거나 같다", () => {
    for (const f of AI_FEATURES) {
      expect(
        MONTHLY_LIMITS.premium[f.id],
        `${f.id}: 프리미엄이 무료보다 적으면 결제할 이유가 없다`,
      ).toBeGreaterThanOrEqual(MONTHLY_LIMITS.free[f.id]);
    }
  });

  it("🔴 무료로도 결제 이유가 생길 만큼은 차이가 난다", () => {
    // 예전 표의 실제 문제: 무료 한도가 '평범하게 쓰면 절대 안 닿는 선'이라 정상
    // 사용자는 한도 안내조차 못 봤다. 코치·자세는 맛보기여야 한다.
    expect(MONTHLY_LIMITS.free.coach).toBeLessThanOrEqual(5);
    expect(MONTHLY_LIMITS.free.posture).toBeLessThanOrEqual(5);
    // 식단 사진만 예외다 — 매일 쓰는 습관이라 조이면 결제가 아니라 이탈이 난다.
    // (하루 세 끼를 감당하는지는 `ai-quota.test.ts` 가 이미 지킨다.)
  });
});
