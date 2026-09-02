/**
 * 건강 연동 항목표 — 로드맵 6.1.
 *
 * 🔴 **한꺼번에 다 달라고 하지 않는다.** 예전엔 걸음수 하나뿐이라 문제가 없었지만,
 * 체중·운동·수면까지 늘어난 마당에 진입하자마자 전부 요청하면 사용자는 무엇에 왜
 * 동의하는지 모른 채 거절한다. 한 번 거절당하면 그 뒤로는 설정 앱을 직접 열어야 해서
 * 되돌리기도 어렵다. 그래서 **켠 항목의 권한만** 그때 요청한다(점진적 권한).
 *
 * 표를 코드가 아니라 **데이터**로 둔다 — 화면·권한 요청·마지막 동기화 표시가 같은 표를
 * 읽으므로, 항목을 추가할 때 한 곳만 고치면 셋이 함께 따라온다.
 *
 * `status` 를 반드시 정직하게 적는다. **아직 못 읽는 항목의 권한을 미리 받아 두지
 * 않는다** — 쓰지도 않을 데이터에 동의를 받는 건 사용자를 속이는 것이고, 스토어 심사
 * 에서도 "선언한 권한을 실제로 쓰는가"를 본다.
 */

/** 항목 id. 저장(마지막 동기화)과 화면이 같은 키를 쓴다. */
export type HealthFeatureId =
  | "steps"
  | "body"
  | "workout"
  | "run"
  | "heartRate"
  | "sleep";

export type HealthFeatureStatus =
  /** 지금 동작한다 — 권한을 요청하고 실제로 읽거나 쓴다. */
  | "ready"
  /** 아직 안 붙었다 — 화면에는 보이되 권한을 요청하지 않는다. */
  | "planned";

export type HealthFeature = {
  id: HealthFeatureId;
  label: string;
  /** 왜 필요한지 — 동의를 구하려면 이유를 먼저 말해야 한다. */
  why: string;
  /** Health Connect 읽기 권한(레코드 종류 이름). */
  read: readonly string[];
  /** Health Connect 쓰기 권한. */
  write: readonly string[];
  status: HealthFeatureStatus;
};

export const HEALTH_FEATURES: readonly HealthFeature[] = [
  {
    id: "steps",
    label: "걸음 수",
    why: "캘린더의 하루 활동량과 소비 칼로리에 반영해요.",
    read: ["Steps"],
    write: [],
    status: "ready",
  },
  {
    id: "body",
    label: "체중 · 체성분",
    why: "체중계에서 잰 값을 옮겨 적지 않아도 체형 그래프가 이어져요.",
    // 체지방률·근육량은 별도 레코드다 — 체중만 읽으면 그래프의 두 줄이 비어 있게 된다.
    read: ["Weight", "BodyFat", "LeanBodyMass"],
    write: [],
    status: "ready",
  },
  {
    id: "workout",
    label: "운동 세션 내보내기",
    why: "여기서 한 운동을 삼성헬스·구글핏에도 남겨요.",
    read: [],
    write: ["ExerciseSession"],
    status: "planned",
  },
  {
    id: "run",
    label: "러닝 거리 · 칼로리 내보내기",
    why: "런닝모드 기록을 다른 건강 앱에서도 볼 수 있어요.",
    read: [],
    write: ["Distance", "TotalCaloriesBurned"],
    status: "planned",
  },
  {
    id: "heartRate",
    label: "심박수",
    why: "운동 강도를 실제 심박으로 가늠해요.",
    read: ["HeartRate"],
    write: [],
    status: "planned",
  },
  {
    id: "sleep",
    label: "수면",
    why: "잘 못 잔 날은 회복을 우선하도록 추천을 조절해요.",
    read: ["SleepSession"],
    write: [],
    status: "planned",
  },
] as const;

export function getHealthFeature(
  id: HealthFeatureId,
): HealthFeature | undefined {
  return HEALTH_FEATURES.find((f) => f.id === id);
}

/** 지금 실제로 동작하는 항목만 — 권한 요청은 여기 있는 것만 대상으로 한다. */
export function readyFeatures(): HealthFeature[] {
  return HEALTH_FEATURES.filter((f) => f.status === "ready");
}

export function isHealthFeatureId(v: unknown): v is HealthFeatureId {
  return (
    typeof v === "string" && HEALTH_FEATURES.some((f) => f.id === v)
  );
}

/**
 * 고른 항목들이 필요로 하는 권한 묶음. 같은 권한을 두 항목이 함께 쓰면 **한 번만** 넣는다
 * — 중복해서 넘기면 기기에 따라 요청이 통째로 거절된다.
 *
 * `planned` 항목은 **조용히 빠진다.** 실수로 넘겨도 아직 안 쓰는 권한을 요구하지 않게.
 */
export function permissionsFor(ids: readonly HealthFeatureId[]): {
  read: string[];
  write: string[];
} {
  const read = new Set<string>();
  const write = new Set<string>();
  for (const id of ids) {
    const f = getHealthFeature(id);
    if (!f || f.status !== "ready") continue;
    for (const r of f.read) read.add(r);
    for (const w of f.write) write.add(w);
  }
  return { read: [...read], write: [...write] };
}

/**
 * 허용된 권한 목록(기기가 돌려준 것)으로 그 항목이 쓸 수 있는 상태인지 판정.
 *
 * 🔴 **하나라도 빠지면 '연결됨'이 아니다.** Health Connect 권한창은 항목별로 따로
 * 체크할 수 있어서, 체중만 허용하고 체지방은 뺀 채로 나올 수 있다. 그걸 '연결됨'으로
 * 보이면 사용자는 다 되는 줄 알고 기다리는데 그래프의 한 줄은 영영 안 채워진다.
 */
export function isFeatureGranted(
  feature: HealthFeature,
  granted: readonly string[],
): boolean {
  const need = [...feature.read, ...feature.write];
  if (need.length === 0) return false;
  // 기기는 "android.permission.health.READ_STEPS" 처럼 접두사가 붙은 문자열을 주기도 한다.
  // 종류 이름이 어디든 들어 있으면 허용된 것으로 본다(대소문자·구분자 차이를 흡수).
  const norm = granted.map((g) => g.toLowerCase().replace(/[^a-z]/g, ""));
  return need.every((n) => {
    const key = n.toLowerCase().replace(/[^a-z]/g, "");
    return norm.some((g) => g.includes(key));
  });
}
