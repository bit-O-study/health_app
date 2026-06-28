import { redirect } from "next/navigation";

import { OnboardingFlow } from "@/features/profile/components/onboarding-flow";
import { getUserProfile } from "@/features/profile/data-access";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectParam } = await searchParams;
  // 초대 링크 등으로 온 경우 온보딩 후 그곳으로 보낸다(내부 경로만 허용).
  const dest =
    redirectParam && redirectParam.startsWith("/") ? redirectParam : "/";

  // 미들웨어가 비로그인 접근을 막는다. 이미 온보딩한 사용자는 목적지로.
  const profile = await getUserProfile();
  if (profile) {
    redirect(dest === "/" ? "/routine" : dest);
  }

  return <OnboardingFlow redirectOnSuccess={dest} />;
}
