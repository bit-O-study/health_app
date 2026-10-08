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
import { addDaysYmd } from "@/features/groups/ranking";
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
 * D 쉬는 부위 — 하루에 그 부위를 1세트 이상(유효 세트) 한 마지막 날. 일주일 넘게 쉰 부위만, 오래 쉰 순.
 * 기록 범위(최근 120일) 안에 없으면 days = null('오래').
 */
export function restingParts(records: readonly ProgressRecord[], stimulusOf: StimulusOf, today: string): RestingPart[] {
  const perDay = new Map<string, Record<PartId, number>>();
  for (const r of records) {
    if (r.status !== "done" || !r.exerciseId) continue;
    const sets = Array.isArray(r.setDetails) && r.setDetails.length ? r.setDetails.length : Math.max(0, r.sets ?? 0);
    if (!sets) continue;
    const day = perDay.get(r.forDate) ?? { chest: 0, back: 0, shoulder: 0, arm: 0, lower: 0, core: 0 };
    for (const [sub, share] of Object.entries(setShare(stimulusOf(r.exerciseId)))) {
      const part = PART_PREFIX.find((p) => sub.startsWith(`${p}-`));
      if (part) day[part] += sets * share;
    }
    perDay.set(r.forDate, day);
  }
  const dates = [...perDay.keys()].sort().reverse();
  const out: RestingPart[] = [];
  for (const part of PART_PREFIX) {
    const lastDate = dates.find((d) => perDay.get(d)![part] >= 1) ?? null;
    const gap = lastDate ? days(lastDate, today) : null;
    if (gap === null || gap >= REST_ALERT_DAYS) out.push({ part, days: gap, lastDate });
  }
  return out.sort((a, b) => (b.days ?? Infinity) - (a.days ?? Infinity));
}

/** 인사이트에 쓰는 기록 범위 시작일. */
export function insightsFrom(today: string): string {
  return addDaysYmd(today, -119);
}
