"use client";

import type { GeoPoint } from "@/features/running/geo";
import type { RunningMode } from "@/features/running/run-session";

const KEY = "heltch.running.checkpoint";
export const RUN_CHECKPOINT_MAX_AGE_MS = 24 * 60 * 60 * 1_000;

export type RunCheckpoint = {
  version: 1;
  sessionId: string;
  mode: RunningMode;
  forDate: string;
  elapsedSec: number;
  distanceM: number;
  speedKmh: number;
  incline: number | null;
  route: GeoPoint[];
  updatedAt: number;
};

function seoulDate(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

function validRoute(value: unknown): GeoPoint[] | null {
  if (!Array.isArray(value)) return null;
  const route = value.slice(-2_000);
  if (route.some((point) => {
    if (!point || typeof point !== "object") return true;
    const p = point as Partial<GeoPoint>;
    return typeof p.lat !== "number" || !Number.isFinite(p.lat) || p.lat < -90 || p.lat > 90 ||
      typeof p.lng !== "number" || !Number.isFinite(p.lng) || p.lng < -180 || p.lng > 180 ||
      typeof p.t !== "number" || !Number.isFinite(p.t) ||
      (p.acc !== undefined && (typeof p.acc !== "number" || !Number.isFinite(p.acc) || p.acc < 0));
  })) return null;
  return route as GeoPoint[];
}

export function normalizeRunCheckpoint(
  value: unknown,
  mode: RunningMode,
  now = Date.now(),
): RunCheckpoint | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Partial<RunCheckpoint>;
  const route = validRoute(v.route);
  if (
    v.version !== 1 ||
    v.mode !== mode ||
    typeof v.sessionId !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(v.sessionId) ||
    typeof v.forDate !== "string" ||
    v.forDate !== seoulDate(now) ||
    typeof v.updatedAt !== "number" ||
    now - v.updatedAt < 0 ||
    now - v.updatedAt > RUN_CHECKPOINT_MAX_AGE_MS ||
    typeof v.elapsedSec !== "number" ||
    !Number.isFinite(v.elapsedSec) ||
    v.elapsedSec < 0 ||
    typeof v.distanceM !== "number" ||
    !Number.isFinite(v.distanceM) ||
    v.distanceM < 0 ||
    typeof v.speedKmh !== "number" ||
    !Number.isFinite(v.speedKmh) ||
    route === null
  ) return null;
  return {
    version: 1,
    sessionId: v.sessionId,
    mode,
    forDate: v.forDate,
    elapsedSec: Math.min(v.elapsedSec, 86_400),
    distanceM: Math.min(v.distanceM, 200_000),
    speedKmh: Math.max(0, Math.min(v.speedKmh, 50)),
    incline: mode === "indoor" && typeof v.incline === "number"
      ? Math.max(0, Math.min(15, Math.round(v.incline)))
      : null,
    route: mode === "outdoor" ? route : [],
    updatedAt: v.updatedAt,
  };
}

export function readRunCheckpoint(mode: RunningMode): RunCheckpoint | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    // 모드 선택 화면에서 다른 모드로 잠깐 들어가도 진행 중인 세션을 지우지 않는다.
    if (value && typeof value === "object") {
      const savedMode = (value as { mode?: unknown }).mode;
      if ((savedMode === "indoor" || savedMode === "outdoor") && savedMode !== mode) {
        return null;
      }
    }
    const checkpoint = normalizeRunCheckpoint(value, mode);
    if (!checkpoint) localStorage.removeItem(KEY);
    return checkpoint;
  } catch {
    localStorage.removeItem(KEY);
    return null;
  }
}

export function writeRunCheckpoint(checkpoint: RunCheckpoint | null): void {
  if (typeof window === "undefined") return;
  try {
    if (checkpoint) localStorage.setItem(KEY, JSON.stringify(checkpoint));
    else localStorage.removeItem(KEY);
  } catch {
    // 저장소가 차단돼도 러닝 자체는 계속한다.
  }
}

export function newRunCheckpoint(
  mode: RunningMode,
  sessionId: string,
  now = Date.now(),
): RunCheckpoint {
  return {
    version: 1,
    sessionId,
    mode,
    forDate: seoulDate(now),
    elapsedSec: 0,
    distanceM: 0,
    speedKmh: 0,
    incline: mode === "indoor" ? 1 : null,
    route: [],
    updatedAt: now,
  };
}
