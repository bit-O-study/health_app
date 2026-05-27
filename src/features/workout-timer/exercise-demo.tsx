"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Hand,
  Lightbulb,
  Play,
  Target,
} from "lucide-react";

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
import { guideFor } from "@/features/workout-timer/exercise-guides";

/**
 * 초보자용 종합 코칭 패널.
 * 섹션:
 * 1. 측면뷰 일러스트 + 현재 단계 안내 (애니메이션 동기)
 * 2. 🤚 그립·세팅 (어디 어떻게 잡는가)
 * 3. 🎯 자극이 와야 할 부위 (펌핑 느낌 설명)
 * 4. ⚠ 조심 포인트 (강조 마커 + 순환 텍스트)
 * 5. 💡 초보 팁
 */
export function ExerciseDemo({
  exerciseId,
}: {
  exerciseId: string;
  name: string;
}) {
  const phases = phasesFor(exerciseId);
  const points = pointsFor(exerciseId);
  const category = motionCategoryFor(exerciseId);
  const cycleMs = cycleDurationMs(exerciseId);
  const guide = guideFor(exerciseId);

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

  if (!guide && points.length === 0 && phases.length === 0) return null;

  const phase = phases[phaseIdx];
  const cautionTip = points[cautionIdx]?.tip ?? "";

  return (
    <div className="flex w-full flex-col gap-3">
      {/* 일러스트 + 단계 카드 */}
      <div className="flex flex-col items-center gap-3">
        {phase ? (
          <PhaseCard phase={phase} index={phaseIdx} total={phases.length} />
        ) : null}
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
      </div>

      {/* 그립·세팅 */}
      {guide ? (
        <Section
          icon={<Hand aria-hidden="true" size={14} />}
          label="그립 · 세팅"
          tone="zinc"
        >
          <p className="text-sm leading-6 text-zinc-200">{guide.setup}</p>
        </Section>
      ) : null}

      {/* 자극 부위 */}
      {guide && guide.targets.length > 0 ? (
        <Section
          icon={<Target aria-hidden="true" size={14} />}
          label="자극이 와야 할 부위"
          tone="emerald"
        >
          <ul className="space-y-2">
            {guide.targets.map((t, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-6">
                <span className="mt-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                <div>
                  <strong className="text-emerald-200">{t.name}</strong>
                  <span className="text-zinc-300"> — {t.feel}</span>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {/* 조심 — 강조 텍스트 + 마커는 일러스트 옆에 있어야 하지만 여기선 텍스트만 */}
      {points.length > 0 ? (
        <Section
          icon={<AlertTriangle aria-hidden="true" size={14} />}
          label={`조심 (${cautionIdx + 1}/${points.length} 순환)`}
          tone="amber"
        >
          <p
            key={cautionTip}
            className="animate-[fadeUp_350ms_ease-out] text-sm leading-6 text-amber-50"
          >
            {cautionTip}
          </p>
          <style>{`
            @keyframes fadeUp { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform: translateY(0); } }
          `}</style>
        </Section>
      ) : null}

      {/* 초보 팁 */}
      {guide && guide.beginnerTips.length > 0 ? (
        <Section
          icon={<Lightbulb aria-hidden="true" size={14} />}
          label="초보 팁"
          tone="sky"
        >
          <ul className="space-y-1.5">
            {guide.beginnerTips.map((t, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm leading-6 text-zinc-200"
              >
                <span className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-sky-400" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </Section>
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

/** 섹션 카드 — 톤(컬러) 별 보더·배경. */
function Section({
  icon,
  label,
  tone,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "zinc" | "emerald" | "amber" | "sky";
  children: React.ReactNode;
}) {
  const tones = {
    zinc: "border-zinc-700 bg-zinc-800/40 text-zinc-300",
    emerald: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
    amber: "border-amber-400/40 bg-amber-500/10 text-amber-300",
    sky: "border-sky-400/40 bg-sky-500/10 text-sky-300",
  };
  return (
    <div
      className={`w-full max-w-md rounded-2xl border px-4 py-3 ${tones[tone]}`}
    >
      <div className="mb-1.5 flex items-center gap-1.5">
        {icon}
        <span className="text-[11px] font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

/** 동작 단계 카드 — 일러스트 위에 큰 글씨로. */
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
      className="w-full max-w-md rounded-2xl border border-emerald-400/50 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 px-4 py-3"
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
        @keyframes fadeUp { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
