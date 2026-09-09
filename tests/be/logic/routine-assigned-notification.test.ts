import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_PREFERENCES,
  NOTIFICATION_KINDS,
  NOTIFICATION_LABEL,
  PREFERENCE_ROW_KEYS,
  decideSend,
  kindForPushType,
  parsePreferences,
  toPreferenceRow,
} from "@/features/notifications/preferences";

/**
 * 트레이너 루틴 배정 알림 — 2026-09-09.
 *
 * 🔴 이 알림이 없으면 회원은 **자기가 안 한 변경**을 원인도 모른 채 겪는다(앱 버그로
 * 읽힌다). 그래서 알림 자체가 기능의 일부다.
 *
 * 그리고 알림 종류를 새로 더할 때 **조용히 빠지는 자리가 여러 군데**다 — 여기서 전부 묶는다.
 */
describe("루틴 배정 알림", () => {
  it("알림 종류로 등록돼 있다 — 설정 화면에 스위치가 생긴다", () => {
    expect(NOTIFICATION_KINDS).toContain("routine-assigned");
    expect(NOTIFICATION_LABEL["routine-assigned"].title).toBeTruthy();
    expect(NOTIFICATION_LABEL["routine-assigned"].desc).toBeTruthy();
  });

  it("🔴 푸시 타입이 종류로 이어져 있다 — 안 그러면 설정에서 못 끄는 알림이 된다", () => {
    expect(kindForPushType("routine-assigned")).toBe("routine-assigned");
  });

  it("🔴 그룹 소식과 **따로** 끈다", () => {
    // 묶어 두면 주간 MVP 알림을 껐다는 이유로 '남이 내 루틴을 바꿨다'를 못 보게 된다.
    expect(kindForPushType("routine-assigned")).not.toBe("group-activity");
    expect(kindForPushType("weekly-mvp")).toBe("group-activity");
  });

  it("기본은 켜짐 — 기존 사용자도 바뀐 걸 알 수 있어야 한다", () => {
    expect(DEFAULT_PREFERENCES.kinds["routine-assigned"]).toBe(true);
    // 행이 없는 사용자(설정을 한 번도 안 건드린 사람)도 기본값으로 받는다.
    expect(parsePreferences(null).kinds["routine-assigned"]).toBe(true);
  });

  it("껐다 켠 값이 DB row 로 오간다", () => {
    const off = { ...DEFAULT_PREFERENCES, kinds: { ...DEFAULT_PREFERENCES.kinds, "routine-assigned": false } };
    const row = toPreferenceRow(off);
    expect(row.routine_assigned).toBe(false);
    expect(parsePreferences(row).kinds["routine-assigned"]).toBe(false);
  });

  it("끄면 안 보내고, 방해 금지 시간에도 안 보낸다", () => {
    const on = DEFAULT_PREFERENCES;
    expect(decideSend(on, "routine-assigned", 14).allowed).toBe(true);
    // 밤 3시 — 기본 방해 금지(22~07) 안이다.
    expect(decideSend(on, "routine-assigned", 3)).toEqual({
      allowed: false,
      reason: "quiet-hours",
    });
    const off = { ...on, kinds: { ...on.kinds, "routine-assigned": false } };
    expect(decideSend(off, "routine-assigned", 14)).toEqual({
      allowed: false,
      reason: "kind-off",
    });
  });

  it("🔴 조회 컬럼 목록에 빠지지 않는다 — 빠지면 꺼도 알림이 그대로 나간다", () => {
    // 예전엔 컬럼 목록이 문자열로 따로 적혀 있어서, 종류를 더하면 그것만 안 읽혔다.
    // 지금은 종류 표에서 뽑으므로 전 종류가 자동으로 들어온다.
    expect(PREFERENCE_ROW_KEYS).toContain("routine_assigned");
    for (const kind of NOTIFICATION_KINDS) {
      const col = kind.replaceAll("-", "_");
      expect(PREFERENCE_ROW_KEYS, `${kind} 컬럼 누락`).toContain(col);
    }
  });

  it("🔴 배정 성공 뒤에 알림을 보내고, 설정을 먼저 확인한다 — 호출부 소스 가드", () => {
    // `notifyUser` 는 설정을 보지 않는다(부르는 쪽 책임이다). 이 가드가 없으면
    // 설정 화면의 스위치가 조용히 장식이 된다 — 화면으로는 절대 안 보인다.
    const src = readFileSync("src/features/groups/trainer-actions.ts", "utf8");
    expect(src).toContain("decideSend(");
    expect(src).toContain('"routine-assigned"');
    expect(src).toContain("notifyUser(");
    // 알림 실패가 배정을 되돌리면 안 된다 — try/catch 안에 있어야 한다.
    const fn = src.slice(src.indexOf("async function notifyAssigned"));
    expect(fn).toContain("try {");
    expect(fn).toContain("catch");
  });
});
