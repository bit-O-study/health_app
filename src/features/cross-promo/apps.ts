/**
 * 자매 서비스 크로스 홍보 데이터 (순수 모듈).
 * 각 앱 홈에서 자기 자신을 뺀 나머지를 배너로 노출한다.
 */
export type PromoApp = {
  key: "health" | "iq" | "whisky";
  emoji: string;
  name: string;
  desc: string;
  url: string;
};

export const PROMO_APPS: PromoApp[] = [
  {
    key: "health",
    emoji: "💪",
    name: "헬쑤",
    desc: "운동 루틴·식단·펫 키우기",
    url: "https://health-app-five-iota.vercel.app",
  },
  {
    key: "iq",
    emoji: "🧠",
    name: "IQ 테스트",
    desc: "멘사식 36문항 지능검사",
    url: "https://iq-test-fuyo-pi.vercel.app",
  },
  {
    key: "whisky",
    emoji: "🍶",
    name: "위스키다모아",
    desc: "주류 최저가 비교",
    url: "https://whisky-app-vert.vercel.app",
  },
];

/** 현재 앱(self)을 제외한 홍보 대상 목록. */
export function otherApps(self: PromoApp["key"]): PromoApp[] {
  return PROMO_APPS.filter((a) => a.key !== self);
}