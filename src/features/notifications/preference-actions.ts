"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import {
  DEFAULT_PREFERENCES,
  isNotificationKind,
  toPreferenceRow,
  type NotificationPreferences,
} from "@/features/notifications/preferences";

/**
 * 알림 설정 저장 — 로드맵 3.1.
 *
 * 클라이언트가 보낸 값을 그대로 믿지 않는다. 종류는 등록된 것만, 시각은 0~23 만
 * 받고 나머지는 기본값으로 메운다(순수 모듈의 규칙을 여기서 다시 쓰지 않도록
 * `sanitize` 한 곳에서만 판단한다).
 */

function sanitize(input: unknown): NotificationPreferences {
  const raw = (input ?? {}) as Partial<NotificationPreferences>;
  const kinds = { ...DEFAULT_PREFERENCES.kinds };
  if (raw.kinds && typeof raw.kinds === "object") {
    for (const [key, value] of Object.entries(raw.kinds)) {
      // 모르는 종류는 버린다 — 컬럼이 없어 저장도 안 되고, 조용히 무시하면
      // 사용자는 껐다고 믿는데 계속 오는 상태가 된다.
      if (isNotificationKind(key) && typeof value === "boolean") {
        kinds[key] = value;
      }
    }
  }
  const hour = (v: unknown, fallback: number) =>
    Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 23
      ? (v as number)
      : fallback;
  return {
    kinds,
    quietHours:
      typeof raw.quietHours === "boolean"
        ? raw.quietHours
        : DEFAULT_PREFERENCES.quietHours,
    quietStartHour: hour(raw.quietStartHour, DEFAULT_PREFERENCES.quietStartHour),
    quietEndHour: hour(raw.quietEndHour, DEFAULT_PREFERENCES.quietEndHour),
  };
}

export async function saveNotificationPreferencesAction(
  input: NotificationPreferences,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const prefs = sanitize(input);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("notification_preferences").upsert(
    {
      user_id: user.id,
      ...toPreferenceRow(prefs),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: "저장에 실패했습니다." };

  revalidatePath("/settings/notifications");
  return { ok: true };
}
