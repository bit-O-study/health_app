import type { Metadata } from "next";

import { PowerliftingApp } from "@/features/powerlifting/powerlifting-app";

export const metadata: Metadata = {
  title: "오늘의 파워리프팅 | HELTCH",
  description: "앱을 켜자마자 오늘 할 운동과 스트롱리프트 5x5 또는 5/3/1 중량을 확인합니다.",
};

export default function PowerliftingPage() {
  return <PowerliftingApp />;
}
