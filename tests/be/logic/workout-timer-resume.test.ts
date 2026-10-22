import { afterEach, describe, expect, it, vi } from "vitest";

import {
  elapsedMs,
  readTimer,
  reconcileResume,
  writeTimer,
  type TimerState,
} from "@/features/workout-timer/timer-store";
import { normalizeSoundKind } from "@/features/workout-timer/rest-sound";

const base = (over: Partial<TimerState> = {}): TimerState => ({
  startedAt: 1_000,
  pausedAt: null,
  accumulated: 0,
  forDate: "2026-10-22",
  lastSeenAt: 2_000,
  ...over,
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("reconcileResume — 일시정지/종료 전까지 공백도 운동시간에 포함", () => {
  it("타이머가 없으면 복원하지 않는다", () => {
    expect(reconcileResume(null, 9_999)).toBeNull();
  });

  it.each([20, 30, 31, 180, 7 * 24 * 60])("%i분 백그라운드 후에도 전체 경과를 유지한다", (minutes) => {
    vi.useFakeTimers();
    const s = base({ accumulated: 5_000 });
    const now = s.lastSeenAt! + minutes * 60_000;
    vi.setSystemTime(now);
    const restored = reconcileResume(s, now)!;
    expect(restored.startedAt).toBe(s.startedAt);
    expect(restored.pausedAt).toBeNull();
    expect(restored.lastSeenAt).toBe(now);
    expect(elapsedMs(restored)).toBe(5_000 + now - s.startedAt);
    vi.advanceTimersByTime(10_000);
    expect(elapsedMs(restored)).toBe(15_000 + now - s.startedAt);
  });

  it("앱 재생성 후 저장본을 읽어도 3시간 공백을 유지한다", () => {
    vi.useFakeTimers();
    const data = new Map<string, string>();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    });
    const s = base({ sessionId: "session-1", baseSec: 30, accumulated: 30_000 });
    writeTimer(s);
    const now = 3 * 3_600_000;
    vi.setSystemTime(now);
    const restored = reconcileResume(readTimer(), now)!;
    expect(restored).toEqual({ ...s, lastSeenAt: now });
    expect(elapsedMs(restored)).toBe(30_000 + now - s.startedAt);
  });

  it("구버전 lastSeenAt 없는 저장본도 시간을 빼지 않는다", () => {
    const s = base({ lastSeenAt: undefined });
    expect(reconcileResume(s, 9_999_999)).toEqual({ ...s, lastSeenAt: 9_999_999 });
  });

  it("명시적 일시정지는 장시간 복귀 후에도 유지하고 재개 이후만 더한다", () => {
    vi.useFakeTimers();
    const paused = base({ pausedAt: 5_000, accumulated: 4_000 });
    const now = 3 * 3_600_000;
    vi.setSystemTime(now);
    const restored = reconcileResume(paused, now)!;
    expect(restored).toBe(paused);
    expect(elapsedMs(restored)).toBe(4_000);
    const resumed = { ...restored, startedAt: now, pausedAt: null };
    vi.advanceTimersByTime(30_000);
    expect(elapsedMs(resumed)).toBe(34_000);
  });
});

describe("normalizeSoundKind", () => {
  it("유효한 값은 통과, 그 외엔 voice(기본)", () => {
    expect(normalizeSoundKind("voice")).toBe("voice");
    expect(normalizeSoundKind("beep")).toBe("beep");
    expect(normalizeSoundKind("custom")).toBe("custom");
    expect(normalizeSoundKind(null)).toBe("voice");
    expect(normalizeSoundKind("삐삐")).toBe("voice");
    expect(normalizeSoundKind(undefined)).toBe("voice");
  });
});
