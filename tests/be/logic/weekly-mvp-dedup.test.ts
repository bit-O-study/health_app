import { beforeEach, describe, expect, it, vi } from "vitest";

import { fakeAdmin, type Row } from "../stubs/fake-supabase";

// 회귀: 월요일에 주간 MVP 크론이 두 번 돌아도 랭킹 알림은 사람당 한 번만 나가야 한다.
// (한 사람이 그룹 두 곳에 있으면 그룹별로 각각 한 번은 정상.)

const sendPush = vi.fn<(...a: unknown[]) => Promise<string>>(async () => "ok");

vi.mock("@/features/notifications/push", () => ({
  pushEnabled: () => true,
  sendPush: (...a: unknown[]) => sendPush(...(a as [])),
}));
vi.mock("@/features/notifications/fcm", () => ({
  fcmEnabled: () => false,
  sendFcm: async () => "ok",
}));

const { runWeeklyGroupMvp } = await import("@/features/groups/weekly-mvp");
const { weekRange, addDaysYmd } = await import("@/features/groups/ranking");

/** 지난주 월요일(= dedup 키에 들어가는 주 시작일)과 그 주 안의 하루. */
const TODAY = "2026-08-31";
const lastMonday = addDaysYmd(weekRange(TODAY).from, -7);
const lastWednesday = addDaysYmd(lastMonday, 2);

function store(): Record<string, Row[]> {
  return {
    groups: [{ id: "g1", name: "헬쑤 그룹" }],
    group_members: [
      { group_id: "g1", user_id: "u1", display_name: "회원1" },
      { group_id: "g1", user_id: "u2", display_name: "회원2" },
    ],
    profiles: [
      { user_id: "u1", name: "회원1", nickname: null, weight_kg: 70 },
      { user_id: "u2", name: "회원2", nickname: null, weight_kg: 60 },
    ],
    // 지난주 활동이 있어야 알림이 나간다(활동 0 인 그룹은 스팸 방지로 건너뜀).
    exercise_completions: [
      {
        user_id: "u1",
        exercise_id: "bench-press",
        sets: 4,
        status: "done",
        for_date: lastWednesday,
      },
    ],
    conditioning_completions: [],
    push_subscriptions: ["u1", "u2"].map((user_id) => ({
      user_id,
      endpoint: `https://push.example/${user_id}`,
      p256dh: "p",
      auth: "a",
    })),
    notification_sends: [],
  };
}

beforeEach(() => {
  sendPush.mockClear();
  sendPush.mockImplementation(async () => "ok");
});

describe("runWeeklyGroupMvp — 같은 주 중복 발송 차단", () => {
  it("첫 실행은 멤버 전원에게, 두 번째 실행은 아무에게도 안 보낸다", async () => {
    const s = store();
    const admin = fakeAdmin(s) as never;

    const first = await runWeeklyGroupMvp(admin, TODAY);
    expect(first).toMatchObject({ groups: 1, notified: 2, deduped: 0 });
    expect(sendPush).toHaveBeenCalledTimes(2);
    expect(s.notification_sends).toHaveLength(2);

    sendPush.mockClear();
    const second = await runWeeklyGroupMvp(admin, TODAY);
    expect(second).toMatchObject({ notified: 0, deduped: 2 });
    expect(sendPush).not.toHaveBeenCalled();
  });

  it("발송 기록 키는 (그룹, 지난주 월요일) 단위", async () => {
    const s = store();
    await runWeeklyGroupMvp(fakeAdmin(s) as never, TODAY);
    expect(s.notification_sends[0].dedup_key).toBe(
      `weekly-group-mvp:g1:${lastMonday}`,
    );
  });

  it("다음 주에는 다시 나간다(키의 주 시작일이 바뀐다)", async () => {
    const s = store();
    const admin = fakeAdmin(s) as never;
    await runWeeklyGroupMvp(admin, TODAY);

    // 다음 주에 실행 — 이번엔 '지난주'가 TODAY 가 속한 주라 활동 기록을 옮겨준다.
    const nextWeekToday = addDaysYmd(TODAY, 7);
    s.exercise_completions = [
      {
        user_id: "u1",
        exercise_id: "bench-press",
        sets: 4,
        status: "done",
        for_date: addDaysYmd(weekRange(TODAY).from, 2),
      },
    ];
    sendPush.mockClear();
    const next = await runWeeklyGroupMvp(admin, nextWeekToday);
    expect(next).toMatchObject({ notified: 2, deduped: 0 });
    expect(sendPush).toHaveBeenCalledTimes(2);
  });

  it("한 명이 터져도 나머지는 보내고, 실패자는 기록하지 않는다", async () => {
    const s = store();
    sendPush.mockImplementation(async (sub) => {
      if ((sub as { endpoint: string }).endpoint.endsWith("u1")) {
        throw new Error("web push 500");
      }
      return "ok";
    });

    const res = await runWeeklyGroupMvp(fakeAdmin(s) as never, TODAY);
    expect(res).toMatchObject({ notified: 1, failed: 1 });
    expect(res.reason).toContain("web push 500");
    expect(s.notification_sends.map((r) => r.user_id)).toEqual(["u2"]);
  });

  it("지난주 활동이 없는 그룹은 알림도, 기록도 없다", async () => {
    const s = store();
    s.exercise_completions = [];
    const res = await runWeeklyGroupMvp(fakeAdmin(s) as never, TODAY);
    expect(res).toMatchObject({ groups: 0, notified: 0 });
    expect(s.notification_sends).toHaveLength(0);
  });
});
