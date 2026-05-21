import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
}

if (!supabaseKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
}

/**
 * 서버 컴포넌트 / 서버 액션 / 라우트 핸들러용 Supabase 클라이언트.
 * 쿠키에 저장된 access/refresh 토큰으로 사용자 세션을 복원합니다.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl!, supabaseKey!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // 서버 컴포넌트에서 호출되면 set 이 막힐 수 있음.
          // 세션 갱신은 미들웨어가 담당하므로 무시해도 안전.
        }
      },
    },
  });
}

/**
 * 현재 로그인 사용자(없으면 null)를 반환합니다.
 * 리프레시 토큰이 손상되었거나 사라진 stale 쿠키일 때 throw 가 페이지로 새지
 * 않도록 잡아내고 null 을 반환 — 로그인 안 한 상태로 처리.
 */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}