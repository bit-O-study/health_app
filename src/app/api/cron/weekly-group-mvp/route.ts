import { runWeeklyGroupMvp } from "@/features/groups/weekly-mvp";
import { handleCron } from "@/lib/cron/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 주간 그룹 MVP 알림 cron — 매주 월요일 호출(지난주 랭킹 결과를 멤버에게 푸시).
 * 인증(`CRON_SECRET`)·실행기록(`cron_runs`)은 `handleCron`,
 * 같은 주 중복 발송 차단은 `runWeeklyGroupMvp` 가 담당한다.
 */
export async function GET(req: Request) {
  return handleCron(req, "weekly-group-mvp", async (admin) => {
    const { groups, notified, targeted, deduped, failed, reason } =
      await runWeeklyGroupMvp(admin);
    return {
      counts: {
        scanned: groups,
        targeted,
        sent: notified,
        deduped,
        failed,
      },
      body: { groups, notified, deduped, failed, reason },
    };
  });
}
