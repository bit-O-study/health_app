"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Crown, Plus, Users } from "lucide-react";

import {
  createGroupAction,
  joinGroupByTokenAction,
} from "@/features/groups/group-actions";
import { GroupControls } from "@/features/groups/components/group-controls";
import {
  DEFAULT_GROUP_MODE,
  groupTabHref,
  type GroupMode,
} from "@/features/groups/group-mode";
import type { GroupSummary } from "@/features/groups/data-access";

/** 붙여넣은 값에서 토큰만 추출 — 전체 URL이면 마지막 경로, 아니면 그대로. */
function extractToken(input: string): string {
  const s = input.trim();
  const m = s.match(/\/groups\/join\/([^/?#\s]+)/);
  if (m) return m[1];
  return s.replace(/[/?#\s]/g, "");
}

export function GroupsClient({
  groups,
  mode = DEFAULT_GROUP_MODE,
}: {
  groups: GroupSummary[];
  /** 그룹탭 전역 모드 — 초대 카드 문구용. */
  mode?: GroupMode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [invite, setInvite] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function create() {
    setErr(null);
    start(async () => {
      const res = await createGroupAction(name);
      // 그룹탭 정식 경로 — 현재 모드(헬스장/인증)에 맞는 화면으로 들어간다.
      if (res.ok && res.id) router.push(groupTabHref(res.id));
      else if (!res.ok) setErr(res.error);
    });
  }

  function join() {
    setErr(null);
    const token = extractToken(invite);
    if (!token) return setErr("초대 링크나 코드를 입력하세요.");
    start(async () => {
      const res = await joinGroupByTokenAction(token);
      if (res.ok && res.id) router.push(groupTabHref(res.id));
      else if (!res.ok) setErr(res.error);
    });
  }

  const field =
    "h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-base outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

  return (
    <div className="space-y-6">
      {err ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40">
          {err}
        </p>
      ) : null}

      {/* 내 그룹 */}
      <section className="space-y-2">
        <h2 className="text-sm font-bold text-zinc-500 dark:text-zinc-400">내 그룹</h2>
        {groups.length === 0 ? (
          <p className="rounded-xl border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-400 dark:border-zinc-700">
            아직 그룹이 없어요. 그룹을 만들거나 초대 링크로 참여하세요.
          </p>
        ) : (
          <ul className="space-y-2">
            {groups.map((g) => (
              <li
                key={g.id}
                className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
              >
                <Link
                  href={`/groups?g=${g.id}`}
                  className="group flex items-center gap-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <Users aria-hidden="true" size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {g.name}
                      {g.isOwner ? (
                        <Crown aria-hidden="true" size={13} className="text-amber-500" />
                      ) : null}
                    </p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      멤버 {g.memberCount}명
                    </p>
                  </div>
                  <ChevronRight
                    aria-hidden="true"
                    size={16}
                    className="shrink-0 text-zinc-400 transition group-hover:translate-x-1"
                  />
                </Link>
                <div className="mt-2 border-t border-zinc-100 pt-2 dark:border-zinc-800">
                  <GroupControls
                    groupId={g.id}
                    groupName={g.name}
                    inviteToken={g.inviteToken}
                    isOwner={g.isOwner}
                    compact
                    mode={mode}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 그룹 만들기 */}
      <section className="space-y-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-bold text-zinc-700 dark:text-zinc-200">새 그룹 만들기</h2>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="그룹 이름 (예: 헬스 모임)"
          aria-label="그룹 이름"
          className={field}
        />
        <button
          type="button"
          disabled={pending || name.trim() === ""}
          onClick={create}
          className="flex h-11 w-full items-center justify-center gap-1 rounded-xl bg-emerald-600 text-base font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          <Plus aria-hidden="true" size={18} /> 그룹 만들기
        </button>
      </section>

      {/* 초대 링크로 참여 */}
      <section className="space-y-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-bold text-zinc-700 dark:text-zinc-200">초대 링크로 참여</h2>
        <input
          value={invite}
          onChange={(e) => setInvite(e.target.value)}
          placeholder="초대 링크 붙여넣기"
          aria-label="초대 링크"
          className={field}
        />
        <button
          type="button"
          disabled={pending || invite.trim() === ""}
          onClick={join}
          className="h-11 w-full rounded-xl border border-emerald-300 bg-emerald-50 text-base font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          참여하기
        </button>
      </section>
    </div>
  );
}
