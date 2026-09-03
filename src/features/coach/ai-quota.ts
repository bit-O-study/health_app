/**
 * AI 사용량 한도 — 로드맵 7.1(무료·프리미엄 구분과 월 사용량/API 비용 제한).
 *
 * 순수 모듈(DB·서버 의존 없음). 표와 계산만 여기 두고, 세는 일은 `ai-usage.ts` 가 한다.
 *
 * 🔴 왜 한도가 필요한가 — AI 호출은 **우리가 돈을 내는 유일한 기능**이다. 지금은 무료
 * NVIDIA NIM 을 쓰지만 그건 개발·평가용이라(분당 40요청) 사용자가 늘면 유료로 갈 수밖에
 * 없다. 한도가 없으면 사진 한 장을 스무 번 다시 스캔하는 사용자 몇 명이 비용을 통째로
 * 끌고 간다. 그때 가서 막으면 "되던 게 갑자기 안 되는" 경험이 되므로 지금 세워 둔다.
 *
 * 🔴 프리미엄 등급은 **표에만 있고 아직 아무도 아니다.** 결제가 붙기 전까지
 * `resolveTier` 는 모두 free 를 준다 — 결제 없이 프리미엄을 나눠 주는 가짜 등급을
 * 만들지 않는다(7.1 의 다음 칸에서 결제 상태를 붙인다).
 */

/** AI 를 쓰는 기능. 한도를 기능별로 나눈 이유는 비용이 다르기 때문이다. */
export type AiFeatureId =
  | "coach"
  | "meal-scan"
  | "body-scan"
  | "equipment-scan"
  | "posture";

export type AiTier = "free" | "premium";

export type AiFeatureMeta = {
  id: AiFeatureId;
  label: string;
  /** 한 번 부를 때 이미지를 보내는가 — 비전 호출이 텍스트보다 훨씬 비싸다. */
  vision: boolean;
};

export const AI_FEATURES: readonly AiFeatureMeta[] = [
  { id: "coach", label: "AI 코치 분석", vision: false },
  { id: "meal-scan", label: "식단 사진 분석", vision: true },
  { id: "body-scan", label: "체성분 분석지 읽기", vision: true },
  { id: "equipment-scan", label: "기구 스캔", vision: true },
  { id: "posture", label: "자세 분석", vision: true },
] as const;

export function isAiFeatureId(v: unknown): v is AiFeatureId {
  return typeof v === "string" && AI_FEATURES.some((f) => f.id === v);
}

/**
 * 등급별 **월** 한도. 하루 한도로 하면 "오늘 다 썼으니 내일" 이 되는데, 이 앱의 AI 는
 * 매일 쓰는 기능이 아니라 몰아서 쓰는 기능이라(체성분 분석지를 받은 날 한 번에) 월이 맞다.
 *
 * 숫자의 근거: 무료 사용자가 **평범하게 쓰면 절대 안 닿는 선**으로 잡았다. 한도는
 * 정상 사용을 막으려는 게 아니라 폭주를 막으려는 것이다.
 *  - 식단 사진: 하루 세 끼 × 30일 = 90 이 정상 상한 → 100
 *  - AI 코치: 주 2~3회면 넉넉 → 30
 *  - 체성분 분석지: 보통 달에 한두 번 → 10
 *  - 기구 스캔·자세 분석: 헬스장에서 몰아 쓰므로 조금 넉넉히
 */
export const MONTHLY_LIMITS: Record<AiTier, Record<AiFeatureId, number>> = {
  free: {
    coach: 30,
    "meal-scan": 100,
    "body-scan": 10,
    "equipment-scan": 40,
    posture: 40,
  },
  premium: {
    coach: 300,
    "meal-scan": 1000,
    "body-scan": 100,
    "equipment-scan": 400,
    posture: 400,
  },
};

export function limitFor(tier: AiTier, feature: AiFeatureId): number {
  return MONTHLY_LIMITS[tier][feature];
}

/**
 * 사용량을 세는 달 — **서울 기준**. UTC 로 세면 매월 1일 0~9시가 지난달로 들어가,
 * 사용자는 달이 바뀌었는데도 "한도 초과" 를 계속 본다.
 */
export function usageMonth(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "00";
  return `${y}-${m}`;
}

export type QuotaState = {
  feature: AiFeatureId;
  tier: AiTier;
  used: number;
  limit: number;
  /** 남은 횟수(0 이하로 안 내려간다). */
  remaining: number;
  /** 이번 호출이 가능한가. */
  allowed: boolean;
};

export function quotaState(
  feature: AiFeatureId,
  tier: AiTier,
  used: number,
): QuotaState {
  const limit = limitFor(tier, feature);
  const safeUsed = Math.max(0, Math.floor(used));
  return {
    feature,
    tier,
    used: safeUsed,
    limit,
    remaining: Math.max(0, limit - safeUsed),
    allowed: safeUsed < limit,
  };
}

/** 라벨 — 안내 문구에 기능 이름을 넣으려면 표에서 가져와야 한다. */
export function featureLabel(feature: AiFeatureId): string {
  return AI_FEATURES.find((f) => f.id === feature)?.label ?? "AI 기능";
}

/**
 * 한도를 넘었을 때 사용자에게 보여줄 문장.
 *
 * **언제 풀리는지 반드시 같이 말한다** — "한도를 초과했습니다" 만 있으면 영영 못 쓰는
 * 건지 기다리면 되는 건지 알 수 없어서, 사용자는 고장으로 받아들인다.
 */
export function overLimitMessage(state: QuotaState): string {
  return `이번 달 ${featureLabel(state.feature)} 사용 횟수(${state.limit}회)를 다 쓰셨어요. 다음 달 1일에 다시 채워져요.`;
}

/** 남은 횟수 안내 — 얼마 안 남았을 때만 띄운다(멀쩡할 때 숫자를 보여줄 이유가 없다). */
export const LOW_QUOTA_RATIO = 0.2;

export function shouldWarnLowQuota(state: QuotaState): boolean {
  return state.allowed && state.remaining <= Math.ceil(state.limit * LOW_QUOTA_RATIO);
}

export function lowQuotaMessage(state: QuotaState): string {
  return `${featureLabel(state.feature)} 이번 달 ${state.remaining}회 남았어요.`;
}
