/**
 * 야외 런닝(GPS) 순수 로직 — 위치 표본에서 거리·속도·페이스 계산(테스트 가능).
 * 브라우저 geolocation 은 클라이언트가 처리하고, 여기선 좌표·시각만 받아 계산한다.
 */

export type GeoPoint = { lat: number; lng: number; t: number; acc?: number };

const R = 6_371_000; // 지구 반지름(m)
const toRad = (d: number) => (d * Math.PI) / 180;

/** 두 좌표 사이 거리(m) — 하버사인. */
export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

// GPS 노이즈 필터 파라미터.
const MAX_ACC_M = 30; // 정확도 30m 초과 표본은 버림
const MIN_SEG_M = 1.5; // 이보다 짧은 이동은 지터로 보고 무시(제자리 GPS 흔들림)
const MAX_SPEED_MPS = 12; // ~43km/h 초과는 GPS 점프로 보고 무시

export type RunTrack = {
  points: GeoPoint[];
  totalMeters: number;
  lastMovingPoint: GeoPoint | null;
};

export function emptyTrack(): RunTrack {
  return { points: [], totalMeters: 0, lastMovingPoint: null };
}

/**
 * 새 위치 표본을 반영해 누적 거리를 갱신한다(노이즈 필터 적용).
 * 반환: 갱신된 트랙 + 이번에 더해진 거리(m) + 순간속도(m/s, 이동 반영 시).
 */
export function addPoint(
  track: RunTrack,
  p: GeoPoint,
): { track: RunTrack; addedM: number; instMps: number } {
  if (p.acc != null && p.acc > MAX_ACC_M) {
    return { track, addedM: 0, instMps: 0 };
  }
  const prev = track.lastMovingPoint;
  if (!prev) {
    return {
      track: { points: [p], totalMeters: 0, lastMovingPoint: p },
      addedM: 0,
      instMps: 0,
    };
  }
  const d = haversineMeters(prev, p);
  const dt = Math.max(0.001, (p.t - prev.t) / 1000);
  const mps = d / dt;
  // 지터(너무 짧음)·점프(너무 빠름)는 무시 — 표본만 쌓고 누적은 그대로.
  if (d < MIN_SEG_M || mps > MAX_SPEED_MPS) {
    return {
      track: { ...track, points: [...track.points, p] },
      addedM: 0,
      instMps: 0,
    };
  }
  const totalMeters = track.totalMeters + d;
  return {
    track: {
      points: [...track.points, p],
      totalMeters,
      lastMovingPoint: p,
    },
    addedM: d,
    instMps: mps,
  };
}

export function speedKmh(mps: number): number {
  return Math.max(0, mps * 3.6);
}

/** 평균 페이스(초/km) — 거리 0 이면 null. */
export function avgPaceSecPerKm(
  totalMeters: number,
  elapsedSec: number,
): number | null {
  if (totalMeters < 1) return null;
  return (elapsedSec / totalMeters) * 1000;
}

export function formatDistanceKm(meters: number): string {
  return (meters / 1000).toFixed(2);
}

export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const mm = String(m).padStart(2, "0");
  const sss = String(ss).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${sss}` : `${mm}:${sss}`;
}

/** 페이스 표기 — 초/km → "5'30\"". null 이면 "--'--". */
export function formatPace(secPerKm: number | null): string {
  if (secPerKm == null || !Number.isFinite(secPerKm) || secPerKm <= 0) {
    return "--'--\"";
  }
  // 전체 초를 먼저 반올림 — 분·초를 따로 반올림하면 359.6초가 5'60" 가 됐다(2026-09-28).
  const total = Math.round(secPerKm);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}'${String(s).padStart(2, "0")}"`;
}

/** GPS 속도(km/h)를 캐릭터 달리기 강도 0..1 로. 걷기(~4km/h)부터 빠른 달리기(~16km/h). */
export function runIntensityFromSpeed(kmh: number): number {
  const x = (kmh - 3) / 13; // 3km/h 이하=0, 16km/h≈1
  return Math.max(0, Math.min(1, x));
}

/**
 * 이동 거리를 더하지 않고 기준점만 옮긴다 — 일시정지 뒤 다시 시작할 때(2026-09-28 런닝 2단계).
 * 멈춘 동안 걸어간 거리는 기록에 넣지 않는다. 경로(points)는 그대로 이어 붙인다.
 * ⚠ lastMovingPoint 를 null 로 만들면 addPoint 가 경로를 새로 시작해 버리므로 이 함수를 쓴다.
 */
export function reanchorTrack(track: RunTrack, p: GeoPoint): RunTrack {
  return { ...track, points: [...track.points, p], lastMovingPoint: p };
}

/**
 * 지금 페이스(초/km) — 최근 windowSec 초 동안 실제로 이동한 구간만으로 계산한다.
 * 누적 평균(avgPaceSecPerKm)은 멈춘 시간까지 섞여 '지금 얼마나 빠른지'를 못 보여 준다.
 * 이동이 20m 미만이면 null(표시 "--'--\"").
 */
export function recentPaceSecPerKm(points: readonly GeoPoint[], nowT: number, windowSec = 30): number | null {
  const from = nowT - windowSec * 1000;
  let meters = 0;
  let sec = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    if (a.t < from) continue; // 창 안에서 시작한 구간만 — 경계를 걸친 옛 구간이 지금 페이스를 흐리지 않게
    if ((a.acc != null && a.acc > MAX_ACC_M) || (b.acc != null && b.acc > MAX_ACC_M)) continue;
    const d = haversineMeters(a, b);
    const dt = (b.t - a.t) / 1000;
    if (dt <= 0 || d < MIN_SEG_M || d / dt > MAX_SPEED_MPS) continue;
    meters += d;
    sec += dt;
  }
  if (meters < 20 || sec <= 0) return null;
  return (sec / meters) * 1000;
}
