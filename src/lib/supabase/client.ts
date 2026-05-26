import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabaseKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
}

/**
 * 브라우저(클라이언트 컴포넌트)용 Supabase 클라이언트.
 * 세션(access/refresh 토큰)은 @supabase/ssr 이 쿠키로 관리합니다.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl!, supabaseKey!);
}
