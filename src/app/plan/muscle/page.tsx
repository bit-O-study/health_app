import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getUserProfile } from "@/features/profile/data-access";
import { MuscleExercisePicker } from "@/features/routine/components/muscle-exercise-picker";

export const dynamic = "force-dynamic";

export default async function MusclePlanPage() {
  const profile = await getUserProfile();
  if (!profile) redirect("/onboarding");

  // 공통 머리글(2026-09-16 8단계) — 마네킹 조작 안내는 마네킹 위 안내로 충분해 뺐다.
  return (
    <div className="app-page">
      <PageHeader title="근육별로 운동선택" back="운동" backHref="/routine" />
      <main className="app-container">
        <MuscleExercisePicker gender={profile.gender} />
      </main>
    </div>
  );
}