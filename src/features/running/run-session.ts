export type RunningMode = "indoor" | "outdoor";

export type RunRoutePoint = {
  lat: number;
  lng: number;
  timestamp: number;
  accuracyM?: number | null;
};

export type RunSessionInput = {
  mode: RunningMode;
  startedAt: string;
  endedAt: string;
  distanceM: number;
  avgKmh?: number | null;
  incline?: number | null;
  route?: RunRoutePoint[];
};

export type ValidRunSession = {
  mode: RunningMode;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  distanceM: number;
  avgKmh: number;
  paceSecPerKm: number | null;
  incline: number | null;
  route: RunRoutePoint[];
};

export type RunSessionResult =
  | { ok: true; session: ValidRunSession }
  | { ok: false; reason: "invalid_time" | "too_short" | "too_far" };

export const MIN_RUN_DURATION_SEC = 60;
export const MIN_OUTDOOR_DISTANCE_M = 50;
export const MAX_RUN_DURATION_SEC = 24 * 60 * 60;
export const MAX_PLAUSIBLE_DISTANCE_M = 200_000;
export const MAX_ROUTE_POINTS = 2_000;

export function runSessionDate(startedAt: string): string | null {
  const startedMs = Date.parse(startedAt);
  if (!Number.isFinite(startedMs)) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(startedMs));
}

export function isDuplicateRunSessionError(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

function finite(value: number): boolean {
  return Number.isFinite(value);
}

export function normalizeRunRoute(points: RunRoutePoint[] = []): RunRoutePoint[] {
  const valid = points
    .filter(
      (point) =>
        finite(point.lat) &&
        point.lat >= -90 &&
        point.lat <= 90 &&
        finite(point.lng) &&
        point.lng >= -180 &&
        point.lng <= 180 &&
        finite(point.timestamp) &&
        (point.accuracyM == null ||
          (finite(point.accuracyM) && point.accuracyM >= 0 && point.accuracyM <= 100)),
    )
    .sort((a, b) => a.timestamp - b.timestamp);

  if (valid.length <= MAX_ROUTE_POINTS) return valid;

  const stride = Math.ceil(valid.length / MAX_ROUTE_POINTS);
  const sampled = valid.filter((_, index) => index % stride === 0);
  const last = valid.at(-1);
  if (last && sampled.at(-1) !== last) sampled.push(last);
  return sampled.slice(-(MAX_ROUTE_POINTS));
}

export function normalizeRunSession(input: RunSessionInput): RunSessionResult {
  const startedMs = Date.parse(input.startedAt);
  const endedMs = Date.parse(input.endedAt);
  if (!finite(startedMs) || !finite(endedMs) || endedMs <= startedMs) {
    return { ok: false, reason: "invalid_time" };
  }

  const durationSec = Math.round((endedMs - startedMs) / 1_000);
  if (durationSec < MIN_RUN_DURATION_SEC || durationSec > MAX_RUN_DURATION_SEC) {
    return { ok: false, reason: "too_short" };
  }

  const distanceM = Math.max(0, Math.round(finite(input.distanceM) ? input.distanceM : 0));
  if (distanceM > MAX_PLAUSIBLE_DISTANCE_M) {
    return { ok: false, reason: "too_far" };
  }
  if (input.mode === "outdoor" && distanceM < MIN_OUTDOOR_DISTANCE_M) {
    return { ok: false, reason: "too_short" };
  }

  const measuredKmh = (distanceM / durationSec) * 3.6;
  const avgKmh =
    input.mode === "outdoor" || !finite(input.avgKmh ?? Number.NaN)
      ? measuredKmh
      : Math.max(0, input.avgKmh ?? 0);

  return {
    ok: true,
    session: {
      mode: input.mode,
      startedAt: new Date(startedMs).toISOString(),
      endedAt: new Date(endedMs).toISOString(),
      durationSec,
      distanceM,
      avgKmh: Math.round(avgKmh * 10) / 10,
      paceSecPerKm: distanceM > 0 ? Math.round(durationSec / (distanceM / 1_000)) : null,
      incline:
        input.mode === "indoor" && finite(input.incline ?? Number.NaN)
          ? Math.max(0, Math.round(input.incline ?? 0))
          : null,
      route: input.mode === "outdoor" ? normalizeRunRoute(input.route) : [],
    },
  };
}
