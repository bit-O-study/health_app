/**
 * 점진적 과부하 추적 — 완료 운동 기록을 1RM 추이·총 볼륨 시계열로 집계한다.
 * server-only 의존성 없는 순수 함수(페이지·테스트 공용).
 *
 * 집계 기준 세 가지(2026-09-01 정리):
 *  1) **세트별 기록이 있으면 그걸 쓴다.** 이 앱은 드롭세트·피라미드를 `set_details`
 *     로 저장하는데, 예전엔 집계가 그걸 안 읽고 균일 세트(sets×reps@weight)로만
 *     계산해 실제와 다른 값을 그렸다. 세트별 값이 있으면 세트마다 더한다.
 *  2) **단측 운동은 볼륨만 ×2.** 사용자는 한쪽 기준으로 적는다(`unilateral-exercises`).
 *  3) **맨몸(무게 0)은 볼륨 0.** 볼륨은 "든 무게의 총합"이라 맨몸은 셀 수가 없다.
 *     운동을 안 한 것으로 보이지 않게, 화면에서는 볼륨과 별개로 다뤄야 한다.
 */

import { loadClassOf } from "@/features/routine/exercise-load";
import type { SetDetail } from "@/features/routine/set-details";
import { volumeSideFactor } from "@/features/routine/unilateral-exercises";

export type ProgressRecord = {
  forDate: string;
  exerciseId: string | null;
  status: "done" | "skipped";
  sets: number | null;
  reps: number | null;
  weightKg: number | null;
  /** 세트별 무게·횟수 스냅샷. null = 균일 세트(sets×reps@weightKg). */
  setDetails?: SetDetail[] | null;
};

export type Point = { date: string; value: number };

/** 추정 1RM (Epley): weight × (1 + reps/30). 맨몸/0중량/0회는 0(추정 불가). */
export function estimate1RM(
  weightKg: number | null,
  reps: number | null,
): number {
  const w = weightKg ?? 0;
  const r = reps ?? 0;
  if (w <= 0 || r <= 0) return 0;
  if (r === 1) return w;
  return Math.round(w * (1 + r / 30) * 10) / 10;
}

/** 1세트 등가 볼륨 = sets × reps × weight(맨몸=0). */
export function setVolume(
  sets: number | null,
  reps: number | null,
  weightKg: number | null,
): number {
  const s = sets ?? 0;
  const r = reps ?? 0;
  const w = weightKg ?? 0;
  return s * r * Math.max(0, w);
}

/** 세트별 기록이 쓸 만한가 — 비었거나 형식이 깨졌으면 균일 세트로 되돌린다. */
function usableDetails(r: ProgressRecord): SetDetail[] | null {
  const d = r.setDetails;
  return Array.isArray(d) && d.length > 0 ? d : null;
}

/**
 * 한 기록의 볼륨 — 세트별 값이 있으면 세트마다, 없으면 균일 세트로. 단측이면 ×2.
 */
export function recordVolume(r: ProgressRecord): number {
  const details = usableDetails(r);
  const base = details
    ? details.reduce(
        (sum, s) => sum + s.reps * Math.max(0, s.weightKg ?? 0),
        0,
      )
    : setVolume(r.sets, r.reps, r.weightKg);
  return base * volumeSideFactor(r.exerciseId);
}

/**
 * 한 기록의 추정 1RM — 세트별 값이 있으면 **세트 중 최고치**.
 * 드롭세트는 뒤로 갈수록 가벼워지므로 평균이나 마지막 세트를 쓰면 힘이 낮게 잡힌다.
 * 단측 운동도 두 배로 하지 않는다(한쪽이 든 무게가 그 팔의 능력이다).
 */
export function recordOneRM(r: ProgressRecord): number {
  const details = usableDetails(r);
  if (!details) return estimate1RM(r.weightKg, r.reps);
  let best = 0;
  for (const s of details) best = Math.max(best, estimate1RM(s.weightKg, s.reps));
  return best;
}

const byDateAsc = (a: Point, b: Point) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

/** 날짜별 총 볼륨 시계열(오름차순). */
export function dailyVolumeSeries(records: ProgressRecord[]): Point[] {
  const map = new Map<string, number>();
  for (const c of records) {
    if (c.status !== "done") continue;
    const v = recordVolume(c);
    if (v <= 0) continue;
    map.set(c.forDate, (map.get(c.forDate) ?? 0) + v);
  }
  return [...map.entries()]
    .map(([date, value]) => ({ date, value: Math.round(value) }))
    .sort(byDateAsc);
}

/** 특정 종목의 날짜별 추정 1RM 최고치 시계열(오름차순). */
export function oneRMSeries(
  records: ProgressRecord[],
  exerciseId: string,
): Point[] {
  const map = new Map<string, number>();
  for (const c of records) {
    if (c.status !== "done" || c.exerciseId !== exerciseId) continue;
    const e = recordOneRM(c);
    if (e <= 0) continue;
    map.set(c.forDate, Math.max(map.get(c.forDate) ?? 0, e));
  }
  return [...map.entries()].map(([date, value]) => ({ date, value })).sort(byDateAsc);
}

/** 총 볼륨이 많은 종목 순위(중량 운동만 — 1RM 추적 대상 선정용). */
export function topExercisesByVolume(
  records: ProgressRecord[],
  n = 6,
): { exerciseId: string; volume: number }[] {
  const map = new Map<string, number>();
  for (const c of records) {
    if (c.status !== "done" || !c.exerciseId) continue;
    const v = recordVolume(c);
    if (v <= 0) continue;
    map.set(c.exerciseId, (map.get(c.exerciseId) ?? 0) + v);
  }
  return [...map.entries()]
    .map(([exerciseId, volume]) => ({ exerciseId, volume: Math.round(volume) }))
    .sort((a, b) => b.volume - a.volume)
    .slice(0, n);
}

/** 시계열 첫 값 대비 마지막 값 변화율(%). 데이터 2개 미만이거나 첫 값 0이면 null. */
export function trendPct(series: Point[]): number | null {
  if (series.length < 2) return null;
  const first = series[0].value;
  const last = series[series.length - 1].value;
  if (first <= 0) return null;
  return Math.round(((last - first) / first) * 100);
}

/* ─── 주간 집계 ──────────────────────────────────────────────────────── */

/**
 * 그 날짜가 속한 주의 **월요일** 날짜(YYYY-MM-DD).
 * 주 경계를 월요일로 두는 건 이 앱의 다른 주간 기능(그룹 MVP)과 같은 기준이다.
 */
export function weekStartYmd(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  const dt = new Date(Date.UTC(y, m - 1, d));
  const jsDay = dt.getUTCDay(); // 0=일
  const backToMonday = jsDay === 0 ? 6 : jsDay - 1;
  dt.setUTCDate(dt.getUTCDate() - backToMonday);
  return dt.toISOString().slice(0, 10);
}

/**
 * 주(월요일)별 총 볼륨 시계열(오름차순).
 *
 * 일별 그래프는 "운동한 날/쉰 날"이 번갈아 나와 톱니처럼 보여서 늘고 있는지가 잘
 * 안 보인다. 주 단위로 묶으면 훈련량 추세가 드러난다.
 */
export function weeklyVolumeSeries(records: ProgressRecord[]): Point[] {
  const map = new Map<string, number>();
  for (const c of records) {
    if (c.status !== "done") continue;
    const v = recordVolume(c);
    if (v <= 0) continue;
    const wk = weekStartYmd(c.forDate);
    map.set(wk, (map.get(wk) ?? 0) + v);
  }
  return [...map.entries()]
    .map(([date, value]) => ({ date, value: Math.round(value) }))
    .sort(byDateAsc);
}

/* ─── 종목별 이력 ────────────────────────────────────────────────────── */

/** 한 종목의 한 날 수행 요약. */
export type ExerciseSession = {
  date: string;
  /** 그날 한 세트 수(세트별 기록이 있으면 그 길이). */
  sets: number;
  /** 대표 횟수 — 세트별이면 최고 무게 세트의 횟수. */
  reps: number;
  /** 대표 무게(kg). 맨몸이면 null. */
  weightKg: number | null;
  volume: number;
  oneRm: number;
};

/** 무게가 가장 무거운 세트 — 대표값(무게·횟수) 뽑는 기준. */
function heaviestSet(details: SetDetail[]): SetDetail {
  return details.reduce((best, s) =>
    (s.weightKg ?? 0) > (best.weightKg ?? 0) ? s : best,
  );
}

/**
 * 한 종목의 날짜별 수행 이력(최신순). 같은 날 여러 번 했으면 합친다
 * (세트는 더하고, 대표 무게·1RM 은 그날 최고치).
 */
export function exerciseHistory(
  records: ProgressRecord[],
  exerciseId: string,
): ExerciseSession[] {
  const byDate = new Map<string, ExerciseSession>();
  for (const c of records) {
    if (c.status !== "done" || c.exerciseId !== exerciseId) continue;
    const details = usableDetails(c);
    const top = details ? heaviestSet(details) : null;
    const one: ExerciseSession = {
      date: c.forDate,
      sets: details ? details.length : (c.sets ?? 0),
      reps: top ? top.reps : (c.reps ?? 0),
      weightKg: top ? top.weightKg : c.weightKg,
      volume: recordVolume(c),
      oneRm: recordOneRM(c),
    };
    const cur = byDate.get(c.forDate);
    if (!cur) {
      byDate.set(c.forDate, one);
      continue;
    }
    // 같은 날 두 번 이상 — 한 일은 더하고, '그날 얼마나 셌나'는 최고치로.
    const heavier = (one.weightKg ?? 0) > (cur.weightKg ?? 0);
    byDate.set(c.forDate, {
      date: cur.date,
      sets: cur.sets + one.sets,
      reps: heavier ? one.reps : cur.reps,
      weightKg: heavier ? one.weightKg : cur.weightKg,
      volume: cur.volume + one.volume,
      oneRm: Math.max(cur.oneRm, one.oneRm),
    });
  }
  return [...byDate.values()].sort((a, b) => (a.date < b.date ? 1 : -1));
}

/* ─── 개인 기록(PR) ──────────────────────────────────────────────────── */

export type PersonalRecord = {
  exerciseId: string;
  /** 최고 추정 1RM 과 그날. */
  bestOneRm: number;
  bestOneRmDate: string;
  /** 한 세션에서 든 가장 무거운 무게와 그날. */
  bestWeightKg: number;
  bestWeightDate: string;
  /** 하루 최고 볼륨과 그날. */
  bestVolume: number;
  bestVolumeDate: string;
};

/**
 * 종목별 개인 기록. 이력이 없는 종목은 결과에 없다.
 *
 * 같은 값이 여러 번 나오면 **처음 달성한 날**을 남긴다 — "언제 이 무게에 올라섰나"가
 * 알고 싶은 것이지, 마지막으로 같은 무게를 한 날이 아니다.
 */
export function personalRecords(
  records: ProgressRecord[],
): Map<string, PersonalRecord> {
  const out = new Map<string, PersonalRecord>();
  // 볼륨은 '하루 합계' 기준이라 종목별 이력을 먼저 만든다.
  const ids = new Set(
    records
      .filter((c) => c.status === "done" && c.exerciseId)
      .map((c) => c.exerciseId as string),
  );
  for (const id of ids) {
    const sessions = exerciseHistory(records, id);
    let pr: PersonalRecord | null = null;
    // 오래된 날부터 훑어야 '처음 달성한 날'이 남는다.
    for (const s of [...sessions].reverse()) {
      if (!pr) {
        pr = {
          exerciseId: id,
          bestOneRm: s.oneRm,
          bestOneRmDate: s.date,
          bestWeightKg: s.weightKg ?? 0,
          bestWeightDate: s.date,
          bestVolume: s.volume,
          bestVolumeDate: s.date,
        };
        continue;
      }
      if (s.oneRm > pr.bestOneRm) {
        pr.bestOneRm = s.oneRm;
        pr.bestOneRmDate = s.date;
      }
      if ((s.weightKg ?? 0) > pr.bestWeightKg) {
        pr.bestWeightKg = s.weightKg ?? 0;
        pr.bestWeightDate = s.date;
      }
      if (s.volume > pr.bestVolume) {
        pr.bestVolume = s.volume;
        pr.bestVolumeDate = s.date;
      }
    }
    if (pr && (pr.bestOneRm > 0 || pr.bestVolume > 0)) out.set(id, pr);
  }
  return out;
}

/** 최근 며칠 안에 갱신된 기록 — 화면에 "새 기록" 으로 띄울 것. */
export type RecentPr = {
  exerciseId: string;
  kind: "oneRm" | "weight";
  value: number;
  date: string;
};

/**
 * 최근 `days` 일 안에 세운 개인 기록. 최신순.
 * 1RM 과 최고 무게가 같은 날 같이 갱신되면 1RM 하나만 내보낸다(같은 사건이다).
 */
export function recentPersonalRecords(
  records: ProgressRecord[],
  todayYmd: string,
  days = 30,
): RecentPr[] {
  const since = shiftYmd(todayYmd, -days);
  const out: RecentPr[] = [];
  for (const pr of personalRecords(records).values()) {
    const oneRmFresh = pr.bestOneRm > 0 && pr.bestOneRmDate >= since;
    if (oneRmFresh) {
      out.push({
        exerciseId: pr.exerciseId,
        kind: "oneRm",
        value: pr.bestOneRm,
        date: pr.bestOneRmDate,
      });
    }
    const weightFresh = pr.bestWeightKg > 0 && pr.bestWeightDate >= since;
    if (weightFresh && !(oneRmFresh && pr.bestWeightDate === pr.bestOneRmDate)) {
      out.push({
        exerciseId: pr.exerciseId,
        kind: "weight",
        value: pr.bestWeightKg,
        date: pr.bestWeightDate,
      });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

/** YYYY-MM-DD 를 n일 이동. */
export function shiftYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return ymd;
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

/* ─── 최근 수행 비교 · 다음 권장 중량 ────────────────────────────────── */

/**
 * 종목별 증량 단위(kg) — 강도 등급으로 정한다.
 * 큰 복합운동은 원판 한 쌍(5kg), 덤벨·머신은 2.5kg, 소근육 고립은 1.25kg.
 * 맨몸은 무게로 올릴 수 없어 `null`(횟수를 늘리는 게 맞다).
 */
export function weightStepKg(exerciseId: string): number | null {
  switch (loadClassOf(exerciseId)) {
    case "heavy":
      return 5;
    case "medium":
      return 2.5;
    case "light":
      return 1.25;
    default:
      return null;
  }
}

export type NextWeightAdvice = {
  exerciseId: string;
  /** 지난번 대표 무게(최고 세트). 맨몸이면 null. */
  lastWeightKg: number | null;
  /** 지난번 대표 횟수. */
  lastReps: number;
  /** 지난번 대비 추정 1RM 변화(kg). 비교할 이전 기록이 없으면 null. */
  changeKg: number | null;
  /** 권장 무게(kg). 근거가 부족하거나 맨몸이면 null. */
  suggestedKg: number | null;
  reason: "increase" | "hold" | "first" | "bodyweight" | "none";
};

/**
 * 최근 수행을 견줘 다음에 들 무게를 제안한다.
 *
 * 여기서는 **직전 두 세션만** 본다 — 정체 감지·디로드처럼 여러 세션을 보는 규칙은
 * 2.2(점진적 과부하 추천)의 일이다. 규칙은 하나뿐이라 사용자가 납득할 수 있다:
 * *지난번보다 떨어지지 않았으면 한 단계 올리고, 떨어졌으면 그대로 간다.*
 *
 * 제안일 뿐이고 실제 무게는 사용자가 정한다 — 그래서 근거(`changeKg`)를 같이 준다.
 */
export function nextWeightAdvice(
  records: ProgressRecord[],
  exerciseId: string,
): NextWeightAdvice {
  const sessions = exerciseHistory(records, exerciseId);
  const none: NextWeightAdvice = {
    exerciseId,
    lastWeightKg: null,
    lastReps: 0,
    changeKg: null,
    suggestedKg: null,
    reason: "none",
  };
  const last = sessions[0];
  if (!last) return none;

  const step = weightStepKg(exerciseId);
  const base = {
    exerciseId,
    lastWeightKg: last.weightKg,
    lastReps: last.reps,
  };
  // 맨몸은 무게 제안이 의미가 없다 — 횟수를 늘리는 종목이다.
  if (step === null || (last.weightKg ?? 0) <= 0) {
    return { ...base, changeKg: null, suggestedKg: null, reason: "bodyweight" };
  }

  const prev = sessions[1];
  if (!prev || prev.oneRm <= 0) {
    // 첫 기록 — 비교 대상이 없으니 같은 무게로 한 번 더 해보고 판단한다.
    return {
      ...base,
      changeKg: null,
      suggestedKg: last.weightKg,
      reason: "first",
    };
  }

  const changeKg = Math.round((last.oneRm - prev.oneRm) * 10) / 10;
  if (changeKg < 0) {
    return { ...base, changeKg, suggestedKg: last.weightKg, reason: "hold" };
  }
  return {
    ...base,
    changeKg,
    suggestedKg: Math.round(((last.weightKg ?? 0) + step) * 100) / 100,
    reason: "increase",
  };
}
