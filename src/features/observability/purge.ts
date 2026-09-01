import type { SupabaseClient } from "@supabase/supabase-js";

import { APP_EVENT_RETENTION_DAYS } from "@/lib/observability/app-event";

/**
 * 보존 기간이 지난 관측 기록 삭제 — 하루 한 번 도는 크론에서 같이 호출한다.
 *
 * 오래된 오류 기록은 진단에 쓸모가 없고(그 사이 배포가 여러 번 바뀐다), 개인정보를
 * 뺐다고 해도 무기한 쌓아 둘 이유가 없다. `notification_sends` 와 같은 방식.
 */
export function appEventCutoff(now = Date.now()): string {
  return new Date(
    now - APP_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
}

export async function purgeOldAppEvents(
  admin: SupabaseClient,
  now = Date.now(),
): Promise<void> {
  // 관측 정리가 실패해도 크론 본업(알림 발송)이 죽으면 안 된다.
  try {
    await admin.from("app_events").delete().lt("occurred_at", appEventCutoff(now));
  } catch {
    /* noop */
  }
}
