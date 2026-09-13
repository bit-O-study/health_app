import { expect, test, type Page } from "@playwright/test";

/**
 * 오프라인에서 앱을 열었을 때(하드 내비게이션) 무엇이 보이는가.
 *
 * 예전: 브라우저 기본 오류 화면(빈 화면). 사용자는 앱이 고장 난 줄 안다.
 * 지금: service worker 가 `/offline.html` 을 내놓는다.
 *
 * 🔴 이 스펙의 핵심은 "오프라인 화면이 뜬다" 보다 **"옛 화면이 안 뜬다"** 쪽이다.
 * 흔한 SW 구현은 방문한 페이지 HTML 을 캐시했다가 오프라인에 다시 보여주는데,
 * 이 앱의 화면에는 어제의 루틴·완료 기록이 서버 렌더로 박혀 있다. 그게 오늘 값인 척
 * 뜨면 빈 화면보다 나쁘다. 아래 두 번째 테스트가 그걸 못 박는다.
 *
 * ⚠ dev 서버에서는 `PWARegister` 가 SW 를 등록하지 않는다(HMR 과 충돌).
 *   그래서 여기서는 테스트가 직접 등록해 **배포될 그 파일 그대로** 검증한다.
 */

async function installSw(page: Page) {
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    // clients.claim() 이 이 페이지를 넘겨받을 때까지 기다린다 — 안 그러면 첫 reload 가
    // SW 를 거치지 않아 테스트가 우연히 통과하거나 우연히 실패한다.
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        );
        if (reg.active && navigator.serviceWorker.controller) resolve();
      });
    }
  });
}

test("오프라인에서 앱을 열면 빈 화면 대신 안내 화면이 뜬다", async ({
  page,
  context,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await installSw(page);

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "오프라인이에요" })).toBeVisible();
  await expect(page.getByRole("button", { name: "다시 시도" })).toBeVisible();
});

test("오프라인 화면은 옛 개인 데이터를 보여주지 않는다", async ({
  page,
  context,
}) => {
  // 온라인일 때 로그인 화면을 한 번 본다 — 이 HTML 이 캐시에 담기면 안 된다.
  await page.goto("/login", { waitUntil: "networkidle" });
  await installSw(page);
  // 온라인이니 로그인 화면이 정상적으로 보인다(네트워크 우선이 살아 있다는 확인).
  await page.reload({ waitUntil: "networkidle" });
  const onlineBody = await page.locator("body").innerText();
  expect(onlineBody).not.toContain("오프라인이에요");

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });

  // 🔴 방금 봤던 그 화면이 다시 뜨면 안 된다. 캐시에 담지 않았으므로 안내 화면이 뜬다.
  await expect(page.getByRole("heading", { name: "오프라인이에요" })).toBeVisible();
});

test("오프라인 화면이 기기에 남은 운동 기록 건수를 알려준다", async ({
  page,
  context,
}) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await installSw(page);

  // 운동모드가 오프라인에 담아 두는 큐와 **같은 키**로 심는다.
  // (키가 어긋나면 사용자는 "기록이 사라졌나" 하고 불안해한다.)
  await page.evaluate(() => {
    window.localStorage.setItem(
      "helssu:pending-writes:v1",
      JSON.stringify([
        {
          kind: "main",
          key: "main:r1",
          name: "스쿼트",
          rowId: "r1",
          status: "done",
          snapshot: {},
          forDate: "2026-09-13",
          queuedAt: Date.now(),
        },
      ]),
    );
  });

  await context.setOffline(true);
  await page.reload({ waitUntil: "domcontentloaded" });

  await expect(page.getByText("1건")).toBeVisible();
  await expect(page.getByText("스쿼트")).toBeVisible();
});

test("온라인이면 서버 응답을 쓴다 — SW 가 화면을 가로채지 않는다", async ({
  page,
}) => {
  await page.goto("/login", { waitUntil: "networkidle" });
  await installSw(page);

  // SW 를 깐 뒤에도 평소 화면이 그대로 떠야 한다. (여기 깨지면 배포해도 옛 화면이
  // 계속 뜨는, 되돌리기 어려운 사고가 된다.)
  await page.reload({ waitUntil: "networkidle" });
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator("body")).not.toContainText("오프라인이에요");
});

test("해시 박힌 빌드 산출물은 캐시에 담긴다 — 약한 회선에서 청크가 안 깨지게", async ({
  page,
}) => {
  await page.goto("/login", { waitUntil: "networkidle" });
  await installSw(page);
  // SW 가 이 페이지를 넘겨받은 뒤 한 번 더 받아야 캐시에 들어간다.
  await page.reload({ waitUntil: "networkidle" });

  const cached = await page.evaluate(async () => {
    const names = await caches.keys();
    const out: string[] = [];
    for (const n of names) {
      const keys = await (await caches.open(n)).keys();
      for (const k of keys) out.push(new URL(k.url).pathname);
    }
    return out;
  });

  // 오프라인 안내 화면은 설치 때 미리 받아 둔다.
  expect(cached).toContain("/offline.html");
  // 그리고 해시 박힌 청크가 담긴다(= 다음 방문엔 네트워크 없이도 뜬다).
  expect(cached.some((p) => p.startsWith("/_next/static/"))).toBe(true);

  // 🔴 화면 HTML 은 **담기지 않아야** 한다. 담기는 순간 어제 데이터가 오늘처럼 뜬다.
  expect(cached).not.toContain("/login");
  expect(cached).not.toContain("/");
});
