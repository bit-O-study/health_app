import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { HealthConnections } from "@/features/health/components/health-connections";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "건강 연동",
};

/**
 * 건강 연동 설정 — 로드맵 6.1.
 *
 * 예전엔 걸음수 하나뿐이라 캘린더 구석의 작은 버튼으로 충분했다. 항목이 늘면서
 * "무엇이 연결돼 있고, 언제 마지막으로 가져왔는지" 를 볼 자리가 필요해졌다.
 * 여기서 항목별로 켜고(점진적 권한), 마지막 동기화 시각을 확인한다.
 * 항목마다 이유가 적혀 있어 머리 설명 문단은 뺐다(2026-09-16 8단계).
 */
export default async function HealthSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/settings/health");

  return (
    <div className="app-page">
      <PageHeader title="건강 연동" back="설정" />
      <main className="app-container">
        <HealthConnections />
      </main>
    </div>
  );
}
