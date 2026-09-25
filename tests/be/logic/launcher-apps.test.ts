import { describe, expect, it } from "vitest";

import {
  BOTTOM_SLOT_COUNTS,
  SIDE_TAB_COUNTS,
  homeSlotIndex,
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
  it("앱의 양옆 칸은 0·2·4개뿐 — 홈은 앱이 적지 않는다", () => {
    for (const app of LAUNCHER_APPS) {
      expect(SIDE_TAB_COUNTS, `${app.id} 의 칸 수 ${app.tabs.length}`).toContain(
        app.tabs.length,
      );
      for (const tab of app.tabs) {
        expect(tab.href, `${app.id} 가 홈을 직접 넣었다`).not.toBe(HOME_TAB.href);
      }
    }
    expect(LAUNCHER_TABS).toHaveLength(4);
  });

  it("🔴 같은 화면으로 가는 칸이 두 개 있으면 안 된다", () => {
    // 예전엔 칸 수를 4개로 맞추려고 /diet?tab=search 같은 걸 넣었는데, 그 페이지는
    // tab 을 읽지도 않아 **버튼 넷이 전부 같은 화면**으로 갔다(2026-09-21).
    const all = [
      ...LAUNCHER_APPS.flatMap((a) => a.tabs.map((t) => ({ who: a.id, t }))),

    ];
    const seen = new Map<string, string>();
    for (const { who, t } of all) {
      const path = t.href.split("?")[0];
      const prev = seen.get(path);
      expect(prev, `${path} 를 ${prev} 와 ${who}:${t.label} 가 함께 가리킨다`).toBeUndefined();
      seen.set(path, `${who}:${t.label}`);
    }
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
      expect(BOTTOM_SLOT_COUNTS, `${path} 칸 수 ${tabs.length}`).toContain(tabs.length);
      // 홈은 언제나 **정확히 한가운데** — 3칸이면 1번, 5칸이면 2번.
      const mid = (tabs.length - 1) / 2;
      expect(Number.isInteger(mid), `${path} 칸 수가 홀수가 아니다`).toBe(true);
      expect(tabs[mid].href, `${path} 가운데 칸`).toBe(HOME_TAB.href);
      expect(tabs[mid].label).toBe("홈");
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

  it("홈 하단 기본 바로가기는 실제 앱 입구이며 설정 메뉴가 아니다", () => {
    expect(LAUNCHER_TABS.map(tab => tab.label)).toEqual(["운동", "식단", "캘린더", "그룹"]);
    for (const tab of LAUNCHER_TABS) expect(appForPath(tab.href)).not.toBeNull();
  });

  it("앱 칸은 자기 앱이나 런처 땅만 가리킨다", () => {
    for (const app of LAUNCHER_APPS) {
      for (const tab of app.tabs) {
        const owner = appForPath(tab.href.split("?")[0]);
        expect(
          owner === null || owner.id === app.id,
          `${app.id} 의 '${tab.label}' 칸이 ${owner?.id} 앱으로 넘어간다`,
        ).toBe(true);
      }
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

  it("화면이 하나뿐인 앱은 런처 바를 그대로 쓴다", () => {
    // 없는 화면을 만들어 칸을 채우지 않는다(2026-09-21).
    for (const id of ["diet", "community", "coach"]) {
      const app = LAUNCHER_APPS.find((a) => a.id === id)!;
      expect(app.tabs, `${id} 가 가짜 칸을 갖고 있다`).toHaveLength(0);
      expect(bottomTabsForPath(app.home)[0].href).toBe(LAUNCHER_TABS[0].href);
    }
  });

  it("홈 자리는 양옆 칸 수의 절반이다", () => {
    expect(homeSlotIndex(2)).toBe(1);
    expect(homeSlotIndex(4)).toBe(2);
  });

  it("홈 칸은 / 와 /home 에서 켜진다", () => {
    expect(isTabActive(HOME_TAB, "/")).toBe(true);
    expect(isTabActive(HOME_TAB, "/home")).toBe(true);
    expect(isTabActive(HOME_TAB, "/routine")).toBe(false);
  });
});

describe("런처 격자", () => {
  it("펫은 관리자가 공개해야 나타나며 다짐은 펫에 속하지 않는다", () => {
    expect(visibleApps().some((a) => a.id === "pet")).toBe(false);
    expect(visibleApps(["pet"]).some((a) => a.id === "pet")).toBe(true);
    expect(appForPath("/commitments")).toBeNull();
  });
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
