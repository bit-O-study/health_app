import { listTeamSubscriptions } from "@/features/billing/team-store";
import { TeamAdminList } from "@/features/billing/components/team-admin-list";
import { isTeamActive } from "@/features/billing/team-plans";
import { seoulYmd } from "@/features/routine/data";

export const dynamic = "force-dynamic";

/**
 * 팀 요금제(B2B) — 신청을 받아 입금을 확인하고 이용 기간을 넣는 자리.
 *
 * 🔴 **입금을 코드가 확인할 방법이 없다.** 그래서 여기가 사람이 판단하는 유일한 문이다.
 * 자동 승인을 붙이면 신청만으로 프리미엄이 새어 나간다.
 */
export default async function AdminBillingPage() {
  // 레이아웃(admin/layout.tsx)에서 isAdminUser 게이트 — 여기선 데이터만 로드.
  const rows = await listTeamSubscriptions();
  const today = seoulYmd();

  const pending = rows.filter((r) => r.status === "requested");
  const active = rows.filter((r) => isTeamActive(r, today));
  const monthly = active.reduce((sum, r) => sum + r.priceKrw, 0);

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-8">
      <h1 className="mb-1 text-2xl font-bold text-zinc-950 dark:text-zinc-100">
        팀 요금제
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        트레이너·헬스장 구독. 입금을 확인하고 이용 기간을 넣으면 그 그룹의 회원 전원이
        프리미엄이 돼요.
      </p>

      <div className="mb-6 grid grid-cols-3 gap-2">
        {[
          { label: "대기 중", value: `${pending.length}건` },
          { label: "이용 중", value: `${active.length}팀` },
          { label: "월 합계", value: `${monthly.toLocaleString("ko-KR")}원` },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-zinc-200 bg-white p-3 text-center dark:border-zinc-700 dark:bg-zinc-800"
          >
            <p className="text-lg font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
              {s.value}
            </p>
            <p className="mt-0.5 text-[11px] font-bold text-zinc-500">{s.label}</p>
          </div>
        ))}
      </div>

      <TeamAdminList rows={rows} today={today} />
    </main>
  );
}
