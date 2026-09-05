import { expect, test } from "@playwright/test";

/**
 * 소셜 로그인(구글·카카오) 진입 검증.
 *
 * 공급자 동의화면은 실제 계정이 필요해 자동화할 수 없다. 대신 **우리가 책임지는
 * 구간** — 버튼 노출 · Supabase authorize 로 넘길 때의 provider/redirect_to/PKCE ·
 * 실패하고 돌아왔을 때의 안내 — 를 검증한다. 여기가 깨지면 소셜 로그인이 통째로
 * 안 된다(과거 redirect_to 가 빠져 콜백이 홈으로 튕긴 적이 있다).
 */

/** signInWithOAuth 가 브라우저를 보낼 Supabase authorize URL 을 가로채 돌려준다. */
async function captureAuthorizeUrl(
  page: import("@playwright/test").Page,
  label: string,
): Promise<URL> {
  let captured: string | null = null;
  await page.route("**/auth/v1/authorize**", async (route) => {
    captured = route.request().url();
    // 공급자 화면으로 실제로 나가지 않게 여기서 끊는다.
    await route.fulfill({ status: 200, body: "intercepted" });
  });

  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: label }).click();
  await expect.poll(() => captured, { timeout: 15_000 }).not.toBeNull();
  return new URL(captured!);
}

test("구글 로그인 버튼은 구글 provider + 우리 콜백으로 보낸다", async ({ page }) => {
  const url = await captureAuthorizeUrl(page, "구글로 계속하기");

  expect(url.searchParams.get("provider")).toBe("google");

  const redirectTo = new URL(url.searchParams.get("redirect_to") ?? "");
  expect(redirectTo.pathname).toBe("/auth/callback");
  expect(redirectTo.searchParams.get("next")).toBe("/");
  // 웹에서는 앱 전용 스킴으로 되돌리는 native 분기를 타면 안 된다.
  expect(redirectTo.searchParams.get("native")).toBeNull();

  // PKCE — code_challenge 가 없으면 콜백의 exchangeCodeForSession 이 실패한다.
  expect(url.searchParams.get("code_challenge")).toBeTruthy();
  expect(url.searchParams.get("code_challenge_method")).toBe("s256");
});

test("카카오 로그인 버튼은 카카오 provider 로 보낸다", async ({ page }) => {
  const url = await captureAuthorizeUrl(page, "카카오로 계속하기");

  expect(url.searchParams.get("provider")).toBe("kakao");
  expect(
    new URL(url.searchParams.get("redirect_to") ?? "").pathname,
  ).toBe("/auth/callback");
});

test("로그인 후 갈 곳(redirect)이 있으면 콜백 next 로 이어진다", async ({ page }) => {
  let captured: string | null = null;
  await page.route("**/auth/v1/authorize**", async (route) => {
    captured = route.request().url();
    await route.fulfill({ status: 200, body: "intercepted" });
  });

  await page.goto("/login?redirect=%2Fplan", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "구글로 계속하기" }).click();
  await expect.poll(() => captured, { timeout: 15_000 }).not.toBeNull();

  const redirectTo = new URL(
    new URL(captured!).searchParams.get("redirect_to") ?? "",
  );
  expect(redirectTo.searchParams.get("next")).toBe("/plan");
});

test("★ 공급자 인증이 실패하면 /login 에서 이유를 보여준다", async ({ page }) => {
  // 콜백 라우트는 error 를 /login?error= 로 넘긴다 — 화면에 그대로 떠야 한다.
  await page.goto("/auth/callback?error=access_denied", {
    waitUntil: "networkidle",
  });

  await expect(page).toHaveURL(/\/login\?error=access_denied/);
  await expect(page.getByText("access_denied")).toBeVisible();
});

test("★ 앱(native)에서 온 콜백은 앱 전용 스킴으로 되돌린다", async ({ page }) => {
  // WebView 가 아니라 외부 브라우저에서 인증이 끝나므로, code 를 교환하지 않고
  // helssu:// 로 앱에 먼저 돌려보내야 한다(안 그러면 앱은 로그아웃 상태로 남는다).
  const res = await page.request.get(
    "/auth/callback?native=1&code=dummy-code&next=%2Fplan",
    { maxRedirects: 0 },
  );

  expect(res.status()).toBe(307);
  const location = res.headers()["location"] ?? "";
  expect(location).toContain("helssu://auth/callback");
  expect(location).toContain("code=dummy-code");
  expect(location).toContain("next=%2Fplan");
});
