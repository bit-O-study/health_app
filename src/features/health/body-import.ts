/**
 * Health Connect 체중·체성분 → 이 앱의 체형 기록 — 로드맵 6.1.
 *
 * 순수 모듈(브라우저·DB 의존 없음). 네이티브에서 읽은 레코드를 이 앱이 저장하는 모양으로
 * 바꾸고, **이미 있는 기록과 겹치는 것을 걸러낸다.**
 *
 * 🔴 왜 걸러야 하나 — `weight_logs` 에는 '출처' 칸도 고유 키도 없다. 동기화를 누를 때마다
 * 같은 측정이 새 줄로 쌓이면 체형 그래프가 같은 점을 여러 번 찍고 "오늘 3번 쟀네" 처럼
 * 보인다. 스키마를 바꾸는 대신(라이브 DB 수동 적용이 필요하다) **읽어서 비교**한다.
 *
 * 겹침 판정: **같은 날(서울) + 같은 체중(0.1kg)** 이면 같은 측정으로 본다.
 *  - 날짜만으로 보면 아침·저녁 두 번 잰 사람의 둘째 기록이 사라진다
 *  - 시각까지 정확히 맞추려 하면 초 단위 오차·타임존 변환으로 매번 새 줄이 생긴다
 *  - 0.1kg 은 저장 정밀도(numeric(5,1))와 같다 — 그보다 잘게 비교해도 저장되면 뭉개진다
 */

import { seoulYmdOf } from "@/features/health/steps-bucket";
import type { HealthRecord } from "@/features/health/health-plugin";

/** 앱에 저장할 체형 한 줄. 값이 없는 칸은 null(그 항목 권한이 없거나 기기가 안 잼). */
export type BodyEntry = {
  /** 측정 시각(ISO). 저장 시 created_at 으로 쓴다 — '언제 잰 값인가'가 그래프의 x축이다. */
  measuredAt: string;
  weightKg: number | null;
  bodyFatPct: number | null;
  muscleMassKg: number | null;
};

/** 이미 저장돼 있는 기록(비교용 최소 필드). */
export type ExistingBodyLog = {
  createdAt: string;
  weightKg: number | null;
};

/** 저장 컬럼의 범위(schema.sql 의 check 와 같다). 벗어나면 insert 가 통째로 실패한다. */
const WEIGHT_MIN = 30;
const WEIGHT_MAX = 250;
const FAT_MAX = 75;
const MUSCLE_MAX = 120;

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "object") {
    const kg = (v as { inKilograms?: number | string }).inKilograms;
    return toNumber(kg);
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** 0.1 단위로 — 저장 정밀도와 같게 맞춰야 비교와 저장이 어긋나지 않는다. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function clampOrNull(
  n: number | null,
  min: number,
  max: number,
): number | null {
  if (n === null) return null;
  const r = round1(n);
  // 범위 밖은 **자르지 않고 버린다.** 250kg 을 250 으로 자르면 없는 측정을 만들어 낸다.
  return r >= min && r <= max ? r : null;
}

function recordTime(r: HealthRecord): string | null {
  const t = r.time ?? r.startTime;
  if (t === undefined || t === null) return null;
  const d = t instanceof Date ? t : new Date(t);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * 종류별 레코드 묶음 → 측정 시각별 한 줄.
 *
 * 체중·체지방·근육량은 **각각 다른 레코드**로 들어온다(같은 체중계가 잰 값이라도).
 * 같은 시각의 것끼리 한 줄로 합쳐야 그래프의 세 줄이 같은 점에서 만난다.
 * 시각은 **분 단위로 묶는다** — 체중계가 세 값을 몇 초 차이로 쓰기 때문에 초까지
 * 맞추면 한 번 잰 것이 세 줄로 쪼개진다.
 */
export function toBodyEntries(input: {
  weight?: readonly HealthRecord[];
  bodyFat?: readonly HealthRecord[];
  leanMass?: readonly HealthRecord[];
}): BodyEntry[] {
  const byMinute = new Map<string, BodyEntry>();

  const put = (
    r: HealthRecord,
    apply: (e: BodyEntry, value: number) => void,
    value: number | null,
  ) => {
    const iso = recordTime(r);
    if (iso === null || value === null) return;
    const key = iso.slice(0, 16); // YYYY-MM-DDTHH:mm
    const cur = byMinute.get(key) ?? {
      measuredAt: iso,
      weightKg: null,
      bodyFatPct: null,
      muscleMassKg: null,
    };
    apply(cur, value);
    byMinute.set(key, cur);
  };

  for (const r of input.weight ?? []) {
    put(r, (e, v) => (e.weightKg = v), clampOrNull(toNumber(r.weight), WEIGHT_MIN, WEIGHT_MAX));
  }
  for (const r of input.bodyFat ?? []) {
    put(r, (e, v) => (e.bodyFatPct = v), clampOrNull(toNumber(r.percentage), 1, FAT_MAX));
  }
  for (const r of input.leanMass ?? []) {
    put(r, (e, v) => (e.muscleMassKg = v), clampOrNull(toNumber(r.mass), 1, MUSCLE_MAX));
  }

  return [...byMinute.values()]
    // 값이 하나도 없는 줄은 만들지 않는다 — 빈 점이 그래프에 찍힌다.
    .filter((e) => e.weightKg !== null || e.bodyFatPct !== null || e.muscleMassKg !== null)
    .sort((a, b) => (a.measuredAt < b.measuredAt ? -1 : 1));
}

/** 겹침 판정 키 — 같은 날(서울) + 같은 체중(0.1kg). 체중이 없으면 날짜만. */
function dedupKey(iso: string, weightKg: number | null): string | null {
  const ymd = seoulYmdOf(new Date(iso));
  if (!ymd) return null;
  return `${ymd}|${weightKg === null ? "-" : round1(weightKg).toFixed(1)}`;
}

/**
 * 아직 저장 안 된 것만 고른다.
 *
 * 들어온 목록 **안에서도** 중복을 없앤다 — 한 번의 동기화에 같은 값이 두 번 들어오면
 * (기기가 같은 측정을 두 앱 경로로 올린 경우) 그대로 두 줄이 된다.
 */
export function pickNewBodyLogs(
  existing: readonly ExistingBodyLog[],
  candidates: readonly BodyEntry[],
): BodyEntry[] {
  const seen = new Set<string>();
  for (const e of existing) {
    const k = dedupKey(e.createdAt, e.weightKg);
    if (k) seen.add(k);
  }
  const out: BodyEntry[] = [];
  for (const c of candidates) {
    const k = dedupKey(c.measuredAt, c.weightKg);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}
