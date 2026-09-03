import { beforeEach, describe, expect, it, vi } from "vitest";

import { fakeAdmin, type Row } from "../stubs/fake-supabase";

/**
 * 알림 설정이 **실제 발송 경로에서** 동작하는지 — 로드맵 3.1.
 *
 * 순수 로직(`preferences.test.ts`)은 규칙만 본다. 여기서는 크론이 그 규칙을 실제로
 * 부르는지, 즉 설정을 껐을 때 푸시가 정말 안 나가는지를 메모리 Supabase 로 확인한다.
 * (설정 화면만 만들고 발송부에 안 물리는 사고가 이 테스트가 막으려는 것이다.)
 */

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

const TODAY = "2026-08-31";
const lastMonday = addDaysYmd(weekRange(TODAY).from, -7);
const lastWednesday = addDaysYmd(lastMonday, 2);

function store(prefRows: Row[] = []): Record<string, Row[]> {
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
    notification_preferences: prefRows,
  };
}

/** 서울 낮 시간대로 고정 — 방해 금지에 걸리지 않게(그건 따로 검증한다). */
function atSeoulHour(hour: number): Date {
  // 서울 = UTC+9. 09시(서울) = 00:00Z.
  const utcHour = (hour - 9 + 24) % 24;
  return new Date(`2026-08-31T${String(utcHour).padStart(2, "0")}:00:00Z`);
}

beforeEach(() => {
  sendPush.mockClear();
  sendPush.mockImplementation(async () => "ok");
  vi.useRealTimers();
});

describe("주간 MVP — 알림 설정 반영", () => {
  it("설정 행이 없으면 지금까지처럼 전원에게 간다", async () => {
    vi.setSystemTime(atSeoulHour(10));
    const s = store();
    const res = await runWeeklyGroupMvp(fakeAdmin(s) as never, TODAY);
    expect(res).toMatchObject({ notified: 2, deduped: 0 });
    expect(sendPush).toHaveBeenCalledTimes(2);
  });

  it("'그룹 소식'을 끈 사람에게는 안 간다(나머지는 그대로)", async () => {
    vi.setSystemTime(atSeoulHour(10));
    const s = store([{ user_id: "u2", group_activity: false }]);
    const res = await runWeeklyGroupMvp(fakeAdmin(s) as never, TODAY);
    expect(res.notified).toBe(1);
    // 설정으로 막힌 사람은 '보내지 않음' 칸에 잡힌다.
    expect(res.deduped).toBe(1);
    expect(sendPush).toHaveBeenCalledTimes(1);
    // 안 보낸 사람은 발송 기록도 안 남는다 — 설정을 다시 켜면 다음 주에 받는다.
    expect(s.notification_sends.map((r) => r.user_id)).toEqual(["u1"]);
  });

  it("다른 종류를 껐을 뿐이면 그룹 소식은 그대로 간다", async () => {
    vi.setSystemTime(atSeoulHour(10));
    const s = store([
      { user_id: "u2", diet_reminder: false, workout_reminder: false },
    ]);
    const res = await runWeeklyGroupMvp(fakeAdmin(s) as never, TODAY);
    expect(res.notified).toBe(2);
  });

  it("야간(기본 22~07)에는 켜 둔 사람에게도 안 간다", async () => {
    vi.setSystemTime(atSeoulHour(23));
    const s = store();
    const res = await runWeeklyGroupMvp(fakeAdmin(s) as never, TODAY);
    expect(res.notified).toBe(0);
    expect(res.deduped).toBe(2);
    expect(sendPush).not.toHaveBeenCalled();
    // 밤에 막힌 사람도 기록이 안 남아 다음 실행(아침)에 받는다.
    expect(s.notification_sends).toEqual([]);
  });

  it("방해 금지를 끈 사람은 새벽에도 받는다", async () => {
    vi.setSystemTime(atSeoulHour(3));
    const s = store([{ user_id: "u1", quiet_hours: false }]);
    const res = await runWeeklyGroupMvp(fakeAdmin(s) as never, TODAY);
    expect(res.notified).toBe(1);
    expect(sendPush).toHaveBeenCalledTimes(1);
  });
});
