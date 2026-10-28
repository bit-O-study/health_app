import type { Page } from "@playwright/test";

/** Swipe the title after centering it inside the scroll area, away from fixed controls. */
export async function swipeGuided(page: Page, direction: "next" | "previous" = "next") {
  const title = page.getByTestId("guided-scroll").getByRole("heading", { level: 2 }).first();
  await title.evaluate(el => el.scrollIntoView({ block: "center", behavior: "instant" }));
  const box = (await title.boundingBox())!;
  const width = page.viewportSize()!.width;
  const start = direction === "next" ? width - 70 : 70;
  const end = direction === "next" ? 70 : width - 70;
  await page.mouse.move(start, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(end, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();
}
