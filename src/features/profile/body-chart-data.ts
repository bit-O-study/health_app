/**
 * 체형 추이 그래프 데이터 준비 — 순수 모듈(server-only 없음 → 단위테스트 가능).
 *
 * 지표(키·몸무게·체지방·근육량)마다 스케일이 완전히 달라 한 그래프에 겹쳐 그리면
 * 이상하게 보인다. 그래서 **지표별로 각각의 시리즈**를 만들어, 화면에서 지표당 하나씩
 * 별도 미니 차트(small multiples)로 그린다. 각 시리즈는 자기 값들의 [min,max]만 안다.
 */

import { seoulYmdOf } from "@/features/health/steps-bucket";

export type BodyMetricKey =
  | "weightKg"
  | "heightCm"
  | "bodyFatPct"
  | "muscleMassKg";

/** 차트에 필요한 최소 로그 형태(server-only BodyLog 와 구조 호환). */
export type BodyLogLike = {
  weightKg: number | null;
  heightCm: number | null;
  bodyFatPct: number | null;
  muscleMassKg: number | null;
  createdAt: string;
};

export type BodySeriesPoint = { i: number; v: number; createdAt: string };

export type BodySeries = {
  key: BodyMetricKey;
  label: string;
  unit: string;
  color: string;
  points: BodySeriesPoint[];
  min: number;
  max: number;
  /** 가장 최근 값(마지막 점). */
  latest: number;
  /** 첫 값(추세 방향 계산용). */
  first: number;
};

export const BODY_METRICS: {
  key: BodyMetricKey;
  label: string;
  unit: string;
  color: string;
}[] = [
  { key: "weightKg", label: "몸무게", unit: "kg", color: "#059669" },
  { key: "bodyFatPct", label: "체지방률", unit: "%", color: "#e11d48" },
  { key: "muscleMassKg", label: "근육량", unit: "kg", color: "#6366f1" },
  { key: "heightCm", label: "키", unit: "cm", color: "#d97706" },
];

/**
 * 로그 배열을 지표별 시리즈로 변환. 값이 하나도 없는 지표는 제외한다.
 * `i` 는 (값이 있든 없든) 전체 로그에서의 위치라, 지표별로 x축 시점이 일관된다.
 */
export function buildBodySeries(logs: BodyLogLike[]): BodySeries[] {
  return BODY_METRICS.map((m) => {
    const points: BodySeriesPoint[] = [];
    logs.forEach((l, i) => {
      const v = l[m.key];
      if (v !== null && Number.isFinite(v)) {
        points.push({ i, v, createdAt: l.createdAt });
      }
    });
    if (points.length === 0) return null;
    const vals = points.map((p) => p.v);
    return {
      ...m,
      points,
      min: Math.min(...vals),
      max: Math.max(...vals),
      latest: vals[vals.length - 1],
      first: vals[0],
    };
  }).filter((s): s is BodySeries => s !== null);
}

/** 첫→마지막 변화량(부호 포함). 값이 1개면 0. 소수 1자리 반올림. */
export function seriesDelta(s: BodySeries): number {
  return Math.round((s.latest - s.first) * 10) / 10;
}

/*
 * ── 날짜 표시 ──────────────────────────────────────────────────────────────
 * `created_at` 은 UTC 다. `new Date(iso).getDate()` 처럼 실행환경 로컬시각으로 찍으면
 * 서버(UTC)와 폰(서울)에서 하루가 어긋난다(밤 9시 이후 기록이 전날로 보인다).
 * 그래서 표시용 날짜는 전부 **서울 고정**으로 만든다.
 */

/** ISO → 서울 기준 "7/31"(그래프 눈금·리스트용). 파싱 실패면 "". */
export function shortDateLabel(iso: string): string {
  const ymd = seoulYmdOf(iso);
  if (!ymd) return "";
  const [, m, d] = ymd.split("-");
  return `${Number(m)}/${Number(d)}`;
}

/** ISO → 서울 기준 "2026. 7. 31."(기록 리스트용, 해 넘어가도 구분되게). 실패면 "". */
export function fullDateLabel(iso: string): string {
  const ymd = seoulYmdOf(iso);
  if (!ymd) return "";
  const [y, m, d] = ymd.split("-");
  return `${y}. ${Number(m)}. ${Number(d)}.`;
}

/** ISO → 서울 기준 "14:20"(같은 날 여러 번 잰 기록 구분용). 실패면 "". */
export function timeLabel(iso: string): string {
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(dt);
}

/**
 * 그래프에 그릴 점 고르기 — 기록이 쌓이면 선이 촘촘해져 그래프가 뭉개진다.
 * 기록이 `limit`(기본 6)개를 넘으면 **의미 있는 점만** 남긴다:
 *
 *   첫 기록 · 최대 · 최소 · 현재 · 직전 · 직직전
 *
 * 이 중 같은 기록이 겹치면(예: 최소가 곧 현재, 최대가 곧 첫 기록) 그만큼 비므로
 * **더 이전 기록**(직직직전 → 직직직직전 …)으로 6개를 채운다.
 * 최대·최소가 항상 포함되므로 y축 눈금(min~max)과 선이 어긋나지 않는다.
 */
export function pickChartPoints(
  points: BodySeriesPoint[],
  limit = 6,
): BodySeriesPoint[] {
  const n = points.length;
  if (n <= limit) return points;

  let maxAt = 0;
  let minAt = 0;
  points.forEach((p, i) => {
    if (p.v > points[maxAt].v) maxAt = i;
    if (p.v < points[minAt].v) minAt = i;
  });

  const keep = new Set<number>();
  // 첫 기록 · 최대 · 최소 · 현재 · 직전 · 직직전 (겹치면 Set 이 알아서 하나로)
  for (const i of [0, maxAt, minAt, n - 1, n - 2, n - 3]) {
    if (i >= 0 && keep.size < limit) keep.add(i);
  }
  // 겹쳐서 모자란 만큼 더 이전 기록으로 채운다(직직직전, 직직직직전 …).
  for (let i = n - 4; i >= 0 && keep.size < limit; i--) keep.add(i);

  return [...keep].sort((a, b) => a - b).map((i) => points[i]);
}

/**
 * 날짜 라벨을 찍을 위치(인덱스 배열) — x 좌표가 `minGap` 보다 가까우면 건너뛴다.
 * 고른 점들은 간격이 제각각이라(현재·직전·직직전은 오른쪽에 몰린다) 균등 배치로는
 * 라벨이 겹친다. 첫·마지막은 항상 남긴다.
 */
export function spacedTickIndexes(xs: number[], minGap: number): number[] {
  if (xs.length === 0) return [];
  if (xs.length === 1) return [0];
  const last = xs.length - 1;
  const keep = [0];
  for (let i = 1; i < last; i++) {
    const prev = keep[keep.length - 1];
    if (xs[i] - xs[prev] >= minGap && xs[last] - xs[i] >= minGap) keep.push(i);
  }
  keep.push(last);
  return keep;
}

export type BodyLogRow = {
  createdAt: string;
  /** 이 기록에 실제로 값이 들어간 지표만(빈 칸은 표시하지 않는다). */
  metrics: {
    key: BodyMetricKey;
    label: string;
    unit: string;
    color: string;
    value: number;
  }[];
};

/**
 * 기록 리스트용 — **최신순**. 값이 하나도 없는 로그는 제외한다.
 * (그래프만으로는 "언제 쟀는지"를 알 수 없어서, 날짜와 값을 같이 나열한다.)
 */
export function buildBodyLogRows(logs: BodyLogLike[]): BodyLogRow[] {
  return logs
    .map((l) => ({
      createdAt: l.createdAt,
      metrics: BODY_METRICS.flatMap((m) => {
        const v = l[m.key];
        return v !== null && Number.isFinite(v) ? [{ ...m, value: v }] : [];
      }),
    }))
    .filter((r) => r.metrics.length > 0)
    .reverse();
}
