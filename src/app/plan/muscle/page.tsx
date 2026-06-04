import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getUserProfile } from "@/features/profile/data-access";
import { MuscleExercisePicker } from "@/features/routine/components/muscle-exercise-picker";

export const dynamic = "force-dynamic";

export default async function MusclePlanPage() {
  const profile = await getUserProfile();
  if (!profile) redirect("/onboarding");

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-8">
      <Link
        className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        href="/"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        메인으로
      </Link>

      <div className="mt-6 mb-6 space-y-1">
        <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100">
          근육별로 운동선택
        </h1>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          3D 마네킹을 손가락으로 돌려 앞·뒤를 보고, 핀치로 확대/축소하세요. 근육
          부위를 누르면 그 부위 운동이 나타납니다. 담은 운동은 부위별 루틴에
          등록됩니다.
        </p>
      </div>

      <MuscleExercisePicker gender={profile.gender} />
    </main>
  );
}