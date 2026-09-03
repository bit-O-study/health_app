import { describe, expect, it } from "vitest";

import {
  DEFAULT_PREFERENCES,
  NOTIFICATION_KINDS,
  NOTIFICATION_LABEL,
  PUSH_TYPE_TO_KIND,
  decideSend,
  filterByPreference,
  isNotificationKind,
  isQuietHour,
  kindForPushType,
  parsePreferences,
  seoulHour,
  toPreferenceRow,
  type NotificationPreferences,
} from "@/features/notifications/preferences";
import { REMINDER_PAYLOADS } from "@/features/notifications/daily-reminder";

function prefs(over: Partial<NotificationPreferences> = {}): NotificationPreferences {
  return {
    ...DEFAULT_PREFERENCES,
    ...over,
    kinds: { ...DEFAULT_PREFERENCES.kinds, ...(over.kinds ?? {}) },
  };
}

describe("parsePreferences — 마이그레이션(행이 없어도 동작)", () => {
  it("행이 없으면 기본값 — 기존 사용자에게 행을 만들지 않아도 지금처럼 받는다", () => {
    expect(parsePreferences(null)).toEqual(DEFAULT_PREFERENCES);
    expect(parsePreferences(undefined)).toEqual(DEFAULT_PREFERENCES);
  });

  it("일부 컬럼만 있어도 나머지는 기본값으로 메운다", () => {
    const p = parsePreferences({ diet_reminder: false });
    expect(p.kinds["diet-reminder"]).toBe(false);
    expect(p.kinds["workout-reminder"]).toBe(true);
    expect(p.quietHours).toBe(true);
  });

  it("값이 깨져 있으면(문자열·범위 밖) 기본값을 쓴다", () => {
    const p = parsePreferences({
      workout_reminder: "yes" as never,
      quiet_start_hour: 99,
      quiet_end_hour: -3,
    });
    expect(p.kinds["workout-reminder"]).toBe(true);
    expect(p.quietStartHour).toBe(22);
    expect(p.quietEndHour).toBe(7);
  });

  it("설정 → row → 설정 왕복이 값을 보존한다", () => {
    const original = prefs({
      kinds: { ...DEFAULT_PREFERENCES.kinds, "group-activity": false },
      quietHours: false,
      quietStartHour: 1,
      quietEndHour: 9,
    });
    expect(parsePreferences(toPreferenceRow(original))).toEqual(original);
  });
});

describe("isQuietHour — 자정을 넘는 구간", () => {
  it("22시~7시는 밤과 새벽을 모두 포함한다", () => {
    const p = prefs({ quietStartHour: 22, quietEndHour: 7 });
    for (const h of [22, 23, 0, 3, 6]) expect(isQuietHour(h, p)).toBe(true);
    for (const h of [7, 8, 12, 21]) expect(isQuietHour(h, p)).toBe(false);
  });

  it("자정을 안 넘는 구간(13~15시)도 된다", () => {
    const p = prefs({ quietStartHour: 13, quietEndHour: 15 });
    expect(isQuietHour(13, p)).toBe(true);
    expect(isQuietHour(14, p)).toBe(true);
    expect(isQuietHour(15, p)).toBe(false);
    expect(isQuietHour(22, p)).toBe(false);
  });

  it("시작과 끝이 같으면 금지 구간이 없다 — 하루 종일 금지는 '전부 끄기' 다", () => {
    const p = prefs({ quietStartHour: 9, quietEndHour: 9 });
    for (const h of [0, 9, 15, 23]) expect(isQuietHour(h, p)).toBe(false);
  });

  it("방해 금지를 끄면 언제나 false", () => {
    expect(isQuietHour(3, prefs({ quietHours: false }))).toBe(false);
  });
});

describe("decideSend — 보낼지 말지", () => {
  it("종류를 껐으면 안 보낸다", () => {
    const p = prefs({
      kinds: { ...DEFAULT_PREFERENCES.kinds, "diet-reminder": false },
    });
    expect(decideSend(p, "diet-reminder", 20)).toEqual({
      allowed: false,
      reason: "kind-off",
    });
    // 다른 종류는 그대로 간다 — 하나 껐다고 전부 막히면 안 된다.
    expect(decideSend(p, "workout-reminder", 20).allowed).toBe(true);
  });

  it("방해 금지 시간이면 켜 둔 종류도 안 보낸다", () => {
    expect(decideSend(prefs(), "workout-inactivity", 2)).toEqual({
      allowed: false,
      reason: "quiet-hours",
    });
  });

  it("하루 리마인더가 도는 20시는 기본 설정에서 통과한다(기존 동작 유지)", () => {
    expect(decideSend(prefs(), "workout-reminder", 20).allowed).toBe(true);
    expect(decideSend(prefs(), "diet-reminder", 20).allowed).toBe(true);
  });
});

describe("filterByPreference — 크론이 대상자를 거를 때", () => {
  const targets = [{ userId: "a" }, { userId: "b" }, { userId: "c" }];

  it("설정이 없는 사용자는 기본값 = 받는다", () => {
    const res = filterByPreference(
      targets,
      (t) => t.userId,
      new Map(),
      "workout-reminder",
      20,
    );
    expect(res.allowed).toHaveLength(3);
    expect(res.blocked).toBe(0);
  });

  it("끈 사람만 빠지고 나머지는 그대로", () => {
    const map = new Map([
      [
        "b",
        prefs({
          kinds: { ...DEFAULT_PREFERENCES.kinds, "workout-reminder": false },
        }),
      ],
    ]);
    const res = filterByPreference(
      targets,
      (t) => t.userId,
      map,
      "workout-reminder",
      20,
    );
    expect(res.allowed.map((t) => t.userId)).toEqual(["a", "c"]);
    expect(res.blocked).toBe(1);
  });

  it("새벽에는 기본 설정만으로도 전부 막힌다", () => {
    const res = filterByPreference(
      targets,
      (t) => t.userId,
      new Map(),
      "workout-inactivity",
      3,
    );
    expect(res.allowed).toEqual([]);
    expect(res.blocked).toBe(3);
  });

  it("빈 목록도 터지지 않는다", () => {
    const res = filterByPreference([], (t: { userId: string }) => t.userId, new Map(), "group-activity", 10);
    expect(res).toEqual({ allowed: [], blocked: 0 });
  });
});

describe("seoulHour — 타임존", () => {
  it("UTC 시각을 서울 시로 바꾼다(+9)", () => {
    // 2026-09-01T13:00Z = 서울 22시 → 기본 설정에서 방해 금지 시작.
    expect(seoulHour(new Date("2026-09-01T13:00:00Z"))).toBe(22);
    // 자정을 넘기는 경우: UTC 16시 = 서울 다음날 1시.
    expect(seoulHour(new Date("2026-09-01T16:00:00Z"))).toBe(1);
  });

  it("서울 22시는 기본 방해 금지에 걸린다 — UTC 로 재면 13시라 안 걸린다", () => {
    const at = new Date("2026-09-01T13:00:00Z");
    expect(isQuietHour(seoulHour(at), prefs())).toBe(true);
    expect(isQuietHour(at.getUTCHours(), prefs())).toBe(false);
  });
});

describe("레지스트리 정합성", () => {
  it("모든 종류에 라벨과 기본값이 있다 — 새 종류를 넣고 빠뜨리면 여기서 걸린다", () => {
    for (const kind of NOTIFICATION_KINDS) {
      expect(NOTIFICATION_LABEL[kind]?.title).toBeTruthy();
      expect(NOTIFICATION_LABEL[kind]?.desc).toBeTruthy();
      expect(typeof DEFAULT_PREFERENCES.kinds[kind]).toBe("boolean");
      expect(isNotificationKind(kind)).toBe(true);
    }
  });

  it("push 타입 매핑이 전부 등록된 종류를 가리킨다", () => {
    for (const [type, kind] of Object.entries(PUSH_TYPE_TO_KIND)) {
      expect(isNotificationKind(kind), `${type} → ${kind}`).toBe(true);
    }
    expect(kindForPushType("없는-타입")).toBeNull();
  });

  it("실제로 보내는 리마인더 타입이 매핑에 들어 있다 — 빠지면 못 끄는 알림이 된다", () => {
    for (const payload of Object.values(REMINDER_PAYLOADS)) {
      expect(kindForPushType(payload.type), payload.type).not.toBeNull();
    }
    // 크론이 직접 쓰는 타입들.
    expect(kindForPushType("workout-end")).toBe("workout-inactivity");
    expect(kindForPushType("weekly-mvp")).toBe("group-activity");
  });

  it("기본값은 전부 켜짐 — 기존 동작을 그대로 두기 위해서다", () => {
    for (const kind of NOTIFICATION_KINDS) {
      expect(DEFAULT_PREFERENCES.kinds[kind]).toBe(true);
    }
    // 야간 금지만 기본으로 켠다(이 기능의 목적).
    expect(DEFAULT_PREFERENCES.quietHours).toBe(true);
  });
});
