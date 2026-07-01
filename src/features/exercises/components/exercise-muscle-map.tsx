"use client";

import dynamic from "next/dynamic";

// react-body-highlighter 는 클라이언트 전용(가이드 오버레이도 ssr:false 로 로드).
// 서버 컴포넌트(루틴 홈)에서 바로 렌더하면 SSR 이 깨질 수 있어 ssr:false 로 동적 로드한다.
const MuscleBodyByNames = dynamic(
  () =>
    import("@/features/workout-timer/muscle-body-view").then(
      (m) => m.MuscleBodyByNames,
    ),
  {
    ssr: false,
    // 회색 자리표시 없이, 레이아웃만 잡아두는 투명 박스.
    loading: () => <div aria-hidden="true" className="h-[92px] w-[104px]" />,
  },
);

/** 루틴 일자 요약 '자극 부위'용 — 그날 자극 근육 이름들을 인체(앞·뒤)에 색칠. */
export function DayMuscleMap({
  names,
  width,
}: {
  names: readonly string[];
  width?: number;
}) {
  return <MuscleBodyByNames names={names} width={width} />;
}
