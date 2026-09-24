/**
 * 세트 방식(set scheme) — 순수 로직.
 *
 * 지금까지 루틴의 한 줄은 `sets · reps · weight` **숫자 세 개**뿐이라
 * "5세트 × 10회 같은 무게"(스트레이트) 말고는 표현할 방법이 없었다.
 * 드롭·피라미드·탑세트/백오프처럼 **세트마다 무게와 횟수가 다른** 방식은
 * 여기서 `expandSets()` 로 **세트 목록으로 펼쳐서** 운동모드·기록이 그대로 쓴다.
 *
 * 저장은 가볍게(스킴 이름 + 파라미터 몇 개), 펼치기는 이 파일에서 한 번만 한다.
 * — 세트별 배열을 통째로 저장하면 루틴 편집·추천·트레이너 처방 세 경로가
 *   전부 배열을 만들어야 해서 어긋나기 쉽다.
 */

/** 운동 한 줄의 세트 방식. */
export type SetScheme =
  | "straight" // 일반(스트레이트) — 같은 무게로 N세트
  | "drop" // 드롭세트 — 마지막 세트 뒤에 무게를 낮춰 연속 수행
  | "pyramid" // 피라미드 — 무게 ↑ 횟수 ↓
  | "reverse_pyramid" // 역피라미드 — 첫 세트가 가장 무겁다
  | "top_backoff" // 탑세트 + 백오프 — 최고 무게 1세트 뒤 가벼운 세트들
  | "cluster" // 클러스터 — 한 세트를 짧은 휴식으로 쪼갠다
  | "rest_pause" // 레스트-포즈 — 실패 지점에서 짧게 쉬고 이어서
  | "amrap"; // 마지막 세트는 가능한 만큼(AMRAP)

export const SET_SCHEMES: readonly SetScheme[] = [
  "straight",
  "drop",
  "pyramid",
  "reverse_pyramid",
  "top_backoff",
  "cluster",
  "rest_pause",
  "amrap",
] as const;

/** 화면에 보여줄 이름과 한 줄 설명. */
export const SET_SCHEME_LABELS: Record<
  SetScheme,
  { name: string; hint: string }
> = {
  straight: { name: "일반", hint: "같은 무게로 정해진 세트만큼" },
  drop: { name: "드롭세트", hint: "마지막 세트 뒤 무게를 낮춰 쉬지 않고 이어서" },
  pyramid: { name: "피라미드", hint: "세트마다 무게를 올리고 횟수를 줄인다" },
  reverse_pyramid: { name: "역피라미드", hint: "첫 세트가 가장 무겁고 점점 가볍게" },
  top_backoff: { name: "탑세트+백오프", hint: "최고 무게 한 세트 뒤 가벼운 세트" },
  cluster: { name: "클러스터", hint: "한 세트를 짧은 휴식으로 나눠서" },
  rest_pause: { name: "레스트-포즈", hint: "실패 지점에서 짧게 쉬고 이어서" },
  amrap: { name: "AMRAP", hint: "마지막 세트는 가능한 만큼" },
};

/** 스킴별 조절값. 없으면 아래 기본값을 쓴다. */
export type SchemeParams = {
  /** 드롭 횟수(드롭세트) — 마지막 세트 뒤에 몇 번 더 내릴지. */
  dropCount?: number;
  /** 드롭 때마다 낮출 비율 %(드롭세트·백오프). */
  dropPct?: number;
  /** 세트마다 바꿀 무게 비율 %(피라미드·역피라미드). */
  stepPct?: number;
  /** 세트마다 바꿀 횟수(피라미드는 줄이고 역피라미드는 늘린다). */
  stepReps?: number;
  /** 탑세트 무게(없으면 기준 무게를 탑세트로 본다). */
  topWeightKg?: number;
  /** 백오프 세트 수(탑세트+백오프). */
  backoffSets?: number;
  /** 클러스터 한 덩어리의 횟수. */
  clusterReps?: number;
  /** 클러스터·레스트-포즈의 짧은 휴식(초). */
  shortRestSec?: number;
  /** 레스트-포즈 추가 횟수. */
  pauseCount?: number;
  /** 세트 사이 휴식(초). 스킴과 무관한 공통값. */
  restSec?: number;
  /** 무게를 맞출 단위(kg). 바벨 2.5, 덤벨·머신 1 등. */
  plateStepKg?: number;
};

/** 펼쳐진 세트 한 줄 — 운동모드가 그대로 보여주고 기록한다. */
export type PlannedSet = {
  /** 1부터. 드롭·클러스터처럼 이어서 하는 것도 각각 한 줄을 차지한다. */
  index: number;
  /** 화면 라벨 — "3세트", "탑세트", "드롭 2" 처럼. */
  label: string;
  kind: "work" | "drop" | "top" | "backoff" | "cluster" | "rest_pause";
  /** 목표 횟수. AMRAP 은 null 이고 `amrap: true`. */
  reps: number | null;
  amrap: boolean;
  /** 목표 무게(kg). 맨몸이면 null. */
  weightKg: number | null;
  /** 이 세트를 끝내고 쉬는 시간(초). 드롭·클러스터는 짧거나 0. */
  restSec: number;
};

export const DEFAULTS = {
  dropCount: 2,
  dropPct: 20,
  stepPct: 10,
  stepReps: 2,
  backoffSets: 2,
  clusterReps: 3,
  shortRestSec: 20,
  pauseCount: 2,
  restSec: 90,
  plateStepKg: 2.5,
} as const;

/** 무게를 원판 단위로 맞춘다. 0 이하로는 내려가지 않는다. */
export function roundToPlate(kg: number, stepKg: number = DEFAULTS.plateStepKg): number {
  if (!Number.isFinite(kg) || stepKg <= 0) return 0;
  const rounded = Math.round(kg / stepKg) * stepKg;
  // 부동소수 찌꺼기 제거(2.5 배수에서 0.30000000000000004 같은 값 방지).
  return Math.max(stepKg, Math.round(rounded * 100) / 100);
}

function scale(
  weightKg: number | null,
  pct: number,
  stepKg: number,
): number | null {
  if (weightKg === null) return null;
  return roundToPlate((weightKg * pct) / 100, stepKg);
}

export type ExpandInput = {
  scheme: SetScheme;
  /** 루틴에 적힌 세트 수. 스킴에 따라 '작업 세트' 수로 쓰인다. */
  sets: number;
  reps: number;
  weightKg: number | null;
  params?: SchemeParams;
};

/**
 * 루틴 한 줄 → 실제로 수행할 세트 목록.
 *
 * 규칙:
 * - 드롭·클러스터·레스트-포즈처럼 **쉬지 않고 이어 가는** 구간은 `restSec` 이 짧거나 0이다.
 * - 맨몸 운동(weightKg = null)은 무게를 계산하지 않고 횟수만 조절한다.
 * - 횟수는 1 밑으로 내려가지 않는다.
 */
export function expandSets(input: ExpandInput): PlannedSet[] {
  const p = { ...DEFAULTS, ...(input.params ?? {}) };
  const sets = Math.max(1, Math.trunc(input.sets));
  const reps = Math.max(1, Math.trunc(input.reps));
  const base = input.weightKg;
  const step = p.plateStepKg;
  const rest = Math.max(0, Math.trunc(p.restSec));
  const short = Math.max(0, Math.trunc(p.shortRestSec));
  const out: PlannedSet[] = [];
  const push = (s: Omit<PlannedSet, "index">) =>
    out.push({ ...s, index: out.length + 1 });

  const work = (i: number, weightKg: number | null, r: number, restSec = rest) =>
    push({
      label: `${i}세트`,
      kind: "work",
      reps: Math.max(1, r),
      amrap: false,
      weightKg,
      restSec,
    });

  switch (input.scheme) {
    case "straight": {
      for (let i = 1; i <= sets; i += 1) work(i, base, reps, i === sets ? 0 : rest);
      break;
    }

    case "amrap": {
      for (let i = 1; i < sets; i += 1) work(i, base, reps);
      push({
        label: "마지막 · 가능한 만큼",
        kind: "work",
        reps: null,
        amrap: true,
        weightKg: base,
        restSec: 0,
      });
      break;
    }

    case "drop": {
      // 작업 세트를 모두 하고, 마지막 세트 뒤에 무게를 낮춰 쉬지 않고 이어 간다.
      for (let i = 1; i <= sets; i += 1) work(i, base, reps, i === sets ? 0 : rest);
      let w = base;
      for (let d = 1; d <= Math.max(1, Math.trunc(p.dropCount)); d += 1) {
        w = scale(w, 100 - p.dropPct, step);
        push({
          label: `드롭 ${d}`,
          kind: "drop",
          reps: Math.max(1, reps),
          amrap: false,
          weightKg: w,
          // 드롭 사이엔 쉬지 않는다. 마지막 드롭 뒤에도 세트가 없으니 0.
          restSec: 0,
        });
      }
      break;
    }

    case "pyramid": {
      // 세트마다 무게 ↑ 횟수 ↓. 기준 무게·횟수는 **첫 세트**.
      for (let i = 0; i < sets; i += 1) {
        const w = scale(base, 100 + p.stepPct * i, step);
        work(i + 1, w, reps - p.stepReps * i, i === sets - 1 ? 0 : rest);
      }
      break;
    }

    case "reverse_pyramid": {
      // 첫 세트가 가장 무겁다. 기준 무게·횟수도 **첫 세트**.
      for (let i = 0; i < sets; i += 1) {
        const w = scale(base, 100 - p.stepPct * i, step);
        work(i + 1, w, reps + p.stepReps * i, i === sets - 1 ? 0 : rest);
      }
      break;
    }

    case "top_backoff": {
      const top = p.topWeightKg ?? base;
      push({
        label: "탑세트",
        kind: "top",
        reps,
        amrap: false,
        weightKg: top === null ? null : roundToPlate(top, step),
        restSec: rest,
      });
      const backoff = Math.max(1, Math.trunc(p.backoffSets));
      const w = scale(top, 100 - p.dropPct, step);
      for (let i = 1; i <= backoff; i += 1) {
        push({
          label: `백오프 ${i}`,
          kind: "backoff",
          // 무게를 낮췄으니 횟수는 늘려 잡는다.
          reps: reps + p.stepReps,
          amrap: false,
          weightKg: w,
          restSec: i === backoff ? 0 : rest,
        });
      }
      break;
    }

    case "cluster": {
      // 한 세트를 clusterReps 덩어리로 쪼개고 사이에 짧게 쉰다.
      const chunk = Math.max(1, Math.trunc(p.clusterReps));
      for (let i = 1; i <= sets; i += 1) {
        const pieces = Math.max(1, Math.ceil(reps / chunk));
        for (let c = 1; c <= pieces; c += 1) {
          const done = chunk * (c - 1);
          const last = c === pieces;
          push({
            label: `${i}세트 · ${c}/${pieces}`,
            kind: "cluster",
            reps: Math.max(1, Math.min(chunk, reps - done)),
            amrap: false,
            weightKg: base,
            restSec: last ? (i === sets ? 0 : rest) : short,
          });
        }
      }
      break;
    }

    case "rest_pause": {
      for (let i = 1; i <= sets; i += 1) work(i, base, reps, i === sets ? 0 : rest);
      for (let c = 1; c <= Math.max(1, Math.trunc(p.pauseCount)); c += 1) {
        push({
          label: `레스트-포즈 ${c}`,
          kind: "rest_pause",
          reps: null,
          amrap: true,
          weightKg: base,
          // 짧게 쉬고 곧바로 이어 간다. 마지막은 0.
          restSec: c === Math.max(1, Math.trunc(p.pauseCount)) ? 0 : short,
        });
      }
      break;
    }
  }

  return out;
}

/**
 * 계획 볼륨(kg). 무게가 없는 세트(맨몸)와 AMRAP 은 0으로 센다 —
 * 실제 수행 기록이 들어오면 그걸로 다시 계산한다.
 */
export function plannedVolumeKg(sets: readonly PlannedSet[]): number {
  const total = sets.reduce(
    (sum, s) => sum + (s.weightKg ?? 0) * (s.reps ?? 0),
    0,
  );
  return Math.round(total * 10) / 10;
}

/** 스킴 이름이 우리가 아는 값인지(DB·외부 입력 방어). */
export function isSetScheme(value: unknown): value is SetScheme {
  return typeof value === "string" && (SET_SCHEMES as readonly string[]).includes(value);
}

/** 모르는 값이 오면 조용히 일반 세트로 — 옛 데이터는 전부 스트레이트였다. */
export function toSetScheme(value: unknown): SetScheme {
  return isSetScheme(value) ? value : "straight";
}

/**
 * 여러 운동을 번갈아 하는 묶음(슈퍼세트·트라이세트·자이언트세트).
 * 운동 줄 자체가 여러 개라 스킴이 아니라 **묶음 종류**로 따로 둔다.
 */
export type GroupKind = "superset" | "triset" | "giant";

export const GROUP_LABELS: Record<GroupKind, string> = {
  superset: "슈퍼세트",
  triset: "트라이세트",
  giant: "자이언트세트",
};

/** 묶음에 든 운동 수로 종류를 정한다(2개 슈퍼·3개 트라이·4개 이상 자이언트). */
export function groupKindFor(count: number): GroupKind | null {
  if (count < 2) return null;
  if (count === 2) return "superset";
  if (count === 3) return "triset";
  return "giant";
}
