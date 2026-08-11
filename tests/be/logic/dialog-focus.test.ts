import { describe, expect, it } from "vitest";

import { nextDialogFocusIndex } from "@/components/dialog-focus";

describe("nextDialogFocusIndex", () => {
  it("마지막 요소에서 Tab을 누르면 첫 요소로 순환한다", () => {
    expect(nextDialogFocusIndex(1, 2, false)).toBe(0);
  });

  it("첫 요소에서 Shift+Tab을 누르면 마지막 요소로 순환한다", () => {
    expect(nextDialogFocusIndex(0, 2, true)).toBe(1);
  });

  it("포커스가 밖에 있으면 진행 방향의 경계로 복구한다", () => {
    expect(nextDialogFocusIndex(-1, 2, false)).toBe(0);
    expect(nextDialogFocusIndex(-1, 2, true)).toBe(1);
  });
});
