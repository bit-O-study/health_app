import { describe, expect, it } from "vitest";
import { placeDockApp } from "@/features/launcher/home-preferences";

describe("하단 앱 드래그 배치", () => {
  const initial = ["workout", "diet", "calendar", "groups"];
  it("기존 앱을 옮기면 목적지 앱과 교환해 네 앱을 보존한다", () => {
    expect(placeDockApp(initial, "workout", 3)).toEqual(["groups", "diet", "calendar", "workout"]);
    expect(initial).toEqual(["workout", "diet", "calendar", "groups"]);
  });
  it("새 앱은 목적지만 교체한다", () => {
    expect(placeDockApp(initial, "community", 0)).toEqual(["community", "diet", "calendar", "groups"]);
  });
  it("빈 자리로 이동하면 원래 자리가 비워진다", () => {
    expect(placeDockApp(["workout", null, "calendar", "groups"], "workout", 1)).toEqual([null, "workout", "calendar", "groups"]);
  });
  it("같은 자리에 놓거나 유효한 자리 밖에 놓으면 구성을 보존한다", () => {
    expect(placeDockApp(initial, "diet", 1)).toEqual(initial);
    expect(placeDockApp(initial, "diet", -1)).toEqual(initial);
    expect(placeDockApp(initial, "diet", 4)).toEqual(initial);
  });
});
describe("🔴 하단바 — 빈칸은 빼고 당겨 채운다 · 맞춤 운동도 놓인다(2026-10-08)", () => {
  it("빈칸·못 쓰는 앱은 빠지고 남은 앱이 순서대로 당겨진다('앱 추가' 칸 없음)", async () => {
    const { dockTabsFor, visibleApps } = await import("@/features/launcher/apps");
    const apps = visibleApps(["fit"]);
    expect(dockTabsFor(["workout", null, "fit", "groups"], apps).map((t) => t.label)).toEqual(["운동", "맞춤 운동", "그룹"]);
    // 스위치가 꺼져 못 쓰는 앱(맞춤 운동)도 빈칸처럼 빠진다
    expect(dockTabsFor(["workout", null, "fit", "groups"], visibleApps([])).map((t) => t.label)).toEqual(["운동", "그룹"]);
    expect(dockTabsFor([null, null, null, null], apps)).toEqual([]);
  });

  it("🔴 홈 기준 — 오른쪽 하나를 지워도 왼쪽 앱은 왼쪽에 남는다(반으로 다시 나누지 않는다)", async () => {
    const { bottomTabsForPath, dockLayoutFor, visibleApps, HOME_TAB } = await import("@/features/launcher/apps");
    const apps = visibleApps([]);
    const tabs = (ids: (string | null)[]) => {
      const d = dockLayoutFor(ids, apps);
      return bottomTabsForPath("/home", d.tabs, d.homeIndex).map((t) => t.label);
    };
    const H = HOME_TAB.label;
    // 오른쪽 4번 자리(그룹)를 지움 → 운동 · 식단 · 홈 · 캘린더 (식단이 오른쪽으로 넘어가지 않는다)
    expect(tabs(["workout", "diet", "calendar", null])).toEqual(["운동", "식단", H, "캘린더"]);
    // 오른쪽 3번 자리를 지움 → 오른쪽 안에서만 당겨진다
    expect(tabs(["workout", "diet", null, "groups"])).toEqual(["운동", "식단", H, "그룹"]);
    // 왼쪽 1번 자리를 지움 → 식단 · 홈 · 캘린더 · 그룹
    expect(tabs([null, "diet", "calendar", "groups"])).toEqual(["식단", H, "캘린더", "그룹"]);
    // 왼쪽 둘 다 비움 → 홈이 맨 왼쪽
    expect(tabs([null, null, "calendar", "groups"])).toEqual([H, "캘린더", "그룹"]);
  });

  it("앱 안에서는(앱 메뉴) 예전처럼 가운데 홈", async () => {
    const { bottomTabsForPath, HOME_TAB } = await import("@/features/launcher/apps");
    expect(bottomTabsForPath("/fit/report", [], 0).map((t) => t.label)).toEqual(["한눈에", HOME_TAB.label, "기록"]);
  });

  it("홈 '내 앱'과 하단바는 같은 앱 목록(launcherFlags)을 쓴다 — 하단바에서만 맞춤 운동이 빠지지 않게", async () => {
    const { readFileSync } = await import("node:fs");
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    const home = readFileSync("src/app/home/page.tsx", "utf8");
    const flags = readFileSync("src/features/launcher/launcher-flags.server.ts", "utf8");
    expect(layout).toContain("enabledFlags={flags}");
    expect(layout).toContain("launcherFlags()");
    expect(home).toContain("enabledFlags={flags}");
    expect(flags).toContain('fit.visible ? ["fit"]');
    expect(flags).toContain('aiTrainer ? ["ai-trainer"]');
  });
});
