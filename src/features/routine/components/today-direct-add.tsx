import { getCurrentGym } from "@/features/gym/gym-data-access";
import { getDailyConditioning } from "@/features/routine/daily-conditioning";
import { seoulYmd } from "@/features/routine/data";
import type { UserProfile } from "@/features/profile/data-access";
import { DailyMainEditor } from "@/features/routine/components/daily-main-editor";
import { ConditioningEditor } from "@/features/routine/components/conditioning-editor";

/**
 * '오늘만 변경'으로 하루 밀린 빈 날 — /routine 안에서 바로 워밍업/본운동/마무리
 * 빈 3섹션을 띄워 직접 담게 한다(부위 제한 없이 전체 운동). 저장은 오늘 daily_plan/
 * daily_conditioning 오버라이드로 들어가고, 담으면 아래에 오늘 운동으로 반영된다.
 */
export async function TodayDirectAddInline({
  profile,
}: {
  profile: UserProfile;
}) {
  const todayYmd = seoulYmd();
  const [gym, daily] = await Promise.all([
    getCurrentGym(),
    getDailyConditioning(todayYmd),
  ]);
  const gymEquipment = gym?.equipmentIds ?? null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40 p-4 text-sm text-zinc-600 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-zinc-300">
        오늘 운동을 내일로 미뤘어요. 아래에서 <strong>워밍업 · 본운동 · 마무리</strong>를
        직접 담으세요. (러닝 등 기본값은 자동으로 넣지 않아요.)
      </div>

      {/* 본운동 — 부위 제한 없이 전체 운동에서 추가(태그 자동) */}
      <DailyMainEditor
        sections={[]}
        gender={profile.gender}
        experience={profile.experience}
        bodyType={profile.bodyType}
        weightKg={profile.weightKg}
        dateYmd={todayYmd}
        gymEquipment={gymEquipment}
        lockWeightReps={profile.lockWeightReps}
        allowAllExercises
      />

      <ConditioningEditor
        focus="core"
        recommendFocuses={[]}
        kind="warmup"
        initial={daily.warmup}
        dailyDate={todayYmd}
        lockWeightReps={profile.lockWeightReps}
      />
      <ConditioningEditor
        focus="core"
        recommendFocuses={[]}
        kind="cooldown"
        initial={daily.cooldown}
        dailyDate={todayYmd}
        lockWeightReps={profile.lockWeightReps}
      />
    </div>
  );
}
