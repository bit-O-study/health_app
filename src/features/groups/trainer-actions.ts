"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifyEnabled, notifyUser } from "@/features/notifications/push-fanout";
import { loadPreferences } from "@/features/notifications/preferences-data";
import {
  DEFAULT_PREFERENCES,
  decideSend,
  seoulHour,
} from "@/features/notifications/preferences";
import { routineDaySlots } from "@/features/routine/data";
import { getUserRoutine } from "@/features/routine/data-access";

export type AssignResult = { ok: true; count: number } | { ok: false; error: string };

/**
 * 트레이너가 **자기 루틴의 한 일차**를 담당 회원의 한 일차로 배정한다.
 *
 * ⚠ 회원의 **영구 루틴**을 덮어쓴다(docs/원칙.md 2번의 반대 방향). 되돌리기 어려운
 *   작업이라 화면이 회원 이름과 일차를 보여 주고 확인을 받은 뒤에만 부른다.
 *
 * 🔴 부위(focus)는 **여기서** 정해 넘긴다. 원본 부위를 그대로 쓰면 회원 루틴에 없는
 *    부위의 운동이 생겨 어느 화면에도 안 뜬다 — 소개 루틴 담기에서 이미 겪은 문제라
 *    같은 규칙(`routineDaySlots` 로 받는 쪽 일차의 부위)을 쓴다. 이 계산을 SQL 에
 *    다시 구현하면 트레이너가 보는 부위와 회원이 보는 부위가 갈린다.
 *
 * 권한(그룹장인지·그 그룹 회원인지)은 DB 함수가 다시 확인한다. 여기서 통과해도
 * 거기서 막힌다 — 서버 액션은 주소만 알면 누구나 부를 수 있다.
 */
export async function assignRoutineDayAction(
  groupId: string,
  memberId: string,
  fromDay: number,
  toDay: number,
): Promise<AssignResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (user.id === memberId)
    return { ok: false, error: "자기 자신에게는 배정할 수 없어요." };

  const mine = await getUserRoutine();
  if (!mine) return { ok: false, error: "먼저 내 루틴을 만들어 주세요." };
  const myFrom = routineDaySlots(mine.splits, mine.variantId, mine.customWeek).find(
    (s) => s.dayIndex === fromDay,
  );
  if (!myFrom) return { ok: false, error: "내 루틴에 없는 일차예요." };

  const supabase = await createSupabaseServerClient();

  // 회원의 일차 목록은 회원 루틴 모양에서 나온다(그룹원에게 안 열려 있어 RPC).
  const { data: theirRows, error: theirErr } = await supabase.rpc(
    "trainer_member_routine",
    { p_group_id: groupId, p_member: memberId },
  );
  if (theirErr) return { ok: false, error: "회원 루틴을 불러오지 못했어요." };
  const their = ((theirRows ?? [])[0] ?? null) as
    | { splits: number; variant_id: string; custom_week: unknown }
    | null;
  if (!their)
    return { ok: false, error: "회원이 아직 루틴을 만들지 않았어요." };

  const theirTo = routineDaySlots(
    their.splits,
    their.variant_id,
    their.custom_week as Parameters<typeof routineDaySlots>[2],
  ).find((s) => s.dayIndex === toDay);
  if (!theirTo) return { ok: false, error: "회원의 그 일차는 쉬는 날이에요." };

  const { data, error } = await supabase.rpc("trainer_assign_routine_day", {
    p_group_id: groupId,
    p_member: memberId,
    p_from_day: fromDay,
    p_from_focus: myFrom.focus,
    p_to_day: toDay,
    p_to_focus: theirTo.focus,
  });
  if (error) return { ok: false, error: error.message };

  const count = Number(data);
  // -1 = 권한 없음(그룹장이 아니거나 그 그룹 회원이 아니다). 왜 막혔는지는 말하지 않는다.
  if (!Number.isFinite(count) || count < 0)
    return { ok: false, error: "이 회원에게는 배정할 수 없어요." };
  if (count === 0)
    return { ok: false, error: "내 그 일차에 담긴 운동이 없어요." };

  // 🔴 회원에게 알린다. **회원이 안 한 변경**이라, 안 알리면 어느 날 자기 루틴이
  //    바뀌어 있는데 왜인지 알 방법이 없다(앱 버그로 읽힌다).
  await notifyAssigned(supabase, groupId, memberId, user.id, theirTo.label);

  revalidatePath(`/groups/${groupId}/trainer`);
  return { ok: true, count };
}

/**
 * 배정 알림 — 실패해도 배정 자체는 성공이다(알림은 부가 기능).
 *
 * 보낸 사람 이름은 **그룹 가입 스냅샷**을 쓴다(응원 알림과 같은 규칙) — 회원 입장에서
 * 그룹에서 보던 그 이름이어야 누군지 안다.
 */
async function notifyAssigned(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  groupId: string,
  memberId: string,
  trainerId: string,
  dayLabel: string,
): Promise<void> {
  try {
    if (!notifyEnabled()) return;
    const admin = createSupabaseAdminClient();
    if (!admin) return;

    // 🔴 설정을 본다. `notifyUser` 는 설정을 안 보므로 **부르는 쪽이** 걸러야 한다
    //    (크론들도 같은 방식이다). 안 그러면 설정 화면의 스위치가 장식이 된다.
    const prefs =
      (await loadPreferences(admin, [memberId])).get(memberId) ?? DEFAULT_PREFERENCES;
    if (!decideSend(prefs, "routine-assigned", seoulHour()).allowed) return;

    const { data: mem } = await supabase
      .from("group_members")
      .select("display_name")
      .eq("group_id", groupId)
      .eq("user_id", trainerId)
      .maybeSingle();
    const fromName =
      ((mem as { display_name: string | null } | null)?.display_name ?? "").trim() ||
      "트레이너";

    await notifyUser(admin, memberId, {
      type: "routine-assigned",
      title: "루틴이 바뀌었어요",
      body: `${fromName}님이 ${dayLabel} 운동을 새로 짜 줬어요`,
      url: "/routine",
    });
  } catch {
    /* 알림 실패는 무시 — 배정은 이미 됐다 */
  }
}
