import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ModeSelectClient, MODE_COOKIE } from "@/app/mode-select-client";

export const dynamic = "force-dynamic";

/**
 * 루트('/') — 학습모드 선택 랜딩. 앱(WebView)은 매 실행마다 '/' 를 로드하므로, 저장된
 * 모드가 있으면 **서버에서 즉시** 해당 화면으로 리다이렉트한다(클라 렌더 전이라 '모드 선택'
 * 깜빡임이 없다). 모드는 쿠키에 저장 — localStorage 만 쓰면 앱에서 가끔 값이 사라져
 * 선택 화면이 다시 뜨던 문제가 있었다. '?choose=1'(설정→운동 모드 변경) 이면 리다이렉트
 * 하지 않고 선택 화면을 보여준다.
 */
export default async function ModeSelectPage({
  searchParams,
}: {
  searchParams: Promise<{ choose?: string }>;
}) {
  const { choose } = await searchParams;
  const mode = (await cookies()).get(MODE_COOKIE)?.value;

  if (choose !== "1" && (mode === "routine" || mode === "powerlifting")) {
    redirect(mode === "powerlifting" ? "/powerlifting" : "/routine");
  }

  // 쿠키가 없을 때만 선택 UI(내부에서 예전 localStorage 값은 쿠키로 승격 후 이동).
  return <ModeSelectClient />;
}
