import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { isDebugFeatureEnabled } from "@/features/admin/debug-features.server";
import { EquipmentScanner } from "@/features/equipment/components/equipment-scanner";

export const dynamic = "force-dynamic";

export default async function EquipmentScanPage() {
  // 지금은 디버그 기능(관리자만). 전체 공개 시 이 게이트를 풀면 된다.
  if (!(await isDebugFeatureEnabled("equipment-scan"))) notFound();

  return (
    <main className="mx-auto w-full max-w-lg px-5 py-8">
      <Link
        href="/exercises"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        <ArrowLeft aria-hidden="true" size={15} />
        운동 목록
      </Link>
      <h1 className="mb-1 text-2xl font-bold text-zinc-950 dark:text-zinc-100">
        기구 분석
      </h1>
      <p className="mb-6 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        헬스장 기구를 촬영하면 어떤 기구인지, 어떤 운동을 할 수 있는지 알려드려요.
        운동을 누르면 상세 운동법으로 이동합니다.
      </p>
      <EquipmentScanner />
    </main>
  );
}
