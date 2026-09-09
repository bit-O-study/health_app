import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  PREFERENCE_ROW_KEYS,
  parsePreferences,
  type NotificationPreferences,
  type PreferenceRow,
} from "@/features/notifications/preferences";
import { chunk } from "@/lib/batch";

/**
 * ⚠ 여기서는 **요청 스코프 supabase 클라이언트를 import 하지 않는다.**
 * 크론(서비스 롤)이 쓰는 경로라서, `@/lib/supabase/server` 를 물면 그 모듈이
 * import 시점에 환경변수를 요구해 크론 단위 테스트가 통째로 깨진다.
 * 로그인 사용자용 조회는 `my-preferences.ts` 에 따로 있다.
 */

/**
 * 조회할 컬럼 — 순수 모듈의 종류 표에서 **뽑아 쓴다**(손으로 적지 않는다).
 * 손으로 적어 두면 종류를 새로 더할 때 여기만 빠지고, 그러면 그 설정을 꺼도 알림이
 * 그대로 나간다 — 화면에는 아무 이상이 없어서 아무도 모른다.
 */
export const PREFERENCE_COLUMNS = ["user_id", ...PREFERENCE_ROW_KEYS].join(", ");

/** `.in(...)` 한 번에 넣을 최대 개수 — PostgREST 는 GET 쿼리스트링이라 URL 길이 제한이 있다. */
const IN_CHUNK = 100;

/**
 * 여러 사용자의 설정을 **한 번에** 읽는다(크론용).
 *
 * 사용자마다 조회하면 원거리 리전 왕복이 사용자 수만큼 직렬로 쌓인다 —
 * 기기 조회(`loadDevices`)와 같은 이유로 묶어서 읽는다.
 * **행이 없는 사용자는 맵에 안 들어간다** — 걸러내는 쪽이 기본값으로 본다.
 */
export async function loadPreferences(
  admin: SupabaseClient,
  userIds: readonly string[],
): Promise<Map<string, NotificationPreferences>> {
  const out = new Map<string, NotificationPreferences>();
  if (userIds.length === 0) return out;
  const batches = chunk([...new Set(userIds)], IN_CHUNK);
  await Promise.all(
    batches.map(async (ids) => {
      const { data } = await admin
        .from("notification_preferences")
        .select(PREFERENCE_COLUMNS)
        .in("user_id", ids);
      // ⚠ 컬럼 목록이 **계산된 문자열**이라 supabase-js 가 행 타입을 추론하지 못한다
      //    (리터럴일 때만 추론한다). 어차피 아래에서 캐스팅해 쓰던 값이라 unknown 을 거친다.
      for (const row of (data ?? []) as unknown as (PreferenceRow & {
        user_id: string;
      })[]) {
        out.set(row.user_id, parsePreferences(row));
      }
    }),
  );
  return out;
}
