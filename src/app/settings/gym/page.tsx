import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { BackLink } from "@/components/back-link";
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

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10 sm:px-8">
      <BackLink className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200">
        <ChevronLeft aria-hidden="true" size={16} />
        설정
      </BackLink>

      <div className="mt-6 mb-6 space-y-1">
        <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100">
          내 헬스장
        </h1>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          헬스장 이름·주소와 보유 기구를 등록해두면 추후 루틴 추천에 반영됩니다.
        </p>
      </div>

      <GymForm initial={initial} />
    </main>
  );
}
