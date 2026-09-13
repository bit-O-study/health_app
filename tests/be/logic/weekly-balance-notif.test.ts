import { describe, expect, it } from "vitest";

import {
  ALL_REGION_COUNT,
  balanceNudgeFor,
  isNudgeDay,
  weeklyBalanceKey,
} from "@/features/notifications/weekly-balance";
import {
  DEFAULT_PREFERENCES,
  NOTIFICATION_KINDS,
  NOTIFICATION_LABEL,
  PREFERENCE_ROW_KEYS,
  parsePreferences,
  toPreferenceRow,
} from "@/features/notifications/preferences";
import { CRON_NAMES } from "@/lib/cron/run-log";

describe("balanceNudgeFor — 보낼지 말지", () => {
  it("안 한 부위가 있으면 그 이름을 그대로 담아 보낸다", () => {
    const p = balanceNudgeFor({
      weekSets: 24,
      untouchedLabels: ["하체", "코어"],
    });
    expect(p).not.toBeNull();
    expect(p!.title).toContain("하체·코어");
    expect(p!.body).toContain("24세트");
    expect(p!.url).toBe("/settings/score");
  });

  it("🔴 이번 주 운동을 안 한 사람에게는 안 보낸다", () => {
    // 그 사람에게 필요한 건 이미 있는 하루 리마인더다. 여기서 또 보내면 잔소리가 겹친다.
    expect(
      balanceNudgeFor({ weekSets: 0, untouchedLabels: ["가슴", "하체"] }),
    ).toBeNull();
  });

  it("빠짐없이 했으면 보낼 말이 없다", () => {
    expect(balanceNudgeFor({ weekSets: 30, untouchedLabels: [] })).toBeNull();
  });

  it("🔴 여섯 부위가 전부 0이면 안 보낸다 — 배분 문제가 아니라 기록 문제일 수 있다", () => {
    const all = Array.from({ length: ALL_REGION_COUNT }, (_, i) => `부위${i}`);
    expect(balanceNudgeFor({ weekSets: 12, untouchedLabels: all })).toBeNull();
  });

  it("이름을 자르지 않는다 — 찾던 부위가 묻히면 알림의 뜻이 사라진다", () => {
    const p = balanceNudgeFor({
      weekSets: 10,
      untouchedLabels: ["등", "어깨", "팔", "하체", "코어"],
    });
    for (const label of ["등", "어깨", "팔", "하체", "코어"]) {
      expect(p!.title + p!.body).toContain(label);
    }
  });
});

describe("isNudgeDay — 토요일에만", () => {
  it("토요일이면 true", () => {
    expect(isNudgeDay("2026-09-12")).toBe(true); // 토
    expect(isNudgeDay("2026-09-19")).toBe(true);
  });

  it("🔴 일요일은 아니다 — 하루밖에 안 남아 메울 시간이 없다", () => {
    expect(isNudgeDay("2026-09-13")).toBe(false);
  });

  it("평일도 아니다", () => {
    for (const ymd of ["2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10", "2026-09-11"]) {
      expect(isNudgeDay(ymd), ymd).toBe(false);
    }
  });

  it("이상한 값은 false — 알림을 찍어서 보내지 않는다", () => {
    expect(isNudgeDay("")).toBe(false);
    expect(isNudgeDay("nope")).toBe(false);
  });
});

describe("weeklyBalanceKey", () => {
  it("주(월요일)마다 달라진다 — 같은 주엔 한 번, 다음 주엔 다시", () => {
    expect(weeklyBalanceKey("2026-09-07")).toBe("weekly-balance:2026-09-07");
    expect(weeklyBalanceKey("2026-09-07")).not.toBe(
      weeklyBalanceKey("2026-09-14"),
    );
  });
});

describe("알림 종류 등록 — 빠뜨리면 설정을 꺼도 알림이 그대로 온다", () => {
  it("새 종류가 목록·라벨·기본값에 다 있다", () => {
    expect(NOTIFICATION_KINDS).toContain("weekly-balance");
    expect(NOTIFICATION_LABEL["weekly-balance"].title).toBeTruthy();
    expect(DEFAULT_PREFERENCES.kinds["weekly-balance"]).toBe(true);
  });

  it("🔴 DB 컬럼 왕복이 된다 — 저장했다 읽으면 그대로 돌아온다", () => {
    const off = {
      ...DEFAULT_PREFERENCES,
      kinds: { ...DEFAULT_PREFERENCES.kinds, "weekly-balance": false },
    };
    const row = toPreferenceRow(off);
    expect(row.weekly_balance).toBe(false);
    expect(parsePreferences(row).kinds["weekly-balance"]).toBe(false);
  });

  it("모든 종류가 왕복된다(하나만 빠져도 조용히 새 알림이 나간다)", () => {
    const row = toPreferenceRow(DEFAULT_PREFERENCES);
    const back = parsePreferences(row);
    for (const kind of NOTIFICATION_KINDS) {
      expect(back.kinds[kind], kind).toBe(DEFAULT_PREFERENCES.kinds[kind]);
    }
  });

  it("🔴 조회 컬럼 목록에도 있다 — 안 읽히면 설정을 꺼도 알림이 그대로 온다", () => {
    expect(PREFERENCE_ROW_KEYS).toContain("weekly_balance");
  });

  it("🔴 별도 cron 을 만들지 않았다 — Hobby 는 두 개까지다", () => {
    // 하루 리마인더 안에서 토요일에만 함께 판정한다.
    expect(CRON_NAMES).not.toContain("weekly-balance");
    expect(CRON_NAMES).toContain("daily-reminders");
  });
});
