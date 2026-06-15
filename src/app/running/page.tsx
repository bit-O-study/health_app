import type { Metadata } from "next";

import { RunningMobileGate } from "@/features/running/running-mobile-gate";

export const metadata: Metadata = {
  title: "런닝 모드 | HELTCH",
  description: "카메라로 머리 움직임을 인식해 달리는 게임 모드(휴대폰 전용).",
  robots: { index: false, follow: false },
};

// URL(/running) 직접 접속으로만 들어오는 숨은 모드 — 메뉴에는 노출하지 않는다.
export default function RunningPage() {
  return <RunningMobileGate />;
}
