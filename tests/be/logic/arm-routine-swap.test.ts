import { describe, expect, it } from "vitest";

import {
  armSwapRpcErrorMessage,
  eligibleArmSwapTargets,
  planFocusDisplayName,
  previewArmRoutineSwap,
} from "@/features/routine/arm-routine-swap";
import type { DayBlockId } from "@/features/routine/data";

const week = (day0: DayBlockId[], day1: DayBlockId[]): DayBlockId[][] => [
  day0,
  day1,
  ["rest"],
  ["rest"],
  ["rest"],
  ["rest"],
  ["rest"],
];

describe("planFocusDisplayName", () => {
  it.each(["이두", "삼두", "전완", "팔"])(
    'arm 슬롯은 "%s"를 팔로 표시한다',
    (label) => {
      expect(planFocusDisplayName("arm", `1일 · ${label}`)).toBe("팔");
    },
  );

  it("다른 부위의 세부 라벨은 유지한다", () => {
    expect(planFocusDisplayName("chest", "1일 · 가슴 상부, 가슴 하부")).toBe(
      "가슴 상부, 가슴 하부",
    );
  });
});

describe("previewArmRoutineSwap", () => {
  it("rejects a week that cannot be normalized", () => {
    expect(previewArmRoutineSwap([], 0, 1)).toEqual({
      ok: false,
      reason: "invalid-week",
    });
  });

  it("팔 블록 전체를 바꾸고 비팔 블록 순서와 입력을 보존한다", () => {
    const input = week(["back", "biceps"], ["shoulder", "triceps"]);
    expect(previewArmRoutineSwap(input, 0, 1)).toEqual({
      ok: true,
      nextWeek: week(["back", "triceps"], ["shoulder", "biceps"]),
    });
    expect(input).toEqual(week(["back", "biceps"], ["shoulder", "triceps"]));
  });

  it("여러 팔 블록은 한 슬롯 묶음으로 옮긴다", () => {
    const input = week(
      ["back", "biceps", "triceps"],
      ["shoulder", "arm-forearm"],
    );
    expect(previewArmRoutineSwap(input, 0, 1)).toEqual({
      ok: true,
      nextWeek: week(
        ["back", "arm-forearm"],
        ["shoulder", "biceps", "triceps"],
      ),
    });
  });

  it("교환 후 한쪽이 4블록이면 거부하고 대상에서도 제외한다", () => {
    const input = week(
      ["back", "biceps", "triceps"],
      ["chest", "shoulder", "arm-forearm"],
    );
    expect(previewArmRoutineSwap(input, 0, 1)).toEqual({
      ok: false,
      reason: "day-limit",
    });
    expect(eligibleArmSwapTargets(input, 0)).toEqual([]);
  });

  it.each([
    [-1, 1, "invalid-day"],
    [0, 7, "invalid-day"],
    [0.5, 1, "invalid-day"],
    [0, 1.5, "invalid-day"],
    [0, 0, "same-day"],
  ] as const)("잘못된 일차 %s→%s를 %s로 거부한다", (source, target, reason) => {
    expect(
      previewArmRoutineSwap(
        week(["back", "biceps"], ["shoulder", "triceps"]),
        source,
        target,
      ),
    ).toEqual({
      ok: false,
      reason,
    });
  });

  it("팔 슬롯이 없는 일차를 거부한다", () => {
    expect(
      previewArmRoutineSwap(week(["back"], ["shoulder", "triceps"]), 0, 1),
    ).toEqual({
      ok: false,
      reason: "missing-arm",
    });
  });

  it("교환 가능한 다른 팔 일차만 반환한다", () => {
    const input: DayBlockId[][] = [
      ["back", "biceps"],
      ["shoulder", "triceps"],
      ["lower"],
      ["chest", "arm-forearm"],
      ["rest"],
      ["rest"],
      ["rest"],
    ];
    expect(eligibleArmSwapTargets(input, 0)).toEqual([1, 3]);
  });
});

describe("armSwapRpcErrorMessage", () => {
  it("DB 오류 코드를 사용자 메시지로 제한한다", () => {
    expect(armSwapRpcErrorMessage("STALE_ROUTINE")).toBe(
      "루틴이 다른 곳에서 변경되었습니다. 새로고침 후 다시 시도해주세요.",
    );
    expect(armSwapRpcErrorMessage("ARM_SLOT_NOT_FOUND")).toBe(
      "교환할 팔 루틴을 찾을 수 없습니다.",
    );
    expect(armSwapRpcErrorMessage("AUTH_REQUIRED")).toBe(
      "로그인이 필요합니다.",
    );
    expect(armSwapRpcErrorMessage("DAY_BLOCK_LIMIT")).toBe(
      "하루에는 최대 3개 부위까지만 설정할 수 있습니다.",
    );
    expect(armSwapRpcErrorMessage("raw postgres detail")).toBe(
      "팔 루틴 교환에 실패했습니다.",
    );
  });
});
