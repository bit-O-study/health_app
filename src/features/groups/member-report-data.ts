import "server-only";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import type { MemberReportData, MemberTodayPlan } from "./member-report";

export async function getMemberReport(groupId: string, memberId: string, from: string, to: string): Promise<MemberReportData | null> {
  if (!await getCurrentUser()) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("trainer_member_report", { p_group_id: groupId, p_member: memberId, p_from: from, p_to: to });
  if (error) throw new Error("회원 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.");
  return data as MemberReportData | null;
}

/**
 * 회원의 **오늘** 운동(오늘만 처방 대상). null = 권한 없음 또는 회원이 처방을 막음.
 *
 * 영구 루틴 리포트(`getMemberReport`)와 다른 함수인 이유: 오늘 화면은 daily_plan
 * 오버라이드까지 봐야 하고, 리포트는 기간 통계라 매번 같이 실어 나르면 낭비다.
 */
export async function getMemberTodayPlan(
  groupId: string,
  memberId: string,
): Promise<MemberTodayPlan | null> {
  if (!(await getCurrentUser())) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("trainer_member_today_plan", {
    p_group_id: groupId,
    p_member: memberId,
  });
  // 오늘 처방은 부가 기능이다 — 실패해도 통계 화면 전체가 죽으면 안 된다.
  if (error) return null;
  return (data as MemberTodayPlan | null) ?? null;
}
