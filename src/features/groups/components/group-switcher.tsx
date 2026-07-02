"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2, Plus } from "lucide-react";

import type { GroupSummary } from "@/features/groups/data-access";

/**
 * 상단 그룹 전환 — 버튼 대신 왼쪽정렬 18px 클릭식 텍스트.
 * 탭하면 즉시 스피너(전환이 느려도 '먹통'처럼 안 보이게) 후 그 그룹으로 이동.
 */
export function GroupSwitcher({
  groups,
  currentId,
}: {
  groups: GroupSummary[];
  currentId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [target, setTarget] = useState<string | null>(null);

  function go(id: string) {
    if (id === currentId || pending) return;
    setTarget(id);
    start(() => router.push(`/groups?g=${id}`));
  }

  return (
    <div className="mb-4 flex items-center gap-4 overflow-x-auto pb-1">
      {groups.map((g) => {
        const active = g.id === currentId;
        const loading = pending && target === g.id;
        return (
          <button
            key={g.id}
            type="button"
            onClick={() => go(g.id)}
            aria-current={active ? "true" : undefined}
            className={`inline-flex shrink-0 items-center gap-1 text-[18px] font-bold transition-colors ${
              active
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            }`}
          >
            {loading ? (
              <Loader2 aria-hidden="true" size={16} className="animate-spin" />
            ) : null}
            {g.name}
            <span className="text-[11px] font-semibold text-zinc-400">
              {g.memberCount}
            </span>
          </button>
        );
      })}
      <Link
        href="/groups/manage"
        aria-label="그룹 만들기/참여"
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-dashed border-zinc-300 text-zinc-400 transition hover:border-emerald-400 hover:text-emerald-500 dark:border-zinc-600"
      >
        <Plus aria-hidden="true" size={16} />
      </Link>
    </div>
  );
}
