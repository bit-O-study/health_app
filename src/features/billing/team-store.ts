import "server-only";

import { cache } from "react";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import {
  isTeamPlan,
  isTeamStatus,
  type TeamSubscription,
} from "@/features/billing/team-plans";
import {
  EMPTY_DEPOSIT,
  parseDepositInfo,
  type DepositInfo,
} from "@/features/billing/deposit-info";

const COLUMNS =
  "group_id, plan, status, seats, price_krw, period_start, period_end, biz_name, biz_number, biz_email, requested_at, approved_at, memo";

type Row = Record<string, unknown>;

const str = (v: unknown): string | null =>
  typeof v === "string" && v.length > 0 ? v : null;
const ymd = (v: unknown): string | null =>
  typeof v === "string" ? v.slice(0, 10) : null;
const int = (v: unknown): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};

/** 행 → 화면용. 값이 깨졌으면 기본으로 접는다(구독 화면이 통째로 죽지 않게). */
export function toTeamSubscription(row: Row): TeamSubscription {
  return {
    groupId: String(row.group_id ?? ""),
    plan: isTeamPlan(row.plan) ? row.plan : "trainer",
    status: isTeamStatus(row.status) ? row.status : "requested",
    seats: int(row.seats),
    priceKrw: int(row.price_krw),
    periodStart: ymd(row.period_start),
    periodEnd: ymd(row.period_end),
    bizName: str(row.biz_name),
    bizNumber: str(row.biz_number),
    bizEmail: str(row.biz_email),
    requestedAt: String(row.requested_at ?? ""),
    approvedAt: str(row.approved_at),
    memo: str(row.memo),
  };
}

/** 그룹의 팀 구독. RLS 가 그룹장·관리자에게만 준다(그 외에는 null). */
export async function getTeamSubscription(
  groupId: string,
): Promise<TeamSubscription | null> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("team_subscriptions")
    .select(COLUMNS)
    .eq("group_id", groupId)
    .maybeSingle();
  return data ? toTeamSubscription(data as Row) : null;
}

/**
 * 내가 속한 팀 구독으로 프리미엄인가.
 *
 * 🔴 판정을 앱에서 다시 짜지 않고 **DB 함수 하나**(`has_team_premium`)에 맡긴다.
 * 그룹 멤버십과 기간을 한 번에 봐야 하는데, 앱에서 하면 왕복이 늘고 무엇보다
 * 같은 규칙이 두 벌이 된다(한쪽만 고쳐지는 날이 온다).
 *
 * React.cache 로 한 요청 내 1회. 실패하면 false — 실수로 프리미엄을 주는 쪽보다 안전하다.
 */
export const hasTeamPremium = cache(async (): Promise<boolean> => {
  try {
    const user = await getCurrentUser();
    if (!user) return false;
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("has_team_premium");
    if (error) return false;
    return data === true;
  } catch {
    return false;
  }
});

/** 관리자용 — 처리해야 할 신청부터. 관리자가 아니면 RLS 가 빈 목록을 준다. */
export async function listTeamSubscriptions(
  limit = 100,
): Promise<(TeamSubscription & { groupName: string })[]> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("team_subscriptions")
    .select(COLUMNS)
    .order("requested_at", { ascending: false })
    .limit(limit);
  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return [];

  // 그룹 이름은 한 번에 — 행마다 물으면 신청 수만큼 왕복이 는다.
  const ids = rows.map((r) => String(r.group_id));
  const { data: groups } = await supabase
    .from("groups")
    .select("id, name")
    .in("id", ids);
  const nameOf = new Map<string, string>();
  for (const g of (groups ?? []) as { id: string; name: string }[]) {
    nameOf.set(g.id, g.name);
  }
  return rows.map((r) => ({
    ...toTeamSubscription(r),
    groupName: nameOf.get(String(r.group_id)) ?? "(삭제된 그룹)",
  }));
}

/**
 * 입금 계좌 안내. `app_settings` 는 관리자 전용 RLS 라 SECURITY DEFINER 함수로 받는다
 * (표를 통째로 열면 다른 설정까지 새어 나간다).
 *
 * 실패하면 빈 값 — 계좌를 못 읽었다고 신청 화면이 죽으면 안 된다.
 */
export const getDepositInfo = cache(async (): Promise<DepositInfo> => {
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("billing_deposit_info");
    if (error) return EMPTY_DEPOSIT;
    return parseDepositInfo(data);
  } catch {
    return EMPTY_DEPOSIT;
  }
});
