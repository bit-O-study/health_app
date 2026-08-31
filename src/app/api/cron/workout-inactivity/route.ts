import {
  loadDevices,
  notifyDevices,
} from "@/features/notifications/push-fanout";
import {
  INACTIVITY_LIMIT_MS,
  NO_RESPONSE_LIMIT_MS,
} from "@/features/workout-timer/inactivity";
import { chunk, mapWithConcurrency } from "@/lib/batch";
import { handleCron } from "@/lib/cron/handler";
import { failureReason } from "@/lib/cron/run-log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 알림 발송 동시 실행 수. */
const USER_CONCURRENCY = 8;
/** `.in(...)` 한 번에 넣을 최대 개수(URL 길이 제한). */
const IN_CHUNK = 100;

type StateRow = {
  user_id: string;
  last_activity_at: string;
  prompted_at: string | null;
};

/**
 * 무활동 감지 cron — Vercel Cron 이 10분마다 호출.
 * 활성 세션 중 30분 무활동이면 종료 확인 푸시를 보내고, 알림 후 10분 무응답이면
 * 세션을 자동 종료(비활성화)한다. (기록 시간은 마지막 활동까지 이미 저장됨.)
 *
 * 판정은 메모리에서 끝내고, 푸시는 제한 동시성으로, 상태 UPDATE 는 사용자별이 아니라
 * **한 번에 묶어서** 처리한다(동시 운동자가 늘어도 실행시간이 비례하지 않게).
 *
 * ⚠ **중복 알림 방지는 `prompted_at` 자체가 한다** — 보내는 즉시 시각을 찍고,
 * 다음 실행부터는 `prompted_at`이 있는 행을 "이미 물어본 사람"으로 분기하기 때문에
 * 10분마다 돌아도 종료 확인은 한 번만 나간다(별도 발송 기록이 필요 없다).
 *
 * 인증(`CRON_SECRET`)·실행기록(`cron_runs`)은 `handleCron` 담당.
 */
export async function GET(req: Request) {
  return handleCron(req, "workout-inactivity", async (admin) => {
    const now = Date.now();
    const { data: states } = await admin
      .from("workout_active_state")
      .select("user_id, last_activity_at, prompted_at")
      .eq("active", true);
    const rows = (states ?? []) as StateRow[];

    // 1) 판정 — DB 없이.
    const toPrompt: string[] = [];
    const toEnd: string[] = [];
    for (const s of rows) {
      const last = new Date(s.last_activity_at).getTime();
      const promptedAt = s.prompted_at
        ? new Date(s.prompted_at).getTime()
        : null;
      if (promptedAt === null) {
        if (now - last >= INACTIVITY_LIMIT_MS) toPrompt.push(s.user_id);
      } else if (now - promptedAt >= NO_RESPONSE_LIMIT_MS) {
        toEnd.push(s.user_id);
      }
    }

    // 2) 종료 확인 푸시 — 대상자 기기를 한 번에 읽고 제한 동시성으로 발송.
    //    (웹푸시의 예/아니오 액션은 SW 가 처리, FCM 은 기본 알림.)
    const devices = await loadDevices(admin, toPrompt);
    let failed = 0;
    let firstFailure: string | undefined;
    const results = await mapWithConcurrency(
      toPrompt,
      USER_CONCURRENCY,
      async (userId) => {
        // 한 명이 터져도 나머지 발송과 상태 갱신은 계속한다(부분 실패 격리).
        try {
          return await notifyDevices(admin, devices.get(userId), {
            type: "workout-end",
            title: "운동을 종료하시겠습니까?",
            body: "30분 동안 완료된 운동이 없어요. 예/아니오를 눌러주세요.",
          });
        } catch (err) {
          failed += 1;
          firstFailure ??= failureReason(err);
          return false;
        }
      },
    );
    const sent = results.filter(Boolean).length;

    // 3) 상태 갱신 — 사용자마다 UPDATE 하지 않고 묶어서.
    //    발송 실패자도 prompted_at 을 찍는다: 안 찍으면 10분 뒤 같은 사람에게 또 시도해
    //    (푸시가 살아난 순간) 밀린 알림이 한꺼번에 가고, 자동 종료도 계속 미뤄진다.
    const promptedAt = new Date().toISOString();
    await Promise.all([
      ...chunk(toPrompt, IN_CHUNK).map((ids) =>
        admin
          .from("workout_active_state")
          .update({ prompted_at: promptedAt })
          .in("user_id", ids),
      ),
      ...chunk(toEnd, IN_CHUNK).map((ids) =>
        admin
          .from("workout_active_state")
          .update({ active: false })
          .in("user_id", ids),
      ),
    ]);

    return {
      counts: {
        scanned: rows.length,
        targeted: toPrompt.length,
        sent,
        failed,
      },
      body: {
        scanned: rows.length,
        prompted: toPrompt.length,
        sent,
        failed,
        reason: firstFailure,
        ended: toEnd.length,
      },
    };
  });
}
