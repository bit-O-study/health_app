"use client";

import dynamic from "next/dynamic";

// react-body-highlighter 는 클라이언트 전용(가이드 오버레이도 ssr:false 로 로드).
// 서버 컴포넌트인 운동 상세 페이지에서 바로 렌더하면 SSR 이 깨질 수 있어,
// 이 클라이언트 래퍼에서 ssr:false 로 동적 로드한다.
const MuscleBodyStatic = dynamic(
  () =>
    import("@/features/workout-timer/muscle-body-view").then(
      (m) => m.MuscleBodyStatic,
    ),
  {
    ssr: false,
    loading: () => (
      <div
        aria-hidden="true"
        className="min-h-[72px] w-full animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"
      />
    ),
  },
);

/**
 * 운동 상세/라이브러리용 — 자극 근육을 인체(앞·뒤)에 색칠해 위치로 보여준다.
 * react-body-highlighter 는 클라이언트 전용이라 ssr:false 로 동적 로드한다.
 */
export function ExerciseMuscleMap({
  exerciseId,
  name,
  width,
  anteriorOnly,
}: {
  exerciseId: string;
  name?: string;
  width?: number;
  anteriorOnly?: boolean;
}) {
  return (
    <MuscleBodyStatic
      exerciseId={exerciseId}
      name={name}
      width={width}
      anteriorOnly={anteriorOnly}
    />
  );
}
