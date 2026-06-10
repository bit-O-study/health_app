import Link from "next/link";
import { ChevronLeft } from "lucide-react";

import { getUserProfile } from "@/features/profile/data-access";
import { VideoPrefToggle } from "@/features/profile/components/video-pref-toggle";

export const dynamic = "force-dynamic";

export default async function PersonalSettingsPage() {
  const profile = await getUserProfile();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10 sm:px-8">
      <Link
        className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        href="/settings"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        설정으로
      </Link>

      <div className="mt-6 space-y-1">
        <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100">
          개인설정
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          운동 화면 동작을 내 취향에 맞게 조절합니다.
        </p>
      </div>

      <div className="mt-8 space-y-4">
        <VideoPrefToggle initialHide={profile?.hideExerciseVideos ?? false} />
      </div>
    </main>
  );
}
