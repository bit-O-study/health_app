/**
 * 부위별 회복 · 내 몸 기준(2026-10-14) — 순수 로직.
 *
 * "오늘 했으면 회복" 이 아니라 **내가 소화할 수 있는 양에 견줘 오늘 얼마나 했는가**로 회복 시간을 정한다
 * ("내가 100 을 드는데 20 으로 깔짝 했다고 회복해야 돼? 이건 아니잖아").
 *
 * 1) 세트의 힘든 정도 — 그 무게로 내가 할 수 있는 횟수(내 예상 최대 1RM 에서 거꾸로) 중 몇 회를 했나.
 *    1RM 100kg 인 사람의 20kg 10회는 120회 중 10회라 거의 0, 80kg 6회는 7.5회 중 6회라 힘든 세트.
 * 2) 내 예상 최대 — 최근 120일 기록의 가장 높은 값. 기록이 없는 종목은 몸(체중·성별·경력·골격근량)으로 어림한다.
 * 3) 내 소화량 — 부위별로 평소 한 번에 해 온 힘든 세트 수(최근 6주, 위쪽 절반 평균).
 *    기록이 모자라면 경력·골격근량으로 정한 바닥값.
 * 4) 오늘 한 양 ÷ 내 소화량 = 부하. 4분의 1이 안 되면 회복이 필요 없고, 1(평소 한 번 분량)이면
 *    근육 크기의 최대 시간, 그 사이는 비례한다.
 */
import { estimate1RM, type ProgressRecord } from "@/features/routine/progress";
import { PART_PREFIX, setShare, type PartId, type StimulusOf } from "@/features/routine/fit";

/** 한 세트(무게·횟수). 무게가 없으면 맨몸. */
export type LoadSet = { reps: number; weightKg: number | null };

/** 내 몸 기준 — 종목별 예상 최대·맨몸 최고 횟수·부위별 소화량. */
export type RecoveryProfile = {
  /** 이 종목에서 내가 한 번 들 수 있는 무게(kg). 모르면 null. */
  oneRmOf: (exerciseId: string) => number | null;
  /** 맨몸 종목에서 한 세트에 해 본 가장 많은 횟수. 모르면 null. */
  bestRepsOf: (exerciseId: string) => number | null;
  /** 부위별로 한 번에 소화하는 힘든 세트 수. */
  capacity: Record<PartId, number>;
};

/** 무게도 기록도 없어 힘든 정도를 모를 때 — 보통의 본세트로 본다. */
export const UNKNOWN_HARDNESS = 0.6;
/** 부하가 이만큼이 안 되면(내 소화량의 4분의 1 미만) 회복이 필요 없다. */
export const NO_RECOVERY_BELOW = 0.25;
/** 소화량을 넘겨 해도 회복 시간은 이 배수까지만 늘린다. */
export const MAX_LOAD_RATIO = 1.3;
/** 경력별 바닥 소화량(힘든 세트) — 기록이 모자랄 때. */
export const CAPACITY_FLOOR = { beginner: 4.5, intermediate: 7, advanced: 9.5 } as const;
/** 소화량을 재는 기간(일)과, 회복을 따지는 최근 며칠(소화량 계산에서 뺀다). */
export const CAPACITY_WINDOW_DAYS = 42;
export const CAPACITY_SKIP_DAYS = 5;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const seoulDay = (ms: number) => new Date(ms + 9 * 3_600_000).toISOString().slice(0, 10);

/**
 * 한 세트가 얼마나 힘들었나(0~1) — 그 무게로 할 수 있는 횟수 중 몇 회를 했는가.
 * 한계에서 멀수록 피로가 훨씬 적어서(절반만 한 세트는 절반보다 덜 힘들다) 1.5 제곱으로 누른다.
 */
export function setHardness(set: LoadSet, oneRm: number | null, bestReps: number | null = null): number {
  if (!(set.reps > 0)) return 0;
  const w = set.weightKg ?? 0;
  if (w > 0 && oneRm && oneRm > 0) {
    // Epley 를 거꾸로: 이 무게로 할 수 있는 횟수 = 30 × (1RM ÷ 무게 − 1).
    const possible = Math.max(1, 30 * (oneRm / w - 1));
    return Math.pow(clamp(set.reps / possible, 0, 1), 1.5);
  }
  if (!(w > 0) && bestReps && bestReps > 0) return Math.pow(clamp(set.reps / bestReps, 0, 1), 1.5);
  return UNKNOWN_HARDNESS;
}

/** 부하(오늘 한 양 ÷ 내 소화량) → 회복 시간 배수(0 = 회복 필요 없음, 1 = 근육 크기의 최대 시간). */
export function loadFactor(ratio: number): number {
  if (!(ratio >= NO_RECOVERY_BELOW)) return 0;
  return Math.min(MAX_LOAD_RATIO, ratio);
}

/** 기록 한 줄의 세트들. 세트별 기록이 없으면 같은 세트를 세트 수만큼. */
export function setsOf(r: Pick<ProgressRecord, "sets" | "reps" | "weightKg" | "setDetails">): LoadSet[] {
  if (Array.isArray(r.setDetails) && r.setDetails.length > 0) {
    return r.setDetails.map((d) => ({ reps: Number(d.reps) || 0, weightKg: d.weightKg ?? null }));
  }
  return Array.from({ length: Math.max(0, r.sets ?? 0) }, () => ({ reps: Number(r.reps) || 0, weightKg: r.weightKg ?? null }));
}

export type BodyForRecovery = {
  experience?: "beginner" | "intermediate" | "advanced" | null;
  gender?: "male" | "female" | null;
  weightKg?: number | null;
  /** 최근 InBody(또는 직접 입력) 골격근량. */
  skeletalMuscleKg?: number | null;
};

/** 체중 대비 골격근 — 성별 평균(남 44% · 여 38%)에 견준 배수(0.8~1.25). 모르면 1. */
export function muscleFactor(b: BodyForRecovery): number {
  if (!b.skeletalMuscleKg || !b.weightKg || !(b.weightKg > 0)) return 1;
  const typical = b.gender === "female" ? 0.38 : 0.44;
  return clamp(b.skeletalMuscleKg / b.weightKg / typical, 0.8, 1.25);
}

/**
 * 내 몸 기준 만들기 — 최근 기록(120일)과 몸 정보.
 * @param expectedOneRm 기록이 없는 종목의 예상 최대(몸으로 어림 — 처방 무게에서 환산). 없으면 모름.
 */
export function buildRecoveryProfile(
  records: readonly (ProgressRecord & { doneAt: string })[],
  stimulusOf: StimulusOf,
  now: Date,
  body: BodyForRecovery = {},
  expectedOneRm?: (exerciseId: string) => number | null,
): RecoveryProfile {
  const done = records.filter((r) => r.status === "done" && r.exerciseId);
  const best = new Map<string, number>();
  const bestReps = new Map<string, number>();
  for (const r of done) {
    const id = r.exerciseId as string;
    for (const s of setsOf(r)) {
      const rm = estimate1RM(s.weightKg, s.reps);
      if (rm > (best.get(id) ?? 0)) best.set(id, rm);
      if (!((s.weightKg ?? 0) > 0) && s.reps > (bestReps.get(id) ?? 0)) bestReps.set(id, s.reps);
    }
  }
  const mf = muscleFactor(body);
  const guess = new Map<string, number | null>();
  const oneRmOf = (id: string) => {
    if (!guess.has(id)) guess.set(id, expectedOneRm?.(id) ?? null);
    const g = guess.get(id) ?? null;
    const mine = best.get(id) ?? 0;
    // 내 기록이 있으면 그것, 몸으로 어림한 값이 더 크면 그쪽(처음 하는 종목을 가볍게 해 본 날을 '한계'로 보지 않게).
    const v = Math.max(mine, g ? g * mf : 0);
    return v > 0 ? v : null;
  };
  const bestRepsOf = (id: string) => bestReps.get(id) ?? null;

  // 소화량 — 최근 며칠(지금 회복을 따지는 운동)은 빼고, 그 전 6주 동안 부위별로 하루에 한 힘든 세트.
  const to = now.getTime() - CAPACITY_SKIP_DAYS * 86_400_000;
  const from = now.getTime() - (CAPACITY_SKIP_DAYS + CAPACITY_WINDOW_DAYS) * 86_400_000;
  const perDay = new Map<string, number>();
  for (const r of done) {
    const at = Date.parse(r.doneAt);
    if (!Number.isFinite(at) || at < from || at >= to) continue;
    const id = r.exerciseId as string;
    const hard = setsOf(r).reduce((a, s) => a + setHardness(s, oneRmOf(id), bestRepsOf(id)), 0);
    for (const [sub, share] of Object.entries(setShare(stimulusOf(id)))) {
      const part = PART_PREFIX.find((p) => sub.startsWith(`${p}-`));
      if (!part) continue;
      const key = `${seoulDay(at)}:${part}`;
      perDay.set(key, (perDay.get(key) ?? 0) + hard * share);
    }
  }
  const floor = CAPACITY_FLOOR[body.experience ?? "intermediate"] * mf;
  const capacity = Object.fromEntries(
    PART_PREFIX.map((part) => {
      // 거든 정도(1세트 미만)인 날은 '그 부위를 한 날'이 아니다.
      const loads = [...perDay.entries()].filter(([k, v]) => k.endsWith(`:${part}`) && v >= 1).map(([, v]) => v).sort((a, b) => b - a);
      const top = loads.slice(0, Math.max(1, Math.ceil(loads.length / 2)));
      const usual = top.length > 0 ? top.reduce((a, v) => a + v, 0) / top.length : 0;
      return [part, Math.round(Math.max(floor, usual) * 10) / 10];
    }),
  ) as Record<PartId, number>;
  return { oneRmOf, bestRepsOf, capacity };
}

/** 기록 없이 쓰는 기준(테스트 · 로그인 직후) — 힘든 정도는 모름, 소화량은 경력 바닥값. */
export function defaultRecoveryProfile(body: BodyForRecovery = {}): RecoveryProfile {
  const floor = Math.round(CAPACITY_FLOOR[body.experience ?? "intermediate"] * muscleFactor(body) * 10) / 10;
  return {
    oneRmOf: () => null,
    bestRepsOf: () => null,
    capacity: Object.fromEntries(PART_PREFIX.map((p) => [p, floor])) as Record<PartId, number>,
  };
}
