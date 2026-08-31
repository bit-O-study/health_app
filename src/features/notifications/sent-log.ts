import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { chunk } from "@/lib/batch";
import {
  retentionCutoff,
  sentKeySet,
  type SendTarget,
  type SentRow,
} from "@/features/notifications/dedup";

/** `.in(...)` 한 번에 넣을 최대 개수 — PostgREST 는 GET 이라 URL 길이 제한이 있다. */
const IN_CHUNK = 100;

/**
 * 대상들 중 **이미 보낸 적 있는** (user, key) 를 한 번에 읽어 판정용 Set 으로 돌려준다.
 * 사용자마다 조회하지 않는다(크론에서 쓰는 경로라 왕복이 사용자 수에 비례하면 안 된다).
 */
export async function loadSentKeys(
  admin: SupabaseClient,
  targets: readonly SendTarget[],
): Promise<Set<string>> {
  if (targets.length === 0) return new Set();
  const userIds = [...new Set(targets.map((t) => t.userId))];
  const keys = [...new Set(targets.map((t) => t.key))];

  const results = await Promise.all(
    chunk(userIds, IN_CHUNK).map(async (ids) => {
      const { data } = await admin
        .from("notification_sends")
        .select("user_id, dedup_key")
        .in("user_id", ids)
        .in("dedup_key", keys);
      return (data ?? []) as SentRow[];
    }),
  );
  return sentKeySet(results.flat());
}

/**
 * 실제로 보낸 것만 기록한다. 이미 있으면 그대로 둔다(같은 시각에 두 실행이 겹쳐도
 * PK 충돌로 죽지 않게 `ignoreDuplicates`).
 */
export async function markSent(
  admin: SupabaseClient,
  targets: readonly SendTarget[],
): Promise<void> {
  if (targets.length === 0) return;
  const sentAt = new Date().toISOString();
  const rows = targets.map((t) => ({
    user_id: t.userId,
    dedup_key: t.key,
    sent_at: sentAt,
  }));
  await Promise.all(
    chunk(rows, IN_CHUNK).map((batch) =>
      admin
        .from("notification_sends")
        .upsert(batch, { onConflict: "user_id,dedup_key", ignoreDuplicates: true }),
    ),
  );
}

/**
 * 보존 기간이 지난 기록 삭제 — 하루 한 번 도는 크론에서 같이 호출한다.
 * (키에 날짜가 들어 있어 오래된 행은 다시 조회되지 않는다. 순전히 용량 문제.)
 */
export async function purgeOldSends(admin: SupabaseClient): Promise<void> {
  await admin
    .from("notification_sends")
    .delete()
    .lt("sent_at", retentionCutoff());
}
