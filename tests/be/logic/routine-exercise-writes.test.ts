import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  replaceRoutineExerciseGroups,
  routineExerciseWriteErrorMessage,
} from "@/features/routine/routine-exercise-writes";

describe("routineExerciseWriteErrorMessage", () => {
  it("stale revision은 다시 저장하라고 안내한다", () => {
    expect(routineExerciseWriteErrorMessage("STALE_ROUTINE")).toBe(
      "루틴이 다른 곳에서 변경되었습니다. 새로고침 후 다시 시도해주세요.",
    );
  });

  it("DB 상세는 노출하지 않는다", () => {
    expect(routineExerciseWriteErrorMessage("raw postgres detail")).toBe(
      "운동 저장에 실패했습니다.",
    );
  });
});

describe("replaceRoutineExerciseGroups", () => {
  it("완료기록을 그룹별로 옮길 수 있도록 삽입 행의 일차와 부위를 보존한다", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: [
        {
          inserted_id: "11111111-1111-1111-1111-111111111111",
          inserted_exercise_id: "curl",
          inserted_day_index: 2,
          inserted_focus: "arm",
        },
      ],
      error: null,
    });

    const result = await replaceRoutineExerciseGroups(
      { rpc } as unknown as SupabaseClient,
      "2026-08-10T00:00:00.000Z",
      false,
      [],
    );

    expect(result).toEqual({
      ok: true,
      inserted: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          exerciseId: "curl",
          dayIndex: 2,
          focus: "arm",
        },
      ],
    });
  });
});
