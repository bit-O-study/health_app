import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/features/admin/admin";
import {
  DEBUG_ACCOUNTS_KEY,
  DEBUG_FEATURES,
  debugSettingKey,
  debugValueToVisibility,
  normalizeDebugAccounts,
  type DebugFeatureId,
  type DebugVisibility,
} from "@/features/admin/debug-features";

/** 관리자 설정용 — 디버그 기능별 노출 범위(미설정=기본 'debug'=디버그 계정만). */
export async function getDebugFeatureStates(): Promise<
  Record<string, DebugVisibility>
> {
  const out: Record<string, DebugVisibility> = {};
  for (const f of DEBUG_FEATURES) out[f.id] = "debug"; // 기본: 디버그 계정만
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
    if (id in out) out[id] = debugValueToVisibility(r.value);
  }
  return out;
}

/**
 * 이 사용자에게 특정 디버그 기능을 노출할지 — '디버그 계정'(관리자 또는 지정된 이메일)이고
 * 그 기능이 켜져 있을 때만. SECURITY DEFINER 함수라 비관리자 디버그 계정도 판정된다.
 */
export const isDebugFeatureEnabled = cache(
  async (id: DebugFeatureId): Promise<boolean> => {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("debug_feature_enabled", {
      p_feature: id,
    });
    if (error) return false;
    return data === true;
  },
);

/** 관리자 설정용 — 지정된 디버그 계정(이메일) 목록. */
export async function getDebugAccounts(): Promise<string[]> {
  if (!(await isAdminUser())) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("app_settings")
    .select("value")
    .eq("key", DEBUG_ACCOUNTS_KEY)
    .maybeSingle();
  return normalizeDebugAccounts((data as { value: unknown } | null)?.value);
}
