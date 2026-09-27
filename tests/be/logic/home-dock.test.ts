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