"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import {
  SHARE_COLUMN,
  isShareKind,
  type ShareKind,
} from "@/features/groups/share-prefs";

export type ShareResult = { ok: true } | { ok: false; error: string };

/**
 * 항목 하나 켜기/끄기.
 *
 * 🔴 **upsert 로 한 방에.** 먼저 읽고 없으면 insert 하면, 빠르게 두 번 누를 때
 *    둘 다 "없다" 를 보고 insert 해 하나가 충돌로 죽는다(스위치가 안 먹는 것처럼 보인다).
 *
 * 권한은 RLS 가 본다 — `user_id = auth.uid()` 뿐이라 여기서 또 확인할 게 없다.
 * (남의 설정을 끄려 해도 정책이 막는다.)
 */
export async function setSharePrefAction(
  groupId: string,
  kind: ShareKind,
  value: boolean,
): Promise<ShareResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!isShareKind(kind)) return { ok: false, error: "알 수 없는 항목이에요." };
  if (typeof value !== "boolean") return { ok: false, error: "잘못된 값이에요." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("member_share_prefs")
    .upsert(
      { user_id: user.id, group_id: groupId, [SHARE_COLUMN[kind]]: value },
      { onConflict: "user_id,group_id" },
    );
  if (error) return { ok: false, error: "설정을 저장하지 못했어요." };

  revalidatePath("/settings/trainers");
  return { ok: true };
}

/**
 * **트레이너 제거** — 그 그룹에서 나가고, 그 그룹에서 받은 코멘트·동의 설정을 같이 지운다.
 *
 * ⚠ 되돌리기 어렵다(다시 들어오려면 초대 링크가 필요하고, 받은 코멘트는 사라진다).
 *   화면이 트레이너 이름을 보여 주고 확인을 받은 뒤에만 부른다.
 *
 * 🔴 루틴은 **안 지운다.** 트레이너가 짜 준 운동이라도 이미 내 루틴이고, 연결을 끊었다고
 *    내일 할 운동이 통째로 비면 그건 벌이지 도움이 아니다.
 */
export async function leaveTrainerGroupAction(
  groupId: string,
): Promise<ShareResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("leave_trainer_group", {
    p_group_id: groupId,
  });
  if (error) return { ok: false, error: "연결을 끊지 못했어요." };
  // false = 그룹장 본인이거나 그 그룹 회원이 아니다. 왜인지는 말하지 않는다.
  if (data !== true)
    return { ok: false, error: "이 그룹에서는 연결을 끊을 수 없어요." };

  revalidatePath("/settings/trainers");
  revalidatePath("/groups");
  revalidatePath("/home");
  return { ok: true };
}
