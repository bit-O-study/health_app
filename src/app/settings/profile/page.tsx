import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getUserProfile } from "@/features/profile/data-access";
import { getBodyLogs } from "@/features/profile/body-logs";
import { BodyLogButton } from "@/features/profile/components/body-log-button";
import { BodyChart } from "@/features/profile/components/body-chart";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const profile = await getUserProfile();
  if (!profile) redirect("/onboarding");

  const logs = await getBodyLogs();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10 sm:px-8">
      <Link
        className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        href="/settings"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        설정
      </Link>

      <div className="mt-6 mb-6 space-y-1">
        <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100">
          체형 정보
        </h1>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          키·몸무게·체지방률·근육량을 기록하면 추천 운동 강도가 맞춰지고, 아래
          그래프로 추이를 볼 수 있습니다.
        </p>
      </div>

      <div className="space-y-6">
        <section className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 shadow-sm">
          <h2 className="mb-3 text-base font-bold text-zinc-950 dark:text-zinc-100">
            추이 그래프
          </h2>
          <BodyChart logs={logs} />
        </section>

        <section className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 shadow-sm">
          <h2 className="mb-1 text-base font-bold text-zinc-950 dark:text-zinc-100">
            체형 기록
          </h2>
          <p className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
            아래 버튼을 눌러 기록하세요. 입력한 항목만 누적 기록되고 최신값으로
            갱신됩니다. 체형을 함께 저장하면 추천 강도에 반영됩니다.
          </p>
          <BodyLogButton
            current={{
              weightKg: profile.weightKg,
              bodyFatPct: profile.bodyFatPct,
              muscleMassKg: profile.muscleMassKg,
              heightCm: profile.heightCm,
            }}
            withBodyType
            currentBodyType={profile.bodyType}
            showGraphLink={false}
          />
        </section>
      </div>
    </main>
  );
}
