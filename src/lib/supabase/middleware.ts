import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { isBlocked } from "@/features/admin/ban";
import { isOAuthCallbackPath } from "@/features/auth/oauth-redirect";
import { isProtectedPath } from "@/features/auth/protected-paths";
import { getSigningKeys } from "@/lib/supabase/jwks";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/**
 * 매 요청마다 access/refresh 토큰을 검증·갱신하고 쿠키에 다시 기록합니다.
 * 보호 경로에 비로그인 접근 시 /login 으로 리다이렉트합니다.
 */
export async function updateSession(request: NextRequest) {
  // OAuth(구글·카카오) 콜백은 미들웨어가 세션에 손대면 안 된다(PKCE 쿠키 유실).
  if (isOAuthCallbackPath(request.nextUrl.pathname)) {
    return NextResponse.next({ request });
  }

  // 정지 여부는 문서·RSC·프리패치·서버 액션 요청에서 모두 확인한다.
  // 탭 이동과 글쓰기 요청을 건너뛰면 열린 화면에서 정지를 우회할 수 있다.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // ⚡ getUser() 대신 getClaims() — getUser() 는 **문서 요청마다** Supabase Auth 로
  //   HTTP 왕복을 한다(서울 icn1 → 싱가포르 ap-southeast-1, 왕복 70~90ms). 이 왕복은
  //   Next 가 렌더를 시작하기도 전에 TTFB 에 그대로 얹힌다. 이 프로젝트는 비대칭
  //   서명키(ES256)를 쓰므로 서명을 로컬(WebCrypto)에서 검증할 수 있고, 공개키는
  //   모듈 캐시에서 넘긴다 → 워밍된 인스턴스에서 인증 왕복 0회.
  //   (만료된 토큰은 getClaims 내부의 getSession() 이 refresh 하므로 쿠키 갱신은 그대로.)
  //
  // 리프레시 토큰이 사라졌거나(Refresh Token Not Found) 손상되면 stale 쿠키를
  // 정리해 비로그인 처리한다. ⚠ 인증 실패는 throw 가 아니라 { error } 로 오므로
  // try/catch 만으로는 안 잡힌다 — error 도 함께 검사해 로컬 signOut 으로 쿠키를
  // 비워야 매 요청 반복되던 에러 로그가 멈춘다(self-heal).
  let user: { id: string } | null = null;
  let authErrored = false;
  try {
    const res = await supabase.auth.getClaims(undefined, {
      keys: await getSigningKeys(),
    });
    const sub = res.data?.claims?.sub;
    user = sub ? { id: sub } : null;
    authErrored = !!res.error;
  } catch {
    authErrored = true;
  }
  if (!user && authErrored) {
    try {
      // scope: 'local' — 네트워크 호출 없이 stale 쿠키만 즉시 제거.
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* signOut 도 실패할 수 있음 — 무시 */
    }
    user = null;
  }

  const { pathname } = request.nextUrl;

  if (!user && isProtectedPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // 관리자 분리 — 관리자는 /admin 만, 일반 사용자는 /admin 차단.
  // 프리페치 요청(링크 호버 등)에선 admins DB 조회를 생략해 매 요청 부하를 줄인다.
  // 실제 네비게이션 때 판정·리다이렉트하면 충분하다.
  const isPrefetch =
    request.headers.get("next-router-prefetch") === "1" ||
    request.headers.get("purpose") === "prefetch";
  if (user) {
    // 정지/영구정지 차단 — 본인 프로필 상태 확인(RLS: 본인 행 읽기 허용).
    // 차단 상태면 안내 페이지(/suspended)로만 보낸다. 정지 안 된 사용자가
    // /suspended 에 있으면 메인으로 되돌린다.
    //
    // ⚡ 성능: 차단여부(profiles) 와 관리자여부(admins) 는 서로 독립 쿼리라 병렬로
    //   실행해 순차 왕복(2회)을 1회로 줄인다. (Supabase 가 원거리 리전이라 왕복
    //   지연이 커서, 매 네비게이션 왕복 1회 절약이 전체 체감속도에 크게 기여한다.)
    const onSuspended = pathname === "/suspended";
    // ⚡ 성능: 관리자여부(admins)는 **/admin 경로에서만** 필요하다(그 외엔 판정에 안 씀).
    //   모든 페이지에서 조회하면 원거리 리전 왕복이 매 네비게이션 TTFB 에 그대로 얹힌다.
    //   정지 여부(profiles)는 즉시 반영돼야 하므로 항상 확인한다(캐시 안 함).
    const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
    const [profResult, adminResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("suspended_until, banned_at, withdrawn_at, must_change_password")
        .eq("user_id", user.id)
        .maybeSingle(),
      isAdminPath && !isPrefetch
        ? supabase.from("admins").select("email").limit(1)
        : Promise.resolve(null),
    ]);
    let blocked = false;
    let mustChange = false;
    try {
      const prof = profResult?.data ?? null;
      blocked = prof
        ? isBlocked({
            suspendedUntil: (prof as { suspended_until: string | null })
              .suspended_until,
            bannedAt: (prof as { banned_at: string | null }).banned_at,
            withdrawnAt: (prof as { withdrawn_at: string | null }).withdrawn_at,
          })
        : false;
      mustChange =
        (prof as { must_change_password: boolean | null } | null)
          ?.must_change_password === true;
      if (blocked && !onSuspended) {
        const url = request.nextUrl.clone();
        url.pathname = "/suspended";
        url.search = "";
        return NextResponse.redirect(url);
      }
      if (!blocked && onSuspended) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        url.search = "";
        return NextResponse.redirect(url);
      }
      // 임시 비밀번호로 로그인 → 새 비밀번호 변경 화면으로 강제 이동(차단 회원 제외).
      // /change-password 자기 자신은 제외(루프 방지). 관리자 라우팅보다 먼저 처리.
      if (!blocked && mustChange && pathname !== "/change-password") {
        const url = request.nextUrl.clone();
        url.pathname = "/change-password";
        url.search = "";
        return NextResponse.redirect(url);
      }
    } catch {
      /* 조회 실패 시 차단하지 않음(정상 사용자 막지 않기) */
    }

    // 활동(접속) 기록 — 접속유저수 통계용. 하루 1회만(쿠키 게이트)으로 DB 부하 최소화.
    // 차단되지 않은 정상 사용자만 집계.
    if (!blocked) {
      const today = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Seoul",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date());
      if (request.cookies.get("hx_act")?.value !== today) {
        try {
          await supabase
            .from("user_activity")
            .upsert(
              { user_id: user.id, active_date: today },
              { onConflict: "user_id,active_date", ignoreDuplicates: true },
            );
        } catch {
          /* 활동 기록 실패는 무시(앱 사용에 영향 없음) */
        }
        response.cookies.set("hx_act", today, {
          path: "/",
          maxAge: 60 * 60 * 24,
          sameSite: "lax",
        });
      }
    }

    // RLS: 관리자면 admins 전체, 아니면 본인 행만(=없음) → 결과 유무로 판정.
    // (위 Promise.all 에서 /admin 경로일 때만 조회한 결과를 사용)
    const isAdmin =
      ((adminResult?.data as { email: string }[] | null)?.length ?? 0) > 0;
    // 관리자는 로그인 시 통합 관리자 콘솔(destinationAfterLogin → ADMIN_CONSOLE_URL)로
    // 이동한다. 앱 안에서 옛 /admin 으로 '강제 이동'시키지 않는다 — 그 옛 관리자
    // 페이지는 모바일에서 깨지고 콘솔로 대체됐다. (강제 이동을 없애 깨진 페이지로
    // 튕기지 않게 함. 관리자도 앱을 일반 사용자처럼 쓸 수 있다.)
    if (!isAdmin && isAdminPath) {
      // 일반 사용자가 관리자 화면 접근 → 메인으로
      const url = request.nextUrl.clone();
      url.pathname = "/";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return response;
}
