import { Trophy } from "lucide-react";

import type { RankedMember } from "@/features/groups/ranking";
import type { CheerView } from "@/features/groups/data-access";
import { characterEmoji, pastelClass } from "@/features/groups/avatar";
import { topBadge } from "@/features/groups/streak";
import { MemberCheers } from "@/features/groups/components/member-cheers";

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

// 상위 3위 카드 — 파스텔 금·은·동.
const TOP_CARD: Record<number, string> = {
  1: "border-amber-300 bg-gradient-to-br from-amber-100 via-amber-50 to-white dark:border-amber-500/40 dark:from-amber-950/40 dark:via-amber-950/20 dark:to-zinc-900",
  2: "border-zinc-300 bg-gradient-to-br from-zinc-100 via-zinc-50 to-white dark:border-zinc-500/40 dark:from-zinc-800/50 dark:to-zinc-900",
  3: "border-orange-300 bg-gradient-to-br from-orange-100 via-orange-50 to-white dark:border-orange-500/40 dark:from-orange-950/40 dark:to-zinc-900",
};

/** 아기자기 귀여운 랭킹 무대 — 동물 캐릭터 + 파스텔 + 왕관/반짝임. 각 카드에 응원. */
export function GroupLeaderboard({
  groupId,
  ranking,
  cheers,
}: {
  groupId: string;
  ranking: RankedMember[];
  cheers: Record<string, CheerView[]>;
}) {
  if (ranking.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-zinc-300 py-12 text-center text-sm text-zinc-400 dark:border-zinc-700">
        <Trophy aria-hidden="true" size={30} className="text-zinc-300" />
        아직 랭킹이 없어요. 운동을 완료하면 귀여운 친구들이 등장해요!
      </div>
    );
  }

  return (
    <ol className="space-y-1.5">
      {ranking.map((m, i) => {
        const isTop3 = m.rank <= 3;
        const isFirst = m.rank === 1;
        const badge = topBadge(m.streak);
        return (
          <li
            key={m.userId}
            className={`rounded-2xl border p-2 shadow-sm transition ${
              m.isMe
                ? "border-emerald-400 bg-emerald-50/70 ring-2 ring-emerald-200 dark:border-emerald-500 dark:bg-emerald-950/30 dark:ring-emerald-800"
                : isTop3
                  ? TOP_CARD[m.rank]
                  : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            }`}
          >
            <div className="flex items-center gap-2">
              {/* 순위 */}
              <span className="w-5 shrink-0 text-center text-sm font-black tabular-nums text-zinc-400">
                {MEDAL[m.rank] ?? m.rank}
              </span>

              {/* 캐릭터 */}
              <div className="relative shrink-0">
                {isFirst ? (
                  <span
                    aria-hidden="true"
                    className="g-crown absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs"
                  >
                    👑
                  </span>
                ) : null}
                {isTop3 ? (
                  <span
                    aria-hidden="true"
                    className="g-sparkle absolute -right-0.5 -top-0.5 text-[9px]"
                  >
                    ✨
                  </span>
                ) : null}
                <span
                  className={`flex items-center justify-center rounded-xl ${pastelClass(
                    m.name,
                  )} ${isTop3 ? "h-9 w-9 text-xl" : "h-8 w-8 text-lg"}`}
                >
                  <span
                    className={isFirst ? "g-bob-big inline-block" : "g-bob inline-block"}
                    style={{ animationDelay: `${(i % 6) * 0.18}s` }}
                  >
                    {characterEmoji(m.name)}
                  </span>
                </span>
              </div>

              {/* 이름 + 스트릭 */}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1 truncate text-xs font-extrabold text-zinc-900 dark:text-zinc-100">
                  {m.name}
                  {m.isMe ? (
                    <span className="rounded-full bg-emerald-100 px-1 text-[9px] font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                      나
                    </span>
                  ) : null}
                  {m.streak > 0 ? (
                    <span className="text-[10px] font-bold text-orange-500 dark:text-orange-400">
                      {badge?.emoji ?? "🔥"}
                      {m.streak}
                    </span>
                  ) : null}
                </p>
                <span className="text-[9px] text-zinc-400">
                  운동 {m.workouts}회 · {m.days}일
                </span>
              </div>

              {/* 점수 pill */}
              <span className="shrink-0 rounded-xl bg-emerald-500 px-2 py-0.5 text-center text-white shadow-sm">
                <span className="block text-xs font-black tabular-nums leading-tight">
                  {m.kcal.toLocaleString()}
                </span>
                <span className="text-[7px] font-bold opacity-80">kcal</span>
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
    </ol>
  );
}
