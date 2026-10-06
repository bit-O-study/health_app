import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { chromium } from "@playwright/test";
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/features/coach/manual-actions", () => ({ requestManualCoach: vi.fn() }));
import { ManualCoachPanel } from "@/features/coach/components/manual-coach-panel";
import { Logo } from "@/features/brand/logo";
import type { CoachReview } from "@/features/coach/workout-review";
const review: CoachReview = { from: "2026-09-25", to: "2026-10-01", workoutDays: 3, previousDays: 2, observation: "최근 7일에 3일 운동을 기록했어요. 직전 7일은 2일이에요.", check: "벤치프레스: 지난번 횟수를 확인해 주세요.", nextStep: "다음 운동에서 목표 횟수를 먼저 채우세요.", exercises: [{ exerciseId: "bench-press", name: "벤치프레스", action: "add-reps", label: "횟수 채우기", attention: false, suggestedKg: 40, suggestedReps: 12, reason: "지난번 8회였어요. 무게는 그대로 두고 12회를 먼저 채워요.", lastDate: "2026-10-01" }] };
// Isolated real-component layout smoke. Does not replace authenticated/device/payment E2E.
describe.skipIf(process.env.COACH_BROWSER_TEST !== "true")("coaching mobile layout", () => {
  it("renders at 360px in both themes without horizontal overflow", async () => {
    const cssDir = join(process.cwd(), ".next/static/css");
    const css = readdirSync(cssDir).filter(file => file.endsWith(".css")).map(file => readFileSync(join(cssDir, file), "utf8")).join("\n");
    expect(css.length).toBeGreaterThan(1000);
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage({ viewport: { width: 360, height: 800 } });
      mkdirSync(".verify-shots", { recursive: true });
      for (const theme of ["light", "dark"]) {
        const content = renderToStaticMarkup(createElement(ManualCoachPanel, { active: true, rows: [], review }));
        await page.setContent(`<html class="${theme === "dark" ? "dark" : ""}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><main class="app-container">${renderToStaticMarkup(createElement(Logo, { size: 48, wordClassName: "text-2xl" }))}<div class="mt-4">${content}</div></main></body></html>`);
        expect(await page.getByLabel("가능한 시간").isVisible()).toBe(true);
        expect(await page.getByRole("heading", { name: "다음 운동 전에 확인하세요" }).isVisible()).toBe(true);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        await page.evaluate(() => Promise.all(document.getAnimations().filter(animation => animation.effect?.getTiming().iterations !== Infinity).map(animation => animation.finished.catch(() => undefined))));
        await page.screenshot({ path: `.verify-shots/coaching-${theme}.png`, fullPage: true });
      }
    } finally { await browser.close(); }
  }, 60_000);
});