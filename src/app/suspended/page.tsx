import { redirect } from "next/navigation";
import { Ban, Clock } from "lucide-react";

import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { banStateOf } from "@/features/admin/ban";
import { SuspendedLogout } from "@/features/admin/components/suspended-logout";

export const dynamic = "force-dynamic";

function fmt(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default async function SuspendedPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("suspended_until, banned_at, ban_reason")
    .eq("user_id", user.id)
    .maybeSingle();

  const prof = (data ?? null) as {
    suspended_until: string | null;
    banned_at: string | null;
    ban_reason: string | null;
  } | null;

  const state = prof
    ? banStateOf({ suspendedUntil: prof.suspended_until, bannedAt: prof.banned_at })
    : "active";

  // 차단 상태가 아니면 메인으로 (미들웨어가 보통 먼저 처리하지만 방어).
  if (state === "active") redirect("/routine");

  const isBan = state === "banned";

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-50 dark:bg-zinc-900 px-6 py-12 text-center">
      <span
        className={`flex h-16 w-16 items-center justify-center rounded-2xl ${
          isBan
            ? "bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400"
            : "bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400"
        }`}
      >
        {isBan ? <Ban size={32} aria-hidden="true" /> : <Clock size={32} aria-hidden="true" />}
      </span>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100">
          {isBan ? "이용이 영구 정지된 계정입니다" : "이용이 정지된 계정입니다"}
        </h1>
        <p className="max-w-md text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          {isBan
            ? "관리자에 의해 계정이 영구 정지되었습니다. 문의가 필요하면 운영팀에 연락해 주세요."
            : prof?.suspended_until
              ? `${fmt(prof.suspended_until)} 까지 이용이 제한됩니다. 기간이 지나면 자동으로 해제됩니다.`
              : "관리자에 의해 계정 이용이 제한되었습니다."}
        </p>
        {prof?.ban_reason ? (
          <p className="mx-auto max-w-md rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-3 text-sm text-zinc-700 dark:text-zinc-300">
            <span className="font-semibold">사유:</span> {prof.ban_reason}
          </p>
        ) : null}
      </div>

      <SuspendedLogout />
    </main>
  );
}
