/**
 * 판매 상품 — 로드맵 7.1.
 *
 * 여기 적힌 id 는 **구글 플레이 콘솔에 등록한 구독 상품 id 와 글자 하나까지 같아야 한다.**
 * 다르면 결제창이 "상품을 찾을 수 없음" 으로 뜨는데, 앱에서는 원인이 안 보인다.
 */

/** 프리미엄 월 구독. Play Console → 수익 창출 → 구독에서 같은 id 로 만든다. */
export const PREMIUM_PRODUCT_ID = "helssu_premium_monthly";

/**
 * 표시 가격(원, 부가세 포함) — 2026-09-09.
 *
 * ⚠ **실제 청구 가격은 Play Console 이 정한다.** 여기 값은 화면에 미리 보여 주는 숫자일
 * 뿐이라, 콘솔에서 가격을 바꾸면 **여기도 같이 바꿔야 한다**(안 그러면 화면에 적힌 값과
 * 결제창 값이 달라진다 — 사용자는 이걸 사기로 받아들인다).
 *
 * 3,900원으로 잡은 근거는 원가다. `ai-quota.ts` 의 한도를 다 써도 최악 원가가
 * 1,940원이고, 아래 `netRevenueKrw` 로 계산한 실수령이 3,013원이다 —
 * **어떤 사용자도 적자가 나지 않는 선**에서 가장 낮은 가격대를 골랐다.
 * (이 관계는 `tests/be/logic/pricing.test.ts` 가 지킨다.)
 */
export const PREMIUM_PRICE_KRW = 3_900;

/** 구글 플레이 수수료. 연 100만 달러까지는 15%. */
export const PLAY_FEE_RATE = 0.15;
/** 부가가치세 10%. 한국 소비자 대상 표시가는 **부가세 포함**이라 빼고 계산한다. */
export const VAT_RATE = 0.1;

/**
 * 표시가에서 실제로 손에 들어오는 금액(원, 1원 미만 버림).
 *
 * 🔴 부가세를 먼저 빼고 수수료를 뗀다. 순서를 바꾸면 몇 백 원이 틀리는데, 원가와
 * 비교하는 숫자라 그 차이가 흑자·적자를 가른다.
 */
export function netRevenueKrw(priceKrw: number = PREMIUM_PRICE_KRW): number {
  return Math.floor((priceKrw / (1 + VAT_RATE)) * (1 - PLAY_FEE_RATE));
}
