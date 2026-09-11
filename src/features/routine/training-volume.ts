/**
 * 주당 **직접 세트 수** — "얼마나 들었나"(볼륨 kg) 대신 "그 근육을 몇 세트 했나".
 *
 * 왜 바꾸나: 기존 밸런스는 **내 최강 부위 대비 비율**(70%/40%)이라 전부 적게 해도
 * "균형", 전부 많이 해도 누군가는 "부족"이 됐다. 상대 기준에는 **기준이 없다**.
 * 근비대 연구가 쓰는 표준 지표는 **근육군당 주당 직접 세트 수**이고 권장 구간이
 * 있으므로(아래), 같은 화면이 "6세트 — 권장 10~20 미달"처럼 **절대 근거**를 말할 수 있다.
 *
 * 🔴 **'직접' 세트만 센다.** 벤치프레스를 가슴 1세트로 세고 삼두·전면삼각근에는
 * 안 얹는다. 간접(협응) 볼륨을 반 세트씩 얹는 방식도 있지만, 이 앱의 세부근육 매핑은
 * 1,351개 중 114개만 명시(나머지는 이름·타깃 추론)라 간접까지 세면 **추론 오차가
 * 곱해진다**. 권장 구간 10~20 자체가 직접 세트 기준이라 서로 맞기도 한다.
 *
 * server-only 의존성 없는 순수 함수. 운동 카탈로그도 import 하지 않는다 —
 * 세부근육 조회는 호출자가 함수로 넘긴다(클라 번들에 목록 1,237개가 실리면 안 된다).
 */

import { REGION_LIST, type Region } from "@/features/routine/score";
import type { SetDetail } from "@/features/routine/set-details";

/**
 * 근육군당 주당 직접 세트 권장 구간.
 * 10 미만이면 자극이 모자라고, 20을 넘으면 회복이 따라오지 못하는 쪽으로 기운다.
 * (근비대 문헌의 통상 권고 구간 — 개인차가 크므로 '경고'가 아니라 '참고선'으로 쓴다.)
 */
export const WEEKLY_SET_MIN = 10;
export const WEEKLY_SET_MAX = 20;

export type VolumeStatus = "none" | "low" | "optimal" | "high";

export const VOLUME_LABEL: Record<VolumeStatus, string> = {
  none: "안 함",
  low: "부족",
  optimal: "적정",
  high: "많음",
};

export const VOLUME_COLOR: Record<VolumeStatus, string> = {
  none: "#f43f5e", // rose-500
  low: "#f59e0b", // amber-500
  optimal: "#10b981", // emerald-500
  // 많은 건 '나쁨'이 아니라 '회복을 보라'는 뜻이라 빨강을 쓰지 않는다.
  high: "#3b82f6", // blue-500
};

export function volumeStatusFor(sets: number): VolumeStatus {
  if (sets <= 0) return "none";
  if (sets < WEEKLY_SET_MIN) return "low";
  if (sets <= WEEKLY_SET_MAX) return "optimal";
  return "high";
}

/** 세부근육 id → 부위. id 앞머리가 부위라 접두사로 가른다(lower 만 region 이름이 다르다). */
export function regionOfSubMuscle(subId: string): Region | null {
  const prefix = subId.split("-")[0];
  if (prefix === "lower") return "leg";
  return (REGION_LIST as string[]).includes(prefix) ? (prefix as Region) : null;
}

/** focus 값 중 부위가 하나로 정해지는 것만(push·pull·fullbody 같은 세션 묶음은 제외). */
const FOCUS_REGION: Record<string, Region> = {
  chest: "chest",
  back: "back",
  shoulder: "shoulder",
  arm: "arm",
  lower: "leg",
  core: "core",
};

export type SetRecord = {
  forDate: string;
  /** 카탈로그 운동 id. null 이면 focus 로만 판정한다. */
  exerciseId?: string | null;
  /** 그날 그 운동의 부위. 세부근육으로 부위를 못 정할 때의 폴백. */
  focus?: string | null;
  sets?: number | null;
  /** 세트별 기록이 있으면 그 길이가 진짜 세트 수다(드롭세트·피라미드). */
  setDetails?: SetDetail[] | null;
};

/** 한 기록의 세트 수. 세트별 기록 우선, 없으면 sets, 그것도 없으면 1. */
export function setCountOf(r: SetRecord): number {
  const d = r.setDetails;
  if (Array.isArray(d) && d.length > 0) return d.length;
  const n = r.sets ?? 1;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

/** 운동 id → 세부근육 id 목록. 호출자가 카탈로그를 아는 쪽에서 넘긴다. */
export type SubsOf = (exerciseId: string) => string[];

/** 운동 id → 세부근육별 기여도(주동근 1.0, 거드는 쪽은 낮게). */
export type SubWeightsOf = (
  exerciseId: string,
) => { id: string; weight: number }[];

/**
 * 이 기록이 **직접** 때리는 부위 하나.
 *
 * 세부근육 매핑의 **첫 항목**을 주동근으로 본다(명시 매핑도 추론도 가장 특이적인 것을
 * 앞에 둔다). 매핑이 없으면 focus 로 떨어지고, focus 가 push/pull 처럼 여러 부위를
 * 묶은 세션 이름이면 **아무 데도 안 센다** — 어디를 직접 했는지 모르는데 찍어서
 * 세면 그 숫자로 "부족/적정"을 말할 수 없다.
 */
export function primaryRegionOf(r: SetRecord, subsOf: SubsOf): Region | null {
  if (r.exerciseId) {
    for (const s of subsOf(r.exerciseId)) {
      const reg = regionOfSubMuscle(s);
      if (reg) return reg;
    }
  }
  return r.focus ? (FOCUS_REGION[r.focus] ?? null) : null;
}

function emptyRegions(): Record<Region, number> {
  return Object.fromEntries(REGION_LIST.map((r) => [r, 0])) as Record<
    Region,
    number
  >;
}

function inRange(ymd: string, fromYmd: string, toYmd: string): boolean {
  return ymd >= fromYmd && ymd <= toYmd;
}

/** 기간(양끝 포함) 안의 부위별 직접 세트 수. */
export function setsByRegion(
  records: readonly SetRecord[],
  subsOf: SubsOf,
  fromYmd: string,
  toYmd: string,
): Record<Region, number> {
  const out = emptyRegions();
  for (const r of records) {
    if (!inRange(r.forDate, fromYmd, toYmd)) continue;
    const reg = primaryRegionOf(r, subsOf);
    if (!reg) continue;
    out[reg] += setCountOf(r);
  }
  return out;
}

/**
 * 기간 안의 **세부근육별** 세트 수.
 *
 * ⚠ 부위와 달리 이 숫자는 **크기 비교에 쓰면 안 된다.** 매핑이 1,351개 중 114개만
 * 명시라, 세부근육마다 걸리는 운동 수가 13배까지 차이 난다(상복부 254 ↔ 하복부 19).
 * 그래서 화면은 "몇 세트가 부족"이 아니라 **"이번 주 한 번도 안 건드림"(0세트)** 만
 * 말한다 — 0 이냐 아니냐는 매핑 편향과 무관하게 참이다.
 */
export function setsBySubMuscle(
  records: readonly SetRecord[],
  subWeightsOf: SubWeightsOf,
  fromYmd: string,
  toYmd: string,
  /** 이 기여도 이상만 센다. 0 이면 스치기만 한 것도 포함. */
  minWeight = 0,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of records) {
    if (!r.exerciseId || !inRange(r.forDate, fromYmd, toYmd)) continue;
    const n = setCountOf(r);
    // 나눠 담지 않는다 — "몇 세트나 이 근육을 건드렸나"이지 배분이 아니다.
    for (const w of subWeightsOf(r.exerciseId)) {
      if (w.weight < minWeight) continue;
      out[w.id] = (out[w.id] ?? 0) + n;
    }
  }
  return out;
}

/**
 * 부위별 **마지막으로 한 날**. 기록이 없으면 null.
 * 밸런스는 "얼마나"만 보는데, 주 1회 몰아치기와 주 3회 분산이 같은 점수로 나온다 —
 * "언제"를 같이 보여줘야 그 둘이 구분된다.
 */
export function lastTrainedByRegion(
  records: readonly SetRecord[],
  subsOf: SubsOf,
): Record<Region, string | null> {
  const out = Object.fromEntries(REGION_LIST.map((r) => [r, null])) as Record<
    Region,
    string | null
  >;
  for (const r of records) {
    const reg = primaryRegionOf(r, subsOf);
    if (!reg) continue;
    const cur = out[reg];
    if (cur === null || r.forDate > cur) out[reg] = r.forDate;
  }
  return out;
}

/** YYYY-MM-DD 두 날 사이의 일수. 날짜가 없으면 null. */
export function daysAgo(ymd: string | null, todayYmd: string): number | null {
  if (!ymd) return null;
  const a = Date.parse(`${ymd}T00:00:00Z`);
  const b = Date.parse(`${todayYmd}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

/* ─── 밀기/당기기 · 상하체 균형 ──────────────────────────────────────── */

export type Balance = {
  a: number;
  b: number;
  /** a / b. b 가 0 이면 null — "무한배 많다"고 말할 수 없다. */
  ratio: number | null;
  /** 한쪽이 다른 쪽의 1.5배를 넘으면 기운 것으로 본다. */
  skewed: boolean;
};

const SKEW = 1.5;

function makeBalance(a: number, b: number): Balance {
  if (a + b === 0) return { a, b, ratio: null, skewed: false };
  const ratio = b > 0 ? a / b : null;
  return { a, b, ratio, skewed: ratio === null || ratio > SKEW || ratio < 1 / SKEW };
}

/**
 * 밀기(가슴·어깨) ↔ 당기기(등).
 * 팔은 **어느 쪽에도 안 넣는다** — 이두는 당기기, 삼두는 밀기인데 지금 구조는 둘을
 * '팔' 하나로 묶는다. 통째로 한쪽에 얹으면 팔 때문에 기운 것처럼 보인다.
 */
export function pushPullBalance(sets: Record<Region, number>): Balance {
  return makeBalance(sets.chest + sets.shoulder, sets.back);
}

/** 상체(가슴·등·어깨·팔) ↔ 하체(다리). */
export function upperLowerBalance(sets: Record<Region, number>): Balance {
  return makeBalance(
    sets.chest + sets.back + sets.shoulder + sets.arm,
    sets.leg,
  );
}

/* ─── 주간 히트맵 ───────────────────────────────────────────────────── */

export type HeatmapDay = {
  ymd: string;
  /** 0=월 … 6=일 */
  weekday: number;
  byRegion: Record<Region, number>;
  total: number;
};

/** 주 시작(월요일)부터 7일. 서버가 계산해 클라이언트에는 이 결과만 내려준다. */
export function weekHeatmap(
  records: readonly SetRecord[],
  subsOf: SubsOf,
  weekStartYmd: string,
): HeatmapDay[] {
  const days: HeatmapDay[] = [];
  for (let i = 0; i < 7; i += 1) {
    const ymd = addDays(weekStartYmd, i);
    const byRegion = setsByRegion(records, subsOf, ymd, ymd);
    days.push({
      ymd,
      weekday: i,
      byRegion,
      total: REGION_LIST.reduce((s, r) => s + byRegion[r], 0),
    });
  }
  return days;
}

/** YYYY-MM-DD 를 n일 이동. */
export function addDays(ymd: string, n: number): string {
  const t = Date.parse(`${ymd}T00:00:00Z`);
  if (!Number.isFinite(t)) return ymd;
  return new Date(t + n * 86_400_000).toISOString().slice(0, 10);
}

/** 그 날짜가 속한 주의 월요일. */
export function weekStartOf(ymd: string): string {
  const t = Date.parse(`${ymd}T00:00:00Z`);
  if (!Number.isFinite(t)) return ymd;
  const dow = new Date(t).getUTCDay(); // 0=일
  return addDays(ymd, -(dow === 0 ? 6 : dow - 1));
}
