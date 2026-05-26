import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { RoutinePlanner } from "@/features/routine/components/routine-planner";
import { RecommendRoutineCard } from "@/features/routine/components/recommend-card";
import { saveRoutineAction } from "@/features/routine/actions";
import { getUserRoutine } from "@/features/routine/data-access";
import { DEFAULT_SPLITS, DEFAULT_VARIANT_ID } from "@/features/routine/data";
import { getUserProfile } from "@/features/profile/data-access";
import { getLatestBodyComposition } from "@/features/body-composition/data-access";
import {
  recommendByBodyComp,
  recommendByProfile,
} from "@/features/body-composition/data";

export const dynamic = "force-dynamic";

export default async function RoutineSettingsPage() {
  const [routine, profile, bodyComp] = await Promise.all([
    getUserRoutine(),
    getUserProfile(),
    getLatestBodyComposition(),
  ]);

  const recommendation = bodyComp
    ? recommendByBodyComp(bodyComp)
    : profile
      ? recommendByProfile(profile.gender, profile.experience)
      : null;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-8">
      <Link
        className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        href="/settings"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        설정
      </Link>

      <div className="mt-6 mb-6 space-y-1">
        <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100">
          루틴 설정
        </h1>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          체성분이 등록돼 있으면 약한 부위를 보강하는 추천 루틴이 위에 뜹니다.
          아래에서 분할/변형을 직접 고르거나 커스텀으로 만들 수도 있어요.
        </p>
      </div>

      {recommendation ? (
        <div className="mb-6">
          <RecommendRoutineCard recommendation={recommendation} />
        </div>
      ) : null}

      <RoutinePlanner
        initialSplits={routine?.splits ?? DEFAULT_SPLITS}
        initialVariantId={routine?.variantId ?? DEFAULT_VARIANT_ID}
        initialCustomWeek={routine?.customWeek ?? null}
        saveAction={saveRoutineAction}
        /* 저장 후 운동 등록 페이지로 — 추천으로 한 번에 채우기 vs 내가 직접 고르기 선택 */
        redirectOnSuccess="/plan"
      />
    </main>
  );
}
