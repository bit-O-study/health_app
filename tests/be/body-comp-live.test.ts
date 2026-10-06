import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import { describe, expect, it, vi } from "vitest";
import { resizeImageForAI } from "@/lib/image/resize-for-ai";
vi.mock("@/features/coach/ai-usage", () => ({ consumeAiQuota: async () => ({ ok: true }) }));
import { scanBodyCompPhotoAction } from "@/features/body-composition/body-comp-scan-actions";

// Opt-in only: sends the chosen local image to the configured AI provider once.
// Never stores the image, response text, or identifying report details in the repository.
describe.skipIf(!process.env.BODY_COMP_VERIFY_IMAGE)("체성분 실제 사진 판독", () => {
  it("사용자가 제공한 InBody 270S의 현재 기본 수치만 읽는다", async () => {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      const source = readFileSync(process.env.BODY_COMP_VERIFY_IMAGE!).toString("base64");
      await page.addScriptTag({ content: `window.resizeReport = ${resizeImageForAI.toString()};` });
      const input = await page.evaluate(async encoded => {
        const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
        const resize = (window as unknown as { resizeReport: typeof resizeImageForAI }).resizeReport;
        return resize(new File([bytes], "report.png", { type: "image/png" }), 1800, 0.9, 160_000);
      }, source);
      const result = await scanBodyCompPhotoAction({ imageBase64: input.base64, mediaType: input.mediaType });
      if (!result.ok) throw new Error(result.error.slice(0, 180));
      console.log("Extracted measurement fields:", JSON.stringify(result.values));
      expect(result.values).toEqual({ weightKg: 99.2, skeletalMuscleKg: 37.5, bodyFatKg: 33.3, bodyFatPct: 33.5 });
      expect(result.warnings).toEqual([]);
    } finally { await browser.close(); }
  }, 120_000);
});