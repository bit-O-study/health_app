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
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${String(s).padStart(2, "0")}"`;
}

/** GPS 속도(km/h)를 캐릭터 달리기 강도 0..1 로. 걷기(~4km/h)부터 빠른 달리기(~16km/h). */
export function runIntensityFromSpeed(kmh: number): number {
  const x = (kmh - 3) / 13; // 3km/h 이하=0, 16km/h≈1
  return Math.max(0, Math.min(1, x));
}
