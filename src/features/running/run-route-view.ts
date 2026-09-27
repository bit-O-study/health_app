/**
 * 런닝 기록 상세 — 저장된 경로(run_sessions.route_points)로 그리는 선(SVG)과 1km 구간 페이스.
 * 지도 타일 없이 점만으로 그린다(외부 지도·키 없음, 배경 위치 노출 없음). 순수 함수.
 */
import { haversineMeters } from "@/features/running/geo";
import type { RunRoutePoint } from "@/features/running/run-session";

const MAX_ACCURACY_M = 50; // 정확도가 이보다 나쁜 점은 그리지 않는다
const MAX_SPEED_MPS = 12; // ~43km/h 초과 이동은 GPS 튐으로 보고 버린다

const geo = (p: RunRoutePoint) => ({ lat: p.lat, lng: p.lng, t: p.timestamp });

/** 정확도 나쁜 점·순간 이동(튐) 점을 뺀 경로. 시간순 정렬. */
export function cleanRunRoute(points: RunRoutePoint[]): RunRoutePoint[] {
  const sorted = points
    .filter(
      (p) =>
        Number.isFinite(p.lat) &&
        Number.isFinite(p.lng) &&
        Number.isFinite(p.timestamp) &&
        (p.accuracyM == null || p.accuracyM <= MAX_ACCURACY_M),
    )
    .sort((a, b) => a.timestamp - b.timestamp);
  const out: RunRoutePoint[] = [];
  for (const p of sorted) {
    const prev = out[out.length - 1];
    if (prev) {
      const sec = (p.timestamp - prev.timestamp) / 1_000;
      const m = haversineMeters(geo(prev), geo(p));
      if (sec <= 0 || m / sec > MAX_SPEED_MPS) continue;
    }
    out.push(p);
  }
  return out;
}

export type RunRouteDrawing = {
  d: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
};

/**
 * 경로 → SVG path. 위경도를 평면으로(경도는 cos(위도) 보정) 옮기고 가로세로 비율을 지켜
 * width×height 안에 pad 만큼 띄워 가운데 맞춘다. 점이 2개 미만이면 null.
 */
export function runRouteSvg(points: RunRoutePoint[], width = 320, height = 200, pad = 16): RunRouteDrawing | null {
  const route = cleanRunRoute(points);
  if (route.length < 2) return null;
  const lat0 = route.reduce((s, p) => s + p.lat, 0) / route.length;
  const k = Math.cos((lat0 * Math.PI) / 180);
  const xs = route.map((p) => p.lng * k);
  const ys = route.map((p) => -p.lat);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const spanX = maxX - minX || 1e-9;
  const spanY = maxY - minY || 1e-9;
  const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
  const offX = (width - spanX * scale) / 2;
  const offY = (height - spanY * scale) / 2;
  const pts = route.map((_, i) => ({
    x: Math.round((offX + (xs[i] - minX) * scale) * 10) / 10,
    y: Math.round((offY + (ys[i] - minY) * scale) * 10) / 10,
  }));
  return {
    d: pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" "),
    start: pts[0],
    end: pts[pts.length - 1],
  };
}

export type RunSplit = {
  /** 구간 길이(m) — 마지막 구간만 1000 미만일 수 있다. */
  distanceM: number;
  /** 이 구간에 걸린 시간(초). */
  sec: number;
  /** 1km 로 환산한 페이스(초/km). */
  paceSecPerKm: number;
};

/**
 * 경로의 시각으로 1km 구간 페이스를 계산한다(경계 시각은 두 점 사이를 선형 보간).
 * 100m 미만 자투리 구간은 버린다. 경로가 없으면 빈 배열(실내 런닝).
 */
export function runSplits(points: RunRoutePoint[], splitM = 1_000): RunSplit[] {
  const route = cleanRunRoute(points);
  if (route.length < 2) return [];
  const splits: RunSplit[] = [];
  let covered = 0; // 지금까지 누적 거리
  let splitStartT = route[0].timestamp;
  let nextMark = splitM;
  for (let i = 1; i < route.length; i++) {
    const a = route[i - 1];
    const b = route[i];
    const seg = haversineMeters(geo(a), geo(b));
    while (seg > 0 && covered + seg >= nextMark) {
      const t = a.timestamp + ((nextMark - covered) / seg) * (b.timestamp - a.timestamp);
      const sec = (t - splitStartT) / 1_000;
      splits.push({ distanceM: splitM, sec, paceSecPerKm: sec });
      splitStartT = t;
      nextMark += splitM;
    }
    covered += seg;
  }
  const restM = covered - (nextMark - splitM);
  if (restM >= 100) {
    const sec = (route[route.length - 1].timestamp - splitStartT) / 1_000;
    splits.push({ distanceM: restM, sec, paceSecPerKm: sec / (restM / 1_000) });
  }
  return splits.map((s) => ({
    distanceM: Math.round(s.distanceM),
    sec: Math.round(s.sec),
    paceSecPerKm: Math.round(s.paceSecPerKm),
  }));
}
