import { afterEach, beforeEach, describe, expect, it } from "vitest";

// 운동 1개 완료마다 그날 누적 시간을 '이중 가산 없이' 더하기 위한 delta 계산.
// timer-store 는 client 모듈이라 node 환경에선 window/localStorage 를 스텁한다.

type LS = {
  getItem: (k: string) => string | null;
  setItem: (k: string, v: string) => void;
  removeItem: (k: string) => void;
};

function installStorage() {
  const store = new Map<string, string>();
  const ls: LS = {
    getItem: (k) => (store.has(k) ? store.get(k)! : null),
    setItem: (k, v) => void store.set(k, v),
    removeItem: (k) => void store.delete(k),
  };
  (globalThis as unknown as { window: unknown }).window = globalThis;
  (globalThis as unknown as { localStorage: LS }).localStorage = ls;
}

// 일시정지 상태(pausedAt!=null)면 elapsedMs = accumulated → 시간을 결정적으로 제어.
function pausedState(forDate: string, accumulatedMs: number) {
  return { startedAt: 0, pausedAt: 1, accumulated: accumulatedMs, forDate };
}

let mod: typeof import("@/features/workout-timer/timer-store");

beforeEach(async () => {
  installStorage();
  // 모듈 캐시를 비워 매 테스트 깨끗한 localStorage 스텁을 쓰게 한다.
  await import("vitest").then(({ vi }) => vi.resetModules());
  mod = await import("@/features/workout-timer/timer-store");
});

afterEach(() => {
  delete (globalThis as Record<string, unknown>).window;
  delete (globalThis as Record<string, unknown>).localStorage;
});

describe("takeUnsavedDelta", () => {
  it("첫 호출은 경과 전체를 delta 로 주고, 바로 다시 부르면 0(null)", () => {
    const s = pausedState("2026-06-10", 10_000); // 10초
    const first = mod.takeUnsavedDelta(s);
    expect(first).toEqual({ forDate: "2026-06-10", deltaSec: 10 });
    // 같은 경과로 다시 → 더 올릴 게 없음
    expect(mod.takeUnsavedDelta(s)).toBeNull();
  });

  it("시간이 더 흐른 만큼만 delta 로 더한다(이중 가산 없음)", () => {
    expect(mod.takeUnsavedDelta(pausedState("2026-06-10", 10_000))).toEqual({
      forDate: "2026-06-10",
      deltaSec: 10,
    });
    // 25초까지 늘면 추가 15초만
    expect(mod.takeUnsavedDelta(pausedState("2026-06-10", 25_000))).toEqual({
      forDate: "2026-06-10",
      deltaSec: 15,
    });
  });

  it("clearSavedMark 후엔 다시 경과 전체를 delta 로 준다(새 세션)", () => {
    mod.takeUnsavedDelta(pausedState("2026-06-10", 30_000));
    mod.clearSavedMark();
    expect(mod.takeUnsavedDelta(pausedState("2026-06-10", 30_000))).toEqual({
      forDate: "2026-06-10",
      deltaSec: 30,
    });
  });

  it("forDate 가 다르면 기준이 0 으로 리셋된다(자정 롤오버)", () => {
    mod.takeUnsavedDelta(pausedState("2026-06-10", 40_000)); // 어제분 40초 저장
    // 새 날짜는 0 기준 → 12초면 12초 전체
    expect(mod.takeUnsavedDelta(pausedState("2026-06-11", 12_000))).toEqual({
      forDate: "2026-06-11",
      deltaSec: 12,
    });
  });

  it("타이머가 없으면 null", () => {
    expect(mod.takeUnsavedDelta(null)).toBeNull();
  });
});
