import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { getPet } from "@/features/pet/data-access";
import { PetStudio } from "@/features/pet/components/pet-studio";

export const dynamic = "force-dynamic";
export const metadata = { title: "늑대 키우기" };

export default async function PetPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/pet");
  const pet = await getPet();
  if (!pet) redirect("/login");

  // 공통 머리글(2026-09-16 8단계) — 설명 문장은 뺐다(Lv·포인트가 화면에 그대로 보인다).
  return (
    <div className="app-page">
      <PageHeader title="늑대 키우기" back="그룹" backHref="/groups" />
      <main className="app-container">
        <PetStudio pet={pet} />
      </main>
    </div>
  );
}
