import fs from "node:fs";
import path from "node:path";

import { describe, expect, it, vi } from "vitest";

import {
  MODAL_STATE_KEY,
  createModalHistory,
} from "@/lib/platform/modal-history";

/**
 * 뒤로가기 = 모달만 닫기(2026-09-14).
 * 가짜 히스토리로 브라우저를 흉내 낸다 — back() 은 실제처럼 **비동기**(popstate 가 나중에 온다).
 */
function fakeBrowser() {
  const entries: unknown[] = [{ __NA: true }];
  let index = 0;
  const queuedBacks: (() => void)[] = [];
  const timers: (() => void)[] = [];

  const history = {
    get state() {
      return entries[index];
    },
    pushState(data: unknown) {
      entries.splice(index + 1);
      entries.push(data);
      index++;
    },
    back() {
      queuedBacks.push(() => {
        if (index === 0) return;
        index--;
        mh.onPopState(entries[index]);
      });
    },
  };
  // back() 은 나중에(비동기) 불리므로 아래 const 를 그때 읽는다.
  const mh = createModalHistory(history, {
    set: (fn) => timers.push(fn) - 1,
    clear: (h) => {
      timers[h as number] = () => {};
    },
  });

  return {
    mh,
    history,
    get length() {
      return entries.length;
    },
    get index() {
      return index;
    },
    /** 사용자가 뒤로가기(하드웨어/브라우저). */
    pressBack() {
      history.back();
      this.flush();
    },
    /** 미뤄 둔 타이머 → 대기 중인 back() 순서로 전부 처리. */
    flush() {
      while (timers.length || queuedBacks.length) {
        timers.splice(0).forEach((fn) => fn());
        queuedBacks.splice(0).forEach((fn) => fn());
      }
    },
  };
}

describe("modal-history — 뒤로가기로 모달만 닫기", () => {
  it("열면 항목을 하나 쌓고, 뒤로가기하면 그 모달만 닫힌다(화면 항목은 그대로)", () => {
    const b = fakeBrowser();
    const close = vi.fn();
    b.mh.open("a", close);
    expect(b.index).toBe(1);
    expect(b.history.state).toEqual({ [MODAL_STATE_KEY]: "a" });

    b.pressBack();
    expect(close).toHaveBeenCalledTimes(1);
    expect(b.index).toBe(0);
    expect(b.mh.openKeys()).toEqual([]);

    // 뒤로가기로 닫힌 뒤 컴포넌트가 release 해도 또 뒤로 가면 안 된다(화면이 바뀜).
    b.mh.release("a");
    b.flush();
    expect(b.index).toBe(0);
  });

  it("🔴 X 로 닫으면 쌓아 둔 항목을 빼 준다 — 다음 뒤로가기가 헛돌지 않게", () => {
    const b = fakeBrowser();
    b.mh.open("a", vi.fn());
    b.mh.release("a");
    b.flush();
    expect(b.index).toBe(0);
  });

  it("🔴 X 로 닫을 때 빼는 back() 이 다른 모달을 닫지 않는다", () => {
    const b = fakeBrowser();
    const closeA = vi.fn();
    const closeB = vi.fn();
    b.mh.open("a", closeA);
    b.mh.open("b", closeB);
    b.mh.release("b");
    b.flush();
    expect(closeA).not.toHaveBeenCalled();
    expect(b.mh.openKeys()).toEqual(["a"]);
    expect(b.index).toBe(1);
  });

  it("겹친 모달은 뒤로가기 한 번에 맨 위 하나씩 닫힌다", () => {
    const b = fakeBrowser();
    const closeA = vi.fn();
    const closeB = vi.fn();
    b.mh.open("a", closeA);
    b.mh.open("b", closeB);

    b.pressBack();
    expect(closeB).toHaveBeenCalledTimes(1);
    expect(closeA).not.toHaveBeenCalled();

    b.pressBack();
    expect(closeA).toHaveBeenCalledTimes(1);
    expect(b.index).toBe(0);
  });

  it("🔴 StrictMode 재마운트(해제→즉시 다시 열기)에도 항목이 하나만 남는다", () => {
    const b = fakeBrowser();
    const close = vi.fn();
    b.mh.open("a", close);
    b.mh.release("a");
    b.mh.open("a", close);
    b.flush();
    expect(b.index).toBe(1);
    expect(b.length).toBe(2);

    b.pressBack();
    expect(close).toHaveBeenCalledTimes(1);
    expect(b.index).toBe(0);
  });

  it("🔴 모달 안에서 다른 화면으로 이동했으면 닫힐 때 back() 하지 않는다(이동을 되돌리면 안 됨)", () => {
    const b = fakeBrowser();
    b.mh.open("a", vi.fn());
    b.history.pushState({ __NA: true, page: "next" });
    b.mh.release("a");
    b.flush();
    expect(b.history.state).toEqual({ __NA: true, page: "next" });
  });

  it("이동한 화면에서 뒤로가면 주인 없는 모달 항목은 건너뛰어 원래 화면으로 간다", () => {
    const b = fakeBrowser();
    b.mh.open("a", vi.fn());
    b.history.pushState({ __NA: true, page: "next" });
    b.mh.release("a");
    b.flush();

    b.pressBack();
    expect(b.index).toBe(0);
  });

  it("🔴 popstate 마다 항목을 다시 쌓는 화면(운동모드)과 만나도 무한히 되돌리지 않는다", () => {
    const b = fakeBrowser();
    // 주인 없는 모달 항목 위에 서 있는 상황.
    b.history.pushState({ [MODAL_STATE_KEY]: "dead" });
    b.history.pushState({ heltchWorkout: true });
    const origBack = b.history.back.bind(b.history);
    let backs = 0;
    b.history.back = () => {
      backs++;
      if (backs > 20) throw new Error("무한 루프");
      origBack();
    };
    b.pressBack(); // → dead 도착 → 한 번만 건너뛴다
    expect(backs).toBeLessThanOrEqual(3);
  });
});

describe("모달들이 뒤로가기 훅을 쓴다", () => {
  const files = [
    "src/components/confirm-dialog.tsx",
    "src/features/account/components/withdraw-button.tsx",
    "src/features/workout-timer/guided-workout.tsx",
    "src/features/workout-timer/muscle-body-view.tsx",
    "src/features/diet/components/diet-board.tsx",
    "src/features/teaching/components/teaching-compose.tsx",
    "src/features/cycle/components/cycle-board.tsx",
    "src/features/community/components/community-board.tsx",
    "src/features/community/components/report-button.tsx",
    "src/features/routine-share/components/share-day-button.tsx",
    "src/features/routine-share/components/routine-share-board.tsx",
    "src/features/equipment/components/equipment-scan-button.tsx",
    "src/features/groups/components/proof-member-sheet.tsx",
    "src/features/groups/components/proof-recorder.tsx",
    "src/features/profile/components/body-log-button.tsx",
    "src/features/routine/components/exercise-finder.tsx",
    "src/features/routine/components/exercise-search-select.tsx",
    "src/features/routine/components/today-adjust-menu.tsx",
    "src/features/routine/components/today-conditioning-list.tsx",
    "src/features/routine/components/today-focus-menu.tsx",
    "src/features/routine/components/today-goal-card.tsx",
    "src/features/routine/components/today-plan-list.tsx",
    "src/features/routine/components/upcoming-seven-days.tsx",
  ];
  it.each(files)("%s", (file) => {
    const src = fs.readFileSync(path.join(process.cwd(), file), "utf8");
    expect(src).toContain("useBackClose(");
  });
});
