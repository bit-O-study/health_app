import { describe, expect, it } from "vitest";

import {
  ALL_EXERCISES,
  ALL_FOCUSES,
  focusForExercise,
} from "@/features/routine/exercise-catalog";
import { FOCUS_KEYS, isFocusKey } from "@/features/routine/data";
import { focusForExerciseId } from "@/features/routine/exercise-body-parts";
import { subMusclesForExercise } from "@/features/routine/muscle-detail";
import { subMusclesForExerciseData } from "@/features/routine/sub-muscles";

/**
 * P0(번들 다이어트) — **가벼운 매핑 함수가 무거운 카탈로그판과 같은 답을 준다**는 보장.
 *
 * 운동 선택기(`ExerciseSearchSelect`)는 부위 칩·세부근육 칩을 그리려고 예전엔
 * `focusForExercise`/`subMusclesForExercise` 를 썼는데, 둘 다 운동 목록(274 KiB)을
 * 뒤진다. 이 선택기는 오늘 계획·일차 편집·컨디셔닝 편집이 모두 쓰기 때문에 그 목록이
 * 화면 4개에 실렸다. 지금은 매핑만 보는 `focusForExerciseId` 와, 이름·타깃을 인자로 받는
 * `subMusclesForExerciseData` 를 쓴다.
 *
 * 그래서 **두 구현이 갈라지면 여기서 깨져야 한다.** 카탈로그에 운동을 추가하면서
 * 부위 매핑(`PRIMARY_BODY_PART`/`EXTRA_BODY_PART`)에 빠뜨리면 선택기에서 그 운동의
 * 부위 칩이 조용히 사라지는데, 그 사고를 사람 눈이 아니라 이 테스트가 잡는다.
 */
describe("가벼운 부위·세부근육 매핑 ↔ 카탈로그판 동치", () => {
  it("focusForExerciseId 가 전 종목에서 focusForExercise 와 같은 답을 준다", () => {
    const diff: { id: string; light: string | null; heavy: string | null }[] = [];
    for (const ex of ALL_EXERCISES) {
      const light = focusForExerciseId(ex.id);
      const heavy = focusForExercise(ex.id);
      if (light !== heavy) diff.push({ id: ex.id, light, heavy });
    }
    expect(diff).toEqual([]);
  });

  it("카탈로그에 없는 운동 id 는 양쪽 다 부위가 없다", () => {
    expect(focusForExerciseId("존재하지-않는-운동")).toBeNull();
    expect(focusForExercise("존재하지-않는-운동")).toBeNull();
  });

  it("subMusclesForExerciseData 가 전 종목에서 subMusclesForExercise 와 같다", () => {
    const diff: string[] = [];
    for (const ex of ALL_EXERCISES) {
      const light = subMusclesForExerciseData(ex.id, ex.name, ex.target).map(
        (s) => s.id,
      );
      const heavy = subMusclesForExercise(ex.id).map((s) => s.id);
      if (light.join(",") !== heavy.join(",")) diff.push(ex.id);
    }
    expect(diff).toEqual([]);
  });

  it("전 종목이 부위 매핑을 갖는다 — 새 운동을 추가하면서 빠뜨리면 여기서 걸린다", () => {
    const missing = ALL_EXERCISES.filter(
      (ex) => focusForExerciseId(ex.id) === null,
    ).map((ex) => ex.id);
    expect(missing).toEqual([]);
  });
});

/**
 * 서버 액션(`exercisesForSlotAction`)은 클라이언트가 보낸 부위 문자열을 `isFocusKey` 로
 * 거른다. 그 목록이 카탈로그의 부위 목록과 어긋나면 **멀쩡한 부위가 조용히 빈 목록**이
 * 된다(운동 추가 폼이 아무것도 못 고르는 상태). 그래서 둘을 못 박아 둔다.
 */
describe("FOCUS_KEYS ↔ 카탈로그 부위 목록", () => {
  it("두 목록이 같은 부위 집합이다", () => {
    expect([...FOCUS_KEYS].sort()).toEqual([...ALL_FOCUSES].sort());
  });

  it("isFocusKey 는 카탈로그 부위만 통과시킨다", () => {
    for (const f of ALL_FOCUSES) expect(isFocusKey(f)).toBe(true);
    for (const bad of ["rest", "", "chest ", "CHEST", null, 3, undefined])
      expect(isFocusKey(bad)).toBe(false);
  });
});
