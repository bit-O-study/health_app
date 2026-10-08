/**
 * 맞춤 운동 · 기록으로 본 나(2026-10-08) — 순수 로직, AI 없음.
 *
 * '이번 7일'만 보던 화면에 쌓인 기록(최근 120일)으로 네 가지를 더 보여 준다
 * (맞춤운동 넘침 진단 보고서 A·B·C·D — "990원 쓸만하구나"):
 *  A 성장 기록 — 종목별 처음 무게 → 지금 무게.
 *  B 정체 알림 — 4주 넘게 예상 최대(1RM)가 안 오른 종목 + 다음에 할 것 한 줄.
 *  C 밀기 : 당기기 — 지난 7일 세트 비율(2:1 넘으면 어깨 앞쪽이 말리기 쉽다).
 *  D 쉬는 부위 — 부위별 마지막으로 1세트 이상 한 날부터 며칠.
 */
import { estimate1RM, recordOneRM, weightStepKg, type ProgressRecord } from "@/features/routine/progress";
import { PR_MIN_GAIN_KG } from "@/features/routine/personal-record";
import { PART_PREFIX, setShare, type PartId, type StimulusOf } from "@/features/routine/fit";

/** 이 기록의 가장 무거운 세트(무게, 그 무게의 횟수). 무게가 없으면 null. */
function topSet(r: ProgressRecord): { kg: number; reps: number } | null {
  const sets = Array.isArray(r.setDetails) && r.setDetails.length > 0
    ? r.setDetails.map((s) => ({ kg: s.weightKg ?? 0, reps: s.reps }))
    : [{ kg: r.weightKg ?? 0, reps: r.reps ?? 0 }];
  let best: { kg: number; reps: number } | null = null;
  for (const s of sets) {
    if (!(s.kg > 0)) continue;
    if (!best || s.kg > best.kg || (s.kg === best.kg && s.reps > best.reps)) best = s;
  }
  return best;
}

const days = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

type Session = { date: string; kg: number; reps: number; oneRm: number; equipment: string | null };

/** 종목별 날짜순 세션(같은 날 여러 줄이면 무거운 세트 하나). */
function sessionsByExercise(records: readonly ProgressRecord[]): Map<string, Session[]> {
  const out = new Map<string, Map<string, Session>>();
  for (const r of records) {
    if (r.status !== "done" || !r.exerciseId) continue;
    const top = topSet(r);
    if (!top) continue;
    const byDate = out.get(r.exerciseId) ?? new Map<string, Session>();
    const prev = byDate.get(r.forDate);
    const oneRm = Math.max(recordOneRM(r), estimate1RM(top.kg, top.reps));
    if (!prev || top.kg > prev.kg) byDate.set(r.forDate, { date: r.forDate, kg: top.kg, reps: top.reps, oneRm: Math.max(oneRm, prev?.oneRm ?? 0), equipment: r.equipment ?? null });
    else prev.oneRm = Math.max(prev.oneRm, oneRm);
    out.set(r.exerciseId, byDate);
  }
  return new Map([...out].map(([id, m]) => [id, [...m.values()].sort((a, b) => a.date.localeCompare(b.date))]));
}

export type GrowthStory = { exerciseId: string; fromKg: number; fromDate: string; toKg: number; toDate: string };

/**
 * A 성장 기록 — 처음 한 날의 무게 → 최근 4주 중 가장 무거운 무게. 4주 넘게 했고, 최근 60일 안에
 * 한 종목만(그만둔 종목은 자랑이 아니다). 늘어난 kg 큰 순.
 */
export function growthStories(records: readonly ProgressRecord[], today: string, n = 3): GrowthStory[] {
  const out: GrowthStory[] = [];
  for (const [exerciseId, ss] of sessionsByExercise(records)) {
    if (ss.length < 2) continue;
    const first = ss[0];
    const last = ss[ss.length - 1];
    if (days(first.date, last.date) < 28 || days(last.date, today) > 60) continue;
    const recent = ss.filter((s) => days(s.date, last.date) <= 28);
    const best = recent.reduce((a, s) => (s.kg > a.kg ? s : a), recent[0]);
    if (best.kg <= first.kg) continue;
    out.push({ exerciseId, fromKg: first.kg, fromDate: first.date, toKg: best.kg, toDate: best.date });
  }
  return out.sort((a, b) => b.toKg - b.fromKg - (a.toKg - a.fromKg)).slice(0, n);
}

export type Plateau = { exerciseId: string; weeks: number; sinceDate: string; bestOneRmKg: number; lastKg: number; lastReps: number; advice: string };

/** 정체를 깨는 다음 한 걸음 — 반복 수 먼저, 다 차면 무게(점진적 과부하). */
export function plateauAdvice(lastKg: number, lastReps: number, stepKg: number): string {
  const up = Math.round((lastKg + stepKg) * 10) / 10;
  if (lastReps >= 12) return `${up}kg로 올려 8회부터 다시 시작해 보세요.`;
  if (lastReps < 8) return `${lastKg}kg로 8회씩 3세트를 채우면 ${up}kg로 올려 보세요.`;
  return `${lastKg}kg로 한 세트에 1~2회씩 늘려 12회가 되면 ${up}kg로 올려 보세요.`;
}

/**
 * B 정체 알림 — 예상 최대(1RM) 신기록이 4주 넘게 없고, 그 뒤로도 3번 이상 했고, 최근 14일 안에 한 종목.
 * 오래 멈춘 순.
 */
export function plateaus(records: readonly ProgressRecord[], today: string, n = 2): Plateau[] {
  const out: Plateau[] = [];
  for (const [exerciseId, ss] of sessionsByExercise(records)) {
    if (ss.length < 6) continue;
    const last = ss[ss.length - 1];
    if (days(last.date, today) > 14) continue;
    let best = ss[0].oneRm;
    let prDate = ss[0].date;
    for (const s of ss.slice(1)) {
      if (s.oneRm - best >= PR_MIN_GAIN_KG) prDate = s.date;
      best = Math.max(best, s.oneRm);
    }
    const weeks = Math.floor(days(prDate, today) / 7);
    const after = ss.filter((s) => s.date > prDate).length;
    if (weeks < 4 || after < 3) continue;
    out.push({
      exerciseId,
      weeks,
      sinceDate: prDate,
      bestOneRmKg: Math.round(best),
      lastKg: last.kg,
      lastReps: last.reps,
      advice: plateauAdvice(last.kg, last.reps, weightStepKg(exerciseId, last.equipment) ?? 2.5),
    });
  }
  return out.sort((a, b) => b.weeks - a.weeks).slice(0, n);
}

/** 밀기 · 당기기에 드는 세부 근육(균형 시트의 '밀기 : 당기기'와 같은 묶음). */
const PUSH = ["chest-upper", "chest-mid", "chest-lower", "chest-inner", "shoulder-front", "arm-triceps-long", "arm-triceps-lateral", "arm-triceps-medial"];
const PULL = ["back-lats", "back-rhomboids", "shoulder-rear", "arm-biceps-long", "arm-biceps-short"];
/** 이 배수를 넘으면 한쪽으로 쏠렸다고 본다. */
export const PUSH_PULL_WARN = 1.5;

export type PushPull = { push: number; pull: number; ratio: number | null; lean: "push" | "pull" | null };

/** C 밀기 : 당기기 — 지난 7일 유효 세트. ratio = 밀기 ÷ 당기기(당기기 0이면 null). */
export function pushPull(stim: Readonly<Record<string, number>>): PushPull {
  const sum = (ks: string[]) => Math.round(ks.reduce((a, k) => a + (stim[k] ?? 0), 0) * 10) / 10;
  const push = sum(PUSH);
  const pull = sum(PULL);
  const ratio = pull > 0 ? Math.round((push / pull) * 10) / 10 : null;
  const lean = push > 0 && (ratio === null || ratio > PUSH_PULL_WARN) ? "push" : pull > 0 && push / pull < 1 / PUSH_PULL_WARN ? "pull" : null;
  return { push, pull, ratio, lean };
}

export type RestingPart = { part: PartId; days: number | null; lastDate: string | null };

/** 이 일수 이상 쉰 부위만 보여 준다. */
export const REST_ALERT_DAYS = 7;

/**
 * D 쉬는 부위 — 그 부위가 **주 부위인 운동**을 마지막으로 한 날. 일주일 넘게 쉰 부위만, 오래 쉰 순.
 * 기록 범위(최근 120일) 안에 없으면 days = null('오래').
 * 🔴 보조 자극으로 세지 않는다 — 스쿼트의 척추기립근 몫으로 '등을 했다'고 하면 "등 운동을 쉬고 있어요"가
 *    맞는 말인데도 안 나오고, 반대로 스쿼트만 한 날 '등 10일째'가 나온다(E2E 에서 잡힘).
 */
export function restingParts(records: readonly ProgressRecord[], partOf: (exerciseId: string) => PartId, today: string): RestingPart[] {
  const last: Partial<Record<PartId, string>> = {};
  for (const r of records) {
    if (r.status !== "done" || !r.exerciseId) continue;
    const sets = Array.isArray(r.setDetails) && r.setDetails.length ? r.setDetails.length : Math.max(0, r.sets ?? 0);
    if (!sets) continue;
    const part = partOf(r.exerciseId);
    if (!last[part] || r.forDate > last[part]!) last[part] = r.forDate;
  }
  const out: RestingPart[] = [];
  for (const part of PART_PREFIX) {
    const lastDate = last[part] ?? null;
    const gap = lastDate ? days(lastDate, today) : null;
    if (gap === null || gap >= REST_ALERT_DAYS) out.push({ part, days: gap, lastDate });
  }
  return out.sort((a, b) => (b.days ?? Infinity) - (a.days ?? Infinity));
}

/* ─── 부위별 회복(2026-10-08) ─────────────────────────────────────────── */

/** 근육 크기 — 작은 근육은 빨리, 큰 근육은 오래 회복한다. */
export const PART_SIZE: Record<PartId, "small" | "medium" | "large"> = {
  arm: "small",
  shoulder: "small",
  core: "small",
  chest: "medium",
  back: "medium",
  lower: "large",
};

/**
 * 기본 회복 시간(시) — 근육 크기 × 그날 그 부위 유효 세트(4세트 미만 · 10세트 미만 · 10세트 이상).
 * 일반적인 권고(작은 근육 24~48시간, 큰 근육 48~72시간 이상)를 세트 수로 나눴다. 참고용.
 */
export const RECOVERY_TABLE: Record<"small" | "medium" | "large", [number, number, number]> = {
  small: [16, 32, 48],
  medium: [24, 48, 72],
  large: [24, 60, 84],
};

/** 무거운 무게(대부분 5회 이하)는 신경·관절 피로까지 더해 더 오래, 가벼운 펌핑(대부분 15회 이상)은 빨리. */
export const INTENSITY_FACTOR = { heavy: 1.2, normal: 1, light: 0.85 } as const;
/** 다 풀리기 전에 같은 부위를 또 하면 남은 피로의 이만큼이 다음 회복에 얹힌다. */
export const CARRY_OVER = 0.5;
/** 오늘 체크인 — 근육통 '심해요'·잠 '못 잤어요'면 남은 시간이 이만큼 길어진다. */
export const CHECKIN_FACTOR = { soreness: 1.25, sleep: 1.1 } as const;

export function recoveryHours(part: PartId, sets: number, intensity: keyof typeof INTENSITY_FACTOR = "normal"): number {
  const band = sets < 4 ? 0 : sets < 10 ? 1 : 2;
  return Math.round(RECOVERY_TABLE[PART_SIZE[part]][band] * INTENSITY_FACTOR[intensity]);
}

export type RecoveryRecord = {
  exerciseId: string | null;
  /** 세트마다 횟수(세트 수 = 길이). */
  reps: readonly number[];
  /** 끝낸 시각(ISO). */
  doneAt: string;
};

export type RecoveryRow = {
  part: PartId;
  /** 0~100. 100 = 다 회복. */
  pct: number;
  /** 다 회복까지 남은 시간(시). 회복됐으면 0. */
  hoursLeft: number;
  /** 지금 회복을 붙잡고 있는 운동을 끝낸 때(ISO). 다 회복됐으면 null. */
  lastAt: string | null;
  /** 그때 그 부위 유효 세트. */
  sets: number;
  intensity: keyof typeof INTENSITY_FACTOR;
  /** 그 전 운동의 피로가 다 안 풀린 채 또 했다. */
  stacked: boolean;
  /** 오늘 체크인이 남은 시간을 늘렸다(근육통 · 잠). */
  condition: ("soreness" | "sleep")[];
};

const HEAVY_REPS = 5;
const LIGHT_REPS = 15;

/**
 * 부위별 회복 정도(2026-10-08 · "작은 근육은 회복이 다르지 않아?" · "디테일하게").
 *
 * 1) 하루(서울)에 한 부위를 한 운동은 한 번으로 묶는다(가슴 3종목 = 한 번). 유효 세트는 `setShare` —
 *    벤치의 삼두 몫도 팔 피로로 센다. 0.5세트 미만은 거든 정도라 뺀다.
 * 2) 필요한 시간 = 근육 크기 × 세트 구간(`RECOVERY_TABLE`) × 강도(무거움 1.2 · 가벼움 0.85).
 * 3) 쌓인 피로 — 앞 운동이 다 안 풀렸으면 남은 시간의 절반을 다음 운동에 더한다.
 * 4) 지금 가장 늦게 풀리는 운동 기준으로 % · 남은 시간. 오늘 근육통 '심해요'면 남은 시간 ×1.25, 잠 못 잤으면 ×1.1.
 */
export function recoveryByPart(
  records: readonly RecoveryRecord[],
  stimulusOf: StimulusOf,
  now: Date,
  checkin?: { soreness: number; sleep: number } | null,
): RecoveryRow[] {
  type Bout = { part: PartId; sets: number; heavy: number; light: number; at: number };
  const bouts = new Map<string, Bout>();
  for (const r of records) {
    if (!r.exerciseId || r.reps.length === 0) continue;
    const at = Date.parse(r.doneAt);
    if (!Number.isFinite(at)) continue;
    const day = new Date(at + 9 * 3_600_000).toISOString().slice(0, 10);
    const n = r.reps.length;
    const heavy = r.reps.filter((x) => x > 0 && x <= HEAVY_REPS).length;
    const light = r.reps.filter((x) => x >= LIGHT_REPS).length;
    for (const [sub, share] of Object.entries(setShare(stimulusOf(r.exerciseId)))) {
      const part = PART_PREFIX.find((p) => sub.startsWith(`${p}-`));
      if (!part) continue;
      const key = `${day}:${part}`;
      const b = bouts.get(key) ?? { part, sets: 0, heavy: 0, light: 0, at };
      b.sets += n * share;
      b.heavy += heavy * share;
      b.light += light * share;
      b.at = Math.max(b.at, at);
      bouts.set(key, b);
    }
  }

  const condition: RecoveryRow["condition"] = [];
  if (checkin?.soreness === 1) condition.push("soreness");
  if (checkin?.sleep === 1) condition.push("sleep");
  const condFactor = (checkin?.soreness === 1 ? CHECKIN_FACTOR.soreness : 1) * (checkin?.sleep === 1 ? CHECKIN_FACTOR.sleep : 1);
  const H = 3_600_000;

  return PART_PREFIX.map((part) => {
    const list = [...bouts.values()].filter((b) => b.part === part && b.sets >= 0.5).sort((a, b) => a.at - b.at);
    let prevEnd = -Infinity;
    let binding: { end: number; need: number; b: Bout; intensity: RecoveryRow["intensity"]; stacked: boolean } | null = null;
    for (const b of list) {
      const intensity: RecoveryRow["intensity"] = b.heavy / b.sets >= 0.5 ? "heavy" : b.light / b.sets >= 0.5 ? "light" : "normal";
      const carry = Math.max(0, (prevEnd - b.at) / H);
      const need = recoveryHours(part, b.sets, intensity) + CARRY_OVER * carry;
      const end = b.at + need * H;
      prevEnd = Math.max(prevEnd, end);
      if (!binding || end > binding.end) binding = { end, need, b, intensity, stacked: carry > 0 };
    }
    const rawLeft = binding ? (binding.end - now.getTime()) / H : 0;
    if (!binding || rawLeft <= 0) {
      return { part, pct: 100, hoursLeft: 0, lastAt: null, sets: 0, intensity: "normal", stacked: false, condition: [] };
    }
    const left = rawLeft * condFactor;
    return {
      part,
      pct: Math.max(0, Math.min(99, Math.round((1 - left / binding.need) * 100))),
      hoursLeft: Math.ceil(left),
      lastAt: new Date(binding.b.at).toISOString(),
      sets: Math.round(binding.b.sets * 10) / 10,
      intensity: binding.intensity,
      stacked: binding.stacked,
      condition: condFactor > 1 ? condition : [],
    };
  });
}
