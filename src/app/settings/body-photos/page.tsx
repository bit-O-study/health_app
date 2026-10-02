import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { loadBodyPhotos } from "@/features/lite/body-photos-data";
import { BodyPhotosPanel } from "@/features/lite/components/body-photos-panel";

export const dynamic = "force-dynamic";
export const metadata = { title: "몸 사진" };

/** 몸 사진(라이트 2단계 혜택 3, 2026-10-02) — 무료 3장 맛보기 · 라이트 무제한. 사진은 나만 본다. */
export default async function BodyPhotosPage() {
  if (!(await getCurrentUser())) redirect("/login?redirect=/settings/body-photos");
  const view = await loadBodyPhotos();
  if (!view) redirect("/login?redirect=/settings/body-photos");
  return (
    <div className="app-page">
      <PageHeader title="몸 사진" back="설정" />
      <main className="app-container">
        <BodyPhotosPanel view={view} today={seoulYmd()} />
      </main>
    </div>
  );
}
