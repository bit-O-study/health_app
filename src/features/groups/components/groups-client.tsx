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

  // 아이폰 입력칸 느낌 — 테두리 대신 옅은 회색 바탕.
  const field =
    "h-11 w-full rounded-[10px] bg-zinc-100 px-3 text-base outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-brand/40 dark:bg-white/[0.08] dark:text-zinc-100";

  return (
    <div className="space-y-6">
      {err ? (
        <p className="rounded-[10px] bg-danger/10 px-3 py-2 text-sm text-danger">
          {err}
        </p>
      ) : null}

      {/* 내 그룹 — 없으면 섹션째 숨긴다(빈 안내 문장 대신 아래 만들기/참여가 바로 보이게). */}
      {groups.length === 0 ? null : (
      <section className="space-y-2">
        <h2 className="px-1 text-sm font-medium text-zinc-500 dark:text-zinc-400">내 그룹</h2>
        {(
          <ul className="space-y-2">
            {groups.map((g) => (
              <li
                key={g.id}
                className="app-card p-3"
              >
                <Link
                  href={`/groups?g=${g.id}`}
                  className="group flex items-center gap-3"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-zinc-100 text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300">
                    <Users aria-hidden="true" size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 truncate text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {g.name}
                      {g.isOwner ? (
                        <Crown aria-hidden="true" size={13} className="text-amber-500" />
                      ) : null}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
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
      )}

      {/* 그룹 만들기 */}
      <section className="app-card space-y-2 p-4">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">새 그룹 만들기</h2>
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
          className="app-press flex h-11 w-full items-center justify-center gap-1 rounded-full bg-brand text-base font-semibold text-white disabled:opacity-40 dark:text-zinc-950"
        >
          <Plus aria-hidden="true" size={18} /> 그룹 만들기
        </button>
      </section>

      {/* 초대 링크로 참여 */}
      <section className="app-card space-y-2 p-4">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">초대 링크로 참여</h2>
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
          className="app-press h-11 w-full rounded-full bg-zinc-100 text-base font-semibold text-brand disabled:opacity-40 dark:bg-white/[0.08]"
        >
          참여하기
        </button>
      </section>
    </div>
  );
}
