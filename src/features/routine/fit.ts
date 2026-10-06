/**
 * 맞춤 운동 계산 — 라이트(990원) 바탕(2026-10-01, `docs/lite-app-ui-2026-10-01.html`).
 *
 * 순수 모듈. 이번 주 기록 → 세부 근육별 자극 → 목표(`body-targets.ts`) 대비 모자람 →
 * 모자란 곳을 채우는 운동 순위 · 균형 비율. AI 없이 규칙만(원가 0원).
 *
 * 🔴 추천은 '오늘만 운동 변경'으로만 적용한다(사용자 결정) — 이 모듈은 고르기만 한다.
 */
import type { Stimulus } from "@/features/routine/exercise-stimulus";

export type FitRecord = {
  exerciseId: string | null;
  forDate: string;
  sets: number;
};

export type StimulusOf = (exerciseId: string) => Stimulus;

/** 추천 한 개를 몇 세트로 셈할지(처방이 실제 세트를 정하지만, 고를 때는 3세트로 견준다). */
export const PLAN_SETS = 3;
/** 이 비율을 넘긴 세부 근육은 '많음' — 더 자극하는 운동은 뒤로(회복). */
export const HIGH_RATIO = 1.5;
/** 이 점수 이상으로 어제·오늘 자극했으면 회복 중으로 본다(48시간). */
export const RECOVERY_SCORE = 60;

/** 세부 근육별 유효 세트(세트 × 점수 ÷ 100). */
export function weeklyStimulus(records: readonly FitRecord[], stimulusOf: StimulusOf): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of records) {
    if (!r.exerciseId || !(r.sets > 0)) continue;
    for (const [sub, score] of Object.entries(stimulusOf(r.exerciseId))) {
      out[sub] = (out[sub] ?? 0) + (r.sets * score) / 100;
    }
  }
  for (const k of Object.keys(out)) out[k] = Math.round(out[k] * 10) / 10;
  return out;
}

export type SubStatus = "none" | "low" | "some" | "ok" | "high";

export const SUB_STATUS_LABEL: Record<SubStatus, string> = {
  none: "안 함",
  low: "부족",
  some: "조금",
  ok: "적정",
  high: "많음",
};

/** 목표 대비 상태. 목표가 0이면(그 사람에게 필요 없는 곳) 한 것만 보고 적정/안 함. */
export function subStatus(stim: number, target: number): SubStatus {
  if (stim <= 0) return target > 0 ? "none" : "ok";
  if (target <= 0) return "ok";
  const r = stim / target;
  if (r < 0.5) return "low";
  if (r < 0.8) return "some";
  if (r <= HIGH_RATIO) return "ok";
  return "high";
}

export type SubRow = { sub: string; stim: number; target: number; pct: number; status: SubStatus };

/** 세부 근육 줄들 — 목표 표의 순서대로. */
export function subRows(targets: Readonly<Record<string, number>>, stim: Readonly<Record<string, number>>): SubRow[] {
  return Object.entries(targets).map(([sub, target]) => {
    const s = stim[sub] ?? 0;
    return {
      sub,
      stim: s,
      target,
      pct: target > 0 ? Math.round((s / target) * 100) : 0,
      status: subStatus(s, target),
    };
  });
}

/** 모자란 순서(목표 대비 % 낮은 것부터, 같으면 목표가 큰 것부터). */
export function mostLacking(rows: readonly SubRow[], n = 3): SubRow[] {
  return [...rows]
    .filter((r) => r.target > 0 && r.pct < 80)
    .sort((a, b) => a.pct - b.pct || b.target - a.target)
    .slice(0, n);
}

/** 부위(6개) 요약 — 무료 맛보기 화면용. */
export const PART_PREFIX = ["chest", "back", "shoulder", "arm", "lower", "core"] as const;
export type PartId = (typeof PART_PREFIX)[number];

export function partRows(
  targets: Readonly<Record<string, number>>,
  stim: Readonly<Record<string, number>>,
): { part: PartId; stim: number; target: number; pct: number; status: SubStatus }[] {
  return PART_PREFIX.map((part) => {
    const keys = Object.keys(targets).filter((k) => k.startsWith(`${part}-`));
    const t = keys.reduce((s, k) => s + targets[k], 0);
    const s = keys.reduce((acc, k) => acc + (stim[k] ?? 0), 0);
    return {
      part,
      stim: Math.round(s * 10) / 10,
      target: Math.round(t * 10) / 10,
      pct: t > 0 ? Math.round((s / t) * 100) : 0,
      status: subStatus(s, t),
    };
  });
}

/** 어제·오늘 세게(RECOVERY_SCORE 이상) 자극한 세부 근육 — 회복 중. */
export function recoveringSubs(
  records: readonly FitRecord[],
  stimulusOf: StimulusOf,
  today: string,
  yesterday: string,
): Set<string> {
  const out = new Set<string>();
  for (const r of records) {
    if (!r.exerciseId || (r.forDate !== today && r.forDate !== yesterday)) continue;
    for (const [sub, score] of Object.entries(stimulusOf(r.exerciseId))) {
      if (score >= RECOVERY_SCORE) out.add(sub);
    }
  }
  return out;
}

export type FitCandidate = { exerciseId: string; name: string; equipment: string };
export type FitPick = FitCandidate & {
  /** 이 운동이 채우는 세부 근육(많이 채우는 순, 최대 2개)과 채우는 양(유효 세트). */
  fills: { sub: string; add: number }[];
  gain: number;
};

/**
 * 모자란 곳을 채우는 운동 고르기 — 한 개씩 고르고, 고를 때마다 자극을 더해 다음을 고른다
 * (같은 곳만 채우는 운동이 줄줄이 나오지 않게).
 *
 * 점수 = Σ min(채우는 양, 모자란 양) − ½ × (많음·회복 중인 곳을 60점 이상으로 더 쓰는 양).
 * 채우는 양 = PLAN_SETS × 운동 점수 ÷ 100.
 */
export function pickExercises(
  candidates: readonly FitCandidate[],
  targets: Readonly<Record<string, number>>,
  stim: Readonly<Record<string, number>>,
  stimulusOf: StimulusOf,
  opts: { n?: number; exclude?: ReadonlySet<string>; recovering?: ReadonlySet<string> } = {},
): FitPick[] {
  const n = opts.n ?? 3;
  const cur: Record<string, number> = { ...stim };
  const picked: FitPick[] = [];
  const used = new Set<string>(opts.exclude ?? []);
  for (let round = 0; round < n; round++) {
    let best: FitPick | null = null;
    for (const c of candidates) {
      if (used.has(c.exerciseId)) continue;
      const s = stimulusOf(c.exerciseId);
      let gain = 0;
      const fills: { sub: string; add: number }[] = [];
      for (const [sub, score] of Object.entries(s)) {
        const add = (PLAN_SETS * score) / 100;
        const target = targets[sub] ?? 0;
        const have = cur[sub] ?? 0;
        const lack = Math.max(0, target - have);
        const useful = Math.min(add, lack);
        gain += useful;
        if (useful > 0) fills.push({ sub, add: Math.round(useful * 10) / 10 });
        // 감점은 그 근육을 **세게**(60점 이상) 쓰는 운동에만 — 살짝 거드는 근육이 이미 찼다고
        // 주목적(예: 오버헤드 익스텐션의 삼두 장두)이 막히면 안 된다.
        const overfull = (target > 0 && have >= target * HIGH_RATIO) || opts.recovering?.has(sub);
        if (overfull && score >= RECOVERY_SCORE) gain -= 0.5 * add;
      }
      if (gain <= 0) continue;
      if (!best || gain > best.gain) {
        best = { ...c, gain: Math.round(gain * 10) / 10, fills: fills.sort((a, b) => b.add - a.add).slice(0, 2) };
      }
    }
    if (!best) break;
    picked.push(best);
    used.add(best.exerciseId);
    for (const [sub, score] of Object.entries(stimulusOf(best.exerciseId))) {
      cur[sub] = (cur[sub] ?? 0) + (PLAN_SETS * score) / 100;
    }
  }
  return picked;
}

/* ─── 균형 ─────────────────────────────────────────────────────────── */

export type BalanceRow = {
  id: string;
  label: string;
  parts: { label: string; now: number; goal: number }[];
  /** 한 줄 안내(가장 모자란 쪽). 다 맞으면 빈 문자열. */
  hint: string;
};

const BALANCES: { id: string; label: string; parts: { label: string; subs: string[] }[] }[] = [
  {
    id: "push-pull",
    label: "밀기 : 당기기",
    parts: [
      { label: "밀기", subs: ["chest-upper", "chest-mid", "chest-lower", "chest-inner", "shoulder-front", "arm-triceps-long", "arm-triceps-lateral", "arm-triceps-medial"] },
      { label: "당기기", subs: ["back-lats", "back-rhomboids", "shoulder-rear", "arm-biceps-long", "arm-biceps-short"] },
    ],
  },
  {
    id: "shoulder",
    label: "어깨 앞 : 옆 : 뒤",
    parts: [
      { label: "앞", subs: ["shoulder-front"] },
      { label: "옆", subs: ["shoulder-side"] },
      { label: "뒤", subs: ["shoulder-rear"] },
    ],
  },
  {
    id: "chest",
    label: "가슴 상 : 중 : 하",
    parts: [
      { label: "상", subs: ["chest-upper"] },
      { label: "중", subs: ["chest-mid"] },
      { label: "하", subs: ["chest-lower"] },
    ],
  },
  {
    id: "triceps",
    label: "삼두 장 : 외 : 내",
    parts: [
      { label: "장두", subs: ["arm-triceps-long"] },
      { label: "외측두", subs: ["arm-triceps-lateral"] },
      { label: "내측두", subs: ["arm-triceps-medial"] },
    ],
  },
  {
    id: "legs",
    label: "하체 앞 : 뒤",
    parts: [
      { label: "앞(대퇴사두)", subs: ["lower-quads"] },
      { label: "뒤(햄스트링·둔근)", subs: ["lower-hamstrings", "lower-glutes"] },
    ],
  },
];

/** 비율을 정수 %로(합 100). 다 0이면 0. */
function shares(xs: number[]): number[] {
  const sum = xs.reduce((s, x) => s + x, 0);
  return sum > 0 ? xs.map((x) => Math.round((x / sum) * 100)) : xs.map(() => 0);
}

export function balanceRows(
  targets: Readonly<Record<string, number>>,
  stim: Readonly<Record<string, number>>,
): BalanceRow[] {
  return BALANCES.map((b) => {
    const nowRaw = b.parts.map((p) => p.subs.reduce((s, k) => s + (stim[k] ?? 0), 0));
    const goalRaw = b.parts.map((p) => p.subs.reduce((s, k) => s + (targets[k] ?? 0), 0));
    const now = shares(nowRaw);
    const goal = shares(goalRaw);
    let hint = "";
    if (nowRaw.some((x) => x > 0)) {
      let worst = -1;
      let gap = 5; // 5%p 안쪽 차이는 맞은 것으로 본다
      now.forEach((v, i) => {
        if (goal[i] - v > gap) {
          gap = goal[i] - v;
          worst = i;
        }
      });
      if (worst >= 0) hint = `${b.parts[worst].label} 쪽이 모자라요(지금 ${now[worst]}% · 목표 ${goal[worst]}%).`;
    }
    return { id: b.id, label: b.label, parts: b.parts.map((p, i) => ({ label: p.label, now: now[i], goal: goal[i] })), hint };
  });
}
