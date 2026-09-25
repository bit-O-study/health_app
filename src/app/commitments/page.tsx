import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { getMyCommitments } from "@/features/commitments/data-access";
import { getUserProfile } from "@/features/profile/data-access";
import { getUserRoutine } from "@/features/routine/data-access";
import { dailyTarget } from "@/features/diet/calorie-target";
import { toSurveyGoal, weeklyWorkoutDays } from "@/features/commitments/survey";
import { CommitmentManager } from "@/features/commitments/components/commitment-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "다짐" };

export default async function CommitmentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/commitments");

  // 설문이 숫자를 계산하려면 프로필이 필요하다 — 설문에서 다시 묻지 않기 위해서다.
  // 루틴의 주당 운동일은 '주 며칠' 의 기본값이 된다.
  const [commitments, profile, routine] = await Promise.all([
    getMyCommitments(),
    getUserProfile(),
    getUserRoutine(),
  ]);
  const me = profile
    ? ({
        gender: profile.gender === "female" ? "female" : "male",
        experience: profile.experience,
        weightKg: profile.weightKg ?? 70,
        goal: toSurveyGoal(profile.goal),
        recommendKcal: dailyTarget({
          gender: profile.gender,
          weightKg: profile.weightKg,
          heightCm: profile.heightCm,
        }).kcal,
      } as const)
    : undefined;
  const defaultPerWeek = weeklyWorkoutDays(routine);

  // 공통 머리글(2026-09-16 8단계) — 설명 문장·제목 옆 깃발 아이콘은 뺐다.
  return (
    <div className="app-page">
      <PageHeader title="나의 다짐" back />
      <main className="app-container">
        <CommitmentManager
          commitments={commitments}
          me={me}
          defaultPerWeek={defaultPerWeek}
        />
      </main>
    </div>
  );
}
