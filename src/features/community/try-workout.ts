/**
 * '오늘 이 운동 해보기' — 순수 로직(커뮤니티 4-1, 2026-09-30).
 *
 * 남의 운동 기록 카드(게시 시점 스냅샷)의 운동을 내 운동 목록의 어떤 운동으로 담을지 정한다.
 * 🔴 담기는 **오늘만**(daily_plan) — 영구 루틴은 건드리지 않는다(원칙 2). 담는 쪽은
 *    `addExercisesTodayOnlyAction` 이고, 세트·무게는 남의 값이 아니라 **내 프로필 추천값**이다.
 *
 * 새 글의 스냅샷에는 운동 id·기구가 들어 있다. 예전 글은 이름뿐이라 운동 목록에서 이름으로 찾고,
 * 못 찾으면 담을 수 없는 운동으로 둔다.
 */

import {
  ALL_EXERCISES,
  getCatalogExercise,
  isEquipmentId,
  type EquipmentId,
} from "@/features/routine/exercise-catalog";
import type { WorkoutSnapshot } from "./workout-snapshot";

export type TryItem = {
  /** 스냅샷 안 순서(서버가 다시 계산할 때 이 번호로 고른다). */
  index: number;
  name: string;
  sets: number | null;
  exerciseId: string | null;
  equipment: EquipmentId | null;
  /** ok = 담을 수 있음 · already = 오늘 목록에 이미 있음 · unknown = 운동 목록에 없음 */
  status: "ok" | "already" | "unknown";
};

const squash = (s: string) => s.replace(/\s+/g, "").toLowerCase();

let byName: Map<string, string> | null = null;
/** 운동 이름(공백 무시) → 운동 id. 같은 이름이 여럿이면 먼저 나온 것(기본 목록 우선). */
export function exerciseIdByName(name: string): string | null {
  if (!byName) {
    byName = new Map();
    for (const ex of ALL_EXERCISES) {
      const k = squash(ex.name);
      if (!byName.has(k)) byName.set(k, ex.id);
    }
  }
  return byName.get(squash(name)) ?? null;
}

/** 이 운동에 쓸 기구 — 스냅샷 기구가 그 운동에서 가능한 기구면 그것, 아니면 운동의 첫 기구. */
export function pickEquipment(exerciseId: string, wanted: unknown): EquipmentId | null {
  const ex = getCatalogExercise(exerciseId);
  if (!ex) return null;
  const options = ex.equipments.map((e) => e.equipment);
  if (isEquipmentId(wanted) && options.includes(wanted)) return wanted;
  return options[0] ?? null;
}

/** 카드의 운동들 → 담기 후보. 같은 운동이 두 번 나오면 두 번째는 '이미 있음'. */
export function planTryItems(snapshot: WorkoutSnapshot, todayExerciseIds: ReadonlySet<string>): TryItem[] {
  const taken = new Set(todayExerciseIds);
  return snapshot.exercises.map((e, index) => {
    const id =
      e.exerciseId && getCatalogExercise(e.exerciseId) ? e.exerciseId : exerciseIdByName(e.name);
    const equipment = id ? pickEquipment(id, e.equipment) : null;
    let status: TryItem["status"] = "ok";
    if (!id || !equipment) status = "unknown";
    else if (taken.has(id)) status = "already";
    if (id && status === "ok") taken.add(id);
    return { index, name: e.name, sets: e.sets, exerciseId: id, equipment, status };
  });
}

/** 사용자가 고른 번호 중 실제로 담을 수 있는 것만 — 서버가 앱이 보낸 값을 그대로 믿지 않게. */
export function pickedForAdd(
  items: readonly TryItem[],
  picked: readonly number[],
): { exerciseId: string; equipment: EquipmentId }[] {
  const want = new Set(picked);
  return items
    .filter((it) => want.has(it.index) && it.status === "ok" && it.exerciseId && it.equipment)
    .map((it) => ({ exerciseId: it.exerciseId!, equipment: it.equipment! }));
}
