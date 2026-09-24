import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, Dumbbell, EyeOff, Flame, Utensils } from "lucide-react";

import { getCurrentUser } from "@/lib/supabase/server";
import {
  getGroupMemberDay,
  getGroupMemberWeeklyTraining,
} from "@/features/groups/data-access";
import { WeeklyTrainingCard } from "@/features/routine/components/weekly-training-card";
import { PageHeader } from "@/components/page-header";

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
  // 오늘 하루치만으로는 "어디가 모자란지" 를 말할 수 없다 — 주간 분석을 같이 읽는다.
  // 둘 다 같은 권한 검사를 거치므로 병렬로 부른다(순차로 기다릴 이유가 없다).
  const [day, weekly] = await Promise.all([
    getGroupMemberDay(id, uid),
    getGroupMemberWeeklyTraining(id, uid),
  ]);

  if (!day) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-16 text-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          기록을 볼 수 없어요(같은 그룹원만 열람 가능).
        </p>
        <Link
          href={`/groups/${id}`}
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand"
        >
          <ChevronLeft size={16} /> 그룹으로
        </Link>
      </main>
    );
  }

  // 회원이 끈 항목 — '기록 없음' 과 **다른 말**을 해야 한다(트레이너가 헛걸음한다).
  const hideWorkout = day.hidden.includes("workout");
  const hideDiet = day.hidden.includes("diet");

  // 다른 하위 화면과 같은 공통 머리글 + .app-page 바탕(2026-09-16 8단계).
  return (
    <div className="app-page">
      <PageHeader title={`${day.name} · 오늘`} back="그룹" backHref={`/groups/${id}`} />
      <main className="app-container">
      <div className="mb-5 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <span className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
            <Utensils size={14} /> 오늘 섭취
          </span>
          <p className="mt-1 text-lg font-bold tabular-nums text-zinc-950 dark:text-zinc-50">
            {hideDiet ? (
              <span className="text-sm font-bold text-zinc-400">비공개</span>
            ) : (
              <>
                {day.intake.toLocaleString()}
                <span className="ml-0.5 text-xs font-semibold text-zinc-400">kcal</span>
              </>
            )}
          </p>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
          <span className="flex items-center gap-1 text-xs font-bold text-brand">
            <Flame size={14} /> 오늘 운동 소비
          </span>
          <p className="mt-1 text-lg font-bold tabular-nums text-zinc-950 dark:text-zinc-50">
            {hideWorkout ? (
              <span className="text-sm font-bold text-zinc-400">비공개</span>
            ) : (
              <>
                {day.burned.toLocaleString()}
                <span className="ml-0.5 text-xs font-semibold text-zinc-400">kcal</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* 이번 주 훈련 — 회원이 자기 점수 화면에서 보는 것과 **같은 판정**.
          트레이너와 회원이 다른 숫자를 보고 이야기하면 안 된다. */}
      {weekly ? (
        <div className="mb-5">
          <WeeklyTrainingCard
            weekStart={weekly.weekStart}
            todayYmd={weekly.todayYmd}
            cells={weekly.cells}
            regions={weekly.regions}
            pushPull={weekly.pushPull}
            upperLower={weekly.upperLower}
            untouchedSubs={weekly.untouchedSubs}
            synergistOnlySubs={weekly.synergistOnlySubs}
            stalled={weekly.stalled}
            viewerIsOther
          />
        </div>
      ) : null}

      {/* 오늘 운동 */}
      <section className="mb-5">
        <h2 className="mb-2 flex items-center gap-1 text-sm font-bold text-zinc-500 dark:text-zinc-400">
          <Dumbbell size={15} /> 오늘 운동
        </h2>
        {hideWorkout ? (
          <p
            data-testid="hidden-workout"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 px-4 py-4 text-center text-sm text-zinc-400 dark:border-zinc-700"
          >
            <EyeOff aria-hidden="true" size={14} />
            회원이 운동 기록 제공을 꺼 뒀어요.
          </p>
        ) : day.workouts.length === 0 ? (
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
                <span className="shrink-0 text-xs font-bold tabular-nums text-brand">
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
                <figcaption className="mt-0.5 text-xs font-semibold text-zinc-500">
                  {p.meal}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : null}

        {hideDiet ? (
          <p
            data-testid="hidden-diet"
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 px-4 py-4 text-center text-sm text-zinc-400 dark:border-zinc-700"
          >
            <EyeOff aria-hidden="true" size={14} />
            회원이 식단 기록 제공을 꺼 뒀어요.
          </p>
        ) : day.foods.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-4 text-center text-sm text-zinc-400 dark:border-zinc-700">
            오늘 기록한 식단이 없어요.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
            {day.foods.map((f, i) => (
              <li key={i} className="flex items-center gap-2 px-4 py-2.5">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                  <span className="mr-1.5 rounded bg-zinc-100 px-1 py-0.5 text-xs font-semibold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
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
    </div>
  );
}
