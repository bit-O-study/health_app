import Link from "next/link";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getUserProfile } from "@/features/profile/data-access";
import { getCurrentUser } from "@/lib/supabase/server";
import { SurveyExtraForm } from "@/features/profile/components/survey-extra-form";
import { defaultBodyStyleChoice } from "@/features/profile/survey-extra";

export const dynamic = "force-dynamic";
export const metadata = { title: "맞춤 운동 설정" };

/**
 * 맞춤 운동 설정(2026-10-01) — 나이대·몸 목표 스타일·1회 운동 시간. 가입 때 안 고른 기존 회원도
 * 여기서 고른다. 몸 목표 스타일을 안 골랐으면 성별 기본값(남 상체 위주 · 여 하체 위주)을 보여 준다.
 */
export default async function FitSettingsPage() {
  if (!(await getCurrentUser())) redirect("/login?redirect=/settings/fit");
  const profile = await getUserProfile();
  if (!profile) redirect("/onboarding");
  return (
    <div className="app-page">
      <PageHeader title="맞춤 운동 설정" back="설정" />
      <main className="app-container space-y-3">
        <p className="px-1 text-sm text-zinc-600 dark:text-zinc-300">
          맞춤 운동 추천(목표 비율·추천 개수)과 하루 칼로리 계산에 써요.
        </p>
        <SurveyExtraForm
          initial={{
            ageGroup: profile.ageGroup,
            bodyStyle: profile.bodyStyle ?? defaultBodyStyleChoice(profile.gender),
            sessionMinutes: profile.sessionMinutes,
          }}
        />
        <Link href="/settings/pain" className="block px-1 text-sm font-semibold text-brand">
          아픈 부위 설정 →
        </Link>
      </main>
    </div>
  );
}
