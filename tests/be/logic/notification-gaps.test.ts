import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  DEFAULT_PREFERENCES,
  NOTIFICATION_KINDS,
  NOTIFICATION_LABEL,
  decideSend,
  kindForPushType,
} from "@/features/notifications/preferences";

/**
 * 2026-09-09 전수 조사에서 나온 **알림 구멍 두 개**의 회귀 테스트.
 *
 * 둘 다 화면에는 아무 이상이 없어서, 사용자가 말해 주기 전엔 몰랐을 종류다.
 *  1. 그룹 응원 알림이 **설정을 안 보고** 나갔다 — 껐는데도 오고, 방해 금지 시간에도 왔다.
 *  2. '내 루틴 담김' 은 설정 화면에 **스위치까지 있는데 보내는 코드가 없었다** —
 *     사용자는 있는 줄 아는 알림이 영영 안 온다.
 *
 * 전수 가드(`push-type-coverage.test.ts`)가 "빠진 곳이 없나"를 보고,
 * 여기서는 이 두 건이 **어떻게** 동작해야 하는지를 못 박는다.
 */
describe("그룹 응원 알림", () => {
  const src = readFileSync("src/features/groups/group-actions.ts", "utf8");

  it("🔴 설정을 보고 보낸다 — 예전엔 껐는데도 왔다", () => {
    expect(src).toContain("decideSend(");
    expect(src).toContain("loadPreferences(");
  });

  it("그룹 소식 스위치로 꺼진다", () => {
    expect(kindForPushType("group-cheer")).toBe("group-activity");
    const off = {
      ...DEFAULT_PREFERENCES,
      kinds: { ...DEFAULT_PREFERENCES.kinds, "group-activity": false },
    };
    expect(decideSend(off, "group-activity", 14)).toEqual({
      allowed: false,
      reason: "kind-off",
    });
  });

  it("🔴 방해 금지 시간에는 안 간다 — 응원은 급한 알림이 아니다", () => {
    expect(decideSend(DEFAULT_PREFERENCES, "group-activity", 3)).toEqual({
      allowed: false,
      reason: "quiet-hours",
    });
  });

  it("알림 실패가 응원 저장을 되돌리지 않는다", () => {
    const fn = src.slice(src.indexOf("notifyEnabled()"));
    expect(fn.slice(0, 1500)).toContain("catch");
  });
});

describe("'내 루틴 담김' 알림", () => {
  const src = readFileSync("src/features/routine-share/actions.ts", "utf8");

  it("🔴 실제로 보낸다 — 스위치만 있고 보내는 코드가 없었다", () => {
    expect(src).toContain('type: "routine-saved"');
    expect(src).toContain("notifyUser(");
  });

  it("설정 스위치가 살아 있다(설정 화면에 뜬다)", () => {
    expect(NOTIFICATION_KINDS).toContain("routine-saved");
    expect(NOTIFICATION_LABEL["routine-saved"].title).toBeTruthy();
    expect(kindForPushType("routine-saved")).toBe("routine-saved");
  });

  it("설정을 보고 보낸다", () => {
    expect(src).toContain("decideSend(");
    const off = {
      ...DEFAULT_PREFERENCES,
      kinds: { ...DEFAULT_PREFERENCES.kinds, "routine-saved": false },
    };
    expect(decideSend(off, "routine-saved", 14).allowed).toBe(false);
  });

  it("🔴 자기 글을 자기가 담으면 안 보낸다", () => {
    const fn = src.slice(src.indexOf("async function notifyRoutineSaved"));
    expect(fn.slice(0, 400)).toContain("authorId === saverId");
  });

  it("🔴 담은 사람이 누구인지는 알리지 않는다 — 올리기가 부담스러워진다", () => {
    const fn = src.slice(src.indexOf("async function notifyRoutineSaved"));
    const body = fn.slice(0, 1200);
    // 본문에 담은 사람 이름/아이디를 끼워 넣지 않는다.
    expect(body).not.toMatch(/body:.*saver/i);
    expect(body).toContain("누군가");
  });

  it("담기 자체는 알림과 무관하게 끝난다 — 실패를 삼킨다", () => {
    const fn = src.slice(src.indexOf("async function notifyRoutineSaved"));
    expect(fn.slice(0, 1200)).toContain("catch");
  });

  it("작성자를 알아야 보낼 수 있다 — 소개글에서 user_id 를 읽는다", () => {
    // 예전 조회는 `exercises, conditioning` 뿐이라 **누구에게 보낼지를 몰랐다.**
    expect(src).toContain('.select("exercises, conditioning, user_id, title")');
  });
});
