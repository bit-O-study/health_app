import { beforeEach, describe, expect, it, vi } from "vitest";

import { fakeAdmin, type Row } from "../stubs/fake-supabase";

// 회귀: 크론은 재실행된다(재시도·수동 호출·스케줄 변경).
// - 같은 사람에게 같은 알림이 두 번 가면 안 된다 → notification_sends 로 차단.
// - 실행할 때마다 cron_runs 에 소요시간·상태·발송 수·실패 사유가 남아야 한다.
// - 한 명 발송이 터져도 나머지는 계속 나가야 한다(부분 실패 격리).

const sendPush = vi.fn<(...a: unknown[]) => Promise<string>>(async () => "ok");
const sendFcm = vi.fn<(...a: unknown[]) => Promise<string>>(async () => "ok");

vi.mock("@/features/notifications/push", () => ({
  pushEnabled: () => true,
  sendPush: (...a: unknown[]) => sendPush(...(a as [])),
}));
vi.mock("@/features/notifications/fcm", () => ({
  fcmEnabled: () => false,
  sendFcm: (...a: unknown[]) => sendFcm(...(a as [])),
}));

// next/server 는 런타임 전용이라 노드에서 그대로 못 쓴다 — 응답 JSON 만 흉내낸다.
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => body,
    }),
  },
}));

/** 테스트가 갈아끼우는 admin 클라이언트. */
let currentAdmin: unknown = null;
vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => currentAdmin,
}));

const { GET: dailyReminders } = await import(
  "@/app/api/cron/daily-reminders/route"
);
const { GET: workoutInactivity } = await import(
  "@/app/api/cron/workout-inactivity/route"
);
const { seoulYmd } = await import("@/features/routine/data");

const today = seoulYmd();

/** 오늘이 휴식일이고 식단 기록이 없는 사용자 2명 + 각자 웹푸시 구독 1개. */
function reminderStore(): Record<string, Row[]> {
  return {
    user_routines: ["u1", "u2"].map((user_id) => ({
      user_id,
      splits: 3,
      variant_id: "push-pull-legs",
      custom_week: null,
      start_date: today,
      rest_date: today, // 휴식일 → 식단 리마인더 대상
      override_date: null,
      override_block: null,
    })),
    food_logs: [],
    exercise_completions: [],
    push_subscriptions: ["u1", "u2"].map((user_id) => ({
      user_id,
      endpoint: `https://push.example/${user_id}`,
      p256dh: "p",
      auth: "a",
    })),
    notification_sends: [],
    cron_runs: [],
  };
}

const req = () => new Request("https://app.test/api/cron/daily-reminders");

beforeEach(() => {
  sendPush.mockClear();
  sendPush.mockImplementation(async () => "ok");
  sendFcm.mockClear();
  delete process.env.CRON_SECRET;
});

describe("daily-reminders — 재실행 중복 방지", () => {
  it("첫 실행은 보내고, 같은 날 두 번째 실행은 한 명도 안 보낸다", async () => {
    const store = reminderStore();
    currentAdmin = fakeAdmin(store);

    const first = await (await dailyReminders(req())).json();
    expect(first).toMatchObject({ ok: true, sent: 2, deduped: 0 });
    expect(sendPush).toHaveBeenCalledTimes(2);
    expect(store.notification_sends).toHaveLength(2);

    sendPush.mockClear();
    const second = await (await dailyReminders(req())).json();
    expect(second).toMatchObject({ ok: true, sent: 0, deduped: 2 });
    expect(sendPush).not.toHaveBeenCalled();
  });

  it("발송 기록 키에 오늘 날짜와 종류가 들어간다(내일은 다시 나가야 하니까)", async () => {
    const store = reminderStore();
    currentAdmin = fakeAdmin(store);
    await dailyReminders(req());
    expect(store.notification_sends[0].dedup_key).toBe(
      `daily-reminders:diet:${today}`,
    );
  });

  it("기기가 없어 못 보낸 사람은 기록하지 않는다 — 기기 등록 뒤 받을 수 있게", async () => {
    const store = reminderStore();
    store.push_subscriptions = []; // 아무도 구독이 없다
    currentAdmin = fakeAdmin(store);

    const res = await (await dailyReminders(req())).json();
    expect(res).toMatchObject({ sent: 0, deduped: 0 });
    expect(store.notification_sends).toHaveLength(0);
  });

  it("오늘 식단을 남긴 사람은 애초에 대상이 아니다", async () => {
    const store = reminderStore();
    store.food_logs = [{ user_id: "u1", for_date: today }];
    currentAdmin = fakeAdmin(store);

    const res = await (await dailyReminders(req())).json();
    expect(res).toMatchObject({ sent: 1 });
    expect(store.notification_sends).toHaveLength(1);
    expect(store.notification_sends[0].user_id).toBe("u2");
  });

  it("한 명 발송이 터져도 나머지는 계속 보낸다(부분 실패 격리)", async () => {
    const store = reminderStore();
    currentAdmin = fakeAdmin(store);
    sendPush.mockImplementation(async (sub) => {
      if ((sub as { endpoint: string }).endpoint.endsWith("u1")) {
        throw new Error("web push 500");
      }
      return "ok";
    });

    const res = await (await dailyReminders(req())).json();
    expect(res).toMatchObject({ ok: true, sent: 1, failed: 1 });
    expect(res.reason).toContain("web push 500");
    // 실패한 사람은 기록하지 않는다 → 다음 실행에서 다시 시도된다.
    expect(store.notification_sends.map((r) => r.user_id)).toEqual(["u2"]);
  });
});

describe("cron_runs 기록", () => {
  it("성공 실행을 수치와 함께 남긴다", async () => {
    const store = reminderStore();
    currentAdmin = fakeAdmin(store);
    await dailyReminders(req());

    expect(store.cron_runs).toHaveLength(1);
    const run = store.cron_runs[0];
    expect(run).toMatchObject({
      name: "daily-reminders",
      status: "ok",
      scanned: 2,
      targeted: 2,
      sent: 2,
      deduped: 0,
      failed: 0,
      reason: null,
    });
    expect(typeof run.duration_ms).toBe("number");
    expect(Number(run.duration_ms)).toBeGreaterThanOrEqual(0);
  });

  it("예외가 나면 status=error 와 사유를 남기고 500 을 준다", async () => {
    const store = reminderStore();
    currentAdmin = fakeAdmin(store, "user_routines");

    const res = await dailyReminders(req());
    expect(res.status).toBe(500);
    expect(store.cron_runs).toHaveLength(1);
    expect(store.cron_runs[0]).toMatchObject({ status: "error" });
    expect(String(store.cron_runs[0].reason)).toContain("user_routines");
  });

  it("CRON_SECRET 이 안 맞으면 401 이고 기록도 남기지 않는다(아무나 행을 못 쌓게)", async () => {
    const store = reminderStore();
    currentAdmin = fakeAdmin(store);
    process.env.CRON_SECRET = "s3cret";

    const res = await dailyReminders(req());
    expect(res.status).toBe(401);
    expect(store.cron_runs).toHaveLength(0);
    expect(sendPush).not.toHaveBeenCalled();
  });

  it("올바른 Bearer 토큰이면 정상 실행된다", async () => {
    const store = reminderStore();
    currentAdmin = fakeAdmin(store);
    process.env.CRON_SECRET = "s3cret";

    const res = await dailyReminders(
      new Request("https://app.test/api/cron/daily-reminders", {
        headers: { authorization: "Bearer s3cret" },
      }),
    );
    expect(res.status).toBe(200);
    expect(store.cron_runs).toHaveLength(1);
  });
});

describe("workout-inactivity — prompted_at 이 중복 알림을 막는다", () => {
  const stateStore = (): Record<string, Row[]> => ({
    workout_active_state: [
      {
        user_id: "u1",
        active: true,
        // 40분 전 마지막 활동 → 30분 무활동 기준 초과
        last_activity_at: new Date(Date.now() - 40 * 60_000).toISOString(),
        prompted_at: null,
      },
    ],
    push_subscriptions: [
      {
        user_id: "u1",
        endpoint: "https://push.example/u1",
        p256dh: "p",
        auth: "a",
      },
    ],
    cron_runs: [],
  });

  it("10분마다 돌아도 종료 확인은 한 번만 나간다", async () => {
    const store = stateStore();
    currentAdmin = fakeAdmin(store);
    const r = () => new Request("https://app.test/api/cron/workout-inactivity");

    const first = await (await workoutInactivity(r())).json();
    expect(first).toMatchObject({ ok: true, prompted: 1, sent: 1 });
    expect(store.workout_active_state[0].prompted_at).toBeTruthy();

    sendPush.mockClear();
    const second = await (await workoutInactivity(r())).json();
    expect(second).toMatchObject({ prompted: 0 });
    expect(sendPush).not.toHaveBeenCalled();
  });

  it("발송이 실패해도 prompted_at 은 찍는다(다음 실행에 밀린 알림이 몰리지 않게)", async () => {
    const store = stateStore();
    currentAdmin = fakeAdmin(store);
    sendPush.mockImplementation(async () => {
      throw new Error("web push 503");
    });

    const res = await (
      await workoutInactivity(
        new Request("https://app.test/api/cron/workout-inactivity"),
      )
    ).json();
    expect(res).toMatchObject({ ok: true, failed: 1, sent: 0 });
    expect(store.workout_active_state[0].prompted_at).toBeTruthy();
    expect(store.cron_runs[0]).toMatchObject({
      name: "workout-inactivity",
      status: "ok",
      failed: 1,
    });
  });
});
