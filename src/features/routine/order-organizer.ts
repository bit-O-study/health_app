/**
 * 오늘 운동 순서 정리(라이트, 2026-10-28) — 같은 부위가 연달아 오지 않게 남은 운동 순서를 다시 짠다.
 * 설계: https://claude.ai/artifact/Q6xK7mJ8RFjjPStSsDmpE3 (런닝 이어하기 · 순서 정리)
 *
 * 🔴 AI 없음(라이트 원칙) — 운동별 세부 근육 자극 점수(exercise-stimulus)·대표 부위·무게 등급만 쓴다.
 * 🔴 결과는 오늘만 적용한다(user_routines.today_order) — 루틴(routine_exercises)은 그대로(원칙 2).
 *
 * 순수 모듈 — 카탈로그 조회는 호출자가 함수로 넘긴다(테스트에서 가짜 데이터로 돌린다).
 */
import type { BodyPart } from "@/features/routine/exercise-catalog-labels";
import { primaryBodyPart } from "@/features/routine/exercise-body-parts";
import { loadClassOf, type LoadClass } from "@/features/routine/exercise-load";
import { stimulusFor, type Stimulus } from "@/features/routine/exercise-stimulus";
import { subMuscleWeightsForExercise } from "@/features/routine/muscle-detail";

export type OrderRow = {
  id: string;
  exerciseId: string;
  supersetGroup: number | null;
  /** 이미 끝냈거나 건너뛴 운동 — 자리를 지킨다. */
  locked: boolean;
};

export type OrderLookups = {
  stimulusOf: (exerciseId: string) => Stimulus;
  bodyPartOf: (exerciseId: string) => BodyPart;
  loadOf: (exerciseId: string) => LoadClass;
};

/** 실제 카탈로그 조회(손 점수 → 없으면 기존 매핑 + 보조근 규칙). 호출마다 캐시. */
export function orderLookups(): OrderLookups {
  const cache = new Map<string, Stimulus>();
  return {
    stimulusOf: (id) => {
      let s = cache.get(id);
      if (!s) {
        s = stimulusFor(id, subMuscleWeightsForExercise(id).map((w) => ({ id: w.sub.id, weight: w.weight })));
        cache.set(id, s);
      }
      return s;
    },
    bodyPartOf: primaryBodyPart,
    loadOf: loadClassOf,
  };
}

export type OrderSuggestion = {
  /** 정리한 전체 순서(행 id). 잠긴 행은 원래 자리. */
  ids: string[];
  /** 붙어 있는 두 운동의 대표 부위가 같은 곳 수 — 전/후. */
  streaksBefore: number;
  streaksAfter: number;
  /** 붙어 있는 운동끼리 세부 근육 자극이 겹치는 정도의 합(낮을수록 덜 힘듦) — 전/후. */
  costBefore: number;
  costAfter: number;
  /** 대표 부위가 하나뿐인 날(가슴만 등) — 세부 부위를 번갈아 둔다고 안내. */
  singlePart: boolean;
  /** 자리를 옮긴 운동마다 짧은 이유. */
  moves: { id: string; from: number; to: number; reason: OrderReason }[];
};

export type OrderReason = "heavy-first" | "spread" | "small-last";

const LOAD_RANK: Record<LoadClass, number> = { heavy: 0, medium: 1, light: 2, bodyweight: 3 };
const SMALL_PARTS: ReadonlySet<BodyPart> = new Set(["arm", "core"]);
/** 이만큼도 안 줄면 "지금 순서도 좋아요" — 괜히 바꾸지 않는다. */
const MIN_GAIN = 0.3;

type Unit = {
  rows: OrderRow[];
  index: number; // 원래 순서(동점 깨기)
  part: BodyPart;
  load: number;
  small: boolean;
  stim: Record<string, number>;
};

/** 두 운동이 같이 쓰는 근육 비율(0~1): 겹치는 자극 / 작은 쪽 전체 자극. */
export function stimulusOverlap(a: Readonly<Record<string, number>>, b: Readonly<Record<string, number>>): number {
  let shared = 0;
  let sumA = 0;
  let sumB = 0;
  for (const v of Object.values(a)) sumA += v;
  for (const v of Object.values(b)) sumB += v;
  for (const [k, v] of Object.entries(a)) shared += Math.min(v, b[k] ?? 0);
  const base = Math.min(sumA, sumB);
  return base > 0 ? shared / base : 0;
}

/** 슈퍼세트(붙어 있는 같은 그룹)는 한 덩어리로 묶는다. */
function toUnits(rows: OrderRow[], look: OrderLookups): Unit[] {
  const units: Unit[] = [];
  for (const row of rows) {
    const last = units[units.length - 1];
    if (last && row.supersetGroup !== null && last.rows[0].supersetGroup === row.supersetGroup) {
      last.rows.push(row);
    } else {
      units.push({ rows: [row], index: units.length, part: "core", load: 3, small: true, stim: {} });
    }
  }
  for (const u of units) {
    u.part = look.bodyPartOf(u.rows[0].exerciseId);
    u.load = Math.min(...u.rows.map((r) => LOAD_RANK[look.loadOf(r.exerciseId)]));
    u.small = u.rows.every((r) => SMALL_PARTS.has(look.bodyPartOf(r.exerciseId)));
    const stim: Record<string, number> = {};
    for (const r of u.rows) for (const [k, v] of Object.entries(look.stimulusOf(r.exerciseId))) stim[k] = (stim[k] ?? 0) + v;
    u.stim = stim;
  }
  return units;
}

function streaks(units: Unit[]): number {
  let n = 0;
  for (let i = 1; i < units.length; i++) if (units[i].part === units[i - 1].part) n++;
  return n;
}

/** 작은 근육 단독 운동이 같은 근육을 쓰는 큰 운동보다 먼저 온 수(삼두 → 벤치 같은 것). */
function smallFirst(units: Unit[]): number {
  let n = 0;
  units.forEach((u, i) => {
    if (u.small && units.slice(i + 1).some((o) => !o.small && stimulusOverlap(o.stim, u.stim) > 0.15)) n++;
  });
  return n;
}

function cost(units: Unit[]): number {
  let c = 0;
  for (let i = 1; i < units.length; i++) {
    c += stimulusOverlap(units[i - 1].stim, units[i].stim);
    if (i >= 2) c += 0.5 * stimulusOverlap(units[i - 2].stim, units[i].stim);
  }
  return Math.round(c * 10) / 10;
}

/**
 * 탐욕 배치: 첫 운동은 가장 무거운 큰 근육 운동, 다음부터는 바로 앞(두 칸 앞은 절반)과 근육이 덜
 * 겹치는 것. 작은 근육(팔·코어) 단독은 같은 근육을 쓰는 큰 운동이 남아 있으면 미룬다.
 * 같은 입력이면 늘 같은 결과 — 동점은 원래 순서.
 */
function arrange(units: Unit[]): Unit[] {
  const left = [...units];
  const out: Unit[] = [];
  while (left.length > 0) {
    let best = 0;
    let bestScore = Infinity;
    for (let i = 0; i < left.length; i++) {
      const u = left[i];
      const prev = out[out.length - 1];
      const prev2 = out[out.length - 2];
      let score = 0.25 * u.load;
      if (prev) score += stimulusOverlap(prev.stim, u.stim) + (prev.part === u.part ? 0.4 : 0);
      if (prev2) score += 0.5 * stimulusOverlap(prev2.stim, u.stim);
      if (u.small && left.some((o) => o !== u && !o.small && stimulusOverlap(o.stim, u.stim) > 0.15)) score += 0.8;
      if (!prev) score += u.small ? 1 : 0; // 시작은 큰 근육
      if (score < bestScore - 1e-9) {
        bestScore = score;
        best = i;
      }
    }
    out.push(left.splice(best, 1)[0]);
  }
  return out;
}

function reasonFor(u: Unit, to: number, from: number): OrderReason {
  if (u.small && to > from) return "small-last";
  if (u.load === 0 && to < from) return "heavy-first";
  return "spread";
}

/**
 * 오늘 운동 순서 제안. 바꿀 이유가 적으면(같은 부위 연속이 그대로이고 겹침이 MIN_GAIN 미만으로만 줄면)
 * null — 화면은 "지금 순서도 좋아요".
 */
export function suggestOrder(rows: OrderRow[], look: OrderLookups): OrderSuggestion | null {
  const free = rows.filter((r) => !r.locked);
  if (free.length < 3) return null;
  const units = toUnits(free, look);
  const arranged = arrange(units);
  const streaksBefore = streaks(units);
  const streaksAfter = streaks(arranged);
  const costBefore = cost(units);
  const costAfter = cost(arranged);
  const improved =
    streaksAfter < streaksBefore ||
    smallFirst(arranged) < smallFirst(units) ||
    costBefore - costAfter >= MIN_GAIN;
  if (!improved || arranged.every((u, i) => u === units[i])) return null;

  // 잠긴 행(끝낸 운동)은 원래 자리에 두고, 빈자리를 정리한 순서로 채운다.
  const freeIds = arranged.flatMap((u) => u.rows.map((r) => r.id));
  let k = 0;
  const ids = rows.map((r) => (r.locked ? r.id : freeIds[k++]));

  const fromIndex = new Map(rows.map((r, i) => [r.id, i]));
  const unitOf = new Map(arranged.flatMap((u) => u.rows.map((r) => [r.id, u] as const)));
  const moves = ids
    .map((id, to) => ({ id, from: fromIndex.get(id)!, to }))
    .filter((m) => m.from !== m.to)
    .map((m) => ({ ...m, reason: reasonFor(unitOf.get(m.id)!, m.to, m.from) }));

  return {
    ids,
    streaksBefore,
    streaksAfter,
    costBefore,
    costAfter,
    singlePart: new Set(units.map((u) => u.part)).size === 1,
    moves,
  };
}

/** 대표 부위가 같은 운동이 n개 이상 연달아 있나 — 목록 위 안내 한 줄. */
export function longestSamePartRun(exerciseIds: string[], bodyPartOf: (id: string) => BodyPart): { part: BodyPart; length: number } | null {
  let best: { part: BodyPart; length: number } | null = null;
  let run = 0;
  for (let i = 0; i < exerciseIds.length; i++) {
    const part = bodyPartOf(exerciseIds[i]);
    run = i > 0 && bodyPartOf(exerciseIds[i - 1]) === part ? run + 1 : 1;
    if (!best || run > best.length) best = { part, length: run };
  }
  return best;
}

/** 오늘만 정한 순서(id 목록)를 적용 — 목록에 없는 행(나중에 더한 운동)은 원래 순서대로 뒤에. */
export function applyTodayOrder<T extends { id: string }>(rows: T[], ids: readonly string[] | null): T[] {
  if (!ids || ids.length === 0) return rows;
  const rank = new Map(ids.map((id, i) => [id, i]));
  return rows
    .map((r, i) => ({ r, i, k: rank.get(r.id) ?? ids.length + i }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.r);
}
