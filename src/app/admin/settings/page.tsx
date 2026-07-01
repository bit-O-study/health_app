import { notFound } from "next/navigation";

import { getAdmins, isAdminUser } from "@/features/admin/admin";
import { DEBUG_FEATURES } from "@/features/admin/debug-features";
import { getDebugFeatureStates } from "@/features/admin/debug-features.server";
import { AdminSettingsManager } from "@/features/admin/components/admin-settings-manager";
import { DebugFeaturesManager } from "@/features/admin/components/debug-features-manager";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  if (!(await isAdminUser())) notFound();
  const [admins, debugStates] = await Promise.all([
    getAdmins(),
    getDebugFeatureStates(),
  ]);
  const debugFeatures = DEBUG_FEATURES.map((f) => ({
    id: f.id,
    label: f.label,
    enabled: debugStates[f.id] ?? true,
  }));

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10 sm:px-8">
      <h1 className="mb-1 text-2xl font-bold text-zinc-950 dark:text-zinc-100">
        관리자 설정
      </h1>
      <p className="mb-6 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        회원의 이메일을 입력해 관리자로 지정할 수 있습니다. 관리자로 지정된
        계정은 일반 화면 대신 이 관리자 콘솔로 이동합니다.
      </p>
      <AdminSettingsManager admins={admins} />

      <section className="mt-10">
        <h2 className="mb-1 text-lg font-bold text-zinc-950 dark:text-zinc-100">
          디버그 기능
        </h2>
        <p className="mb-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          개발/진단용 기능을 기능별로 켜고 끌 수 있습니다. 켜진 기능은 디버그
          계정(관리자)에게만 앱에 표시됩니다.
        </p>
        <DebugFeaturesManager features={debugFeatures} />
      </section>
    </main>
  );
}
