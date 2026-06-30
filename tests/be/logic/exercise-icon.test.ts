import { describe, expect, it } from "vitest";

import { EXERCISES } from "@/features/routine/exercise-catalog";
import { hasDedicatedIcon } from "@/features/exercises/components/exercise-icon";

// 운동별 아이콘 — 큐레이션된 기본 카탈로그의 모든 운동이 일반 덤벨 폴백이 아니라
// 동작에 맞는 전용 아이콘을 가져야 한다. (변형·머신 운동은 가장 가까운 동작 아이콘 재사용.)
// 1,300 CSV 자동 확장분(EXTRA_EXERCISES)은 폴백 아이콘 사용이 정상이라 제외.

describe("exercise icon mapping", () => {
  it("기본 카탈로그 운동이 전용 아이콘을 가진다(일반 덤벨 폴백 없음)", () => {
    const missing = Object.keys(EXERCISES).filter(
      (id) => !hasDedicatedIcon(id),
    );
    expect(missing, `아이콘 미매핑: ${missing.join(", ")}`).toEqual([]);
  });
});