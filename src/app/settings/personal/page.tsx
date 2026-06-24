import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { getUserProfile } from "@/features/profile/data-access";
import { VideoPrefToggle } from "@/features/profile/components/video-pref-toggle";
import { PrefToggle } from "@/features/profile/components/pref-toggle";
import { RestDefaultPicker } from "@/features/profile/components/rest-default-picker";
import { RestSoundPicker } from "@/features/profile/components/rest-sound-picker";

export const dynamic = "force-dynamic";

export default async function PersonalSettingsPage() {
  const profile = await getUserProfile();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10 sm:px-8">
      <Link
        className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        href="/settings"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        설정으로
      </Link>

      <div className="mt-6 space-y-1">
        <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100">
          개인설정
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          운동 화면과 휴식 알림을 내 취향에 맞게 조절합니다.
        </p>
      </div>

      {/* 운동 화면 표시 */}
      <section className="mt-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          운동 화면 표시
        </h2>
        <div className="space-y-4">
          <VideoPrefToggle initialHide={profile?.hideExerciseVideos ?? false} />
          <PrefToggle
            prefKey="lockWeightReps"
            initial={profile?.lockWeightReps ?? false}
            title="무게·횟수 고정"
            description="켜면 미리 정한 무게·횟수를 메인·편집에 표시하고 수정합니다. 끄면 메인에선 숨기고 운동모드에서 그때그때 설정합니다."
            icon="weight"
          />
          <PrefToggle
            prefKey="showExerciseGuide"
            initial={profile?.showExerciseGuide ?? true}
            title="상세 가이드"
            description="운동모드에서 '운동법·꿀팁 보기' 버튼을 보여줍니다. (자세한 운동법은 상세 페이지에서)"
            icon="guide"
          />
        </div>
      </section>

      {/* 휴식 알림 */}
      <section className="mt-8">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          휴식 타이머
        </h2>
        <div className="space-y-4">
          <RestDefaultPicker />
          <PrefToggle
            prefKey="restSound"
            initial={profile?.restSound ?? true}
            title="휴식 종료 소리"
            description="휴식 타이머가 끝나면 소리로 알립니다. (소리 종류는 아래에서 선택)"
            icon="sound"
          />
          <RestSoundPicker />
          <PrefToggle
            prefKey="restHaptic"
            initial={profile?.restHaptic ?? true}
            title="휴식 종료 진동"
            description="휴식 타이머가 끝나면 진동(햅틱)으로 알립니다. (지원 기기)"
            icon="haptic"
          />
        </div>
      </section>
    </main>
  );
}
