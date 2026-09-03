import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import {
  DEFAULT_PREFERENCES,
  parsePreferences,
  type NotificationPreferences,
  type PreferenceRow,
} from "@/features/notifications/preferences";
import { PREFERENCE_COLUMNS } from "@/features/notifications/preferences-data";

/**
 * 지금 로그인한 사용자의 알림 설정. 행이 없으면 기본값.
 *
 * 크론용 일괄 조회(`preferences-data.loadPreferences`)와 **파일을 나눠 둔다** —
 * 여기는 요청 스코프 클라이언트를 쓰는데, 그걸 크론 경로가 물면 단위 테스트가
 * 환경변수를 요구하며 깨진다.
 */
export async function getMyNotificationPreferences(): Promise<NotificationPreferences> {
  const user = await getCurrentUser();
  if (!user) return DEFAULT_PREFERENCES;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("notification_preferences")
    .select(PREFERENCE_COLUMNS)
    .eq("user_id", user.id)
    .maybeSingle();
  return parsePreferences(data as PreferenceRow | null);
}
