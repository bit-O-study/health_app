import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { RoutinePlanner } from "@/features/routine/components/routine-planner";
import { RecommendRoutineCard } from "@/features/routine/components/recommend-card";
import { RoutinePresets } from "@/features/routine/components/routine-presets";
import { saveRoutineAction } from "@/features/routine/actions";
import { getUserRoutine } from "@/features/routine/data-access";
import { getRoutinePresets } from "@/features/routine/presets";
import { DEFAULT_SPLITS, DEFAULT_VARIANT_ID } from "@/features/routine/data";
import { getUserProfile } from "@/features/profile/data-access";
import { getLatestBodyComposition } from "@/features/body-composition/data-access";
import {
  recommendByBodyComp,
  recommendByProfile,
} from "@/features/body-composition/data";

export const dynamic = "force-dynamic";

export default async function RoutineSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const [routine, profile, bodyComp, presets, sp] = await Promise.all([
    getUserRoutine(),
    getUserProfile(),
    getLatestBodyComposition(),
    getRoutinePresets(),
    searchParams,
  ]);

  // 진입 경로별 백링크 — 메인에서 왔으면 운동 메인(/routine)으로, 설정에서 왔으면 설정으로.
  // ("/" 는 운동/파워리프팅 모드 선택 랜딩이라 운동 화면이 아님)
  const fromHome = sp.from === "home";
  const backHref = fromHome ? "/routine" : "/settings";
  const backLabel = fromHome ? "오늘의 운동" : "설정";

  const recommendation = bodyComp
    ? recommendByBodyComp(bodyComp)
    : profile
      ? recommendByProfile(profile.gender, profile.experience)
      : null;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-8">
      <Link
        className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        href={backHref}
      >
        <ChevronLeft aria-hidden="true" size={16} />
        {backLabel}
      </Link>

      <div className="mt-6 mb-6 space-y-1">
        <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100">
          루틴 설정
        </h1>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          체성분이 등록돼 있으면 약한 부위를 보강하는 추천 루틴이 위에 뜹니다.
          아래에서 루틴/변형을 직접 고르거나 커스텀으로 만들 수도 있어요.
        </p>
      </div>

      {recommendation ? (
        <div className="mb-6">
          <RecommendRoutineCard recommendation={recommendation} />
        </div>
      ) : null}

      <div className="mb-6">
        <RoutinePresets presets={presets} />
      </div>

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
