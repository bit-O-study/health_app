import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { sendPush, pushEnabled } from "@/features/notifications/push";
import { sendFcm, fcmEnabled } from "@/features/notifications/fcm";
import { chunk, mapWithConcurrency } from "@/lib/batch";

export type NotifyPayload = {
  type: string;
  title: string;
  body: string;
  url?: string;
};

/** 한 사용자의 기기들 — 웹푸시 구독 + FCM 토큰. */
export type UserDevices = {
  subs: { endpoint: string; p256dh: string; auth: string }[];
  tokens: string[];
};

/** 기기 발송 동시 실행 수 — 외부 푸시 서버(FCM/webpush) rate limit 을 고려한 상한. */
const SEND_CONCURRENCY = 8;
/** `.in(...)` 한 번에 넣을 최대 개수 — PostgREST 는 GET 쿼리스트링이라 URL 길이 제한이 있다. */
const IN_CHUNK = 100;

/** 웹푸시(브라우저/PWA) 또는 FCM(네이티브 앱) 중 하나라도 설정됐는지. */
export function notifyEnabled(): boolean {
  return pushEnabled() || fcmEnabled();
}

/**
 * 여러 사용자의 기기를 **한 번에** 읽는다(사용자 수만큼 조회하지 않는다).
 *
 * 크론처럼 수백~수천 명에게 보내는 경로에서 사용자마다 구독/토큰을 따로 읽으면
 * `2 × 사용자 수` 왕복이 직렬로 쌓인다. 여기서 모아 읽고 `notifyDevices` 로 넘긴다.
 */
export async function loadDevices(
  admin: SupabaseClient,
  userIds: readonly string[],
): Promise<Map<string, UserDevices>> {
  const out = new Map<string, UserDevices>();
  if (userIds.length === 0) return out;
  const ensure = (uid: string): UserDevices => {
    let d = out.get(uid);
    if (!d) {
      d = { subs: [], tokens: [] };
      out.set(uid, d);
    }
    return d;
  };

  const batches = chunk([...userIds], IN_CHUNK);
  await Promise.all([
    pushEnabled()
      ? Promise.all(
          batches.map(async (ids) => {
            const { data } = await admin
              .from("push_subscriptions")
              .select("user_id, endpoint, p256dh, auth")
              .in("user_id", ids);
            for (const s of (data ?? []) as {
              user_id: string;
              endpoint: string;
              p256dh: string;
              auth: string;
            }[]) {
              ensure(s.user_id).subs.push({
                endpoint: s.endpoint,
                p256dh: s.p256dh,
                auth: s.auth,
              });
            }
          }),
        )
      : Promise.resolve(),
    fcmEnabled()
      ? Promise.all(
          batches.map(async (ids) => {
            const { data } = await admin
              .from("fcm_tokens")
              .select("user_id, token")
              .in("user_id", ids);
            for (const t of (data ?? []) as {
              user_id: string;
              token: string;
            }[]) {
              ensure(t.user_id).tokens.push(t.token);
            }
          }),
        )
      : Promise.resolve(),
  ]);

  return out;
}

/**
 * 이미 읽어 둔 기기 목록으로 발송 — 기기별 **병렬**(상한 있음), 만료분은 **모아서** 삭제.
 * 하나라도 보냈으면 true(= '알림 보낼 기기가 있었다').
 */
export async function notifyDevices(
  admin: SupabaseClient,
  devices: UserDevices | undefined,
  payload: NotifyPayload,
): Promise<boolean> {
  if (!devices) return false;
  const { subs, tokens } = devices;
  if (subs.length === 0 && tokens.length === 0) return false;

  const [subResults, tokResults] = await Promise.all([
    mapWithConcurrency(subs, SEND_CONCURRENCY, (s) =>
      sendPush({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }, payload),
    ),
    mapWithConcurrency(tokens, SEND_CONCURRENCY, (t) => sendFcm(t, payload)),
  ]);

  // 만료(gone) 정리 — 기기마다 DELETE 를 날리지 않고 한 번에 지운다.
  const goneEndpoints = subs
    .filter((_, i) => subResults[i] === "gone")
    .map((s) => s.endpoint);
  const goneTokens = tokens.filter((_, i) => tokResults[i] === "gone");
  await Promise.all([
    ...chunk(goneEndpoints, IN_CHUNK).map((ids) =>
      admin.from("push_subscriptions").delete().in("endpoint", ids),
    ),
    ...chunk(goneTokens, IN_CHUNK).map((ids) =>
      admin.from("fcm_tokens").delete().in("token", ids),
    ),
  ]);

  return true;
}

/**
 * 한 사용자의 모든 기기에 알림 전송 — 기기 조회 후 발송(단건 호출부용).
 * 여러 사용자에게 보낼 땐 `loadDevices` + `notifyDevices` 를 쓴다.
 */
export async function notifyUser(
  admin: SupabaseClient,
  userId: string,
  payload: NotifyPayload,
): Promise<void> {
  const devices = await loadDevices(admin, [userId]);
  await notifyDevices(admin, devices.get(userId), payload);
}
