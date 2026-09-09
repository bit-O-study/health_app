import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { applyTargetLabels } from "@/features/routine-share/share";

/**
 * 루틴 추천글의 **제목 기본값**에 일차를 넣지 않는다 — 2026-09-09.
 *
 * 🔴 "1일차" 는 **쓰는 사람의 루틴에서만** 뜻이 있다. 읽는 사람에게 내 3일차가 무슨
 * 날인지 알 방법이 없다(남의 3일차와 같을 이유가 없다). 그래서 고르는 자리(label)와
 * 남에게 보이는 자리(title)를 나눈다.
 */
describe("루틴 추천 대상 문구", () => {
  it("고르는 줄에는 일차가 있다 — 몇 일차인지가 정보다", () => {
    expect(applyTargetLabels(0, ["가슴", "삼두"]).label).toBe("1일차 · 가슴 · 삼두");
    expect(applyTargetLabels(4, ["등"]).label).toBe("5일차 · 등");
  });

  it("🔴 제목 기본값에는 일차가 없다", () => {
    expect(applyTargetLabels(0, ["가슴", "삼두"]).title).toBe("가슴 · 삼두");
    expect(applyTargetLabels(4, ["등"]).title).toBe("등");
    for (let d = 0; d < 7; d++) {
      expect(applyTargetLabels(d, ["하체"]).title).not.toMatch(/일차/);
    }
  });

  it("부위가 없으면 빈 제목 — 없는 부위를 지어내지 않는다", () => {
    expect(applyTargetLabels(2, []).title).toBe("");
  });

  it("🔴 화면이 제목 기본값으로 title 을 쓴다(label 이 아니라)", () => {
    // 여기가 `target.label` 로 돌아가면 제목에 다시 "1일차" 가 붙는다 —
    // 화면만 봐서는 기본값이 무엇이었는지 알 수 없다(사용자가 지우면 그만이라).
    const src = readFileSync(
      "src/features/community/components/community-board.tsx",
      "utf8",
    );
    expect(src).toContain("defaultTitle={target.title}");
    expect(src).not.toContain("defaultTitle={target.label}");
  });
});
