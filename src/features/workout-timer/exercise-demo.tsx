"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Play } from "lucide-react";

import { primaryBodyPart } from "@/features/routine/exercise-catalog";
import {
  EXERCISE_CAUTIONS,
  fallbackPointsForBodyPart,
  type CautionPoint,
} from "@/features/workout-timer/exercise-cautions";
import {
  motionCategoryFor,
  MotionFigure,
} from "@/features/workout-timer/exercise-motion";
import {
  cycleDurationMs,
  musclesFor,
  phasesFor,
  type ExercisePhase,
  type MuscleLabel,
} from "@/features/workout-timer/exercise-phases";

/**
 * 운동 가이드 — 근육TV 스타일.
 * - 상단: 단계 카드 (준비 → 내리기 → 정점 → 올리기) 가 동작 사이클과 동기로 순환
 * - 중단: 인체 일러스트 + 활성 근육 콜아웃 라벨 (좌·우에 명칭) + 조심 마커
 * - 하단: 현재 강조된 조심 포인트의 주의사항
 */
export function ExerciseDemo({
  exerciseId,
  name,
}: {
  exerciseId: string;
  name: string;
}) {
  const phases = phasesFor(exerciseId);
  const muscles = musclesFor(exerciseId);
  const points = pointsFor(exerciseId);
  const category = motionCategoryFor(exerciseId);
  const cycleMs = cycleDurationMs(exerciseId);

  // 단계 — 사이클 동안 phases 개수 만큼 순환 (animation 과 sync)
  const [phaseIdx, setPhaseIdx] = useState(0);
  // 조심 마커 — 그보다 약간 느린 페이스 (사이클 1회당 1개씩)
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
      {/* 단계 카드 — 현재 동작 안내 */}
      {phase ? <PhaseCard phase={phase} index={phaseIdx} total={phases.length} /> : null}

      {/* 인체 일러스트 + 근육 라벨 + 조심 마커 — 가로로 충분히 넓게 */}
      <div
        className="relative mx-auto"
        style={{ width: "min(100%, 22rem)", aspectRatio: "100 / 160" }}
      >
        {/* 일러스트 (figure) */}
        <div
          className="absolute"
          style={{ left: "30%", right: "30%", top: 0, bottom: 0 }}
        >
          <MotionFigure category={category} />
        </div>
        {/* 근육 콜아웃 (figure 좌·우 영역 활용) */}
        <MuscleCallouts muscles={muscles} />
        {/* 조심 마커 — figure 영역(중앙 40%) 위에 비례 위치 */}
        {points.map((p, i) => (
          <CautionMarker
            key={`${name}-${i}`}
            point={p}
            isActive={i === cautionIdx}
          />
        ))}
      </div>

      {/* 하단 조심 카드 */}
      {points.length > 0 ? (
        <CautionTipCard
          tip={cautionTip}
          index={cautionIdx}
          total={points.length}
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

/** 단계 안내 카드 — 큰 글씨로 현재 phase 표시. fade in 애니메이션. */
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
        <span className="ml-1 inline-flex items-center gap-1 text-[10px] text-emerald-200/70">
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

/**
 * 근육 라벨 콜아웃 — figure 양옆에 텍스트 배치 + 가는 라인으로 근육 위치 가리킴.
 * 부모 컨테이너의 좌측 30% / 우측 30% 영역을 텍스트 공간으로 사용.
 */
function MuscleCallouts({ muscles }: { muscles: MuscleLabel[] }) {
  if (muscles.length === 0) return null;
  return (
    <svg
      className="pointer-events-none absolute inset-0"
      viewBox="0 0 100 160"
      preserveAspectRatio="none"
    >
      {muscles.map((m, i) => {
        // figure 는 viewBox 의 30~70% 영역 (좌우 30% 는 텍스트용)
        const muscleX = 30 + (m.x * 40) / 100; // figure 영역 내 % → 전체 viewBox %
        const muscleY = m.y;
        // 텍스트 위치 — 좌(0~28%) 또는 우(72~100%)
        const tx = m.align === "left" ? 26 : 74;
        const ty = m.textY;
        return (
          <g key={i}>
            {/* 콜아웃 라인 */}
            <line
              x1={tx}
              y1={ty}
              x2={muscleX}
              y2={muscleY}
              stroke="#34d399"
              strokeWidth="0.4"
              strokeDasharray="1 1"
              opacity="0.7"
            />
            {/* 라벨 끝 dot — 근육 위치 */}
            <circle cx={muscleX} cy={muscleY} r="1.2" fill="#34d399" />
            {/* 텍스트 — figure 측면 */}
            <text
              x={tx}
              y={ty + 0.5}
              fontSize="3.6"
              fontWeight="700"
              fill="#6ee7b7"
              textAnchor={m.align === "left" ? "end" : "start"}
              dominantBaseline="middle"
            >
              {m.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * 조심 포인트 마커 — figure 영역(부모의 30~70%) 안에 비례 위치.
 */
function CautionMarker({
  point,
  isActive,
}: {
  point: CautionPoint;
  isActive: boolean;
}) {
  // figure 는 부모의 30~70% 영역 → x 변환: 부모 % = 30 + figure % * 0.4
  const parentX = 30 + (point.x * 40) / 100;
  return (
    <div
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${parentX}%`, top: `${point.y}%` }}
    >
      <div
        className={`flex items-center justify-center rounded-full border-2 transition-all duration-500 ${
          isActive
            ? "h-7 w-7 border-amber-300 bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.7)]"
            : "h-4 w-4 border-amber-400/60 bg-amber-500/40 text-amber-100"
        } ${isActive ? "animate-[pulseMarker_1.2s_ease-in-out_infinite]" : ""}`}
      >
        <AlertTriangle aria-hidden="true" size={isActive ? 12 : 8} />
      </div>
      <style>{`
        @keyframes pulseMarker {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

/** 활성 마커의 tip 카드 (조심 사항). */
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
    <div
      key={tip}
      className="w-full max-w-md rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-2.5"
    >
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
