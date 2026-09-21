import { describe, expect, it } from "vitest";

import {
  BOTTOM_SLOT_COUNT,
  HOME_SLOT_INDEX,
  HOME_TAB,
  LAUNCHER_APPS,
  LAUNCHER_TABS,
  WIDGET_APP_IDS,
  appForPath,
  bottomTabsForPath,
  isTabActive,
  visibleApps,
} from "@/features/launcher/apps";

/**
 * 런처형 홈 — 앱 레지스트리 가드 (2026-09-20).
 *
 * 지키려는 약속 두 가지:
 *  ① **가운데 칸은 언제나 홈**이다. 앱을 새로 추가해도 이게 깨지면 안 된다.
 *  ② **운동 기능이 새 구조에서 길을 잃으면 안 된다.** 지금 있는 운동 경로가
 *     전부 운동 앱으로 잡히는지 여기서 못 박는다(사용자 요구 2026-09-20).
 */
describe("런처 앱 레지스트리", () => {
  it("모든 앱은 양옆 4칸만 갖는다 — 홈은 앱이 적지 않는다", () => {
    for (const app of LAUNCHER_APPS) {
      expect(app.tabs, `${app.id} 의 칸 수`).toHaveLength(4);
      for (const tab of app.tabs) {
        expect(tab.href, `${app.id} 가 홈을 직접 넣었다`).not.toBe(HOME_TAB.href);
      }
    }
    expect(LAUNCHER_TABS).toHaveLength(4);
  });

  it("어느 앱에서든 하단바는 5칸이고, 가운데가 홈이다", () => {
    const paths = [
      "/home",
      "/settings",
      ...LAUNCHER_APPS.map((a) => a.home),
      "/plan/today",
      "/plan/muscle",
      "/exercises/bench-press",
      "/conditioning/42",
      "/jog",
      "/running",
      "/calendar/2026-09-20",
      "/groups/7",
      "/community/3",
      "/commitments",
    ];
    for (const path of paths) {
      const tabs = bottomTabsForPath(path);
      expect(tabs, `${path} 칸 수`).toHaveLength(BOTTOM_SLOT_COUNT);
      expect(tabs[HOME_SLOT_INDEX].href, `${path} 가운데 칸`).toBe(HOME_TAB.href);
      expect(tabs[HOME_SLOT_INDEX].label).toBe("홈");
    }
  });

  it("앱 id 와 탭 href 가 앱 안에서 겹치지 않는다", () => {
    const ids = LAUNCHER_APPS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const app of LAUNCHER_APPS) {
      const hrefs = app.tabs.map((t) => t.href);
      expect(new Set(hrefs).size, `${app.id} 에 같은 칸이 두 번`).toBe(hrefs.length);
    }
  });

  it("두 앱이 같은 경로를 가져가지 않는다", () => {
    const seen = new Map<string, string>();
    for (const app of LAUNCHER_APPS) {
      for (const prefix of app.owns) {
        const owner = seen.get(prefix);
        expect(owner, `${prefix} 를 ${owner} 와 ${app.id} 가 함께 가진다`).toBeUndefined();
        seen.set(prefix, app.id);
      }
    }
  });

  it("홈 위젯 앱 3개는 실제 앱이다", () => {
    expect(WIDGET_APP_IDS).toHaveLength(3);
    for (const id of WIDGET_APP_IDS) {
      expect(LAUNCHER_APPS.some((a) => a.id === id), `${id} 앱이 없다`).toBe(true);
    }
  });
});

describe("경로 → 앱 매칭", () => {
  it("운동 기능 경로는 하나도 빠짐없이 운동 앱으로 간다", () => {
    // 2026-09-20 전수 대조표(보고서 06장)에 나온 운동 경로 전부.
    const workoutPaths = [
      "/routine",
      "/plan",
      "/plan/today",
      "/plan/muscle",
      "/exercises",
      "/exercises/incline-dumbbell-press",
      "/conditioning/12",
      "/jog",
      "/running",
    ];
    for (const path of workoutPaths) {
      expect(appForPath(path)?.id, `${path} 가 운동 앱이 아니다`).toBe("workout");
    }
  });

  it("각 앱의 홈 경로는 자기 앱으로 잡힌다", () => {
    for (const app of LAUNCHER_APPS) {
      expect(appForPath(app.home)?.id, `${app.home}`).toBe(app.id);
    }
  });

  it("런처 자신의 화면은 어느 앱도 아니다", () => {
    for (const path of ["/home", "/", "/settings", "/settings/profile", "/equipment"]) {
      expect(appForPath(path), path).toBeNull();
    }
    expect(bottomTabsForPath("/home")[0].href).toBe(LAUNCHER_TABS[0].href);
  });

  it("접두사는 경계까지 본다 — /plan 이 /planner 를 삼키지 않는다", () => {
    expect(appForPath("/planner")).toBeNull();
    expect(appForPath("/petition")).toBeNull();
    expect(appForPath("/pet")?.id).toBe("pet");
  });
});

describe("탭 활성 판정", () => {
  it("운동 앱에서 오늘·루틴·기록이 제 경로에서만 켜진다", () => {
    const workout = LAUNCHER_APPS.find((a) => a.id === "workout")!;
    const [today, plan, , record] = workout.tabs;

    expect(isTabActive(today, "/routine")).toBe(true);
    expect(isTabActive(today, "/conditioning/9")).toBe(true);
    expect(isTabActive(today, "/plan")).toBe(false);

    expect(isTabActive(plan, "/plan")).toBe(true);
    expect(isTabActive(plan, "/plan/muscle")).toBe(true);
    expect(isTabActive(plan, "/settings/routine")).toBe(true);
    expect(isTabActive(plan, "/routine")).toBe(false);

    // 설정 속에 묻혀 있던 성장 그래프·내 운동 점수를 '기록' 칸이 데려온다.
    expect(isTabActive(record, "/settings/progress")).toBe(true);
    expect(isTabActive(record, "/settings/score")).toBe(true);
  });

  it("쿼리스트링이 붙은 탭도 경로로 판단한다", () => {
    const diet = LAUNCHER_APPS.find((a) => a.id === "diet")!;
    const search = diet.tabs[1];
    expect(search.href).toContain("?");
    expect(isTabActive(search, "/diet")).toBe(true);
    expect(isTabActive(search, "/calendar")).toBe(false);
  });

  it("홈 칸은 / 와 /home 에서 켜진다", () => {
    expect(isTabActive(HOME_TAB, "/")).toBe(true);
    expect(isTabActive(HOME_TAB, "/home")).toBe(true);
    expect(isTabActive(HOME_TAB, "/routine")).toBe(false);
  });
});

describe("런처 격자", () => {
  it("헬쑤쌤은 디버그 기능이 켜진 사용자에게만 보인다", () => {
    expect(visibleApps().some((a) => a.id === "coach")).toBe(false);
    expect(visibleApps(["helssu-coach"]).some((a) => a.id === "coach")).toBe(true);
  });

  it("나머지 앱은 플래그 없이도 전부 보인다", () => {
    const shown = visibleApps().map((a) => a.id);
    for (const app of LAUNCHER_APPS) {
      if (app.debugFlag) continue;
      expect(shown, `${app.id} 가 런처에서 빠졌다`).toContain(app.id);
    }
  });
});
