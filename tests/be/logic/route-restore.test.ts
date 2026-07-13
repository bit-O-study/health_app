import { describe, expect, it } from "vitest";

import {
  RESTORE_WINDOW_MS,
  shouldRestoreRoute,
  type SavedRoute,
} from "@/lib/platform/route-restore";

const NOW = 1_000_000_000_000;
const saved = (path: string, agoMs = 0): SavedRoute => ({
  path,
  ts: NOW - agoMs,
});

describe("shouldRestoreRoute — 부팅 후 '보던 화면' 복원 판단", () => {
  it("홈(/routine)으로 튕겼고 최근에 다른 화면이면 복원", () => {
    expect(shouldRestoreRoute(saved("/community"), "/routine", NOW)).toBe(true);
    expect(shouldRestoreRoute(saved("/"), "/routine", NOW)).toBe(false); // 저장분이 홈
  });

  it("딥링크로 특정 화면을 연 경우(현재가 홈이 아님)엔 복원 안 함", () => {
    expect(shouldRestoreRoute(saved("/community"), "/diet", NOW)).toBe(false);
  });

  it("저장분이 홈이면 복원 의미 없음", () => {
    expect(shouldRestoreRoute(saved("/routine"), "/routine", NOW)).toBe(false);
    expect(shouldRestoreRoute(saved("/"), "/", NOW)).toBe(false);
  });

  it("이미 그 화면이면(같은 전체 경로) 복원 안 함", () => {
    // 현재도 홈, 저장도 홈이 아닌데 경로 동일 케이스는 사실상 없지만 방어.
    expect(shouldRestoreRoute(saved("/routine"), "/routine", NOW)).toBe(false);
  });

  it("30분 창을 넘으면(오래됨) 복원 안 함", () => {
    expect(
      shouldRestoreRoute(saved("/community", RESTORE_WINDOW_MS - 1), "/routine", NOW),
    ).toBe(true);
    expect(
      shouldRestoreRoute(saved("/community", RESTORE_WINDOW_MS), "/routine", NOW),
    ).toBe(false);
    expect(
      shouldRestoreRoute(saved("/community", 24 * 60 * 60 * 1000), "/routine", NOW),
    ).toBe(false);
  });

  it("저장 없음 → 복원 안 함", () => {
    expect(shouldRestoreRoute(null, "/routine", NOW)).toBe(false);
  });

  it("쿼리스트링 포함 깊은 경로도 복원(홈으로 튕겼을 때)", () => {
    expect(
      shouldRestoreRoute(saved("/exercises/dips?eq=barbell"), "/routine", NOW),
    ).toBe(true);
  });
});