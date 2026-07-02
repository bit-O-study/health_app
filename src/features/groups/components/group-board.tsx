import type { GroupDetail, GroupSummary } from "@/features/groups/data-access";
import { GroupSwitcher } from "@/features/groups/components/group-switcher";
import { GymRoom } from "@/features/groups/components/gym-room";

/** 그룹 보드 — 위: 그룹 전환칩 + 그룹명 / 아래: 전체화면 헬스장(늑대 배회). */
export function GroupBoard({
  detail,
  groups,
}: {
  detail: GroupDetail;
  groups: GroupSummary[];
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* 상단: 그룹 탭(전환칩)만 */}
      <div className="shrink-0 px-4 pt-1">
        <GroupSwitcher groups={groups} currentId={detail.id} />
      </div>

      {/* 헬스장(나머지 전부) */}
      <div className="relative min-h-0 flex-1">
        <GymRoom groupId={detail.id} pet={detail.pet} members={detail.ranking} />
      </div>
    </div>
  );
}
