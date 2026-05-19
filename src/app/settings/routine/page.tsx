import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { RoutinePlanner } from "@/features/routine/components/routine-planner";
import { saveRoutineAction } from "@/features/routine/actions";
import { getUserRoutine } from "@/features/routine/data-access";
import { DEFAULT_SPLITS, DEFAULT_VARIANT_ID } from "@/features/routine/data";

export const dynamic = "force-dynamic";

export default async function RoutineSettingsPage() {
  const routine = await getUserRoutine();

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-8">
      <Link
        className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800"
        href="/settings"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        설정
      </Link>

      <div className="mt-6 mb-6 space-y-1">
        <h1 className="text-2xl font-bold text-zinc-950">루틴 설정</h1>
        <p className="text-sm leading-6 text-zinc-600">
          몇 분할로 운동할지와 나누는 방식을 고른 뒤 저장하세요. 저장한 루틴은
          메인 페이지에서 오늘 날짜에 맞는 운동으로 안내됩니다.
        </p>
      </div>

      <RoutinePlanner
        initialSplits={routine?.splits ?? DEFAULT_SPLITS}
        initialVariantId={routine?.variantId ?? DEFAULT_VARIANT_ID}
        initialCustomWeek={routine?.customWeek ?? null}
        saveAction={saveRoutineAction}
        redirectOnSuccess="/"
      />
    </main>
  );
}