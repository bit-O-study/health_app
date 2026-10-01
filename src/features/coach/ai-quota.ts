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
 * 한도 칸은 무료·프리미엄 둘이다. 요금제(무료·베이직·플러스·프로, `billing/plans.ts`)
 * 중 유료는 모두 프리미엄 칸을 쓴다(`aiTierForPlan`). 누가 어느 요금제인지는
 * `billing/plan-store.ts` 가 구독 만료 시각·팀 구독·트레이너 연결로 정한다.
 */

/** AI 를 쓰는 기능. 한도를 기능별로 나눈 이유는 비용이 다르기 때문이다. */
export type AiFeatureId =
  | "coach"
  | "meal-scan"
  | "body-scan"
  | "equipment-scan"
  | "posture"
  /** AI 트레이너 탭 — 오늘의 운동 제안(2026-09-30 2단계). */
  | "trainer"
  /** AI 트레이너 탭 — 오늘 식단 피드백(2026-09-30 2단계). */
  | "diet-coach";

/**
 * none = AI 를 아예 안 쓰는 칸(2026-10-01 사용자 결정: 990원 라이트엔 AI 없음).
 * 무료 회원은 맛보기(free), 베이직부터 premium.
 */
export type AiTier = "none" | "free" | "premium";

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
  { id: "trainer", label: "AI 트레이너 오늘의 운동", vision: false },
  { id: "diet-coach", label: "AI 트레이너 식단 피드백", vision: false },
] as const;

export function isAiFeatureId(v: unknown): v is AiFeatureId {
  return typeof v === "string" && AI_FEATURES.some((f) => f.id === v);
}

/**
 * 회당 추정 원가(원) — 2026-09-09. 구독 가격을 정하려면 원가를 알아야 하고, 원가는
 * 한도표 바로 옆에 있어야 한다(따로 두면 한도만 올리고 원가는 아무도 다시 안 본다).
 *
 * 지금은 무료 티어(Gemini·NVIDIA)라 **실제 지출은 0원**이다. 아래 숫자는 그 티어가
 * 막혔을 때 쓰는 폴백(Claude Haiku 4.5, 입력 $1·출력 $5 / 1M 토큰) 기준의 추정이다.
 * 코드에서 뽑은 실제 값으로 계산했다:
 *  - 이미지는 `resizeImageForAI` 가 768px 로 줄인다 → 약 590 토큰
 *  - 프롬프트는 600~800자(약 800~1,000 토큰), 출력은 max 900~1,000(실제 ~400~600)
 *  - 환율 1,400원/$ 가정
 *
 * ⚠ 추정이다. 실제 청구서가 나오기 시작하면 이 표부터 실측으로 바꿔야 한다.
 */
export const COST_PER_CALL_KRW: Record<AiFeatureId, number> = {
  // 이미지는 없지만 사용자의 운동 기록이 입력에 통째로 들어가 입력이 가장 크다.
  coach: 7,
  "meal-scan": 5,
  // 분석지 표를 다 읽어 내야 해서 출력이 길다.
  "body-scan": 6,
  "equipment-scan": 5,
  posture: 5,
  // 내 상태 요약 + 후보 운동 목록이 입력이라 코치와 비슷하다.
  trainer: 7,
  // 오늘 먹은 것 목록 + 목표 숫자라 입력이 짧다.
  "diet-coach": 5,
};

/**
 * 등급별 **월** 한도. 하루 한도로 하면 "오늘 다 썼으니 내일" 이 되는데, 이 앱의 AI 는
 * 매일 쓰는 기능이 아니라 몰아서 쓰는 기능이라(체성분 분석지를 받은 날 한 번에) 월이 맞다.
 *
 * 🔴 **2026-09-09에 숫자의 목적이 바뀌었다.** 예전 한도는 "폭주만 막는 방어선"이라
 * 무료가 평범하게 쓰면 절대 안 닿는 선이었다(식단 100·코치 30). 그러면 정상 사용자는
 * 결제 화면까지 갈 일이 없어 **설계상 아무도 구독하지 않는다.** 지금은 한도가
 * **상품의 경계**다 — 무료는 맛보기, 프리미엄은 매일 써도 남는 선.
 *
 * 프리미엄 숫자의 근거 — **다 써도 적자가 안 나야 한다.**
 * 위 원가표로 최악을 계산하면 60×7 + 160×5 + 20×6 + 40×5 + 40×5 + 30×7 + 30×5 = **2,100원**이고,
 * (2026-09-30 AI 트레이너 운동 30·식단 30회를 넣으며 식단 사진 프리미엄을 200→160 으로 — 70% 선 유지)
 * 3,900원 구독의 실수령은 3,013원이다(부가세 10% 빼고 플레이 수수료 15% 뗀 값).
 * 예전 한도(합계 2,200회)로는 최악 13,200원이라 **얼마를 받아도 적자가 날 수 있었다.**
 * 이 관계는 `tests/be/logic/pricing.test.ts` 가 지킨다 — 한도만 올리면 실패한다.
 *
 * 무료 숫자의 근거 — **맛보기이되 습관은 건드리지 않는다.**
 *  - 식단 사진 100회는 그대로 둔다. 하루 세 끼 기록이 이 앱의 **매일 쓰는 습관**이고,
 *    여기를 조이면 결제가 아니라 이탈이 난다. (무료 한 명 최악 원가 604원은 감수한다.)
 *  - 코치·자세·체성분은 3회 = "어떤 건지 보고 판단할 만큼". 이게 결제 이유가 된다.
 */
export const MONTHLY_LIMITS: Record<AiTier, Record<AiFeatureId, number>> = {
  // 라이트 — AI 없음. 0회라 원가도 0원.
  none: {
    coach: 0,
    "meal-scan": 0,
    "body-scan": 0,
    "equipment-scan": 0,
    posture: 0,
    trainer: 0,
    "diet-coach": 0,
  },
  free: {
    coach: 3,
    "meal-scan": 100,
    "body-scan": 3,
    "equipment-scan": 10,
    posture: 3,
    // 맛보기 한 번 — 어떤 건지 보고 판단할 만큼.
    trainer: 1,
    "diet-coach": 1,
  },
  premium: {
    coach: 60, // 하루 2회
    "meal-scan": 160, // 하루 5끼 이상
    "body-scan": 20,
    "equipment-scan": 40,
    posture: 40,
    trainer: 30, // 매일 한 번
    "diet-coach": 30, // 매일 저녁 한 번
  },
};

/** 그 등급이 한도를 **전부** 썼을 때의 월 원가(원). 가격이 이걸 넘어야 장사가 된다. */
export function worstCaseMonthlyCostKrw(tier: AiTier): number {
  return AI_FEATURES.reduce(
    (sum, f) => sum + MONTHLY_LIMITS[tier][f.id] * COST_PER_CALL_KRW[f.id],
    0,
  );
}

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

/**
 * AI 가 없는 요금제(라이트)에서 AI 를 누르면 — "0회 다 쓰셨어요"가 아니라 왜 없는지와 앞으로를 말한다.
 * 사용자 결정(2026-10-01): 나머지 요금제(AI 포함)는 아직 준비 중.
 */
export const NO_AI_MESSAGE =
  "990원 라이트 요금제에는 AI 기능이 없어요. AI가 들어간 요금제는 아직 준비 중이에요.";

/** 남은 횟수 안내 — 얼마 안 남았을 때만 띄운다(멀쩡할 때 숫자를 보여줄 이유가 없다). */
export const LOW_QUOTA_RATIO = 0.2;

export function shouldWarnLowQuota(state: QuotaState): boolean {
  return state.allowed && state.remaining <= Math.ceil(state.limit * LOW_QUOTA_RATIO);
}

export function lowQuotaMessage(state: QuotaState): string {
  return `${featureLabel(state.feature)} 이번 달 ${state.remaining}회 남았어요.`;
}
