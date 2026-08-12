import { expect, test } from "@playwright/test";

/**
 * 3D 런닝 씬 부하 가드 (팅김 방지).
 *
 * 팅김(앱 강제종료)은 중저가 폰에서 3D 씬이 GPU·메모리를 계속 잡아먹을 때 났다.
 * 실기기 크래시를 여기서 재현할 수는 없지만, **크래시로 이어지는 조건**은 브라우저에서
 * 그대로 잴 수 있다. 플래그(shadowMap.enabled 같은 내부 상태)가 아니라 **실제 GPU 작업량**
 * 을 센다 — 내부 구조가 바뀌어도 안 깨지고, "부하가 정말 줄었나"를 직접 답한다.
 *
 *   1) 저사양 기기로 보이면 프레임당 드로우콜이 실제로 줄어드는가
 *      (그림자를 켜면 three.js 가 씬을 그림자 패스에서 한 번 더 그린다 → 드로우콜 ~2배)
 *   2) 씬을 오래 켜둬도 WebGL 컨텍스트가 늘거나 사라지지 않는가
 *      (WebView 는 동시 컨텍스트 수가 제한돼 있고, 넘치면 컨텍스트가 강제로 날아가거나
 *       앱이 죽는다 — 팅김의 유력 후보)
 */

/**
 * 드로우콜·프레임·컨텍스트를 세는 계측기. 페이지 스크립트보다 먼저 주입해야 한다.
 *
 * ⚠ **프레임당** 드로우콜로 봐야 한다. 총량으로 보면 안 된다 — 그림자를 끄면 프레임이
 *   더 빨리 돌아서 초당 드로우콜 총량은 오히려 비슷해진다(측정해 보고 알았다: 저사양·
 *   고사양 총량이 4830 으로 똑같이 나왔다). 그림자 패스는 씬을 한 번 더 그리는 것이므로
 *   '한 프레임에 몇 번 그리는가'가 정확한 신호다.
 */
const INSTRUMENT = `
  window.__gl = { contexts: 0, lost: 0, draws: 0, frames: 0 };
  const orig = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    const ctx = orig.call(this, type, ...rest);
    if (ctx && /webgl/i.test(String(type))) {
      window.__gl.contexts++;
      this.addEventListener("webglcontextlost", () => { window.__gl.lost++; });
      for (const m of ["drawElements", "drawArrays"]) {
        const f = ctx[m].bind(ctx);
        ctx[m] = function (...a) { window.__gl.draws++; return f(...a); };
      }
    }
    return ctx;
  };
  (function tick() { window.__gl.frames++; requestAnimationFrame(tick); })();
`;

type GlStats = {
  contexts: number;
  lost: number;
  draws: number;
  frames: number;
};

const readGl = () => (window as unknown as { __gl: GlStats }).__gl;

/** 힐링 러닝(/jog)을 지정한 기기 성능으로 열고, 3초 동안의 드로우콜을 잰다. */
async function measure(
  browser: import("@playwright/test").Browser,
  deviceMemory: number,
  cores: number,
): Promise<GlStats> {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await ctx.newPage();
  await page.addInitScript(INSTRUMENT);
  await page.addInitScript(
    ([m, c]) => {
      Object.defineProperty(navigator, "deviceMemory", { get: () => m });
      Object.defineProperty(navigator, "hardwareConcurrency", { get: () => c });
    },
    [deviceMemory, cores] as const,
  );

  await page.goto("/jog", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "시작하기" }).click();
  await expect(page.locator("canvas")).toHaveCount(1, { timeout: 15_000 });
  await page.waitForTimeout(1500); // 첫 렌더·모델 로드가 끝나길 기다린다

  // 여기서부터 3초간의 순수 렌더 작업량만 센다.
  await page.evaluate(() => {
    const g = (window as unknown as { __gl: GlStats }).__gl;
    g.draws = 0;
    g.frames = 0;
  });
  await page.waitForTimeout(3000);
  const stats = (await page.evaluate(readGl)) as GlStats;
  await ctx.close();
  return stats;
}

/** 프레임당 드로우콜 — 그림자 패스가 있으면 씬을 한 번 더 그려 대략 2배가 된다. */
const drawsPerFrame = (s: GlStats) => (s.frames > 0 ? s.draws / s.frames : 0);

test("저사양 기기는 그림자를 꺼서 GPU 드로우콜이 실제로 줄어든다", async ({
  browser,
}) => {
  // 중저가 안드로이드(2GB/4코어) vs 플래그십(8GB/8코어).
  const low = await measure(browser, 2, 4);
  const high = await measure(browser, 8, 8);
  const lowPf = drawsPerFrame(low);
  const highPf = drawsPerFrame(high);
  // 수치를 남긴다 — "얼마나 줄었나"를 나중에 사람이 바로 볼 수 있게.
  // eslint-disable-next-line no-console
  console.log(
    `[씬 부하] 저사양 ${lowPf.toFixed(1)} draw/frame (${low.frames}f) · ` +
      `고사양 ${highPf.toFixed(1)} draw/frame (${high.frames}f) · ` +
      `감소 ${(100 - (lowPf / highPf) * 100).toFixed(0)}%`,
  );

  // 계측기가 붙었는지부터 확인 — 0이면 아래 비교가 무의미하다(조용히 통과 방지).
  expect(low.frames, "프레임 계측이 안 됐다").toBeGreaterThan(10);
  expect(lowPf, "드로우콜 계측이 안 됐다").toBeGreaterThan(0);
  expect(highPf, "드로우콜 계측이 안 됐다").toBeGreaterThan(0);

  // 그림자 패스가 사라지면 씬을 한 번만 그린다 → 프레임당 드로우콜이 크게 줄어야 한다.
  // (측정값 흔들림을 감안해 '25% 이상 감소'로 넉넉히 잡는다.)
  expect(
    lowPf,
    `저사양 ${lowPf.toFixed(1)}/프레임 vs 고사양 ${highPf.toFixed(1)}/프레임 — 그림자가 안 꺼진 것`,
  ).toBeLessThan(highPf * 0.75);
});

test("씬을 켠 채 오래 둬도 WebGL 컨텍스트가 하나뿐이고 잃지 않는다", async ({
  browser,
}) => {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await ctx.newPage();
  await page.addInitScript(INSTRUMENT);

  await page.goto("/jog", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: "시작하기" }).click();
  await expect(page.locator("canvas")).toHaveCount(1, { timeout: 15_000 });

  // 달리는 상태로 오래 둔다 — 250m 마다 맵이 바뀌며 캔버스 텍스처를 새로 만드는 구간.
  await page.evaluate(() => {
    let i = 0;
    const w = window as unknown as { __inj?: ReturnType<typeof setInterval> };
    w.__inj = setInterval(() => {
      const y = i++ % 2 ? 19 : 1; // 크게 위아래로 — 달리기 흔들림
      window.dispatchEvent(
        new DeviceMotionEvent("devicemotion", {
          accelerationIncludingGravity: { x: 0, y, z: 0 },
        }),
      );
    }, 30);
  });
  await page.waitForTimeout(8000);
  await page.evaluate(() => {
    const w = window as unknown as { __inj?: ReturnType<typeof setInterval> };
    if (w.__inj) clearInterval(w.__inj);
  });

  const gl = (await page.evaluate(readGl)) as GlStats;
  expect(await page.locator("canvas").count()).toBe(1);
  expect(gl.contexts, "달리는 동안 WebGL 컨텍스트가 더 만들어졌다").toBe(1);
  expect(gl.lost, "WebGL 컨텍스트를 잃었다(기기가 GPU 자원을 회수한 것)").toBe(0);

  await ctx.close();
});
