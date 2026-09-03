"use server";

import { exercisesForMuscle } from "@/features/routine/muscle-exercises";
import type { MuscleId } from "@/features/routine/muscle-map";
import { isMuscleId } from "@/features/routine/muscle-map";

/**
 * 근육별 운동 목록을 **서버에서** 준다 — 클라이언트 번들 다이어트.
 *
 * 예전엔 픽커가 1,237개 카탈로그를 통째로 import 해서, 마네킹 화면을 여는 것만으로
 * 274 KiB 가 다운로드·파싱되고 그대로 WebView 힙에 남았다(저사양 폰 팅김의 한 축).
 * 지금은 **누른 부위 하나 분량만** 받아온다.
 */

/** 픽커가 쓰는 최소 필드 — 운동법·기구 상세는 목록에서 안 쓴다. */
export type MuscleExerciseOption = {
  id: string;
  name: string;
  target: string;
};

export async function exercisesForMuscleAction(
  muscle: MuscleId,
): Promise<MuscleExerciseOption[]> {
  // 클라이언트가 보내는 값이라 그대로 믿지 않는다.
  if (!isMuscleId(muscle)) return [];
  return exercisesForMuscle(muscle).map((ex) => ({
    id: ex.id,
    name: ex.name,
    target: ex.target,
  }));
}
