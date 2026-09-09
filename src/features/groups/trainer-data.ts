import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { resolveMemberName } from "@/features/groups/member-name";
import { weekRange } from "@/features/groups/ranking";
import { sortForTrainer, type TrainerMember } from "@/features/groups/trainer-board";

export type TrainerBoard = {
  groupId: string;
  groupName: string;
  weekFrom: string;
  weekTo: string;
  today: string;
  /** 챙길 사람이 위로 정렬된 담당 회원(트레이너 자신은 뺀다). */
  members: TrainerMember[];
};

type Row = {
  user_id: string;
  workout_days: number | string | null;
  diet_days: number | string | null;
  last_workout: string | null;
  target_days: number | string | null;
  weight_first: number | string | null;
  weight_last: number | string | null;
};

const int = (v: number | string | null): number => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
};
const dec = (v: number | string | null): number | null => {
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * 담당 회원의 이번 주 상태. **그룹장(=트레이너)이 아니면 null.**
 *
 * 판정은 서버에서 두 번 한다. `trainer_board` 함수가 소유자를 확인하고(빈 결과),
 * 여기서도 `groups.owner_id` 를 확인해 **아예 화면을 안 준다.** 함수만 믿으면
 * 회원이 없는 그룹에서 빈 대시보드가 그려져 "트레이너 화면이 열린다"는 오해를 준다.
 */
export async function getTrainerBoard(groupId: string): Promise<TrainerBoard | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();

  const { data: group } = await supabase
    .from("groups")
    .select("id, name, owner_id")
    .eq("id", groupId)
    .maybeSingle();
  const g = group as { id: string; name: string; owner_id: string } | null;
  if (!g || g.owner_id !== user.id) return null;

  const today = seoulYmd();
  const { from, to } = weekRange(today);

  // 집계(RPC)와 멤버 목록은 서로 의존이 없어 한 묶음으로. 프로필은 멤버 id 가 있어야
  // 물을 수 있어 그다음이다(왕복 2회 — 회원 수와 무관하게 고정이다).
  const [{ data: stats }, { data: members }] = await Promise.all([
    supabase.rpc("trainer_board", { p_group_id: groupId, p_from: from, p_to: to }),
    supabase.from("group_members").select("user_id, display_name").eq("group_id", groupId),
  ]);

  const memberRows = (members ?? []) as { user_id: string; display_name: string | null }[];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, name, nickname")
    .in("user_id", memberRows.map((r) => r.user_id));

  // 표시 이름 = 프로필 이름(최신) 우선 → 그룹 가입 스냅샷 → "회원".
  // 랭킹 화면과 **같은 규칙**을 쓴다(화면마다 이름이 다르면 같은 사람인지 알 수 없다).
  const dispOf = new Map<string, string | null>();
  for (const r of memberRows) dispOf.set(r.user_id, r.display_name);
  const nameOf = new Map<string, string>();
  for (const p of (profiles ?? []) as {
    user_id: string;
    name: string | null;
    nickname: string | null;
  }[]) {
    nameOf.set(p.user_id, resolveMemberName(p.nickname, p.name, dispOf.get(p.user_id)));
  }

  const rows = ((stats ?? []) as Row[])
    // 트레이너 자신은 담당 회원이 아니다 — 자기를 챙기라고 띄울 이유가 없다.
    .filter((r) => r.user_id !== user.id)
    .map<TrainerMember>((r) => ({
      userId: r.user_id,
      name: nameOf.get(r.user_id) ?? resolveMemberName(null, null, dispOf.get(r.user_id)),
      workoutDays: int(r.workout_days),
      dietDays: int(r.diet_days),
      targetDays: int(r.target_days),
      // date 컬럼이라 'YYYY-MM-DD' 로 오지만, 드라이버가 시각을 붙여 보내는 경우가 있다.
      lastWorkout: r.last_workout ? r.last_workout.slice(0, 10) : null,
      weightFirst: dec(r.weight_first),
      weightLast: dec(r.weight_last),
    }));

  return {
    groupId: g.id,
    groupName: g.name,
    weekFrom: from,
    weekTo: to,
    today,
    members: sortForTrainer(rows, today),
  };
}
