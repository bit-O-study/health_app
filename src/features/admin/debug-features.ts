/**
 * 디버그 기능 레지스트리 — 순수 모듈(server-only 없음 → 단위 테스트 가능).
 * DB 접근이 필요한 게이트 함수는 `debug-features.server.ts` 에 있다.
 *
 * 🔴 새 디버그(개발/진단) 기능을 만들 때는 아래 DEBUG_FEATURES 에 { id, label } 로
 *    등록하고, 노출부에서 `isDebugFeatureEnabled(id)`(server 파일)로 게이트한다.
 *    그러면 관리자 설정(/admin/settings)에 '기능별 온오프' 토글이 자동으로 생기고,
 *    디버그 계정(관리자)에게만, 켜진 기능만 보인다. 자세한 규칙은 docs/DEBUG-FEATURES.md.
 */
export const DEBUG_FEATURES = [
  { id: "pet", label: "펫(늑대 키우기 — 관리자 공개 후 이용)" },
  {
    id: "steps",
    label: "걸음수 진단칩(🩺 앱UA·브릿지·플러그인·권한·레코드…)",
  },
  {
    id: "equipment-scan",
    label: "기구 사진 분석(📷 기구 식별 + 가능한 운동, Claude 비전)",
  },
  {
    id: "helssu-coach",
    label: "짐꾼쌤 탭(🧑‍🏫 AI 코치 — 기구검색·운동/식단 분석·AI 다짐·자세분석)",
  },
  {
    id: "ai-trainer",
    label: "AI 트레이너 탭(✨ 내 상태로 오늘의 운동 제안 → 적용하면 오늘만 변경)",
  },
  {
    id: "fit",
    label: "맞춤 운동 앱(💪 세부 부위 추천·부위·균형 — 라이트 이상은 스위치와 상관없이 보임)",
  },
  {
    id: "diet-photo-ai",
    label: "AI 식단 사진 인식(🍱 사진 → 음식·칼로리 자동 추정, NVIDIA 무료 비전)",
  },
] as const;

export type DebugFeatureId = (typeof DEBUG_FEATURES)[number]["id"];

export const debugSettingKey = (id: string) => `debug.${id}`;

/**
 * 저장된 app_settings 값을 '켜짐 여부'로 해석한다.
 * 기본은 켜짐 — 명시적으로 false 를 기록한 경우에만 꺼짐(미설정/null/그 외 = 켜짐).
 */
export function debugValueEnabled(value: unknown): boolean {
  return value !== false;
}

/**
 * 기능 노출 범위 — 숨김(아무에게도 X) / debug(디버그 계정만) / lite(디버그 계정 + 라이트 이상 회원 먼저)
 * / public(전체 공개). 관리자 설정에서 기능별로 이 4단계를 고른다.
 * lite 는 2026-10-02 라이트 혜택 E1 "새 기능 먼저 써 보기" — 공개 전 기능을 990원 회원에게 먼저 연다.
 */
export type DebugVisibility = "hidden" | "debug" | "lite" | "public";

export const DEBUG_VISIBILITIES: readonly DebugVisibility[] = [
  "hidden",
  "debug",
  "lite",
  "public",
];

export const DEBUG_VISIBILITY_LABEL: Record<DebugVisibility, string> = {
  hidden: "숨김",
  debug: "디버그 계정만",
  lite: "라이트 먼저",
  public: "전체 공개",
};

export function isDebugVisibility(v: unknown): v is DebugVisibility {
  return v === "hidden" || v === "debug" || v === "lite" || v === "public";
}

/**
 * app_settings 값 → 노출 범위. 기본 'debug'(디버그 계정만).
 * 하위호환: 과거 boolean false(=꺼짐)는 'hidden' 으로 본다.
 */
export function debugValueToVisibility(value: unknown): DebugVisibility {
  if (value === "public") return "public";
  if (value === "lite") return "lite";
  if (value === false || value === "hidden") return "hidden";
  return "debug";
}

/** app_settings['debug.accounts'] 저장 키. */
export const DEBUG_ACCOUNTS_KEY = "debug.accounts";

/** 저장된 값(무엇이든)을 정규화된 이메일 목록으로 — 소문자·trim·중복/빈값 제거. */
export function normalizeDebugAccounts(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of value) {
    if (typeof v !== "string") continue;
    const e = v.trim().toLowerCase();
    if (e && !seen.has(e)) {
      seen.add(e);
      out.push(e);
    }
  }
  return out;
}

/** 목록에 이메일 추가(정규화·중복제거). 잘못된 이메일이면 null(호출부에서 에러 처리). */
export function addDebugAccount(list: unknown, email: string): string[] | null {
  const e = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  return normalizeDebugAccounts([...normalizeDebugAccounts(list), e]);
}

/** 목록에서 이메일 제거. */
export function removeDebugAccount(list: unknown, email: string): string[] {
  const e = email.trim().toLowerCase();
  return normalizeDebugAccounts(list).filter((x) => x !== e);
}
