"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  planAppEventInsert,
  type RawAppEvent,
} from "@/lib/observability/app-event";

/**
 * 기기가 모아 둔 사건을 받아 저장한다 — 로드맵 1.3.
 *
 * 원칙 두 가지.
 *  1) **닫힌 입구다.** 로그인한 사용자의 것만, 그 사람 user_id 로만 들어간다
 *     (RLS 도 `auth.uid() = user_id`). 아무나 행을 쌓을 수 있으면 그게 구멍이다 —
 *     크론 기록에서 인증 실패(401)를 남기지 않기로 한 것과 같은 이유.
 *  2) **기능보다 뒤다.** 무슨 일이 있어도 던지지 않는다. 저장에 실패해도 호출부는
 *     그대로 진행한다(관측 때문에 앱이 멈추면 안 된다).
 *
 * 종류·문자열 세탁·상한 판단은 전부 `app-event.ts`(순수 모듈)가 맡는다. 클라이언트가
 * 보낸 값은 심각도까지 거기서 다시 정한다 — 보낸 대로 믿지 않는다.
 */

/** 한 사람이 한 시간에 남길 수 있는 최대 행 수. 넘으면 조용히 버린다. */
const HOURLY_LIMIT = 200;

/**
 * @returns `accepted` = 기기가 대기열을 비워도 되는지. 로그인 전이거나 저장이
 *   실패하면 false 라서 기기가 들고 있다가 다시 보낸다.
 */
export async function reportAppEventsAction(
  events: RawAppEvent[],
): Promise<{ stored: number; accepted: boolean }> {
  try {
    if (!Array.isArray(events) || events.length === 0) {
      return { stored: 0, accepted: true };
    }

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    // 비로그인 사건(로그인 실패 등)은 기기가 들고 있다가 로그인 뒤에 보낸다.
    if (!user) return { stored: 0, accepted: false };

    const now = Date.now();
    // 사용량 상한 — 오작동하는 기기 하나가 표를 다 채우지 못하게.
    const hourAgo = new Date(now - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("app_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", hourAgo);

    const plan = planAppEventInsert(events, now, count ?? 0, HOURLY_LIMIT);
    if (plan.events.length === 0) return { stored: 0, accepted: plan.accepted };

    const { error } = await supabase.from("app_events").insert(
      plan.events.map((e) => ({
        user_id: user.id,
        kind: e.kind,
        severity: e.severity,
        route: e.route || null,
        message: e.message || null,
        app_version: e.appVersion || null,
        platform: e.platform,
        device: e.device || null,
        value: e.value,
        count: e.count,
        occurred_at: new Date(e.occurredAt).toISOString(),
      })),
    );
    // 저장 실패는 삼킨다 — 관측 실패가 기능 실패가 되면 안 된다. 대신 기기가
    // 대기열을 유지해 다음에 다시 시도한다.
    return { stored: error ? 0 : plan.events.length, accepted: !error };
  } catch {
    return { stored: 0, accepted: false };
  }
}
