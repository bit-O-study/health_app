"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import type { GroupSummary } from "@/features/groups/data-access";

/** 상단 그룹 전환 칩 — 현재 그룹 강조, 탭하면 그 그룹으로. '+'는 만들기/참여로. */
export function GroupSwitcher({
  groups,
  currentId,
}: {
  groups: GroupSummary[];
  currentId: string;
}) {
  const router = useRouter();
  return (
    <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1">
      {groups.map((g) => {
        const active = g.id === currentId;
        return (
          <button
            key={g.id}
            type="button"
            onClick={() => router.push(`/groups?g=${g.id}`)}
            aria-current={active ? "true" : undefined}
            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-sm font-bold transition ${
              active
                ? "bg-emerald-600 text-white shadow"
                : "border border-zinc-200 bg-white text-zinc-600 hover:border-emerald-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            }`}
          >
            {g.name}
            <span
              className={`rounded-full px-1.5 text-[10px] ${
                active
                  ? "bg-white/20"
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
              }`}
            >
              {g.memberCount}
            </span>
          </button>
        );
      })}
      <Link
        href="/groups/manage"
        aria-label="그룹 만들기/참여"
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-dashed border-zinc-300 text-zinc-400 transition hover:border-emerald-400 hover:text-emerald-500 dark:border-zinc-600"
      >
        <Plus aria-hidden="true" size={18} />
      </Link>
    </div>
  );
}
