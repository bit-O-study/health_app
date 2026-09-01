import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/features/routine/plan-actions", () => ({
  registerRecommendedPlanAction: vi.fn(),
  saveManualPlanAction: vi.fn(),
  swapArmRoutineAction: vi.fn(),
}));
vi.mock("@/features/routine/delete-actions", () => ({
  clearAllPlanAction: vi.fn(),
}));
vi.mock("@/features/routine/components/conditioning-editor", () => ({
  ConditioningEditor: () => null,
}));
vi.mock("@/features/routine-share/components/share-day-button", () => ({
  ShareDayButton: () => null,
}));

import { PlanEditor } from "@/features/routine/components/plan-editor";

describe("PlanEditor 팔 루틴 교환 진입점", () => {
  it("교환 가능한 팔 일차가 여러 개여도 상단 진입 버튼을 하나만 렌더링한다", () => {
    const shared = {
      items: [],
      warmup: [],
      cooldown: [],
      showConditioning: false,
    };
    const html = renderToStaticMarkup(
      createElement(PlanEditor, {
        focuses: [
          {
            key: "0:back",
            dayIndex: 0,
            focus: "back",
            blockIds: ["back"],
            isSide: false,
            label: "1일차 · 등",
            ...shared,
          },
          {
            key: "0:arm",
            dayIndex: 0,
            focus: "arm",
            blockIds: ["biceps"],
            isSide: true,
            label: "1일차 · 이두",
            ...shared,
          },
          {
            key: "1:shoulder",
            dayIndex: 1,
            focus: "shoulder",
            blockIds: ["shoulder"],
            isSide: false,
            label: "2일차 · 어깨",
            ...shared,
          },
          {
            key: "1:arm",
            dayIndex: 1,
            focus: "arm",
            blockIds: ["triceps"],
            isSide: true,
            label: "2일차 · 삼두",
            ...shared,
          },
        ],
        customWeek: [
          ["back", "biceps"],
          ["shoulder", "triceps"],
          ["rest"],
          ["rest"],
          ["rest"],
          ["rest"],
          ["rest"],
        ],
        routineUpdatedAt: "2026-08-11T00:00:00.000Z",
        gender: "male",
        experience: "beginner",
        bodyType: "average",
        weightKg: 70,
      }),
    );

    expect(
      html.match(/data-testid="arm-swap-button"/g) ?? [],
    ).toHaveLength(1);
  });
});
