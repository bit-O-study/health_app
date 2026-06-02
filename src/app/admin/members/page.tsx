import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getMembers, isAdminUser } from "@/features/admin/admin";
import { banStateOf, BAN_STATE_LABEL } from "@/features/admin/ban";
import { MemberBanControls } from "@/features/admin/components/member-ban-controls";

export const dynamic = "force-dynamic";

function suspendedUntilLabel(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `~${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

const GENDER_LABEL: Record<string, string> = { male: "남", female: "여" };
const EXP_LABEL: Record<string, string> = {
  beginner: "초급",
  intermediate: "중급",
  advanced: "고급",
};

export default async function AdminMembersPage() {
  if (!(await isAdminUser())) notFound();
  const members = await getMembers();

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-8">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        관리자
      </Link>
      <h1 className="mt-6 mb-1 text-2xl font-bold text-zinc-950 dark:text-zinc-100">
        회원정보
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        총 {members.length}명
      </p>

      {members.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 p-6 text-center text-sm text-zinc-500">
          회원이 없습니다.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 dark:bg-zinc-900 text-left text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-3 py-2">이름</th>
                <th className="px-3 py-2">이메일</th>
                <th className="px-3 py-2">전화번호</th>
                <th className="px-3 py-2">성별</th>
                <th className="px-3 py-2">경력</th>
                <th className="px-3 py-2">키</th>
                <th className="px-3 py-2">체중</th>
                <th className="px-3 py-2">가입일</th>
                <th className="px-3 py-2">상태</th>
                <th className="px-3 py-2">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {members.map((m) => {
                const state = banStateOf({
                  suspendedUntil: m.suspendedUntil,
                  bannedAt: m.bannedAt,
                });
                const badge =
                  state === "banned"
                    ? "bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-400"
                    : state === "suspended"
                      ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500";
                return (
                  <tr key={m.userId} className="text-zinc-800 dark:text-zinc-200">
                    <td className="px-3 py-2">{m.name ?? "-"}</td>
                    <td className="px-3 py-2">{m.email ?? "-"}</td>
                    <td className="px-3 py-2">{m.phone ?? "-"}</td>
                    <td className="px-3 py-2">{m.gender ? GENDER_LABEL[m.gender] ?? m.gender : "-"}</td>
                    <td className="px-3 py-2">{m.experience ? EXP_LABEL[m.experience] ?? m.experience : "-"}</td>
                    <td className="px-3 py-2">{m.heightCm ? `${m.heightCm}cm` : "-"}</td>
                    <td className="px-3 py-2">{m.weightKg !== null ? `${m.weightKg}kg` : "-"}</td>
                    <td className="px-3 py-2 text-zinc-500">{m.createdAt.slice(0, 10)}</td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${badge}`}>
                        {BAN_STATE_LABEL[state]}
                        {state === "suspended" && m.suspendedUntil
                          ? ` ${suspendedUntilLabel(m.suspendedUntil)}`
                          : ""}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <MemberBanControls userId={m.userId} state={state} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
