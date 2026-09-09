"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { isAdminUser } from "@/features/admin/admin";
import { isTeamPlan, type TeamPlan } from "@/features/billing/team-plans";

export type TeamActionResult = { ok: true } | { ok: false; error: string };

const trim = (v: unknown, max: number): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length === 0 ? null : s.slice(0, max);
};

/**
 * 이용 신청 — 그룹장이 낸다. 상태는 항상 `requested` 다.
 *
 * 🔴 여기서 `status` 를 받지 않는다. 화면이 보내는 값으로 상태를 정하면 신청 화면을
 * 흉내 내는 것만으로 스스로 `active` 가 된다. (RLS 도 같은 걸 막지만, 애초에 값을
 * 안 받는 게 맞다 — 막을 게 없으면 뚫릴 것도 없다.)
 */
export async function requestTeamPlanAction(
  groupId: string,
  plan: TeamPlan,
  biz: { name?: string; number?: string; email?: string },
): Promise<TeamActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!isTeamPlan(plan)) return { ok: false, error: "요금제를 골라 주세요." };

  const supabase = await createSupabaseServerClient();
  // 그룹당 한 행이라 upsert. 이미 이용 중이면 RLS(update 는 requested 만)가 막는다.
  const { error } = await supabase.from("team_subscriptions").upsert(
    {
      group_id: groupId,
      plan,
      status: "requested",
      requested_by: user.id,
      biz_name: trim(biz.name, 80),
      biz_number: trim(biz.number, 20),
      biz_email: trim(biz.email, 120),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "group_id" },
  );
  if (error) return { ok: false, error: "신청하지 못했어요. 잠시 후 다시 시도해 주세요." };

  revalidatePath(`/groups/${groupId}/trainer/billing`);
  return { ok: true };
}

/** 신청 취소 — 아직 승인 전일 때만(RLS 가 강제). */
export async function cancelTeamRequestAction(
  groupId: string,
): Promise<TeamActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("team_subscriptions")
    .delete()
    .eq("group_id", groupId);
  if (error) return { ok: false, error: "취소하지 못했어요." };
  revalidatePath(`/groups/${groupId}/trainer/billing`);
  return { ok: true };
}

/**
 * 승인·연장 — **관리자만**. 입금을 확인한 사람이 기간과 금액을 넣는다.
 *
 * 🔴 관리자 여부를 여기서도 본다. RLS 가 이미 막지만, 서버 액션은 주소만 알면 누구나
 * 부를 수 있어서 **막힌 이유가 화면에 안 보이면** 그대로 배포되는 사고가 난다.
 * 여기서 먼저 걸러야 로그와 오류 문구가 정직해진다.
 */
export async function approveTeamPlanAction(input: {
  groupId: string;
  periodStart: string;
  periodEnd: string;
  priceKrw: number;
  seats: number;
  memo?: string;
}): Promise<TeamActionResult> {
  if (!(await isAdminUser())) return { ok: false, error: "관리자만 할 수 있어요." };
  const YMD = /^\d{4}-\d{2}-\d{2}$/;
  if (!YMD.test(input.periodStart) || !YMD.test(input.periodEnd))
    return { ok: false, error: "이용 기간을 확인해 주세요." };
  if (input.periodEnd < input.periodStart)
    return { ok: false, error: "종료일이 시작일보다 빠릅니다." };
  const price = Math.max(0, Math.trunc(Number(input.priceKrw) || 0));
  const seats = Math.max(0, Math.trunc(Number(input.seats) || 0));

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("team_subscriptions")
    .update({
      status: "active",
      period_start: input.periodStart,
      period_end: input.periodEnd,
      price_krw: price,
      seats,
      memo: trim(input.memo, 500),
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("group_id", input.groupId);
  if (error) return { ok: false, error: "승인하지 못했어요." };

  revalidatePath("/admin/billing");
  revalidatePath(`/groups/${input.groupId}/trainer/billing`);
  return { ok: true };
}

/** 해지(관리자) — 기간은 그대로 두고 상태만 바꾼다. 남은 기간은 그대로 쓰게 한다. */
export async function cancelTeamPlanAction(
  groupId: string,
): Promise<TeamActionResult> {
  if (!(await isAdminUser())) return { ok: false, error: "관리자만 할 수 있어요." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("team_subscriptions")
    .update({ status: "canceled", updated_at: new Date().toISOString() })
    .eq("group_id", groupId);
  if (error) return { ok: false, error: "해지하지 못했어요." };
  revalidatePath("/admin/billing");
  return { ok: true };
}
