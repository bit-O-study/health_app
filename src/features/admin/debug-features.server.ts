import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/features/admin/admin";
import {
  DEBUG_FEATURES,
  debugSettingKey,
  debugValueEnabled,
  type DebugFeatureId,
} from "@/features/admin/debug-features";

/** 관리자 설정용 — 디버그 기능별 온오프 상태(미설정=기본 켜짐). */
export async function getDebugFeatureStates(): Promise<Record<string, boolean>> {
  const out: Record<string, boolean> = {};
  for (const f of DEBUG_FEATURES) out[f.id] = true; // 기본 켜짐
  if (!(await isAdminUser())) return out;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("app_settings")
    .select("key, value")
    .in(
      "key",
      DEBUG_FEATURES.map((f) => debugSettingKey(f.id)),
    );
  for (const r of (data ?? []) as { key: string; value: unknown }[]) {
    const id = r.key.replace(/^debug\./, "");
    if (id in out) out[id] = debugValueEnabled(r.value);
  }
  return out;
}

/**
 * 이 사용자에게 특정 디버그 기능을 노출할지 — '디버그 계정(관리자)' 이고 그 기능이 켜져 있을 때만.
 * (비관리자면 app_settings 를 읽지 않고 즉시 false.)
 */
export const isDebugFeatureEnabled = cache(
  async (id: DebugFeatureId): Promise<boolean> => {
    if (!(await isAdminUser())) return false;
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", debugSettingKey(id))
      .maybeSingle();
    if (!data) return true; // 미설정 = 기본 켜짐
    return debugValueEnabled((data as { value: unknown }).value);
  },
);
