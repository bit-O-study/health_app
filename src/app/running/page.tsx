import type { Metadata } from "next";

import { RunningMobileGate } from "@/features/running/running-mobile-gate";
import type { RunningMode } from "@/features/running/run-session";
import { runContextFromParams } from "@/features/running/run-context";

export const metadata: Metadata = {
  title: "런닝 모드 | HELTCH",
  description: "카메라로 머리 움직임을 인식해 달리는 게임 모드(휴대폰 전용).",
  robots: { index: false, follow: false },
};

// URL(/running) 직접 접속으로만 들어오는 숨은 모드 — 메뉴에는 노출하지 않는다.
export default async function RunningPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; day?: string; goal?: string; replaced?: string }>;
}) {
  const { mode, day, goal, replaced } = await searchParams;
  // 루틴에서 열었으면(?day=) 그 맥락 — 저장할 때 붙고, 다음에 같은 루틴이 오면 이 설정으로 열린다.
  const context = runContextFromParams({ day, goal, replaced });
  const initialMode: RunningMode | null =
    mode === "indoor" || mode === "outdoor" ? mode : null;

  return <RunningMobileGate initialMode={initialMode} context={context} />;
}
