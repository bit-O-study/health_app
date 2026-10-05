/**
 * 카메라로 운동 횟수 세기 — 순수 모듈(2026-09-30, `docs/rep-counter-review-2026-09-30.html`).
 *
 * MediaPipe 자세 인식이 준 관절 좌표 → 관절 각도 → 부드럽게 다듬기 → 내려감·올라옴 판정.
 * 화면·카메라와 떼어 둔 이유는 **이 판정이 곧 기능**이라서다. 실제 카메라는 자동 테스트로
 * 못 돌리니, 좌표 기록만으로 "몇 번 세는가"를 여기서 전부 검증한다.
 *
 * 🔴 덜 내려간 동작은 세지 않는다(사용자 결정). 내려감 기준 각도까지 가야 1회다.
 * 🔴 들어가는 기준(내려감)과 나오는 기준(올라옴)을 **다르게** 둔다. 한 기준으로 판정하면
 *    그 각도 근처에서 몸이 흔들릴 때 한 번 동작을 여러 번 센다.
 */

/** MediaPipe Pose 관절점 하나(0~1 정규화 좌표). visibility 는 0~1. */
export type PosePoint = { x: number; y: number; visibility?: number };

export type RepKind = "squat" | "pushup";

/** MediaPipe Pose(33점) 번호 — 왼쪽/오른쪽 한 벌씩. */
const POSE = {
  shoulder: [11, 12],
  elbow: [13, 14],
  wrist: [15, 16],
  hip: [23, 24],
  knee: [25, 26],
  ankle: [27, 28],
} as const;

type Joint = keyof typeof POSE;

export type RepSpec = {
  kind: RepKind;
  label: string;
  /** 각도를 재는 세 관절(가운데가 꼭짓점). */
  joints: readonly [Joint, Joint, Joint];
  /** 이 각도 **이하**로 내려가야 '내려감'. */
  downDeg: number;
  /** 이 각도 **이상**으로 올라와야 '올라옴' — 내려감 뒤에 오면 1회. */
  upDeg: number;
  /** 시작 전 안내 문구. */
  startHint: string;
  /** 몸이 안 보일 때 안내 문구. */
  setupHint: string;
};

/**
 * 기준 각도 — 화면 속 2D 각도라 실제 관절 각도보다 조금 크게 나온다(폰이 정확히 옆이
 * 아닐 때). 보고서 그림의 90°/160° 는 원리 예시이고, 여기 값은 "평행까지 앉은 스쿼트"와
 * "가슴이 바닥 가까이 간 푸시업"을 놓치지 않는 선이다. 실기기에서 조정한다.
 */
export const REP_SPECS: Record<RepKind, RepSpec> = {
  squat: {
    kind: "squat",
    label: "스쿼트",
    joints: ["hip", "knee", "ankle"],
    downDeg: 100,
    upDeg: 160,
    startHint: "일어선 자세로 시작하세요.",
    setupHint: "폰을 옆에 세우고, 머리부터 발끝까지 화면에 들어오게 서 주세요.",
  },
  pushup: {
    kind: "pushup",
    label: "푸시업",
    joints: ["shoulder", "elbow", "wrist"],
    downDeg: 100,
    upDeg: 150,
    startHint: "팔을 편 자세로 시작하세요.",
    setupHint: "폰을 바닥 옆에 세우고, 머리부터 발끝까지 옆모습이 보이게 해 주세요.",
  },
};

/**
 * 카메라로 셀 수 있는 운동. 옆에서 보면 무릎·팔꿈치 각도가 크게 바뀌는 것만 넣는다.
 * (한 다리 스쿼트·다이아몬드가 아닌 변형까지 넓히려면 실기기 확인 뒤에.)
 */
const KIND_BY_EXERCISE: Record<string, RepKind> = {
  squat: "squat",
  "goblet-squat": "squat",
  "sumo-squat": "squat",
  "box-squat": "squat",
  "front-squat": "squat",
  "push-up": "pushup",
  "diamond-pushup": "pushup",
};

export function repKindFor(exerciseId: string): RepKind | null {
  return KIND_BY_EXERCISE[exerciseId] ?? null;
}

/** 세 점의 사잇각(°, 0~180). b 가 꼭짓점. 점이 겹치면 null. */
export function jointAngle(a: PosePoint, b: PosePoint, c: PosePoint): number | null {
  const v1x = a.x - b.x;
  const v1y = a.y - b.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const n1 = Math.hypot(v1x, v1y);
  const n2 = Math.hypot(v2x, v2y);
  if (n1 === 0 || n2 === 0) return null;
  const cos = Math.min(1, Math.max(-1, (v1x * v2x + v1y * v2y) / (n1 * n2)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** 이보다 덜 보이는 관절은 믿지 않는다(가려졌거나 화면 밖). */
export const MIN_VISIBILITY = 0.5;

/**
 * 한 장면의 관절 좌표 → 그 운동의 관절 각도. 옆모습이라 한쪽은 가려지므로, **더 잘 보이는
 * 쪽**을 고른다. 양쪽 다 안 보이면 null(= 몸이 화면에 다 안 들어왔다).
 */
export function angleFromPose(
  points: readonly PosePoint[] | null | undefined,
  spec: RepSpec,
): number | null {
  if (!points) return null;
  let best: { vis: number; angle: number } | null = null;
  for (const side of [0, 1] as const) {
    const [a, b, c] = spec.joints.map((j) => points[POSE[j][side]]);
    if (!a || !b || !c) continue;
    const vis = Math.min(a.visibility ?? 1, b.visibility ?? 1, c.visibility ?? 1);
    if (vis < MIN_VISIBILITY) continue;
    const angle = jointAngle(a, b, c);
    if (angle === null) continue;
    if (!best || vis > best.vis) best = { vis, angle };
  }
  return best?.angle ?? null;
}

/**
 * 판정 상태.
 * - `waiting`: 아직 '올라온 자세'를 한 번도 못 봤다. 이 상태에선 세지 않는다 — 카메라 앞에
 *   쪼그려 앉아 폰을 세우다가 일어서는 동작이 1회로 세지면 안 된다.
 * - `up` / `down`: 지금 자세.
 */
export type RepPhase = "waiting" | "up" | "down";

export type RepState = {
  phase: RepPhase;
  count: number;
  /** 다듬은 각도. 아직 못 봤으면 null. */
  smoothed: number | null;
  /** 몸이 화면에 다 보이는가(마지막 장면 기준). */
  visible: boolean;
};

export const INITIAL_REP_STATE: RepState = {
  phase: "waiting",
  count: 0,
  smoothed: null,
  visible: false,
};

/** 흔들림 다듬기 비율(지수이동평균). 클수록 새 값을 빨리 따라간다. 15~20Hz 기준. */
export const SMOOTHING = 0.5;

/**
 * 장면 하나를 반영한다. `counted` 가 true 면 이번 장면에서 1회가 늘었다(음성 안내용).
 *
 * 🔴 몸이 안 보이는 장면(angle=null)은 **상태를 건드리지 않는다.** 잠깐 가려졌다고
 *    '올라옴'으로 치거나 세던 걸 버리면, 내려간 채 가려진 동작이 두 번 세지거나 사라진다.
 */
export function stepRep(
  state: RepState,
  angle: number | null,
  spec: RepSpec,
): { state: RepState; counted: boolean } {
  if (angle === null) {
    return { state: { ...state, visible: false }, counted: false };
  }
  const smoothed =
    state.smoothed === null ? angle : state.smoothed + (angle - state.smoothed) * SMOOTHING;
  let { phase, count } = state;
  let counted = false;
  if (smoothed >= spec.upDeg) {
    if (phase === "down") {
      count += 1;
      counted = true;
    }
    phase = "up";
  } else if (smoothed <= spec.downDeg && phase === "up") {
    phase = "down";
  }
  return { state: { phase, count, smoothed, visible: true }, counted };
}

/** 화면 안내 문구 — 지금 무엇을 하면 되는지. */
export function repStatusText(state: RepState, spec: RepSpec): string {
  if (!state.visible) return spec.setupHint;
  if (state.phase === "waiting") return `좋아요. ${spec.startHint}`;
  if (state.phase === "down") return "좋아요, 올라오세요.";
  return state.count === 0 ? "시작하세요!" : "계속하세요.";
}

/** 횟수 칸에 넣을 값 — 스크러버 범위(1~100) 안으로. 0회면 넣지 않는다(null). */
export function repsToApply(count: number): number | null {
  if (!Number.isFinite(count) || count < 1) return null;
  return Math.min(100, Math.floor(count));
}
