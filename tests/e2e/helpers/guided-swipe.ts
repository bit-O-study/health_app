import type { Page } from "@playwright/test";

/** 미디어 위 버튼 없이 포인터 제스처로 이동한다. */
export async function swipeGuided(page: Page, direction: "next" | "previous") {
  const target = page.getByTestId("guided-scroll");
  const x = direction === "next" ? 260 : 100;
  const end = direction === "next" ? 100 : 260;
  await target.dispatchEvent("pointerdown", { pointerType: "touch", pointerId: 1, clientX: x, clientY: 250 });
  await target.dispatchEvent("pointermove", { pointerType: "touch", pointerId: 1, clientX: end, clientY: 250 });
  await target.dispatchEvent("pointerup", { pointerType: "touch", pointerId: 1, clientX: end, clientY: 250 });
}
