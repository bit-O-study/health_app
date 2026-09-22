import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

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

  return (
    <main className="mx-auto w-full max-w-md px-4 py-6">
      <Link
        href="/groups"
        className="mb-3 inline-flex items-center gap-1 text-sm text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        <ArrowLeft aria-hidden="true" size={15} />
        그룹으로
      </Link>
      <h1 className="mb-1 text-xl font-extrabold text-zinc-950 dark:text-zinc-50">
        🐺 늑대 키우기
      </h1>
      <p className="mb-4 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
        운동할수록 Lv이 오르고 포인트가 쌓여요. 포인트로 옷을 사서 나만의 늑대를
        꾸며보세요.
      </p>
      {view === "rewards" && <section className="app-card mb-4 p-4"><h2 className="font-bold">운동으로 모은 보상</h2><p className="mt-2 text-sm">보유 포인트 {pet.points.toLocaleString()} P · 아래 상점에서 펫의 방을 꾸며보세요.</p><a href="#pet-rewards" className="mt-2 block text-sm text-emerald-600">보상 상점으로 →</a></section>}
      <PetStudio pet={pet} />
    </main>
  );
}
