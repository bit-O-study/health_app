import { PageHeader } from "@/components/page-header";
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

export default async function RoutineSettingsPage() {
  const [routine, profile, bodyComp, presets] = await Promise.all([
    getUserRoutine(),
    getUserProfile(),
    getLatestBodyComposition(),
    getRoutinePresets(),
  ]);

  const recommendation = bodyComp
    ? recommendByBodyComp(bodyComp)
    : profile
      ? recommendByProfile(profile.gender, profile.experience)
      : null;

  // 공통 머리글 + 카드(2026-09-16 8단계) — 설명 문단은 뺐다. 운동탭·설정 어디서든 들어오므로 뒤로는 router.back.
  return (
    <div className="app-page">
      <PageHeader title="루틴 설정" back />
      <main className="app-container space-y-4">
        {recommendation ? (
          <RecommendRoutineCard recommendation={recommendation} />
        ) : null}

        <RoutinePresets presets={presets} />

        <RoutinePlanner
          initialSplits={routine?.splits ?? DEFAULT_SPLITS}
          initialVariantId={routine?.variantId ?? DEFAULT_VARIANT_ID}
          initialCustomWeek={routine?.customWeek ?? null}
          saveAction={saveRoutineAction}
          /* 저장 후 운동 등록 페이지로 — 추천으로 한 번에 채우기 vs 내가 직접 고르기 선택 */
          redirectOnSuccess="/plan"
        />
      </main>
    </div>
  );
}
