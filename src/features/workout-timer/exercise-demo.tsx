"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Play } from "lucide-react";

import { primaryBodyPart } from "@/features/routine/exercise-catalog";
import {
  EXERCISE_CAUTIONS,
  fallbackPointsForBodyPart,
  type CautionPoint,
} from "@/features/workout-timer/exercise-cautions";
import { motionCategoryFor } from "@/features/workout-timer/exercise-motion";
import { ExerciseFlipbook } from "@/features/workout-timer/exercise-flipbook";
import {
  cycleDurationMs,
  phasesFor,
  type ExercisePhase,
} from "@/features/workout-timer/exercise-phases";

/**
 * 운동 가이드 — 측면뷰 플립북 스타일.
 * 상단: 단계 카드 (준비 → 내리기 → 정점 → 올리기) 가 사이클과 동기
 * 중단: 측면뷰 플랫 컬러 일러스트 (3 프레임 페이드) + 모션 화살표
 * 하단: 조심 포인트 — amber 카드 한 줄로
 */
export function ExerciseDemo({
  exerciseId,
  name,
}: {
  exerciseId: string;
  name: string;
}) {
  const phases = phasesFor(exerciseId);
  const points = pointsFor(exerciseId);
  const category = motionCategoryFor(exerciseId);
  const cycleMs = cycleDurationMs(exerciseId);

  const [phaseIdx, setPhaseIdx] = useState(0);
  const [cautionIdx, setCautionIdx] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPhaseIdx(0);
    if (phases.length <= 1) return;
    const id = window.setInterval(() => {
      setPhaseIdx((i) => (i + 1) % phases.length);
    }, cycleMs / phases.length);
    return () => window.clearInterval(id);
  }, [phases, cycleMs]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCautionIdx(0);
    if (points.length <= 1) return;
    const id = window.setInterval(() => {
      setCautionIdx((i) => (i + 1) % points.length);
    }, cycleMs);
    return () => window.clearInterval(id);
  }, [points, cycleMs]);

  if (points.length === 0 && phases.length === 0) return null;

  const phase = phases[phaseIdx];
  const cautionTip = points[cautionIdx]?.tip ?? "";

  return (
    <div className="flex w-full flex-col items-center gap-3">
      {/* 단계 카드 */}
      {phase ? (
        <PhaseCard phase={phase} index={phaseIdx} total={phases.length} />
      ) : null}

      {/* 측면뷰 플립북 일러스트 */}
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-700 bg-gradient-to-b from-zinc-800 to-zinc-900 p-3"
        style={
          {
            ["--cycle" as string]: `${cycleMs}ms`,
            aspectRatio: "1 / 1",
          } as React.CSSProperties
        }
      >
        <ExerciseFlipbook category={category} />
      </div>

      {/* 조심 카드 */}
      {points.length > 0 ? (
        <CautionTipCard
          tip={cautionTip}
          index={cautionIdx}
          total={points.length}
          key={`${name}-${cautionIdx}`}
        />
      ) : null}
    </div>
  );
}

function pointsFor(exerciseId: string): CautionPoint[] {
  const exact = EXERCISE_CAUTIONS[exerciseId];
  if (exact && exact.length > 0) return exact;
  const part = primaryBodyPart(exerciseId);
  return fallbackPointsForBodyPart(part);
}

function PhaseCard({
  phase,
  index,
  total,
}: {
  phase: ExercisePhase;
  index: number;
  total: number;
}) {
  return (
    <div
      className="w-full max-w-md rounded-2xl border border-emerald-400/40 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 px-4 py-3"
      key={`${index}-${phase.name}`}
    >
      <div className="flex items-center gap-2 text-emerald-300">
        <Play aria-hidden="true" size={12} />
        <span className="text-[10px] font-bold uppercase tracking-wider">
          단계 {index + 1} / {total}
        </span>
        <span className="ml-1 inline-flex items-center gap-1">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={`block h-1 w-3 rounded-full ${
                i === index ? "bg-emerald-300" : "bg-emerald-300/25"
              }`}
            />
          ))}
        </span>
      </div>
      <h3 className="mt-1 animate-[fadeUp_350ms_ease-out] text-lg font-bold text-white">
        {phase.name}
      </h3>
      <p className="mt-0.5 animate-[fadeUp_400ms_ease-out] text-sm leading-6 text-emerald-50/90">
        {phase.instruction}
      </p>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function CautionTipCard({
  tip,
  index,
  total,
}: {
  tip: string;
  index: number;
  total: number;
}) {
  return (
    <div className="w-full max-w-md rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-2.5">
      <div className="flex items-center gap-2 text-amber-300">
        <AlertTriangle aria-hidden="true" size={12} />
        <span className="text-[10px] font-bold uppercase tracking-wide">
          조심 {index + 1} / {total}
        </span>
      </div>
      <p className="mt-0.5 animate-[fadeUp_350ms_ease-out] text-sm leading-6 text-amber-50/95">
        {tip}
      </p>
    </div>
  );
}
