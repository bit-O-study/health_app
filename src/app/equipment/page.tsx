import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { isDebugFeatureEnabled } from "@/features/admin/debug-features.server";
import { EquipmentScanner } from "@/features/equipment/components/equipment-scanner";

export const dynamic = "force-dynamic";

export default async function EquipmentScanPage() {
  // 지금은 디버그 기능(관리자만). 전체 공개 시 이 게이트를 풀면 된다.
  if (!(await isDebugFeatureEnabled("equipment-scan"))) notFound();

  // 공통 머리글(2026-09-16 8단계) — 설명 문장은 뺐다(스캐너 버튼이 곧 설명).
  return (
    <div className="app-page">
      <PageHeader title="기구 분석" back="운동 목록" backHref="/exercises" />
      <main className="app-container">
        <EquipmentScanner />
      </main>
    </div>
  );
}
