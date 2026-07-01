import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ModeSelectClient } from "@/app/mode-select-client";
import { getTrainingModeFromProfile } from "@/features/profile/training-mode";
import {
  isTrainingMode,
  MODE_COOKIE,
  MODE_HREF,
} from "@/features/profile/training-mode-shared";

export const dynamic = "force-dynamic";

/**
 * 루트('/') — 학습모드 선택 랜딩. 앱(WebView)은 매 실행마다 '/' 를 로드하므로, 모드가 정해져
 * 있으면 **서버에서 즉시** 해당 화면으로 리다이렉트한다(클라 렌더 전이라 '모드 선택' 깜빡임 없음).
 *
 * 3단 폴백으로 모드를 찾는다:
 *   1) 쿠키(training_mode)  2) (클라) localStorage  3) 계정 DB(profiles.training_mode)
 * 셋 중 하나라도 있으면 메인으로 보내고, 셋 다 없을 때만 선택 화면을 보여준다.
 * '?choose=1'(설정→운동 모드 변경) 이면 리다이렉트하지 않고 선택 화면을 보여준다.
 */
export default async function ModeSelectPage({
  searchParams,
}: {
  searchParams: Promise<{ choose?: string }>;
}) {
  const { choose } = await searchParams;
  if (choose === "1") return <ModeSelectClient />;

  // 1) 쿠키
  const cookieMode = (await cookies()).get(MODE_COOKIE)?.value;
  if (isTrainingMode(cookieMode)) redirect(MODE_HREF[cookieMode]);

  // 3) 계정 DB (2번 localStorage 는 서버가 못 읽어 클라에서 처리) — 있으면 바로 메인으로.
  //    (클라가 쿠키로 승격하므로 다음부턴 1번 빠른 경로를 탄다.)
  const dbMode = await getTrainingModeFromProfile();
  if (dbMode) redirect(MODE_HREF[dbMode]);

  // 쿠키·DB 모두 없음 → 클라에서 localStorage 확인(있으면 승격+이동), 없으면 선택 화면.
  return <ModeSelectClient />;
}
