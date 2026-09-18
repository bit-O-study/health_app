import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  getGroupMemberDay,
  getGroupMemberWeeklyTraining,
} from "@/features/groups/data-access";
import { WeeklyTrainingCard } from "@/features/routine/components/weekly-training-card";

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
      <div className="app-page">
        <PageHeader title="그룹원 기록" back="그룹으로" backHref={`/groups/${id}`} />
        <main className="app-container">
          <p className="app-card p-3 text-center text-sm text-zinc-500 dark:text-zinc-400">
            기록을 볼 수 없어요(같은 그룹원만 열람 가능).
          </p>
        </main>
      </div>
    );
  }

  // 공통 머리글 + 요약 한 장(두 칸) + 섹션 라벨·그룹 목록(2026-09-16 8단계).
  return (
    <div className="app-page">
    <PageHeader title={`${day.name} · 오늘`} back="그룹으로" backHref={`/groups/${id}`} />
    <main className="app-container space-y-4">
      <div className="app-list">
        <div className="grid grid-cols-2 divide-x divide-[var(--line)] py-2.5 text-center">
          <div className="min-w-0 px-2">
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">오늘 섭취</p>
            <p className="mt-0.5 truncate text-base font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
              {day.intake.toLocaleString()}
              <span className="ml-0.5 text-xs font-medium text-zinc-400">kcal</span>
            </p>
          </div>
          <div className="min-w-0 px-2">
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">오늘 운동 소비</p>
            <p className="mt-0.5 truncate text-base font-semibold tabular-nums text-brand">
              {day.burned.toLocaleString()}
              <span className="ml-0.5 text-xs font-medium text-zinc-400">kcal</span>
            </p>
          </div>
        </div>
      </div>

      {/* 이번 주 훈련 — 회원이 자기 점수 화면에서 보는 것과 **같은 판정**.
          트레이너와 회원이 다른 숫자를 보고 이야기하면 안 된다. */}
      {weekly ? (
        <div>
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
      <section>
        <h2 className="app-section-label">오늘 운동</h2>
        {day.workouts.length === 0 ? (
          <p className="app-card p-3 text-center text-sm text-zinc-400">
            오늘 완료한 운동이 없어요.
          </p>
        ) : (
          <ul className="app-list">
            {day.workouts.map((w, i) => (
              <li key={i} className="app-row min-h-[2.75rem] justify-between">
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-900 dark:text-zinc-100">
                  {w.name}
                  {w.detail ? (
                    <span className="ml-1.5 text-xs font-normal text-zinc-400">{w.detail}</span>
                  ) : null}
                </span>
                <span className="shrink-0 text-sm tabular-nums text-brand">
                  {w.kcal}kcal
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 오늘 식단 */}
      <section>
        <h2 className="app-section-label">오늘 식단</h2>
        {/* 끼니별 사진 */}
        {day.mealPhotos.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {day.mealPhotos.map((p, i) => (
              <figure key={i} className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.photoUrl}
                  alt={`${p.meal} 사진`}
                  className="h-20 w-20 rounded-xl object-cover"
                />
                <figcaption className="mt-0.5 text-xs text-zinc-500">
                  {p.meal}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : null}

        {day.foods.length === 0 ? (
          <p className="app-card p-3 text-center text-sm text-zinc-400">
            오늘 기록한 식단이 없어요.
          </p>
        ) : (
          <ul className="app-list">
            {day.foods.map((f, i) => (
              <li key={i} className="app-row min-h-[2.75rem] justify-between">
                <span className="min-w-0 flex-1 truncate text-sm text-zinc-900 dark:text-zinc-100">
                  <span className="mr-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                    {f.meal}
                  </span>
                  {f.name}
                </span>
                <span className="shrink-0 text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
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
