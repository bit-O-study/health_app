import { describe, expect, it } from "vitest";

import {
  dailyReminderKey,
  pairKey,
  retentionCutoff,
  SEND_LOG_RETENTION_DAYS,
  sentKeySet,
  splitAlreadySent,
  weeklyMvpKey,
} from "@/features/notifications/dedup";

describe("dedup 키", () => {
  it("하루 리마인더는 종류·날짜별로 나뉜다", () => {
    expect(dailyReminderKey("diet", "2026-08-31")).toBe(
      "daily-reminders:diet:2026-08-31",
    );
    expect(dailyReminderKey("workout", "2026-08-31")).not.toBe(
      dailyReminderKey("diet", "2026-08-31"),
    );
  });

  it("날짜가 바뀌면 키도 바뀐다 — 내일은 다시 나가야 한다", () => {
    expect(dailyReminderKey("diet", "2026-09-01")).not.toBe(
      dailyReminderKey("diet", "2026-08-31"),
    );
  });

  it("주간 MVP 는 그룹·주(월요일)별", () => {
    expect(weeklyMvpKey("g1", "2026-08-24")).toBe(
      "weekly-group-mvp:g1:2026-08-24",
    );
    expect(weeklyMvpKey("g1", "2026-08-24")).not.toBe(
      weeklyMvpKey("g2", "2026-08-24"),
    );
    expect(weeklyMvpKey("g1", "2026-08-31")).not.toBe(
      weeklyMvpKey("g1", "2026-08-24"),
    );
  });

  it("사용자가 다르면 판정 키도 다르다", () => {
    expect(pairKey("u1", "k")).not.toBe(pairKey("u2", "k"));
  });
});

describe("splitAlreadySent", () => {
  const targets = [
    { userId: "u1", key: "daily-reminders:diet:2026-08-31" },
    { userId: "u2", key: "daily-reminders:diet:2026-08-31" },
  ];

  it("기록이 없으면 전부 보낸다", () => {
    const { fresh, deduped } = splitAlreadySent(targets, new Set());
    expect(fresh).toHaveLength(2);
    expect(deduped).toBe(0);
  });

  it("이미 보낸 사람은 걸러낸다(크론 재실행 = 잔소리 2번 금지)", () => {
    const sent = sentKeySet([
      { user_id: "u1", dedup_key: "daily-reminders:diet:2026-08-31" },
    ]);
    const { fresh, deduped } = splitAlreadySent(targets, sent);
    expect(fresh.map((t) => t.userId)).toEqual(["u2"]);
    expect(deduped).toBe(1);
  });

  it("다른 날짜 기록은 오늘 발송을 막지 않는다", () => {
    const sent = sentKeySet([
      { user_id: "u1", dedup_key: "daily-reminders:diet:2026-08-30" },
    ]);
    expect(splitAlreadySent(targets, sent).fresh).toHaveLength(2);
  });

  it("한 실행 안에서 같은 (사용자,키) 가 중복돼도 한 번만 남긴다", () => {
    const dup = [...targets, { userId: "u1", key: targets[0].key }];
    const { fresh, deduped } = splitAlreadySent(dup, new Set());
    expect(fresh).toHaveLength(2);
    expect(deduped).toBe(1);
  });

  it("같은 사용자라도 그룹(키)이 다르면 각각 나간다", () => {
    const multi = [
      { userId: "u1", key: weeklyMvpKey("g1", "2026-08-24") },
      { userId: "u1", key: weeklyMvpKey("g2", "2026-08-24") },
    ];
    expect(splitAlreadySent(multi, new Set()).fresh).toHaveLength(2);
  });

  it("원본 항목(발송에 필요한 필드)을 그대로 들고 나온다", () => {
    const rich = [{ userId: "u1", key: "k", groupName: "그룹", rank: 1 }];
    expect(splitAlreadySent(rich, new Set()).fresh[0].groupName).toBe("그룹");
  });
});

describe("retentionCutoff", () => {
  it("보존기간(기본 30일) 이전 시각을 ISO 로 준다", () => {
    const now = Date.parse("2026-08-31T00:00:00.000Z");
    expect(retentionCutoff(now)).toBe("2026-08-01T00:00:00.000Z");
    expect(SEND_LOG_RETENTION_DAYS).toBe(30);
  });

  it("일수를 지정할 수 있고, 음수는 지금으로 눕힌다", () => {
    const now = Date.parse("2026-08-31T00:00:00.000Z");
    expect(retentionCutoff(now, 1)).toBe("2026-08-30T00:00:00.000Z");
    expect(retentionCutoff(now, -5)).toBe("2026-08-31T00:00:00.000Z");
  });
});
