"use client";

import Model, { type IExerciseData, type Muscle } from "react-body-highlighter";
import { X } from "lucide-react";

// 이름·타깃을 인자로 받는 쪽을 쓴다 — id 만으로 찾으면 운동 목록(274 KiB)을 뒤져야 하고,
// 그러면 이 인체 그림 하나 때문에 운동모드 화면에 카탈로그가 통째로 실린다.
import { subMusclesForExerciseData } from "@/features/routine/sub-muscles";
import { musclesForKoreanNames } from "@/features/workout-timer/muscle-body-map";

/** 우리 세부 근육 id → react-body-highlighter 의 근육명. */
const SUB_TO_MUSCLE: Record<string, Muscle> = {
  "chest-upper": "chest",
  "chest-mid": "chest",
  "chest-lower": "chest",
  "chest-inner": "chest",
  "back-lats": "upper-back",
  "back-rhomboids": "upper-back",
  "back-traps": "trapezius",
  "back-erector": "lower-back",
  "shoulder-front": "front-deltoids",
  "shoulder-side": "front-deltoids",
  "shoulder-rear": "back-deltoids",
  "arm-biceps-long": "biceps",
  "arm-biceps-short": "biceps",
  "arm-triceps-long": "triceps",
  "arm-triceps-lateral": "triceps",
  "arm-triceps-medial": "triceps",
  "arm-forearm": "forearm",
  "lower-quads": "quadriceps",
  "lower-hamstrings": "hamstring",
  "lower-glutes": "gluteal",
  "lower-adductors": "adductor",
  "lower-calves": "calves",
  "core-upper-abs": "abs",
  "core-lower-abs": "abs",
  "core-obliques": "obliques",
};

const HILITE = ["#34d399"]; // emerald-400 (빈도 1 = index 0)
const BODY = "#d4d4d8"; // zinc-300 — 비자극 근육 기본색

/** 운동의 자극 근육(react-body-highlighter 명칭, 중복 제거). */
export function musclesForExerciseBody(
  exerciseId: string,
  name: string,
  target: string,
): Muscle[] {
  const set = new Set<Muscle>();
  for (const s of subMusclesForExerciseData(exerciseId, name, target)) {
    const m = SUB_TO_MUSCLE[s.id];
    if (m) set.add(m);
  }
  return [...set];
}

/** 여러 근육명을 앞·뒤 인체에 색칠(루틴 일자 요약 '자극 부위'용, 소형). */
export function MuscleBodyByNames({
  names,
  width = 44,
}: {
  names: readonly string[];
  width?: number;
}) {
  const data: IExerciseData[] = [
    { name: "day", muscles: musclesForKoreanNames(names) },
  ];
  return (
    <div className="flex items-end justify-start gap-1.5">
      <Model
        data={data}
        type="anterior"
        highlightedColors={HILITE}
        bodyColor={BODY}
        style={{ width }}
      />
      <Model
        data={data}
        type="posterior"
        highlightedColors={HILITE}
        bodyColor={BODY}
        style={{ width }}
      />
    </div>
  );
}

/** 실사풍 인체(정면) 작은 미리보기 — 자극 근육 색칠. 탭하면 앞·뒤 크게. */
export function MuscleBodyInset({
  exerciseId,
  name,
  target,
  onOpen,
}: {
  exerciseId: string;
  name: string;
  /** 자극 부위 문구 — 세부근육 추론에 쓴다(서버가 큐에 넣어 내려준다). */
  target: string;
  onOpen: () => void;
}) {
  const data: IExerciseData[] = [
    { name: "x", muscles: musclesForExerciseBody(exerciseId, name, target) },
  ];
  return (
    <button
      type="button"
      aria-label="자극 부위 크게 보기"
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      onClick={onOpen}
      className="absolute bottom-2 left-2 z-10 flex flex-col items-center rounded-xl bg-black/55 px-2 pb-1 pt-0.5 backdrop-blur-sm transition hover:bg-black/70"
    >
      <span className="text-[9px] font-bold text-white/90">자극 부위</span>
      <Model
        data={data}
        type="anterior"
        highlightedColors={HILITE}
        bodyColor={BODY}
        style={{ width: 40 }}
      />
    </button>
  );
}

/** 자극 근육을 앞·뒤 실사풍 인체로 크게 보여주는 모달. */
export function MuscleBodyModal({
  exerciseId,
  name,
  target,
  onClose,
}: {
  exerciseId: string;
  name: string;
  /** 자극 부위 문구 — 세부근육 추론에 쓴다(서버가 큐에 넣어 내려준다). */
  target: string;
  onClose: () => void;
}) {
  const data: IExerciseData[] = [
    { name, muscles: musclesForExerciseBody(exerciseId, name, target) },
  ];
  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-zinc-950">
      <div className="flex items-center justify-between px-4 pb-2 pt-[max(env(safe-area-inset-top),1rem)]">
        <span className="text-base font-bold text-zinc-100">
          {name} · 자극 부위
        </span>
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-zinc-200 transition hover:bg-zinc-700"
        >
          <X aria-hidden="true" size={18} />
        </button>
      </div>
      <div className="flex flex-1 items-center justify-center gap-3 overflow-auto p-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
        <figure className="flex flex-col items-center gap-1">
          <Model
            data={data}
            type="anterior"
            highlightedColors={HILITE}
            bodyColor={BODY}
            style={{ width: "min(42vw, 200px)" }}
          />
          <figcaption className="text-xs font-semibold text-zinc-400">앞</figcaption>
        </figure>
        <figure className="flex flex-col items-center gap-1">
          <Model
            data={data}
            type="posterior"
            highlightedColors={HILITE}
            bodyColor={BODY}
            style={{ width: "min(42vw, 200px)" }}
          />
          <figcaption className="text-xs font-semibold text-zinc-400">뒤</figcaption>
        </figure>
      </div>
    </div>
  );
}
