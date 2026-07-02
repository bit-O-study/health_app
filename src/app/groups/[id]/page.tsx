import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, Flame } from "lucide-react";

import { getCurrentUser } from "@/lib/supabase/server";
import { getGroupDetail } from "@/features/groups/data-access";
import { topBadge } from "@/features/groups/streak";
import { GroupControls } from "@/features/groups/components/group-controls";
import { GroupChallenge } from "@/features/groups/components/group-challenge";
import { MemberCheers } from "@/features/groups/components/member-cheers";

export const dynamic = "force-dynamic";
export const metadata = { title: "그룹 랭킹" };

const MEDAL = ["🥇", "🥈", "🥉"];

function mdDisplay(ymd: string) {
  const [, m, d] = ymd.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const detail = await getGroupDetail(id);

  if (!detail) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-16 text-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          그룹을 찾을 수 없거나 멤버가 아니에요.
        </p>
        <Link
          href="/groups"
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600"
        >
          <ChevronLeft size={16} /> 그룹 목록
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href="/groups"
          aria-label="그룹 목록"
          className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <ChevronLeft aria-hidden="true" size={20} />
        </Link>
        <h1 className="truncate text-lg font-bold text-zinc-950 dark:text-zinc-50">
          {detail.name}
        </h1>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-2 dark:bg-emerald-950/30">
        <span className="flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-300">
          <Flame aria-hidden="true" size={16} /> 이번 주 운동 랭킹대전
        </span>
        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          {mdDisplay(detail.weekFrom)} ~ {mdDisplay(detail.weekTo)}
        </span>
      </div>

      <GroupChallenge
        groupId={detail.id}
        isOwner={detail.isOwner}
        challenge={detail.challenge}
      />

      <ol className="mb-6 space-y-2">
        {detail.ranking.map((m) => (
          <li key={m.userId}>
           <Link
            href={`/groups/${detail.id}/member/${m.userId}`}
            className={`flex items-center gap-3 rounded-xl border p-3 transition hover:border-emerald-300 dark:hover:border-emerald-700 ${
              m.isMe
                ? "border-emerald-400 bg-emerald-50/60 dark:border-emerald-600 dark:bg-emerald-950/30"
                : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            }`}
          >
            <span className="w-7 shrink-0 text-center text-lg font-extrabold tabular-nums text-zinc-400">
              {MEDAL[m.rank - 1] ?? m.rank}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1 truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {m.name}
                {m.isMe ? (
                  <span className="text-xs font-semibold text-emerald-600">나</span>
                ) : null}
                {m.streak >= 3 && topBadge(m.streak) ? (
                  <span
                    title={`${topBadge(m.streak)!.label} 운동 중`}
                    className="rounded-full bg-orange-100 px-1.5 py-0.5 text-[10px] font-bold text-orange-700 dark:bg-orange-950/40 dark:text-orange-300"
                  >
                    {topBadge(m.streak)!.emoji} {topBadge(m.streak)!.label}
                  </span>
                ) : null}
              </p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                운동 {m.workouts}회 · {m.days}일
                {m.streak > 0 ? (
                  <span className="text-orange-500 dark:text-orange-400">
                    {" "}· 🔥 {m.streak}일 연속
                  </span>
                ) : null}
              </p>
              <p className="text-[11px] text-zinc-400 dark:text-zinc-500">
                오늘 🍽 {m.todayIntake.toLocaleString()} · 🔥 {m.todayBurned.toLocaleString()}
              </p>
              {m.todayPhotos.length > 0 ? (
                <div className="mt-1 flex gap-1">
                  {m.todayPhotos.map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={src}
                      src={src}
                      alt="오늘 식단"
                      className="h-9 w-9 rounded-md object-cover"
                    />
                  ))}
                </div>
              ) : null}
            </div>
            <span className="shrink-0 text-right">
              <span className="block text-base font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">
                {m.kcal.toLocaleString()}
              </span>
              <span className="text-[10px] font-semibold text-zinc-400">kcal</span>
            </span>
           </Link>
           <MemberCheers
             groupId={detail.id}
             toUser={m.userId}
             cheers={detail.cheers[m.userId] ?? []}
             readOnly={m.isMe}
           />
          </li>
        ))}
      </ol>

      <GroupControls
        groupId={detail.id}
        groupName={detail.name}
        inviteToken={detail.inviteToken}
        isOwner={detail.isOwner}
      />
    </main>
  );
}
