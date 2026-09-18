import { redirect } from "next/navigation";
import { Ban, Clock, UserX } from "lucide-react";

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
    .select("suspended_until, banned_at, ban_reason, withdrawn_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const prof = (data ?? null) as {
    suspended_until: string | null;
    banned_at: string | null;
    ban_reason: string | null;
    withdrawn_at: string | null;
  } | null;

  const withdrawn = prof?.withdrawn_at != null;
  const state = prof
    ? banStateOf({ suspendedUntil: prof.suspended_until, bannedAt: prof.banned_at })
    : "active";

  // 차단·탈퇴 상태가 아니면 메인으로 (미들웨어가 보통 먼저 처리하지만 방어).
  if (state === "active" && !withdrawn) redirect("/routine");

  const isBan = state === "banned";

  // 입구 화면과 같은 촘촘한 한 줄기(2026-09-16 8단계) — 상태 아이콘은 의미색(위험·주의) 옅은 칩.
  return (
    <div className="app-page">
      <main className="app-container flex min-h-dvh max-w-sm flex-col justify-center gap-4 py-10">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-[14px] ${
            withdrawn
              ? "bg-zinc-100 text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300"
              : isBan
                ? "bg-danger/10 text-danger"
                : "bg-warn/10 text-warn"
          }`}
        >
          {withdrawn ? (
            <UserX size={24} aria-hidden="true" />
          ) : isBan ? (
            <Ban size={24} aria-hidden="true" />
          ) : (
            <Clock size={24} aria-hidden="true" />
          )}
        </span>

        <div className="space-y-1 px-1">
          <h1 className="app-title">
            {withdrawn
              ? "탈퇴한 계정입니다"
              : isBan
                ? "이용이 영구 정지된 계정입니다"
                : "이용이 정지된 계정입니다"}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {withdrawn
              ? "회원탈퇴가 완료되었습니다. 데이터는 일정 기간 보관되며, 복구를 원하시면 운영팀에 문의해 주세요."
              : isBan
                ? "관리자에 의해 계정이 영구 정지되었습니다. 문의가 필요하면 운영팀에 연락해 주세요."
                : prof?.suspended_until
                  ? `${fmt(prof.suspended_until)} 까지 이용이 제한됩니다. 기간이 지나면 자동으로 해제됩니다.`
                  : "관리자에 의해 계정 이용이 제한되었습니다."}
          </p>
        </div>
        {prof?.ban_reason ? (
          <p className="app-card px-3 py-2.5 text-sm text-zinc-700 dark:text-zinc-300">
            <span className="font-semibold">사유:</span> {prof.ban_reason}
          </p>
        ) : null}

        <SuspendedLogout />
      </main>
    </div>
  );
}
