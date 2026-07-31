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
 * x축에 날짜를 찍을 점의 위치(인덱스 배열).
 * 점이 많으면 라벨이 서로 겹치므로 **최대 max 개**만, 첫·마지막을 반드시 포함해
 * 균등 간격으로 고른다.
 */
export function dateTickIndexes(count: number, max = 4): number[] {
  if (count <= 0) return [];
  if (max <= 1 || count === 1) return [0];
  if (count <= max) return Array.from({ length: count }, (_, i) => i);
  const step = (count - 1) / (max - 1);
  const out = new Set<number>();
  for (let k = 0; k < max; k++) out.add(Math.round(k * step));
  return [...out].sort((a, b) => a - b);
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
