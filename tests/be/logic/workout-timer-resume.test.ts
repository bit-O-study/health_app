import { describe, expect, it } from "vitest";

import {
  AWAY_GAP_MS,
  COLD_RESUME_GAP_MS,
  freezeOnColdStart,
  reconcileResume,
  type TimerState,
} from "@/features/workout-timer/timer-store";
import { normalizeSoundKind } from "@/features/workout-timer/rest-sound";

const base = (over: Partial<TimerState> = {}): TimerState => ({
  startedAt: 1_000,
  pausedAt: null,
  accumulated: 0,
  forDate: "2026-06-15",
  lastSeenAt: 2_000,
  ...over,
});

describe("reconcileResume — 닫아둔 동안의 시간 제외", () => {
  it("null/정지 상태는 그대로 둔다", () => {
    expect(reconcileResume(null, 9_999)).toBeNull();
    const paused = base({ pausedAt: 5_000 });
    expect(reconcileResume(paused, 9_999_999)).toBe(paused);
  });

  it("짧은 공백(임계 미만)이면 startedAt 유지, lastSeenAt 만 갱신", () => {
    const s = base({ lastSeenAt: 2_000 });
    const now = 2_000 + AWAY_GAP_MS - 1;
    const r = reconcileResume(s, now)!;
    expect(r.startedAt).toBe(s.startedAt);
    expect(r.lastSeenAt).toBe(now);
  });

  it("며칠 닫아두면(큰 공백) 그 시간을 경과에서 제외한다", () => {
    const s = base({ startedAt: 1_000, lastSeenAt: 2_000, accumulated: 0 });
    const aWeek = 7 * 24 * 3600 * 1000;
    const now = 2_000 + aWeek; // 일주일 뒤 다시 열림
    const r = reconcileResume(s, now)!;
    // startedAt 이 공백만큼 미뤄져, '지금' 기준 경과는 공백을 뺀 값(=lastSeenAt-startedAt).
    expect(now - r.startedAt).toBe(s.lastSeenAt! - s.startedAt); // 1000ms 만 인정
    // 즉 '지금' 시점 경과 = accumulated + (now - startedAt) = 1초 (일주일이 아님).
    expect(r.accumulated + (now - r.startedAt)).toBe(1_000);
    expect(r.lastSeenAt).toBe(now);
  });
});

describe("freezeOnColdStart — 팅김(강제종료) 뒤 다시 켰을 때", () => {
  it("앱이 죽어 있던 시간은 운동시간에 안 들어가고, 정지 상태로 되살아난다", () => {
    // 1분(60_000ms) 운동하다 팅김 → 3분 뒤 다시 켬.
    const s = base({ startedAt: 0, lastSeenAt: 60_000, accumulated: 0 });
    const now = 60_000 + 180_000;
    const r = freezeOnColdStart(s, now)!;
    expect(r.pausedAt).toBe(now); // '다시 운동하기' 를 눌러야 다시 흐른다
    // 정지 상태의 경과 = accumulated. 죽어 있던 3분은 빠지고 1분만 인정.
    expect(r.accumulated).toBe(60_000);
  });

  it("정지 상태로 얼린 뒤 '다시 운동하기'로 재개하면 그 시점부터만 더해진다", () => {
    const s = base({ startedAt: 0, lastSeenAt: 60_000, accumulated: 0 });
    const wake = 60_000 + 180_000;
    const frozen = freezeOnColdStart(s, wake)!;
    // resume() 이 하는 일과 같은 계산: startedAt=지금, accumulated 유지
    const resumed: TimerState = {
      startedAt: wake,
      pausedAt: null,
      accumulated: frozen.accumulated,
      forDate: frozen.forDate,
      lastSeenAt: wake,
    };
    // 재개 후 30초 더 운동 → 총 90초 (팅긴 3분은 제외).
    expect(resumed.accumulated + (wake + 30_000 - resumed.startedAt)).toBe(90_000);
  });

  it("새로고침·앱 내 화면 이동 수준의 짧은 공백은 그대로 진행(정지 안 함)", () => {
    const s = base({ startedAt: 0, lastSeenAt: 60_000 });
    const r = freezeOnColdStart(s, 60_000 + COLD_RESUME_GAP_MS - 1)!;
    expect(r).toBe(s); // 원본 그대로 — 계속 흐른다
  });

  it("이미 정지 중이거나 타이머가 없으면 그대로", () => {
    expect(freezeOnColdStart(null, 9_999)).toBeNull();
    const paused = base({ pausedAt: 5_000 });
    expect(freezeOnColdStart(paused, 9_999_999)).toBe(paused);
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
