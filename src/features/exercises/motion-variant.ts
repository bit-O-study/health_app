/**
 * 누끼 시범 영상은 운동모드 배경색에 맞춘 두 벌(라이트 ID.mp4 / 다크 ID-dark.mp4)이다.
 * 테마를 아직 모르면(서버 렌더·하이드레이션 직후) src 를 비워 두어 엉뚱한 영상을 받지 않는다.
 */
export function pickMotionSource(
  url: string,
  darkUrl: string | undefined,
  isDark: boolean | null,
): string | undefined {
  if (!darkUrl) return url;
  if (isDark === null) return undefined;
  return isDark ? darkUrl : url;
}

/** 검토 통과 v3 누끼 영상의 다크 버전 경로. */
export function motionDarkUrl(exerciseId: string): string {
  return `/exercise-guides/ai-v3/${exerciseId}-dark.mp4`;
}
