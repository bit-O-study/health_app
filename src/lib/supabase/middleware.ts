import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { isBlocked } from "@/features/admin/ban";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/** 보호 경로: 로그인하지 않으면 /login 으로 보냄 */
const PROTECTED_PREFIXES = [
  "/settings",
  "/onboarding",
  "/plan",
  "/admin",
  "/change-password",
  "/exercises", // 운동 찾기(목록·상세) — 로그인 후에만 노출
  "/commitments", // 다짐 — 개인 목표(로그인 필요)
];

/**
 * 매 요청마다 access/refresh 토큰을 검증·갱신하고 쿠키에 다시 기록합니다.
 * 보호 경로에 비로그인 접근 시 /login 으로 리다이렉트합니다.
 */
export async function updateSession(request: NextRequest) {
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

  // getUser() 호출이 만료된 access 토큰을 refresh 토큰으로 갱신합니다.
  // 리프레시 토큰이 사라졌거나(Refresh Token Not Found) 손상되면 stale 쿠키를
  // 정리해 비로그인 처리한다. ⚠ getUser() 는 인증 실패 시 throw 가 아니라
  // { error } 를 반환하므로 try/catch 만으로는 안 잡힌다 — error 도 함께 검사해
  // 로컬 signOut 으로 쿠키를 비워야 매 요청 반복되던 에러 로그가 멈춘다(self-heal).
  let user = null;
  let authErrored = false;
  try {
    const res = await supabase.auth.getUser();
    user = res.data.user ?? null;
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
  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (!user && isProtected) {
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
  if (user && !isPrefetch) {
    // 정지/영구정지 차단 — 본인 프로필 상태 확인(RLS: 본인 행 읽기 허용).
    // 차단 상태면 안내 페이지(/suspended)로만 보낸다. 정지 안 된 사용자가
    // /suspended 에 있으면 메인으로 되돌린다.
    const onSuspended = pathname === "/suspended";
    let blocked = false;
    try {
      const { data: prof } = await supabase
        .from("profiles")
        .select("suspended_until, banned_at, withdrawn_at, must_change_password")
        .eq("user_id", user.id)
        .maybeSingle();
      blocked = prof
        ? isBlocked({
            suspendedUntil: (prof as { suspended_until: string | null })
              .suspended_until,
            bannedAt: (prof as { banned_at: string | null }).banned_at,
            withdrawnAt: (prof as { withdrawn_at: string | null }).withdrawn_at,
          })
        : false;
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
      if (
        !blocked &&
        (prof as { must_change_password: boolean | null } | null)
          ?.must_change_password === true &&
        pathname !== "/change-password"
      ) {
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

    const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");
    // 관리자도 접근 허용하는 일반 경로(숨은 테스트 기능 등) — /admin 강제이동에서 제외.
    const isAdminAllowedExtra =
      pathname === "/running" ||
      pathname.startsWith("/running/") ||
      pathname === "/jog" ||
      pathname.startsWith("/jog/") ||
      // 운동 찾기(목록·상세) — 관리자도 볼 수 있어야 기구분석 '상세보기' 링크가 동작한다.
      pathname === "/exercises" ||
      pathname.startsWith("/exercises/") ||
      pathname === "/commitments" ||
      // 관리자도 임시 비번이면 비번 변경 화면을 거쳐야 함 — /admin 강제이동에서 제외.
      pathname === "/change-password";
    let isAdmin = false;
    try {
      // RLS: 관리자면 admins 전체, 아니면 본인 행만(=없음) → 결과 유무로 판정.
      const { data } = await supabase.from("admins").select("email").limit(1);
      isAdmin = (data?.length ?? 0) > 0;
    } catch {
      isAdmin = false;
    }
    if (isAdmin && !isAdminPath && !isAdminAllowedExtra) {
      // 관리자가 일반 화면 접근 → 관리자 홈으로(단 허용 경로 제외)
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }
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
