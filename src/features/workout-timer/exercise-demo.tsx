"use client";

import { motionCategoryFor } from "@/features/workout-timer/exercise-motion";
import { ExerciseFlipbook } from "@/features/workout-timer/exercise-flipbook";
import { cycleDurationMs } from "@/features/workout-timer/exercise-phases";

/**
 * 운동 가이드 — 그림으로만. 텍스트 X.
 * - 큰 측면뷰 일러스트 + 시각 코칭 오버레이 (잡는 위치 / 모션 방향 / 자극 부위 / 조심)
 * - 하단에 작은 범례 (시각 마커 색이 뭘 의미하는지)
 */
export function ExerciseDemo({
  exerciseId,
}: {
  exerciseId: string;
  name: string;
}) {
  const category = motionCategoryFor(exerciseId);
  const cycleMs = cycleDurationMs(exerciseId);

  return (
    <div className="flex w-full flex-col items-center gap-2">
      {/* 측면뷰 일러스트 — 모든 시각 마커가 이 안에 들어있음 */}
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-700 bg-gradient-to-b from-zinc-800 to-zinc-900 p-4"
        style={
          {
            ["--cycle" as string]: `${cycleMs}ms`,
            aspectRatio: "1 / 1",
          } as React.CSSProperties
        }
      >
        <ExerciseFlipbook category={category} />
      </div>

      {/* 범례 — 마커 색이 뭘 의미하는지 작게 (텍스트 최소화) */}
      <Legend />
    </div>
  );
}

function Legend() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 text-[10px] text-zinc-400">
      <LegendItem color="#10b981" label="잡는 위치" shape="ring" />
      <LegendItem color="#34d399" label="동작 방향" shape="arrow" />
      <LegendItem color="#ef4444" label="자극 부위" shape="glow" />
      <LegendItem color="#facc15" label="조심" shape="x" />
    </div>
  );
}

function LegendItem({
  color,
  label,
  shape,
}: {
  color: string;
  label: string;
  shape: "ring" | "arrow" | "glow" | "x";
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="14" height="14" viewBox="0 0 14 14">
        {shape === "ring" ? (
          <circle cx="7" cy="7" r="4" fill="none" stroke={color} strokeWidth="1.5" />
        ) : shape === "arrow" ? (
          <g stroke={color} strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <line x1="7" y1="2" x2="7" y2="12" />
            <polyline points="4,5 7,2 10,5" />
          </g>
        ) : shape === "glow" ? (
          <circle cx="7" cy="7" r="5" fill={color} opacity="0.6" />
        ) : (
          <g>
            <circle cx="7" cy="7" r="5" fill="#1f1f23" stroke={color} strokeWidth="1.5" />
            <line x1="5" y1="5" x2="9" y2="9" stroke={color} strokeWidth="1.5" />
            <line x1="9" y1="5" x2="5" y2="9" stroke={color} strokeWidth="1.5" />
          </g>
        )}
      </svg>
      <span>{label}</span>
    </span>
  );
}
