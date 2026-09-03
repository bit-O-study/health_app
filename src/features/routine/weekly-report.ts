/**
 * 주간 통합 리포트 — 로드맵 2.3. **순수 로직**(DB/React 의존 없음, 테스트 공용).
 *
 * 정한 기준 세 가지. 여기가 흔들리면 숫자가 거짓말을 한다.
 *
 * 1) **주 경계는 월요일, 날짜는 서울 기준.**
 *    DB 의 `for_date` 는 이미 서울 날짜로 적힌다(`seoulYmd`). 그래서 여기서는
 *    타임존 계산을 다시 하지 않고 `YYYY-MM-DD` 문자열만 비교한다 — UTC 로 한 번 더
 *    변환하면 자정 근처 기록이 하루씩 밀린다.
 *
 * 2) **이번 주는 아직 안 끝났다 — 지난주와 같은 요일까지만 견준다.**
 *    화요일에 "이번 주 2일 vs 지난주 7일" 을 보여주면 항상 폭락한 것처럼 보인다.
 *    그래서 지난주도 **같은 요일까지** 잘라서 비교한다. 주가 끝나면 둘 다 7일이라
 *    자연히 전체 비교가 된다.
 *
 * 3) **기록이 없는 날은 0 이지 '누락' 이 아니다.**
 *    다만 비율(식단 기록률)의 분모는 **지난 날 수**다 — 화요일에 2/7=29% 로 보이면
 *    기록을 다 했는데도 실패한 것처럼 읽힌다.
 */

import {
  recordVolume,
  weekStartYmd,
  shiftYmd,
  type ProgressRecord,
} from "@/features/routine/progress";
import {
  BODY_PART_LABEL,
  BODY_PART_ORDER,
  type BodyPart,
} from "@/features/routine/exercise-catalog-labels";
import { primaryBodyPart } from "@/features/routine/exercise-body-parts";

/** 하루 한 줄로 들어오는 값들(없는 날은 아예 안 들어온다). */
export type DailyValue = { forDate: string; value: number };

export type WeeklyInput = {
  /** 완료한 본운동 기록(넘긴 것 포함 — 여기서 거른다). */
  completions: ProgressRecord[];
  /** 날짜별 운동 시간(초). */
  workoutSeconds: DailyValue[];
  /** 날짜별 러닝 거리(m). */
  runMeters: DailyValue[];
  /** 날짜별 걸음 수. */
  steps: DailyValue[];
  /** 식단을 한 줄이라도 적은 날짜들. */
  dietLoggedDates: string[];
};

export type BodyPartShare = {
  part: BodyPart;
  label: string;
  volume: number;
  /** 전체 볼륨 대비 비율(0~1). 볼륨이 0이면 0. */
  ratio: number;
};

export type WeeklyTotals = {
  /** 이 주의 월요일. */
  weekStart: string;
  /** 집계에 들어간 날 수(이번 주는 오늘까지, 지난주는 같은 요일까지). */
  days: number;
  /** 운동한 날 수(본운동 완료가 하나라도 있는 날). */
  workoutDays: number;
  /** 완료한 본운동 개수. */
  exerciseCount: number;
  workoutMinutes: number;
  volumeKg: number;
  bodyParts: BodyPartShare[];
  runMeters: number;
  steps: number;
  dietLoggedDays: number;
  /** 식단을 적은 날 / 지난 날. 0~1. */
  dietRate: number;
};

/** 지난주 대비 변화. `pct` 는 지난주가 0이면 null(무한대로 늘었다고 말할 수 없다). */
export type Delta = { diff: number; pct: number | null };

export type WeeklyReport = {
  current: WeeklyTotals;
  previous: WeeklyTotals;
  /** 이번 주가 아직 안 끝났나(비교가 '같은 요일까지' 임을 알려야 한다). */
  partial: boolean;
  deltas: {
    workoutDays: Delta;
    exerciseCount: Delta;
    workoutMinutes: Delta;
    volumeKg: Delta;
    runMeters: Delta;
    steps: Delta;
    dietRate: Delta;
  };
};

/** 두 날짜(포함) 사이의 날 수. 같은 날이면 1. */
export function daysBetween(fromYmd: string, toYmd: string): number {
  const ms = Date.parse(`${toYmd}T00:00:00Z`) - Date.parse(`${fromYmd}T00:00:00Z`);
  if (!Number.isFinite(ms)) return 0;
  return Math.max(0, Math.round(ms / 86_400_000) + 1);
}

function inRange(ymd: string, fromYmd: string, toYmd: string): boolean {
  return ymd >= fromYmd && ymd <= toYmd;
}

function sumDaily(rows: readonly DailyValue[], from: string, to: string): number {
  let total = 0;
  for (const r of rows) if (inRange(r.forDate, from, to)) total += r.value;
  return total;
}

/** 부위별 볼륨 분포 — 볼륨이 0인 부위는 빼고, 많은 순으로. */
function bodyPartShares(
  volumeByPart: Map<BodyPart, number>,
  total: number,
): BodyPartShare[] {
  return BODY_PART_ORDER.map((part) => ({
    part,
    label: BODY_PART_LABEL[part],
    volume: Math.round(volumeByPart.get(part) ?? 0),
    ratio: total > 0 ? (volumeByPart.get(part) ?? 0) / total : 0,
  }))
    .filter((p) => p.volume > 0)
    .sort((a, b) => b.volume - a.volume);
}

/** 한 구간(from~to, 양끝 포함)의 집계. */
export function totalsFor(
  input: WeeklyInput,
  weekStart: string,
  fromYmd: string,
  toYmd: string,
): WeeklyTotals {
  const done = input.completions.filter(
    (c) => c.status === "done" && inRange(c.forDate, fromYmd, toYmd),
  );

  const workoutDates = new Set<string>();
  const volumeByPart = new Map<BodyPart, number>();
  let volume = 0;
  for (const c of done) {
    workoutDates.add(c.forDate);
    const v = recordVolume(c);
    volume += v;
    if (v > 0 && c.exerciseId) {
      const part = primaryBodyPart(c.exerciseId);
      volumeByPart.set(part, (volumeByPart.get(part) ?? 0) + v);
    }
  }

  const days = daysBetween(fromYmd, toYmd);
  const dietDays = new Set(
    input.dietLoggedDates.filter((d) => inRange(d, fromYmd, toYmd)),
  ).size;

  return {
    weekStart,
    days,
    workoutDays: workoutDates.size,
    exerciseCount: done.length,
    workoutMinutes: Math.round(sumDaily(input.workoutSeconds, fromYmd, toYmd) / 60),
    volumeKg: Math.round(volume),
    bodyParts: bodyPartShares(volumeByPart, volume),
    runMeters: Math.round(sumDaily(input.runMeters, fromYmd, toYmd)),
    steps: Math.round(sumDaily(input.steps, fromYmd, toYmd)),
    dietLoggedDays: dietDays,
    // 분모는 '지난 날' — 화요일에 2/7 로 보이면 다 적고도 실패한 것처럼 읽힌다.
    dietRate: days > 0 ? dietDays / days : 0,
  };
}

function delta(current: number, previous: number): Delta {
  const diff = Math.round((current - previous) * 100) / 100;
  // 지난주가 0이면 변화율을 말할 수 없다(0 → 5 는 몇 % 인가?). null 로 두고
  // 화면이 '신규' 로 표현하게 한다.
  const pct = previous > 0 ? Math.round(((current - previous) / previous) * 100) : null;
  return { diff, pct };
}

/**
 * 이번 주 리포트와 지난주 비교.
 *
 * @param todayYmd 서울 기준 오늘. 이 날까지만 이번 주에 넣고, 지난주도 **같은 요일까지** 자른다.
 */
export function weeklyReport(
  input: WeeklyInput,
  todayYmd: string,
): WeeklyReport {
  const thisWeekStart = weekStartYmd(todayYmd);
  const lastWeekStart = shiftYmd(thisWeekStart, -7);
  const elapsed = daysBetween(thisWeekStart, todayYmd); // 1~7
  // 지난주도 같은 길이로 자른다 — 진행 중인 주를 끝난 주와 견주면 항상 폭락으로 보인다.
  const lastWeekEnd = shiftYmd(lastWeekStart, elapsed - 1);

  const current = totalsFor(input, thisWeekStart, thisWeekStart, todayYmd);
  const previous = totalsFor(input, lastWeekStart, lastWeekStart, lastWeekEnd);

  return {
    current,
    previous,
    partial: elapsed < 7,
    deltas: {
      workoutDays: delta(current.workoutDays, previous.workoutDays),
      exerciseCount: delta(current.exerciseCount, previous.exerciseCount),
      workoutMinutes: delta(current.workoutMinutes, previous.workoutMinutes),
      volumeKg: delta(current.volumeKg, previous.volumeKg),
      runMeters: delta(current.runMeters, previous.runMeters),
      steps: delta(current.steps, previous.steps),
      dietRate: delta(
        Math.round(current.dietRate * 100),
        Math.round(previous.dietRate * 100),
      ),
    },
  };
}

/** 리포트에 보여줄 게 하나라도 있나 — 전부 0이면 카드를 띄우지 않는다. */
export function hasWeeklyActivity(t: WeeklyTotals): boolean {
  return (
    t.exerciseCount > 0 ||
    t.workoutMinutes > 0 ||
    t.runMeters > 0 ||
    t.steps > 0 ||
    t.dietLoggedDays > 0
  );
}

/** 거리 표기 — 1km 미만은 m, 그 이상은 소수 한 자리 km. */
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

/** 시간 표기 — 60분 미만은 분, 그 이상은 '1시간 20분'. */
export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}분`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}시간` : `${h}시간 ${m}분`;
}
