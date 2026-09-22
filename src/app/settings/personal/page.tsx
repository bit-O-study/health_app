import { PageHeader } from "@/components/page-header";
import { getUserProfile } from "@/features/profile/data-access";
import { LightModeToggle } from "@/features/profile/components/light-mode-toggle";
import { VideoPrefToggle } from "@/features/profile/components/video-pref-toggle";
import { PrefToggle } from "@/features/profile/components/pref-toggle";
import { RestDefaultPicker } from "@/features/profile/components/rest-default-picker";
import { RestSoundPicker } from "@/features/profile/components/rest-sound-picker";

export const dynamic = "force-dynamic";

export default async function PersonalSettingsPage() {
  const profile = await getUserProfile();

  // 아이폰 설정식 그룹 목록 두 장 — 한 줄에 하나(2026-09-16 8단계). 설명 문장은 뺐다.
  return (
    <div className="app-page">
      <PageHeader title="개인설정" back="설정" />
      <main className="app-container space-y-4">
        <section>
          <h2 className="app-section-label">운동 화면 표시</h2>
          <div className="app-list">
            <LightModeToggle />
            <VideoPrefToggle initialHide={profile?.hideExerciseVideos ?? false} />
            <PrefToggle
              prefKey="lockWeightReps"
              initial={profile?.lockWeightReps ?? false}
              title="무게·횟수 고정"
              icon="weight"
            />
            <PrefToggle
              prefKey="showExerciseGuide"
              initial={profile?.showExerciseGuide ?? true}
              title="상세 가이드"
              icon="guide"
            />
          </div>
        </section>

        <section>
          <h2 className="app-section-label">휴식 타이머</h2>
          <div className="app-list">
            <RestDefaultPicker />
            <PrefToggle
              prefKey="restSound"
              initial={profile?.restSound ?? true}
              title="휴식 종료 소리"
              icon="sound"
            />
            <RestSoundPicker />
            <PrefToggle
              prefKey="restHaptic"
              initial={profile?.restHaptic ?? true}
              title="휴식 종료 진동"
              icon="haptic"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
