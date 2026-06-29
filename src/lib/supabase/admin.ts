import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * 서비스롤 Supabase 클라이언트(RLS 우회) — cron 등 서버 전용 작업에서만 사용.
 * SUPABASE_SERVICE_ROLE_KEY 가 없으면 null (cron 이 graceful no-op).
 * 절대 클라이언트 번들로 새지 않게 server-only.
 */
export function createSupabaseAdminClient(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
