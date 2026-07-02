import { Flame, Trophy } from "lucide-react";

import type { RankedMember } from "@/features/groups/ranking";
import type { CheerView } from "@/features/groups/data-access";
import {
  avatarColorClass,
  memberInitial,
  relativeBarPct,
} from "@/features/groups/avatar";
import { topBadge } from "@/features/groups/streak";
import { MemberCheers } from "@/features/groups/components/member-cheers";

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

// 상위 3위 행 강조(금·은·동 그라데이션).
const TOP_ROW: Record<number, string> = {
  1: "border-amber-300 bg-gradient-to-r from-amber-50 to-white dark:border-amber-500/40 dark:from-amber-950/30 dark:to-zinc-900",
  2: "border-zinc-300 bg-gradient-to-r from-zinc-100 to-white dark:border-zinc-500/40 dark:from-zinc-800/40 dark:to-zinc-900",
  3: "border-orange-300 bg-gradient-to-r from-orange-50 to-white dark:border-orange-500/40 dark:from-orange-950/30 dark:to-zinc-900",
};
const BAR_TONE: Record<number, string> = {
  1: "from-amber-400 to-amber-500",
  2: "from-zinc-400 to-zinc-500",
  3: "from-orange-400 to-orange-500",
};

/** 쿠키런 스타일 랭킹대전 — 상위 3위 강조 행 + 아바타 + 상대 막대 + 응원. */
export function GroupLeaderboard({
  groupId,
  ranking,
  cheers,
}: {
  groupId: string;
  ranking: RankedMember[];
  cheers: Record<string, CheerView[]>;
}) {
  const topKcal = ranking[0]?.kcal ?? 0;

  return (
    <ol className="space-y-2">
      {ranking.map((m) => {
        const badge = topBadge(m.streak);
        const bar = relativeBarPct(m.kcal, topKcal);
        const isTop3 = m.rank <= 3;
        return (
          <li
            key={m.userId}
            className={`overflow-hidden rounded-2xl border p-3 shadow-sm transition ${
              m.isMe
                ? "border-emerald-400 ring-1 ring-emerald-300 dark:border-emerald-500 dark:ring-emerald-700"
                : isTop3
                  ? TOP_ROW[m.rank]
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            }`}
          >
            <div className="flex items-center gap-3">
              {/* 순위 */}
              <span className="w-8 shrink-0 text-center text-xl font-black tabular-nums text-zinc-400">
                {MEDAL[m.rank] ?? m.rank}
              </span>
              {/* 아바타 */}
              <span
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-black text-white shadow ${avatarColorClass(
                  m.name,
                )} ${isTop3 ? "ring-2 ring-white dark:ring-zinc-800" : ""}`}
              >
                {memberInitial(m.name)}
              </span>
              {/* 이름 + 스트릭 + 막대 */}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 truncate text-sm font-extrabold text-zinc-900 dark:text-zinc-100">
                  {m.name}
                  {m.isMe ? (
                    <span className="rounded bg-emerald-100 px-1 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                      나
                    </span>
                  ) : null}
                  {m.streak > 0 ? (
                    <span className="text-[11px] font-bold text-orange-500 dark:text-orange-400">
                      {badge?.emoji ?? "🔥"}
                      {m.streak}
                    </span>
                  ) : null}
                </p>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${
                      isTop3 ? BAR_TONE[m.rank] : "from-emerald-400 to-emerald-500"
                    }`}
                    style={{ width: `${bar}%` }}
                  />
                </div>
                <p className="mt-0.5 text-[10px] text-zinc-400">
                  운동 {m.workouts}회 · {m.days}일
                </p>
              </div>
              {/* 점수 */}
              <span className="shrink-0 text-right">
                <span className="flex items-center gap-0.5 text-base font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                  <Flame aria-hidden="true" size={13} />
                  {m.kcal.toLocaleString()}
                </span>
                <span className="text-[9px] font-bold text-zinc-400">kcal</span>
              </span>
            </div>

            <MemberCheers
              groupId={groupId}
              toUser={m.userId}
              cheers={cheers[m.userId] ?? []}
              readOnly={m.isMe}
            />
          </li>
        );
      })}
      {ranking.length === 0 ? (
        <li className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-zinc-300 py-10 text-center text-sm text-zinc-400 dark:border-zinc-700">
          <Trophy aria-hidden="true" size={28} className="text-zinc-300" />
          아직 랭킹이 없어요. 운동을 완료하면 점수가 쌓입니다!
        </li>
      ) : null}
    </ol>
  );
}
