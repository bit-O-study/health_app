"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { ALL_EXERCISES, getCatalogExercise } from "@/features/routine/exercise-catalog";
import { prescriptionNote, validPrescription, type PrescriptionInput } from "./member-report";

export async function searchPrescriptionExercises(query: string) {
  if (!await getCurrentUser() || typeof query !== "string") return [];
  const q = query.trim().toLocaleLowerCase().slice(0, 100);
  if (!q) return [];
  return ALL_EXERCISES.filter(e => `${e.name} ${e.target}`.toLocaleLowerCase().includes(q)).slice(0, 20)
    .map(e => ({ id: e.id, name: e.name, equipments: e.equipments.map(v => v.equipment) }));
}


/**
 * 처방 입력 검증(두 축 공통) — 세트/횟수/중량 범위 + **운동·기구 조합이 실제로 있는지**.
 * `"use server"` 파일이라 export 하지 않는다(서버 액션만 export 할 수 있다).
 */
function checkPrescriptionInput(
  input: PrescriptionInput | null,
): { name: string } | { error: string } {
  if (input === null) return { name: "" };
  if (!validPrescription(input))
    return { error: "세트(1~20), 횟수(1~100), 중량(0 이상, 소수 첫째 자리)을 확인해 주세요." };
  const exercise = getCatalogExercise(input.exerciseId);
  if (!exercise || !exercise.equipments.some(e => e.equipment === input.equipment))
    return { error: "운동과 기구를 다시 선택해 주세요." };
  return { name: exercise.name };
}

/** 처방이 닿는 화면들 — 트레이너 쪽과 **회원 쪽 오늘 화면**을 같이 새로 그린다. */
function revalidatePrescription(groupId: string, memberId: string) {
  revalidatePath(`/groups/${groupId}/trainer`);
  revalidatePath(`/groups/${groupId}/trainer/members/${memberId}`);
  revalidatePath(`/groups/${groupId}/trainer/comment/${memberId}`);
  revalidatePath("/routine"); revalidatePath("/plan"); revalidatePath("/home");
}

export async function prescribeMemberExercise(
  groupId: string, memberId: string, rowId: string, expectedUpdatedAt: string,
  input: PrescriptionInput | null,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (memberId === user.id) return { ok: false, error: "담당 회원의 운동만 처방할 수 있어요." };
  const checked = checkPrescriptionInput(input);
  if ("error" in checked) return { ok: false, error: checked.error };
  const note = prescriptionNote("routine", checked.name, input);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("trainer_prescribe_exercise", {
    p_group_id: groupId, p_member: memberId, p_row: rowId,
    p_expected_updated_at: expectedUpdatedAt, p_patch: input, p_note: note,
  });
  if (error) return { ok: false, error: "처방을 저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
  if (data !== true) return { ok: false, error: "권한이 없거나 회원의 운동이 변경됐어요. 새로고침 후 다시 확인해 주세요." };
  revalidatePrescription(groupId, memberId);
  return { ok: true };
}

/**
 * **오늘만** 처방 — 회원의 오늘 운동 한 줄을 바꾸거나(input) 뺀다(null).
 *
 * 🔴 원칙 #2: 영구 루틴은 안 바뀐다. 내일이면 회원 루틴은 그대로다.
 * 🔴 대상은 `(부위, position)` + `expectedExerciseId` 로 찾는다 — 루틴에서 온 줄은
 *    아직 daily_plan 에 id 가 없기 때문(처방하는 순간 그 부위가 통째로 고정된다).
 */
export async function prescribeMemberToday(
  groupId: string, memberId: string, focus: string, position: number,
  expectedExerciseId: string, input: PrescriptionInput | null,
): Promise<{ ok: boolean; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (memberId === user.id) return { ok: false, error: "담당 회원의 운동만 처방할 수 있어요." };
  const checked = checkPrescriptionInput(input);
  if ("error" in checked) return { ok: false, error: checked.error };
  const note = prescriptionNote("today", checked.name, input);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("trainer_prescribe_today", {
    p_group_id: groupId, p_member: memberId, p_focus: focus, p_position: position,
    p_expected_exercise_id: expectedExerciseId, p_patch: input, p_note: note,
  });
  if (error) return { ok: false, error: "처방을 저장하지 못했어요. 잠시 후 다시 시도해 주세요." };
  if (data !== true)
    return { ok: false, error: "권한이 없거나 회원이 오늘 운동을 바꿨어요. 새로고침 후 다시 확인해 주세요." };
  revalidatePrescription(groupId, memberId);
  return { ok: true };
}
