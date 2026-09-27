import "server-only";

import { cache } from "react";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import type { TrainerSwitchGroup } from "@/features/groups/trainer-switch";

/**
 * 내가 **그룹장(=트레이너)인 그룹** 목록. 없으면 빈 배열 → 헤더 스위치를 안 그린다.
 *
 * 🔴 `getAllGroups`(내가 속한 그룹)를 쓰면 안 된다. 그건 **참여한** 그룹까지 주므로
 *    남의 그룹에 회원으로 들어간 일반 사용자에게도 "회원 관리" 가 뜬다.
 *    트레이너 화면은 `groups.owner_id` 로만 열린다(`getTrainerBoard` 와 같은 기준) —
 *    헤더도 **같은 기준**이어야 한다. 아니면 눌러 놓고 "그룹장만 볼 수 있어요" 를 본다.
 *
 * RLS(`members read groups`)가 owner 행을 허용하므로 SECURITY DEFINER 가 필요 없다.
 * 같은 요청 안에서 헤더가 여러 번 그려져도 왕복은 1회(React.cache).
 */
export const getOwnedGroupsForSwitch = cache(
  async (): Promise<TrainerSwitchGroup[]> => {
    const user = await getCurrentUser();
    if (!user) return [];

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("groups")
      .select("id, name")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true });
    // 헤더는 부가 기능이다 — 조회가 실패해도 홈 화면이 깨지면 안 된다.
    if (error || !data) return [];

    return (data as { id: string; name: string }[]).map((g) => ({
      id: g.id,
      name: g.name,
    }));
  },
);
