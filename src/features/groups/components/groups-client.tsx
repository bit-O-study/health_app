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

  // 아이폰 입력칸 느낌 — 테두리 대신 옅은 회색 바탕. 버튼과 한 줄에 놓는다(2026-09-16 촘촘하게).
  const field =
    "h-10 min-w-0 flex-1 rounded-[10px] bg-zinc-100 px-3 text-base outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-brand/40 dark:bg-white/[0.08] dark:text-zinc-100";

  return (
    <div className="space-y-4">
      {err ? (
        <p className="rounded-[10px] bg-danger/10 px-3 py-2 text-sm text-danger">
          {err}
        </p>
      ) : null}

      {/* 내 그룹 — 없으면 섹션째 숨긴다(빈 안내 문장 대신 아래 만들기/참여가 바로 보이게). */}
      {groups.length === 0 ? null : (
        <section>
          <h2 className="app-section-label">내 그룹</h2>
          <ul className="app-list">
            {groups.map((g) => (
              <li key={g.id}>
                <Link
                  href={`/groups?g=${g.id}`}
                  className="app-row transition active:bg-zinc-100 dark:active:bg-white/[0.06]"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300">
                    <Users aria-hidden="true" size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 truncate text-base leading-5 text-zinc-900 dark:text-zinc-100">
                      {g.name}
                      {g.isOwner ? (
                        <Crown aria-hidden="true" size={13} className="text-amber-500" />
                      ) : null}
                    </span>
                    <span className="block text-xs leading-4 text-zinc-500 dark:text-zinc-400">
                      멤버 {g.memberCount}명
                    </span>
                  </span>
                  <ChevronRight aria-hidden="true" size={16} className="shrink-0 text-zinc-400" />
                </Link>
                <div className="pb-2.5 pl-[3.25rem] pr-3">
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
        </section>
      )}

      {/* 그룹 만들기 — 입력칸 + 버튼 한 줄 */}
      <section>
        <h2 className="app-section-label">새 그룹 만들기</h2>
        <div className="app-card flex items-center gap-2 p-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="그룹 이름"
            aria-label="그룹 이름"
            className={field}
          />
          <button
            type="button"
            disabled={pending || name.trim() === ""}
            onClick={create}
            aria-label="그룹 만들기"
            className="app-press inline-flex h-10 shrink-0 items-center gap-1 rounded-[10px] bg-brand px-3.5 text-sm font-semibold text-white disabled:opacity-40 dark:text-zinc-950"
          >
            <Plus aria-hidden="true" size={16} /> 만들기
          </button>
        </div>
      </section>

      {/* 초대 링크로 참여 — 입력칸 + 버튼 한 줄 */}
      <section>
        <h2 className="app-section-label">초대 링크로 참여</h2>
        <div className="app-card flex items-center gap-2 p-2">
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
            className="app-press inline-flex h-10 shrink-0 items-center rounded-[10px] bg-zinc-100 px-3.5 text-sm font-semibold text-brand disabled:opacity-40 dark:bg-white/[0.08]"
          >
            참여하기
          </button>
        </div>
      </section>
    </div>
  );
}
