/**
 * 체형 추이 그래프 데이터 준비 — 순수 모듈(server-only 없음 → 단위테스트 가능).
 *
 * 지표(키·몸무게·체지방·근육량)마다 스케일이 완전히 달라 한 그래프에 겹쳐 그리면
 * 이상하게 보인다. 그래서 **지표별로 각각의 시리즈**를 만들어, 화면에서 지표당 하나씩
 * 별도 미니 차트(small multiples)로 그린다. 각 시리즈는 자기 값들의 [min,max]만 안다.
 */

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
