import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getUserProfile } from "@/features/profile/data-access";
import { getBodyLogs } from "@/features/profile/body-logs";
import { BodyLogButton } from "@/features/profile/components/body-log-button";
import { BodyChart } from "@/features/profile/components/body-chart";
import { BodyLogList } from "@/features/profile/components/body-log-list";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const profile = await getUserProfile();
  if (!profile) redirect("/onboarding");

  const logs = await getBodyLogs();

  // 공통 머리글 + 섹션 라벨 + 카드(2026-09-16 8단계) — 설명 문장은 뺐다.
  return (
    <div className="app-page">
      <PageHeader title="체형 정보" back="설정" />
      <main className="app-container space-y-4">
        <section>
          <h2 className="app-section-label">추이 그래프</h2>
          <div className="app-card p-3">
            <BodyChart logs={logs} />
          </div>
        </section>

        <section>
          <h2 className="app-section-label">측정 기록</h2>
          <div className="app-card p-3">
            <BodyLogList logs={logs} />
          </div>
        </section>

        <section>
          <h2 className="app-section-label">체형 기록</h2>
          <div className="app-card p-3">
            <BodyLogButton
              current={{
                weightKg: profile.weightKg,
                bodyFatPct: profile.bodyFatPct,
                muscleMassKg: profile.muscleMassKg,
                heightCm: profile.heightCm,
              }}
              withBodyType
              currentBodyType={profile.bodyType}
              showGraphLink={false}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
