"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { primaryBodyPart } from "@/features/routine/exercise-catalog";
import {
  EXERCISE_CAUTIONS,
  fallbackPointsForBodyPart,
  type CautionPoint,
} from "@/features/workout-timer/exercise-cautions";

/**
 * 본운동 데모 — 운동별 "조심해야 할 부위" 펄스 마커 + 주의사항 카드 순환.
 * 마네킹 대신 단순한 인체 실루엣 위에 마커를 배치, 마커별 tip 이 아래에서 강조 순환.
 */
export function ExerciseDemo({
  exerciseId,
  name,
}: {
  exerciseId: string;
  name: string;
}) {
  const points = pointsFor(exerciseId);

  // 활성화된 마커 (강조 펄스) — 2.5초마다 다음. Hooks 는 무조건 호출되어야 하므로 조건부 return 위에.
  const [active, setActive] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(0);
    if (points.length <= 1) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % points.length);
    }, 2500);
    return () => window.clearInterval(id);
  }, [points]);

  if (points.length === 0) {
    return null;
  }

  const activeTip = points[active]?.tip ?? "";

  return (
    <div className="flex w-full max-w-sm flex-col items-center">
      <div className="relative h-56 w-40 sm:h-64 sm:w-44">
        <SilhouetteFigure />
        {points.map((p, i) => (
          <CautionMarker
            key={`${name}-${i}`}
            point={p}
            isActive={i === active}
          />
        ))}
      </div>
      <CautionTipCard tip={activeTip} index={active} total={points.length} />
    </div>
  );
}

function pointsFor(exerciseId: string): CautionPoint[] {
  const exact = EXERCISE_CAUTIONS[exerciseId];
  if (exact && exact.length > 0) return exact;
  // 운동 카탈로그에서 1차 부위 → fallback 마커
  const part = primaryBodyPart(exerciseId);
  return fallbackPointsForBodyPart(part);
}

/** 운동 캔버스로 쓰는 정면 인체 실루엣. 단순·중성색 — 마네킹과 다른 톤. */
function SilhouetteFigure() {
  return (
    <svg
      viewBox="0 0 100 160"
      className="h-full w-full"
      role="img"
      aria-label="인체 실루엣"
      fill="#27272a"
      stroke="#3f3f46"
      strokeWidth="0.8"
    >
      {/* 머리 */}
      <circle cx="50" cy="14" r="10" />
      {/* 목 */}
      <rect x="46" y="22" width="8" height="6" />
      {/* 어깨선 — 등쪽 윤곽 살리기 위해 둥근 사다리꼴 */}
      <path d="M30 32 Q50 26 70 32 L66 42 Q50 38 34 42 Z" />
      {/* 상체 */}
      <rect x="34" y="40" width="32" height="36" rx="3" />
      {/* 팔 */}
      <rect x="22" y="34" width="8" height="40" rx="4" />
      <rect x="70" y="34" width="8" height="40" rx="4" />
      {/* 전완 */}
      <rect x="22" y="72" width="8" height="22" rx="4" fill="#1f1f23" />
      <rect x="70" y="72" width="8" height="22" rx="4" fill="#1f1f23" />
      {/* 골반 */}
      <rect x="36" y="76" width="28" height="14" rx="3" />
      {/* 허벅지 */}
      <rect x="36" y="90" width="12" height="40" rx="3" />
      <rect x="52" y="90" width="12" height="40" rx="3" />
      {/* 종아리 */}
      <rect x="36" y="130" width="12" height="22" rx="3" fill="#1f1f23" />
      <rect x="52" y="130" width="12" height="22" rx="3" fill="#1f1f23" />
    </svg>
  );
}

/**
 * 조심 포인트 마커 — 절대 위치 (% 기준). 활성일 때 더 크게 + 펄스 글로우 + 라벨 노출.
 */
function CautionMarker({
  point,
  isActive,
}: {
  point: CautionPoint;
  isActive: boolean;
}) {
  return (
    <div
      className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: `${point.x}%`, top: `${point.y}%` }}
    >
      <div
        className={`flex items-center justify-center rounded-full border-2 transition-all duration-500 ${
          isActive
            ? "h-8 w-8 border-amber-300 bg-amber-500 text-white shadow-[0_0_24px_rgba(245,158,11,0.7)]"
            : "h-5 w-5 border-amber-400/60 bg-amber-500/40 text-amber-100"
        } ${isActive ? "animate-[pulseMarker_1.2s_ease-in-out_infinite]" : ""}`}
      >
        <AlertTriangle aria-hidden="true" size={isActive ? 14 : 10} />
      </div>
      {isActive ? (
        <span className="absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
          {point.label}
        </span>
      ) : null}
      <style>{`
        @keyframes pulseMarker {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.18); }
        }
      `}</style>
    </div>
  );
}

/** 활성 마커의 tip 을 큰 카드로 표시 + 진행 인디케이터. */
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
    <div className="mt-4 w-full max-w-md rounded-2xl border border-amber-400/40 bg-amber-500/10 px-4 py-3">
      <div className="flex items-center gap-2 text-amber-300">
        <AlertTriangle aria-hidden="true" size={14} />
        <span className="text-[10px] font-bold uppercase tracking-wide">
          조심 {index + 1} / {total}
        </span>
      </div>
      <p
        key={tip}
        className="mt-1 animate-[fadeUp_400ms_ease-out] text-sm leading-6 text-amber-50"
      >
        {tip}
      </p>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
