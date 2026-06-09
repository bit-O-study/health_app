import { redirect } from "next/navigation";

import { OnboardingFlow } from "@/features/profile/components/onboarding-flow";
import { getUserProfile } from "@/features/profile/data-access";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  // 미들웨어가 비로그인 접근을 막는다. 이미 온보딩한 사용자는 메인으로.
  const profile = await getUserProfile();
  if (profile) {
    redirect("/routine");
  }

  return <OnboardingFlow />;
}
