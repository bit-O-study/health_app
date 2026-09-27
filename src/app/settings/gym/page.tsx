import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getUserProfile } from "@/features/profile/data-access";
import { getCurrentGym } from "@/features/gym/gym-data-access";
import { GymForm, type GymFormInitial } from "@/features/gym/gym-form";

export const dynamic = "force-dynamic";

export default async function GymSettingsPage() {
  const profile = await getUserProfile();
  if (!profile) redirect("/onboarding");

  const gym = await getCurrentGym();
  const initial: GymFormInitial | null = gym
    ? {
        id: gym.id,
        name: gym.name,
        address: gym.address ?? "",
        equipmentIds: gym.equipmentIds,
      }
    : null;

  // 공통 머리글(2026-09-16 8단계) — 설명 문단은 뺐다(검색창이 곧 안내).
  return (
    <div className="app-page">
      <PageHeader title="내 헬스장" back="설정" />
      <main className="app-container">
        <GymForm initial={initial} />
      </main>
    </div>
  );
}
