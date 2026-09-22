import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { getPet } from "@/features/pet/data-access";
import { PetStudio } from "@/features/pet/components/pet-studio";

export const dynamic = "force-dynamic";
export const metadata = { title: "늑대 키우기" };

export default async function PetPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/pet");
  const pet = await getPet();
  if (!pet) redirect("/login");

  // 공통 머리글(2026-09-16 8단계) — 설명 문장은 뺐다(Lv·포인트가 화면에 그대로 보인다).
  return (
    <div className="app-page">
      <PageHeader title="늑대 키우기" back="그룹" backHref="/groups" />
      <main className="app-container">
      {view === "rewards" && <section className="app-card mb-4 p-4"><h2 className="font-bold">운동으로 모은 보상</h2><p className="mt-2 text-sm">보유 포인트 {pet.points.toLocaleString()} P · 아래 상점에서 펫의 방을 꾸며보세요.</p><a href="#pet-rewards" className="mt-2 block text-sm text-emerald-600">보상 상점으로 →</a></section>}
        <PetStudio pet={pet} />
      </main>
    </div>
  );
}
