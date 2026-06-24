import { describe, expect, it } from "vitest";

import { ALL_EXERCISES } from "@/features/routine/exercise-catalog";
import { hasDedicatedIcon } from "@/features/exercises/components/exercise-icon";

// 운동별 아이콘 — 모든 카탈로그 운동이 일반 덤벨 폴백이 아니라 동작에 맞는 전용
// 아이콘을 가져야 한다. (변형·머신 운동은 가장 가까운 동작 아이콘을 재사용.)

describe("exercise icon mapping", () => {
  it("모든 카탈로그 운동이 전용 아이콘을 가진다(일반 덤벨 폴백 없음)", () => {
    const missing = ALL_EXERCISES.map((e) => e.id).filter(
      (id) => !hasDedicatedIcon(id),
    );
    expect(missing, `아이콘 미매핑: ${missing.join(", ")}`).toEqual([]);
  });
});