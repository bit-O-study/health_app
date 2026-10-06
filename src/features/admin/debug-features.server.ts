import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { resolvePlan } from "@/features/billing/plan-store";
import { hasPlan } from "@/features/billing/plans";
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
  for (const f of DEBUG_FEATURES) out[f.id] = f.id === "pet" ? "hidden" : "debug"; // 기본: 디버그 계정만
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
    if (!error && data === true) return true;
    // '라이트 먼저'(2026-10-02, 라이트 혜택 E1) — DB 함수는 그 값을 '디버그 계정만'으로 보므로,
    // 디버그 계정이 아니면 여기서 라이트 이상인지 한 번 더 본다(DB 함수는 그대로 — 요금제 판정은 앱 한 곳).
    if ((await debugVisibilities())[id] !== "lite") return false;
    try {
      return hasPlan(await resolvePlan(), "lite");
    } catch {
      return false;
    }
  },
);

/**
 * 기능별 노출 범위 — 한 요청에 한 번만 읽는다. app_settings 는 관리자만 읽는 표라 서비스 롤로 읽고,
 * 밖으로는 범위 값만 쓴다. 실패하면 빈 표(= '라이트 먼저' 없음 — 안 주는 쪽으로).
 */
const debugVisibilities = cache(async (): Promise<Partial<Record<string, DebugVisibility>>> => {
  try {
    const admin = createSupabaseAdminClient();
    if (!admin) return {};
    const { data } = await admin
      .from("app_settings")
      .select("key, value")
      .in("key", DEBUG_FEATURES.map((f) => debugSettingKey(f.id)));
    const out: Partial<Record<string, DebugVisibility>> = {};
    for (const r of (data ?? []) as { key: string; value: unknown }[]) {
      out[r.key.replace(/^debug\./, "")] = debugValueToVisibility(r.value);
    }
    return out;
  } catch {
    return {};
  }
});

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
