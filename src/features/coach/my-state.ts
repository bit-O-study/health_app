/**
 * 내 상태 계산 — AI 트레이너 요금제 1단계(2026-09-30, `docs/ai-trainer-plans-2026-09-30.html`).
 *
 * 순수 모듈. 운동·체중·체성분·수분·식단·걸음 기록을 **숫자 요약 한 묶음**으로 만든다.
 * AI 트레이너(2단계~)는 날 기록 대신 이 요약만 받는다 — 날 기록을 통째로 보내면 비싸고,
 * AI 가 숫자를 잘못 세고, 필요 없는 개인 기록까지 나간다.
 *
 * 🔴 숫자는 **여기서** 계산하고 AI 는 해석만 한다. "등이 주 6세트" 같은 사실을 AI 가 세게
 *    두면 매번 다르게 센다. 이 모듈이 틀리면 테스트가 잡는다.
 */
import { BODY_PART_LABEL, type BodyPart } from "@/features/routine/exercise-catalog-labels";
import { primaryBodyPart } from "@/features/routine/exercise-body-parts";
import { recordOneRM, type ProgressRecord } from "@/features/routine/progress";
import { volumeStatusFor, VOLUME_LABEL, type VolumeStatus } from "@/features/routine/training-volume";
import { dailyWaterTargetMl } from "@/features/diet/water";
import { GOAL_LABEL, type Goal } from "@/features/profile/goal";

export const BODY_PARTS: readonly BodyPart[] = ["chest", "back", "shoulder", "arm", "lower", "core"];

/** 운동량을 보는 기간(주). 한 주만 보면 휴가·야근 한 번에 결론이 뒤집힌다. */
export const VOLUME_WEEKS = 4;

export type MyStateInput = {
  /** 기준일(서울, YYYY-MM-DD). */
  today: string;
  /** 최근 VOLUME_WEEKS 주 완료 기록. */
  records: readonly ProgressRecord[];
  /** 체중 기록(오래된 것 → 최근, 어느 순서든 된다). */
  weights: readonly { date: string; kg: number }[];
  /** 체성분 기록(최근 2개면 충분). */
  bodyComps: readonly BodyCompPoint[];
  profile: {
    goal: Goal | null;
    weightKg: number | null;
    targetWeightKg: number | null;
    targetMuscleKg: number | null;
    targetBodyFatPct: number | null;
  };
  /** 최근 7일 하루 합계. 기록 없는 날은 빼고 넣는다. */
  waterMlByDay: readonly number[];
  proteinGByDay: readonly number[];
  kcalByDay: readonly number[];
  stepsByDay: readonly number[];
};

export type BodyCompPoint = {
  date: string;
  weightKg: number | null;
  skeletalMuscleKg: number | null;
  bodyFatPct: number | null;
  muscleRightArm: number | null;
  muscleLeftArm: number | null;
  muscleRightLeg: number | null;
  muscleLeftLeg: number | null;
};

export type PartVolume = { part: BodyPart; weeklySets: number; status: VolumeStatus };

export type MyState = {
  goal: Goal | null;
  /** 부위별 **주 평균** 세트(최근 4주). */
  volume: PartVolume[];
  /** 운동한 날(최근 4주). */
  workoutDays: number;
  /** 무게가 3번 연속 그대로인 종목(예상 1RM 기준). */
  stalled: { exerciseId: string; oneRmKg: number; sessions: number }[];
  weight: { latestKg: number | null; change4wKg: number | null };
  body: {
    skeletalMuscleKg: number | null;
    muscleChangeKg: number | null;
    bodyFatPct: number | null;
    fatPctChange: number | null;
    /** 좌우 차이가 뚜렷한 곳(5% 이상). */
    imbalances: { where: "팔" | "다리"; strongerSide: "오른쪽" | "왼쪽"; diffKg: number }[];
  };
  toGoal: { weightKg: number | null; muscleKg: number | null; bodyFatPct: number | null };
  water: { avgMl: number | null; targetMl: number; pct: number | null };
  protein: { avgG: number | null; targetG: number | null };
  kcalAvg: number | null;
  stepsAvg: number | null;
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const avg = (xs: readonly number[]) => {
  const v = xs.filter((x) => Number.isFinite(x) && x > 0);
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
};

/** 세트 수 — 세트별 기록이 있으면 그 개수, 없으면 sets 칸. */
function setsOf(r: ProgressRecord): number {
  if (Array.isArray(r.setDetails) && r.setDetails.length > 0) return r.setDetails.length;
  return Math.max(0, r.sets ?? 0);
}

export function weeklyVolume(records: readonly ProgressRecord[], weeks = VOLUME_WEEKS): PartVolume[] {
  const total = new Map<BodyPart, number>();
  for (const r of records) {
    if (r.status !== "done" || !r.exerciseId) continue;
    const part = primaryBodyPart(r.exerciseId);
    total.set(part, (total.get(part) ?? 0) + setsOf(r));
  }
  return BODY_PARTS.map((part) => {
    const weeklySets = round1((total.get(part) ?? 0) / Math.max(1, weeks));
    return { part, weeklySets, status: volumeStatusFor(weeklySets) };
  });
}

/** 정체 판정에 필요한 최소 세션 수. 두 번 같은 건 우연일 수 있다. */
export const STALL_SESSIONS = 3;

/**
 * 무게 정체 — 종목마다 최근 세션 3번의 예상 1RM 이 **오르지 않았으면** 정체.
 * 날짜순으로 정리해 마지막 3번만 본다(그 전에 올랐어도 지금 멈췄으면 정체다).
 */
export function stalledLifts(records: readonly ProgressRecord[]): MyState["stalled"] {
  const byEx = new Map<string, { date: string; oneRm: number }[]>();
  for (const r of records) {
    if (r.status !== "done" || !r.exerciseId) continue;
    const oneRm = recordOneRM(r);
    if (oneRm <= 0) continue; // 맨몸·시간 운동은 무게로 판단하지 않는다
    const list = byEx.get(r.exerciseId) ?? [];
    list.push({ date: r.forDate, oneRm });
    byEx.set(r.exerciseId, list);
  }
  const out: MyState["stalled"] = [];
  for (const [exerciseId, list] of byEx) {
    if (list.length < STALL_SESSIONS) continue;
    const last = [...list].sort((a, b) => a.date.localeCompare(b.date)).slice(-STALL_SESSIONS);
    const first = last[0].oneRm;
    if (last.every((s) => s.oneRm <= first)) {
      out.push({ exerciseId, oneRmKg: first, sessions: last.length });
    }
  }
  return out.sort((a, b) => b.oneRmKg - a.oneRmKg);
}

/** 좌우 근육 차이가 이 비율 이상이면 알린다. 측정 오차(1~2%)보다 확실히 큰 선. */
export const IMBALANCE_RATIO = 0.05;

function imbalance(
  where: "팔" | "다리",
  right: number | null,
  left: number | null,
): MyState["body"]["imbalances"][number] | null {
  if (!right || !left || right <= 0 || left <= 0) return null;
  const diff = right - left;
  if (Math.abs(diff) / Math.max(right, left) < IMBALANCE_RATIO) return null;
  return { where, strongerSide: diff > 0 ? "오른쪽" : "왼쪽", diffKg: round1(Math.abs(diff)) };
}

/**
 * 하루 단백질 목표(g) — 근육을 늘리거나 감량 중 근육을 지키려면 체중 1kg 당 1.6g,
 * 유지는 1.2g. 체중을 모르면 null(모르는 걸 지어내지 않는다).
 */
export function proteinTargetG(goal: Goal | null, weightKg: number | null): number | null {
  if (!weightKg || weightKg <= 0) return null;
  const perKg = goal === "maintain" || goal === null ? 1.2 : 1.6;
  return Math.round(weightKg * perKg);
}

export function computeMyState(input: MyStateInput): MyState {
  const weights = [...input.weights]
    .filter((w) => Number.isFinite(w.kg) && w.kg > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
  const latestKg = weights.at(-1)?.kg ?? input.profile.weightKg ?? null;
  const change4wKg = weights.length >= 2 ? round1(weights.at(-1)!.kg - weights[0].kg) : null;

  const comps = [...input.bodyComps].sort((a, b) => a.date.localeCompare(b.date));
  const cur = comps.at(-1) ?? null;
  const prev = comps.length >= 2 ? comps.at(-2)! : null;
  const delta = (a: number | null | undefined, b: number | null | undefined) =>
    a != null && b != null ? round1(a - b) : null;

  const imbalances = cur
    ? [
        imbalance("팔", cur.muscleRightArm, cur.muscleLeftArm),
        imbalance("다리", cur.muscleRightLeg, cur.muscleLeftLeg),
      ].filter((x): x is NonNullable<typeof x> => x !== null)
    : [];

  const skeletal = cur?.skeletalMuscleKg ?? null;
  const fatPct = cur?.bodyFatPct ?? null;
  const { profile } = input;
  const toGoal = {
    weightKg: profile.targetWeightKg && latestKg ? round1(profile.targetWeightKg - latestKg) : null,
    muscleKg: profile.targetMuscleKg && skeletal ? round1(profile.targetMuscleKg - skeletal) : null,
    bodyFatPct: profile.targetBodyFatPct && fatPct ? round1(profile.targetBodyFatPct - fatPct) : null,
  };

  const waterAvg = avg(input.waterMlByDay);
  const waterTarget = dailyWaterTargetMl(latestKg);
  const days = new Set(input.records.filter((r) => r.status === "done").map((r) => r.forDate));

  return {
    goal: profile.goal,
    volume: weeklyVolume(input.records),
    workoutDays: days.size,
    stalled: stalledLifts(input.records),
    weight: { latestKg, change4wKg },
    body: {
      skeletalMuscleKg: skeletal,
      muscleChangeKg: delta(cur?.skeletalMuscleKg, prev?.skeletalMuscleKg),
      bodyFatPct: fatPct,
      fatPctChange: delta(cur?.bodyFatPct, prev?.bodyFatPct),
      imbalances,
    },
    toGoal,
    water: {
      avgMl: waterAvg === null ? null : Math.round(waterAvg),
      targetMl: waterTarget,
      pct: waterAvg === null ? null : Math.round((waterAvg / waterTarget) * 100),
    },
    protein: {
      avgG: (() => {
        const p = avg(input.proteinGByDay);
        return p === null ? null : Math.round(p);
      })(),
      targetG: proteinTargetG(profile.goal, latestKg),
    },
    kcalAvg: (() => {
      const k = avg(input.kcalByDay);
      return k === null ? null : Math.round(k);
    })(),
    stepsAvg: (() => {
      const s = avg(input.stepsByDay);
      return s === null ? null : Math.round(s);
    })(),
  };
}

const signed = (n: number, unit: string) => `${n > 0 ? "+" : ""}${n}${unit}`;

/**
 * 사람이 읽는 요약 줄 — AI 에 보내는 입력이자 화면에 그대로 보여 줄 수 있는 문장.
 * 모르는 항목은 줄을 빼고 지어내지 않는다. 이름·연락처 같은 건 애초에 여기 없다.
 */
export function myStateLines(s: MyState, exerciseName: (id: string) => string): string[] {
  const lines: string[] = [];
  if (s.goal) lines.push(`목표: ${GOAL_LABEL[s.goal]}`);
  lines.push(
    `최근 ${VOLUME_WEEKS}주 운동한 날 ${s.workoutDays}일. 부위별 주 평균 세트(적정 10~20): ` +
      s.volume.map((v) => `${BODY_PART_LABEL[v.part]} ${v.weeklySets}(${VOLUME_LABEL[v.status]})`).join(", "),
  );
  if (s.stalled.length) {
    lines.push(
      `${STALL_SESSIONS}번 연속 무게 그대로: ` +
        s.stalled.slice(0, 4).map((x) => `${exerciseName(x.exerciseId)}(예상 1RM ${x.oneRmKg}kg)`).join(", "),
    );
  }
  if (s.weight.latestKg !== null) {
    lines.push(
      `체중 ${s.weight.latestKg}kg` +
        (s.weight.change4wKg !== null ? ` (4주 ${signed(s.weight.change4wKg, "kg")})` : ""),
    );
  }
  if (s.body.skeletalMuscleKg !== null) {
    lines.push(
      `골격근 ${s.body.skeletalMuscleKg}kg` +
        (s.body.muscleChangeKg !== null ? ` (지난 측정 대비 ${signed(s.body.muscleChangeKg, "kg")})` : "") +
        (s.body.bodyFatPct !== null ? `, 체지방률 ${s.body.bodyFatPct}%` : "") +
        (s.body.fatPctChange !== null ? ` (${signed(s.body.fatPctChange, "%p")})` : ""),
    );
  }
  for (const im of s.body.imbalances) {
    lines.push(`${im.where} 근육 ${im.strongerSide}이 ${im.diffKg}kg 많음`);
  }
  const goalBits = [
    s.toGoal.weightKg !== null ? `체중 ${signed(s.toGoal.weightKg, "kg")}` : null,
    s.toGoal.muscleKg !== null ? `근육 ${signed(s.toGoal.muscleKg, "kg")}` : null,
    s.toGoal.bodyFatPct !== null ? `체지방률 ${signed(s.toGoal.bodyFatPct, "%p")}` : null,
  ].filter(Boolean);
  if (goalBits.length) lines.push(`목표까지: ${goalBits.join(", ")}`);
  if (s.water.avgMl !== null) {
    lines.push(`수분 하루 평균 ${s.water.avgMl}ml (목표 ${s.water.targetMl}ml의 ${s.water.pct}%)`);
  }
  if (s.protein.avgG !== null) {
    lines.push(
      `단백질 하루 평균 ${s.protein.avgG}g` + (s.protein.targetG !== null ? ` (목표 ${s.protein.targetG}g)` : ""),
    );
  }
  if (s.kcalAvg !== null) lines.push(`섭취 하루 평균 ${s.kcalAvg}kcal`);
  if (s.stepsAvg !== null) lines.push(`걸음 하루 평균 ${s.stepsAvg}보`);
  return lines;
}
