import { notFound } from "next/navigation";

import {
  getAdmins,
  getPostModerators,
  isAdminUser,
} from "@/features/admin/admin";
import { DEBUG_FEATURES } from "@/features/admin/debug-features";
import {
  getDebugAccounts,
  getDebugFeatureStates,
} from "@/features/admin/debug-features.server";
import { AdminSettingsManager } from "@/features/admin/components/admin-settings-manager";
import { DebugAccountsManager } from "@/features/admin/components/debug-accounts-manager";
import { DebugFeaturesManager } from "@/features/admin/components/debug-features-manager";
import { PostModeratorsManager } from "@/features/admin/components/post-moderators-manager";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  if (!(await isAdminUser())) notFound();
  const [admins, debugStates, debugAccounts, moderators] = await Promise.all([
    getAdmins(),
    getDebugFeatureStates(),
    getDebugAccounts(),
    getPostModerators(),
  ]);
  const debugFeatures = DEBUG_FEATURES.map((f) => ({
    id: f.id,
    label: f.label,
    visibility: debugStates[f.id] ?? "debug",
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
          게시물 관리자
        </h2>
        <p className="mb-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          여기에 지정한 계정은 커뮤니티의 모든 게시물·댓글을 삭제하거나 수정할 수
          있습니다. (관리자 계정은 기본으로 가능합니다.)
        </p>
        <PostModeratorsManager moderators={moderators} />
      </section>

      <section className="mt-10">
        <h2 className="mb-1 text-lg font-bold text-zinc-950 dark:text-zinc-100">
          디버그 계정
        </h2>
        <p className="mb-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          여기에 지정한 계정은 관리자가 아니어도 켜진 디버그 기능을 앱에서 볼 수
          있습니다. (테스트폰 계정 지정용. 관리자 계정은 항상 볼 수 있습니다.)
        </p>
        <DebugAccountsManager accounts={debugAccounts} />
      </section>

      <section className="mt-10">
        <h2 className="mb-1 text-lg font-bold text-zinc-950 dark:text-zinc-100">
          디버그 기능
        </h2>
        <p className="mb-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          개발/진단용 기능을 기능별로 켜고 끌 수 있습니다. 켜진 기능은 디버그
          계정에게만 앱에 표시됩니다.
        </p>
        <DebugFeaturesManager features={debugFeatures} />
      </section>
    </main>
  );
}
