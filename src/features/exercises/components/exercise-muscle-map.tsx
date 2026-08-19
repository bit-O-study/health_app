import { MuscleBodyByNames } from "@/features/workout-timer/muscle-body-view";

/**
 * 루틴 일자 요약 '자극 부위'용 — 그날 자극 근육 이름들을 인체(앞·뒤)에 색칠.
 *
 * 예전엔 `dynamic(..., { ssr: false })` 로 클라이언트에서만 그렸다. 그래서 운동탭이
 * **인체 그림만 빈 칸인 채로 먼저 뜨고** 잠시 뒤 툭 나타났다(반쯤 로딩된 화면).
 * react-body-highlighter 는 SVG 만 그리고 window/document 를 쓰지 않아 서버 렌더가
 * 되므로, 그냥 같이 렌더해 **화면이 한 번에 완성된 상태로** 도착하게 한다.
 */
export function DayMuscleMap({
  names,
  width,
}: {
  names: readonly string[];
  width?: number;
}) {
  return <MuscleBodyByNames names={names} width={width} />;
}
