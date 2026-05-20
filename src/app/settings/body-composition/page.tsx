import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getUserProfile } from "@/features/profile/data-access";
import { getLatestBodyComposition } from "@/features/body-composition/data-access";
import { isOcrEnabled } from "@/features/body-composition/ocr";
import { BodyCompForm } from "@/features/body-composition/components/body-comp-form";

export const dynamic = "force-dynamic";

export default async function BodyCompositionPage() {
  const profile = await getUserProfile();
  if (!profile) redirect("/onboarding");

  const [latest, ocrEnabled] = await Promise.all([
    getLatestBodyComposition(),
    isOcrEnabled(),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10 sm:px-8">
      <Link
        className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800"
        href="/settings"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        설정
      </Link>

      <div className="mt-6 mb-6 space-y-1">
        <h1 className="text-2xl font-bold text-zinc-950">
          체성분 결과 등록
        </h1>
        <p className="text-sm leading-6 text-zinc-600">
          체성분 분석지(체중·골격근량·체지방률·부위별 근육량·지방 등)를 입력하면
          마네킹의 부위별 밸런스가 측정값 기반으로 표시되고, 추천 루틴도 약한
          부위를 보강하는 방향으로 제안됩니다. 측정은 의학적 진단이 아니며
          피트니스 가이드 목적입니다.
        </p>
        {latest ? (
          <p className="text-xs text-emerald-700">
            가장 최근 측정: {latest.measuredAt}
          </p>
        ) : (
          <p className="text-xs text-zinc-500">
            아직 등록된 체성분이 없습니다. 첫 등록을 진행하세요.
          </p>
        )}
      </div>

      <BodyCompForm
        hasExistingImage={Boolean(latest?.imagePath)}
        ocrEnabled={ocrEnabled}
      />
    </main>
  );
}
