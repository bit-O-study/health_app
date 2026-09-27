import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getUserProfile } from "@/features/profile/data-access";
import { getLatestBodyComposition } from "@/features/body-composition/data-access";
import { BodyCompForm } from "@/features/body-composition/components/body-comp-form";

export const dynamic = "force-dynamic";

export default async function BodyCompositionPage() {
  const profile = await getUserProfile();
  if (!profile) redirect("/onboarding");

  const latest = await getLatestBodyComposition();

  // 공통 머리글 + 한 줄 안내(2026-09-16 8단계) — 긴 설명은 뺐다. 진단이 아니라는 고지는 한 줄로 남긴다.
  return (
    <div className="app-page">
      <PageHeader title="체성분 결과 등록" back="설정" />
      <main className="app-container space-y-4">
        <p className="px-1 text-xs text-zinc-500 dark:text-zinc-400">
          {latest ? (
            <span className="text-brand">최근 측정 {latest.measuredAt} · </span>
          ) : null}
          의학적 진단이 아닌 운동 가이드용이에요.
        </p>
        <BodyCompForm hasExistingImage={Boolean(latest?.imagePath)} />
      </main>
    </div>
  );
}
