"use client";

import { useEffect, useState } from "react";
import { Dumbbell, Flame, Loader2, Utensils, X } from "lucide-react";

import type { MemberDay } from "@/features/groups/data-access";
import { getGroupMemberDayAction } from "@/features/groups/proof-actions";

/**
 * 움짤 인증 피드에서 그룹원을 탭하면 뜨는 바텀시트 —
 * 그 사람의 오늘 운동·식단(섭취/소비 요약 + 운동 목록 + 끼니 사진·식단)을 예쁘게 보여준다.
 */
export function ProofMemberSheet({
  groupId,
  member,
  onClose,
}: {
  groupId: string;
  member: { userId: string; name: string };
  onClose: () => void;
}) {
  const [day, setDay] = useState<MemberDay | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getGroupMemberDayAction(groupId, member.userId)
      .then((d) => {
        if (alive) setDay(d);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [groupId, member.userId]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl dark:bg-zinc-900 sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-100 px-5 py-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100 text-sm font-black text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              {member.name.slice(0, 1)}
            </span>
            <h2 className="text-base font-black text-zinc-950 dark:text-zinc-50">
              {member.name}
              <span className="ml-1.5 text-sm font-semibold text-zinc-400">
                오늘
              </span>
            </h2>
          </div>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center py-16 text-zinc-400">
            <Loader2 aria-hidden="true" size={24} className="animate-spin" />
          </div>
        ) : !day ? (
          <p className="px-5 py-16 text-center text-sm text-zinc-500 dark:text-zinc-400">
            기록을 볼 수 없어요 (같은 그룹원만 열람 가능).
          </p>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {/* 섭취 / 소비 요약 */}
            <div className="mb-5 grid grid-cols-2 gap-2">
              <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
                <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                  <Utensils size={13} /> 오늘 섭취
                </span>
                <p className="mt-1 text-xl font-black tabular-nums text-zinc-950 dark:text-zinc-50">
                  {day.intake.toLocaleString()}
                  <span className="ml-0.5 text-xs font-semibold text-zinc-400">
                    kcal
                  </span>
                </p>
              </div>
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  <Flame size={13} /> 오늘 소비
                </span>
                <p className="mt-1 text-xl font-black tabular-nums text-zinc-950 dark:text-zinc-50">
                  {day.burned.toLocaleString()}
                  <span className="ml-0.5 text-xs font-semibold text-zinc-400">
                    kcal
                  </span>
                </p>
              </div>
            </div>

            {/* 오늘 운동 */}
            <section className="mb-5">
              <h3 className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                <Dumbbell size={14} /> 오늘 운동
              </h3>
              {day.workouts.length === 0 ? (
                <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-4 text-center text-sm text-zinc-400 dark:border-zinc-700">
                  오늘 완료한 운동이 없어요.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
                  {day.workouts.map((w, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-2 px-4 py-2.5"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                        {w.name}
                        {w.detail ? (
                          <span className="ml-1.5 text-xs font-normal text-zinc-400">
                            {w.detail}
                          </span>
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
            <section className="pb-2">
              <h3 className="mb-2 flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                <Utensils size={14} /> 오늘 식단
              </h3>
              {day.mealPhotos.length > 0 ? (
                <div className="mb-3 flex flex-wrap gap-2">
                  {day.mealPhotos.map((p, i) => (
                    <figure key={i} className="text-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={p.photoUrl}
                        alt={`${p.meal} 사진`}
                        className="h-20 w-20 rounded-xl object-cover"
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
                <ul className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
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
          </div>
        )}
      </div>
    </div>
  );
}
