import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { BackLink } from "@/components/back-link";
import { getCurrentUser } from "@/lib/supabase/server";
import { HealthConnections } from "@/features/health/components/health-connections";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "건강 연동",
};

/**
 * 건강 연동 설정 — 로드맵 6.1.
 *
 * 예전엔 걸음수 하나뿐이라 캘린더 구석의 작은 버튼으로 충분했다. 항목이 늘면서
 * "무엇이 연결돼 있고, 언제 마지막으로 가져왔는지" 를 볼 자리가 필요해졌다.
 * 여기서 항목별로 켜고(점진적 권한), 마지막 동기화 시각을 확인한다.
 */
export default async function HealthSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/settings/health");

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10 sm:px-8">
      <BackLink className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200">
        <ChevronLeft aria-hidden="true" size={16} />
        뒤로
      </BackLink>

      <div className="mt-6 space-y-1">
        <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100">
          건강 연동
        </h1>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          삼성헬스·구글핏 같은 앱이 Health Connect 에 모아 둔 기록을 가져와요.
          <strong> 필요한 항목만 하나씩</strong> 켤 수 있고, 켜지 않은 항목의 권한은
          요청하지 않아요.
        </p>
      </div>

      <section className="mt-8">
        <HealthConnections />
      </section>
    </main>
  );
}
