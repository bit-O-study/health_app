import { Flame } from "lucide-react";

import type { GroupDetail, GroupSummary } from "@/features/groups/data-access";
import { GroupSwitcher } from "@/features/groups/components/group-switcher";
import { GroupChallenge } from "@/features/groups/components/group-challenge";
import { GroupLeaderboard } from "@/features/groups/components/group-leaderboard";
import { GroupControls } from "@/features/groups/components/group-controls";

function mdDisplay(ymd: string) {
  const [, m, d] = ymd.split("-");
  return `${Number(m)}/${Number(d)}`;
}

/** 그룹 보드 — (전환칩) + 랭킹대전 배너 + 주간 챌린지 + 게임형 리더보드 + 컨트롤. */
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

      {/* 랭킹대전 배너 */}
      <div className="mb-4 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="truncate text-lg font-extrabold">{detail.name}</h1>
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-bold">
            {mdDisplay(detail.weekFrom)} ~ {mdDisplay(detail.weekTo)}
          </span>
        </div>
        <p className="mt-0.5 flex items-center gap-1 text-sm font-bold text-emerald-50">
          <Flame aria-hidden="true" size={15} /> 이번 주 운동 랭킹대전
        </p>
      </div>

      <GroupChallenge
        groupId={detail.id}
        isOwner={detail.isOwner}
        challenge={detail.challenge}
      />

      <div className="mb-6">
        <GroupLeaderboard
          groupId={detail.id}
          ranking={detail.ranking}
          cheers={detail.cheers}
        />
      </div>

      <GroupControls
        groupId={detail.id}
        groupName={detail.name}
        inviteToken={detail.inviteToken}
        isOwner={detail.isOwner}
      />
    </div>
  );
}
