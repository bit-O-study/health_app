import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// workout-edit-store 는 브라우저 localStorage 에 그날 편집값·"마지막으로 보던 항목(activeRow)"
// 을 저장한다. node 환경엔 window/localStorage 가 없으므로 최소 스텁을 심고 검증한다.
class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) {
    return this.m.has(k) ? this.m.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
}

const KEY = "heltch.workout.edits";

let store: typeof import("@/features/workout-timer/workout-edit-store");
let seoulTodayYmd: () => string;

beforeEach(async () => {
  const mem = new MemStorage();
  vi.stubGlobal("window", {} as unknown);
  vi.stubGlobal("localStorage", mem as unknown as Storage);
  // import 는 stub 이후에 — 모듈 최상단이 window 를 참조하진 않지만 안전하게.
  store = await import("@/features/workout-timer/workout-edit-store");
  ({ seoulTodayYmd } = await import("@/features/workout-timer/timer-store"));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("activeRow — 운동모드에서 마지막으로 보던 항목 복원", () => {
  it("기본값은 null (저장 전)", () => {
    expect(store.getActiveRow()).toBeNull();
  });

  it("set 하면 같은 값이 나오고, clear 하면 다시 null", () => {
    store.setActiveRow("row-dips");
    expect(store.getActiveRow()).toBe("row-dips");
    store.setActiveRow("row-bench");
    expect(store.getActiveRow()).toBe("row-bench");
    store.clearActiveRow();
    expect(store.getActiveRow()).toBeNull();
  });

  it("무게/세트 편집값과 독립적으로 함께 보존된다", () => {
    store.setMainEdit("row-dips", { w: 40, reps: 12, sets: 4 });
    store.setActiveRow("row-dips");
    expect(store.getActiveRow()).toBe("row-dips");
    expect(store.getMainEdit("row-dips")).toEqual({ w: 40, reps: 12, sets: 4 });
    // activeRow 만 지워도 편집값은 남는다.
    store.clearActiveRow();
    expect(store.getActiveRow()).toBeNull();
    expect(store.getMainEdit("row-dips")).toEqual({ w: 40, reps: 12, sets: 4 });
  });

  it("날짜가 지난(어제) 저장분은 무효 → null (날짜 스코프)", () => {
    // 어제 날짜로 activeRow 를 직접 심는다.
    const yesterday = "2000-01-01";
    expect(seoulTodayYmd()).not.toBe(yesterday);
    localStorage.setItem(
      KEY,
      JSON.stringify({
        date: yesterday,
        main: {},
        cond: {},
        setsDone: {},
        activeRow: "row-stale",
      }),
    );
    expect(store.getActiveRow()).toBeNull();
  });
});