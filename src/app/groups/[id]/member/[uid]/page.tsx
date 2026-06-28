import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, Dumbbell, Flame, Utensils } from "lucide-react";

import { getCurrentUser } from "@/lib/supabase/server";
import { getGroupMemberDay } from "@/features/groups/data-access";

export const dynamic = "force-dynamic";
export const metadata = { title: "그룹원 오늘 기록" };

export default async function GroupMemberPage({
  params,
}: {
  params: Promise<{ id: string; uid: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id, uid } = await params;
  const day = await getGroupMemberDay(id, uid);

  if (!day) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-16 text-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          기록을 볼 수 없어요(같은 그룹원만 열람 가능).
        </p>
        <Link
          href={`/groups/${id}`}
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-emerald-600"
        >
          <ChevronLeft size={16} /> 그룹으로
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-4 flex items-center gap-2">
        <Link
          href={`/groups/${id}`}
          aria-label="그룹으로"
          className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
        >
          <ChevronLeft aria-hidden="true" size={20} />
        </Link>
        <h1 className="truncate text-lg font-bold text-zinc-950 dark:text-zinc-50">
          {day.name} · 오늘
        </h1>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
            <Utensils size={14} /> 오늘 섭취
          </span>
          <p className="mt-1 text-lg font-extrabold tabular-nums text-zinc-950 dark:text-zinc-50">
            {day.intake.toLocaleString()}
            <span className="ml-0.5 text-xs font-semibold text-zinc-400">kcal</span>
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            <Flame size={14} /> 오늘 운동 소비
          </span>
          <p className="mt-1 text-lg font-extrabold tabular-nums text-zinc-950 dark:text-zinc-50">
            {day.burned.toLocaleString()}
            <span className="ml-0.5 text-xs font-semibold text-zinc-400">kcal</span>
          </p>
        </div>
      </div>

      {/* 오늘 운동 */}
      <section className="mb-5">
        <h2 className="mb-2 flex items-center gap-1 text-sm font-bold text-zinc-500 dark:text-zinc-400">
          <Dumbbell size={15} /> 오늘 운동
        </h2>
        {day.workouts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-4 text-center text-sm text-zinc-400 dark:border-zinc-700">
            오늘 완료한 운동이 없어요.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {day.workouts.map((w, i) => (
              <li key={i} className="flex items-center justify-between gap-2 px-4 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                  {w.name}
                  {w.detail ? (
                    <span className="ml-1.5 text-xs font-normal text-zinc-400">{w.detail}</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-xs font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {w.kcal}kcal
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 오늘 식단 */}
      <section>
        <h2 className="mb-2 flex items-center gap-1 text-sm font-bold text-zinc-500 dark:text-zinc-400">
          <Utensils size={15} /> 오늘 식단
        </h2>
        {/* 끼니별 사진 */}
        {day.mealPhotos.length > 0 ? (
          <div className="mb-3 flex flex-wrap gap-2">
            {day.mealPhotos.map((p, i) => (
              <figure key={i} className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.photoUrl}
                  alt={`${p.meal} 사진`}
                  className="h-24 w-24 rounded-xl object-cover"
                />
                <figcaption className="mt-0.5 text-[11px] font-semibold text-zinc-500">
                  {p.meal}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : null}

        {day.foods.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-4 text-center text-sm text-zinc-400 dark:border-zinc-700">
            오늘 기록한 식단이 없어요.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {day.foods.map((f, i) => (
              <li key={i} className="flex items-center gap-2 px-4 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                  <span className="mr-1.5 rounded bg-zinc-100 px-1 py-0.5 text-[10px] font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {f.meal}
                  </span>
                  {f.name}
                </span>
                <span className="shrink-0 text-xs font-bold tabular-nums text-amber-600 dark:text-amber-400">
                  {f.kcal}kcal
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
