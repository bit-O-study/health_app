"use client";

import { useEffect, useState } from "react";
import { Eye } from "lucide-react";

import { exercisePhotoFrames } from "@/features/workout-timer/exercise-photo-map";
import { focusForStep } from "@/features/workout-timer/exercise-focus";

/**
 * 실사 시연 데모 — free-exercise-db(퍼블릭도메인)의 시작/끝 2프레임 사진을 부드럽게
 * 교차 재생. 매핑이 없으면 null. (방법 문구가 없는 운동용)
 */
export function ExercisePhotoDemo({
  exerciseId,
  equipment,
  cycleMs = 2600,
}: {
  exerciseId: string;
  equipment?: string;
  cycleMs?: number;
}) {
  const frames = exercisePhotoFrames(exerciseId, equipment);
  if (!frames) return null;
  const [a, b] = frames;
  return (
    <div className="w-full max-w-lg">
      <div
        className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800"
        style={{ ["--ex-cycle" as string]: `${cycleMs}ms` }}
      >
        <img src={a} alt="" loading="eager" decoding="async" className="ex-photo-a absolute inset-0 h-full w-full object-cover" />
        <img src={b} alt="" loading="eager" decoding="async" className="ex-photo-b absolute inset-0 h-full w-full object-cover" />
        <span className="absolute bottom-2 right-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
          실제 동작
        </span>
      </div>
    </div>
  );
}

/**
 * 튜토리얼 "영상" — 실사 사진 위에 방법/주의 문구(steps)를 한 장면씩 넘긴다.
 * 1번 문구 → 한 장면, 2번 → 다음 장면 … 자동 전환(루프) + 진행 점.
 * 앞쪽 단계(셋업)는 시작 프레임, 뒤쪽 단계(실행)는 끝 프레임 사진으로 동기화.
 * 사진 매핑이 없으면 사진 없이 그라데이션 배경 위에 문구 장면만.
 */
export function ExerciseTutorial({
  frames,
  steps,
  perStepMs = 3200,
}: {
  /** 시연 사진 2프레임(시작/끝). null 이면 사진 없이 그라데이션 위 문구만. */
  frames: [string, string] | null;
  steps: string[];
  perStepMs?: number;
}) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    // 단계 배열이 바뀌면 첫 단계부터 — 의도된 리셋.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(0);
    if (steps.length <= 1) return;
    const id = window.setInterval(
      () => setActive((i) => (i + 1) % steps.length),
      perStepMs,
    );
    return () => window.clearInterval(id);
  }, [steps, perStepMs]);

  // 앞 절반 = 시작 프레임, 뒤 절반 = 끝 프레임.
  const useEnd = steps.length > 1 && active >= Math.ceil(steps.length / 2);

  // 이 단계가 가리키는 신체 부위 — 사진 위 라벨로 "어디를 볼지" 안내한다.
  // (사진마다 프레임/해상도가 달라 부위로 확대하면 흐려지거나 엉뚱한 곳을 가리켜서,
  //  확대 대신 선명한 전체 사진 + 부위 라벨로 안내한다.)
  const focus = steps.length > 0 ? focusForStep(steps[active]) : null;

  return (
    <div className="w-full max-w-lg">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-indigo-100 to-cyan-100 dark:border-zinc-700 dark:from-zinc-800 dark:to-zinc-900">
        {frames ? (
          <>
            <img
              src={frames[0]}
              alt=""
              loading="eager"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out"
              style={{ opacity: useEnd ? 0 : 1 }}
            />
            <img
              src={frames[1]}
              alt=""
              loading="eager"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out"
              style={{ opacity: useEnd ? 1 : 0 }}
            />
          </>
        ) : null}

        {/* 부위 안내 배지 — 이 단계가 어느 부위를 보는지 라벨로(좌표 확대 X, 선명 유지). */}
        {focus ? (
          <span
            key={`focus-${active}`}
            data-testid="ex-focus-marker"
            data-part={focus.part}
            className="ex-cap absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-emerald-500/95 px-2.5 py-1 text-[11px] font-extrabold text-white shadow-lg backdrop-blur-sm"
          >
            <Eye size={12} aria-hidden="true" />
            {focus.part}
          </span>
        ) : null}

        {/* 자막 가독성용 하단 그라데이션 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/80 via-black/45 to-transparent" />

        {/* 단계 자막 장면 — active 가 바뀔 때마다 페이드인업 */}
        {steps.length > 0 ? (
          <div key={active} className="ex-cap absolute inset-x-0 bottom-0 p-4">
            <div className="flex items-start gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-extrabold text-white shadow">
                {active + 1}
              </span>
              <p className="text-[15px] font-semibold leading-snug text-white drop-shadow sm:text-base">
                {steps[active]}
              </p>
            </div>
            {/* 진행 점 */}
            <div className="mt-2.5 flex items-center gap-1.5 pl-[34px]">
              {steps.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === active ? "w-5 bg-emerald-400" : "w-1.5 bg-white/45"
                  }`}
                />
              ))}
            </div>
          </div>
        ) : null}

        <span className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
          {frames ? "실제 동작" : "동작 가이드"}
        </span>
      </div>
    </div>
  );
}
