import type { Metadata } from "next";

import { ZenRun } from "@/features/running/zen-run";

export const metadata: Metadata = {
  title: "힐링 러닝 | HELTCH",
  description: "카메라 없이 제자리 달리기를 감지해 예쁜 풍경 속을 달리는 힐링 러닝.",
  robots: { index: false, follow: false },
};

// 카메라 없이(모션 센서) 제자리 달리기를 감지하는 힐링 러닝. 접근 게이트 없음.
export default function JogPage() {
  return <ZenRun />;
}
