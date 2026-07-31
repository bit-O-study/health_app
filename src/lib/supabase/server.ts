import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { getSigningKeys } from "@/lib/supabase/jwks";

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
 *
 * React.cache 로 같은 요청 내에서는 한 번만 생성 — 페이지 한 번 렌더에서
 * 여러 helper 가 각자 호출해도 클라이언트 객체를 재사용하고, 쿠키 조회도 1회.
 */
export const createSupabaseServerClient = cache(async () => {
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
});

/**
 * 서버에서 쓰는 최소 사용자 정보. access 토큰(JWT) 클레임에 들어 있는 값만 담는다
 * — 코드베이스 전체가 쓰는 필드가 `id`·`email`·`user_metadata` 뿐이라 충분하다.
 * (전체 User 객체가 필요한 소수 지점은 그 자리에서 `auth.getUser()` 를 직접 호출한다.)
 */
export type SessionUser = {
  id: string;
  email: string | null;
  user_metadata: Record<string, unknown>;
};

/**
 * 현재 로그인 사용자(없으면 null)를 반환합니다.
 * 리프레시 토큰이 손상되었거나 사라진 stale 쿠키일 때 throw 가 페이지로 새지
 * 않도록 잡아내고 null 을 반환 — 로그인 안 한 상태로 처리.
 *
 * ⚡ `getUser()` 가 아니라 `getClaims()` 를 쓴다. `getUser()` 는 **매번** Supabase Auth
 * 서버로 HTTP 왕복을 하는데(icn1 서울 → ap-southeast-1 싱가포르, 왕복 70~90ms),
 * 이 프로젝트는 비대칭 서명키(ES256)를 쓰므로 토큰 서명을 **로컬에서 검증**할 수 있다.
 * 공개키는 모듈 캐시에서 넘겨준다([`getSigningKeys`](./jwks.ts)) → 워밍된 인스턴스에서는
 * 네트워크 왕복 0회. 서명 검증 + exp 검사를 거치므로 `getUser()` 와 같은 수준으로 신뢰할
 * 수 있다(쿠키를 그냥 믿는 `getSession()` 과는 다르다).
 *
 * ⚠ 단, 로그아웃/세션 폐기는 access 토큰이 만료될 때까지(기본 1시간) 즉시 반영되지
 * 않는다. **정지·차단은 미들웨어가 매 요청 `profiles` 를 확인하므로 그대로 즉시 반영된다.**
 *
 * React.cache 로 한 요청 내 단 1회만 실행.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  try {
    // 토큰이 만료됐으면 getClaims 내부의 getSession() 이 먼저 refresh 한다(쿠키 갱신 유지).
    const { data, error } = await supabase.auth.getClaims(undefined, {
      keys: await getSigningKeys(),
    });
    const claims = data?.claims;
    if (error || !claims?.sub) return null;
    return {
      id: claims.sub,
      email: typeof claims.email === "string" ? claims.email : null,
      user_metadata: (claims.user_metadata ?? {}) as Record<string, unknown>,
    };
  } catch {
    return null;
  }
});
