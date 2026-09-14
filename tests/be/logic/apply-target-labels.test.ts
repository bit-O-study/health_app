import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  applyTargetLabels,
  validateShareText,
} from "@/features/routine-share/share";

/**
 * 루틴 추천글 — 고르는 줄 문구 + **제목은 자동으로 채우지 않는다**(2026-09-13).
 *
 * 🔴 제목을 미리 채우면 그대로 올려 버려 추천글 제목이 전부 "가슴 · 삼두" 처럼 똑같아진다.
 * 제목은 비워서 열고, 비어 있으면 올리지 못한다.
 */
describe("루틴 추천 대상 문구", () => {
  it("고르는 줄에는 일차가 있다 — 몇 일차인지가 정보다", () => {
    expect(applyTargetLabels(0, ["가슴", "삼두"]).label).toBe("1일차 · 가슴 · 삼두");
    expect(applyTargetLabels(4, ["등"]).label).toBe("5일차 · 등");
  });

  it("🔴 자동 제목을 만들지 않는다", () => {
    expect(applyTargetLabels(0, ["가슴"])).not.toHaveProperty("title");
  });
});

describe("🔴 추천글 작성 시트 — 제목 자동 입력 없음 + 제목 없으면 못 올림", () => {
  const sheet = readFileSync(
    "src/features/routine-share/components/share-day-button.tsx",
    "utf8",
  );

  it("제목은 빈 값으로 시작한다", () => {
    expect(sheet).toContain('useState("")');
    expect(sheet).not.toContain("defaultTitle");
  });

  it("제목이 비면 '올리기' 버튼이 막힌다", () => {
    expect(sheet).toContain("disabled={pending || titleMissing}");
  });

  it("호출부 어디서도 기본 제목을 넘기지 않는다", () => {
    for (const path of [
      "src/features/community/components/community-board.tsx",
      "src/features/routine/components/plan-editor.tsx",
    ]) {
      expect(readFileSync(path, "utf8")).not.toContain("defaultTitle");
    }
  });

  it("서버 검증도 빈 제목을 거절한다", () => {
    expect(validateShareText("", "")).toBe("제목을 입력하세요.");
  });
});
