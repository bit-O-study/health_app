import type { GroupDetail, GroupSummary } from "@/features/groups/data-access";
import { GroupSwitcher } from "@/features/groups/components/group-switcher";
import { GroupLeaderboard } from "@/features/groups/components/group-leaderboard";
import { GymRoom } from "@/features/groups/components/gym-room";

/** 그룹 보드 — (전환칩) + 그룹명 + 헬스장 씬(늑대 돌아다님) + 랭킹. */
export function GroupBoard({
  detail,
  groups,
}: {
  detail: GroupDetail;
  /** 전환칩용 내 그룹 목록(1개 이하면 칩 숨김). */
  groups: GroupSummary[];
}) {
  return (
    <div>
      {groups.length > 1 ? (
        <GroupSwitcher groups={groups} currentId={detail.id} />
      ) : null}

      <h1 className="mb-2 truncate text-lg font-extrabold text-zinc-950 dark:text-zinc-50">
        {detail.name}
      </h1>

      <GymRoom members={detail.ranking} />

      <GroupLeaderboard
        groupId={detail.id}
        ranking={detail.ranking}
        cheers={detail.cheers}
      />
    </div>
  );
}
