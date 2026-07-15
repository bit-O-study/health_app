"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Dumbbell, Lock, RefreshCw, Trash2 } from "lucide-react";

import type { GroupSummary } from "@/features/groups/data-access";
import type { ProofBoard, ProofMember } from "@/features/groups/proof-data";
import { deleteGroupProofAction } from "@/features/groups/proof-actions";
import { GroupSwitcher } from "@/features/groups/components/group-switcher";
import { ProofRecorder } from "@/features/groups/components/proof-recorder";
import { ProofMemberSheet } from "@/features/groups/components/proof-member-sheet";

/** 인증 시각 → 한국시간 "오후 3:24". */
function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("ko-KR", {
      timeZone: "Asia/Seoul",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/** 인증한 멤버의 큰 카드 — 무음 루프 영상 + 이름 + 시각. locked 면 블러+잠금. */
function ProofCard({
  member,
  locked,
}: {
  member: ProofMember;
  locked: boolean;
}) {
  const proof = member.proof!;
  return (
    <figure className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-zinc-900">
      {proof.mediaType === "gif" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={proof.mediaUrl}
          alt={`${member.name} 인증`}
          className={`h-full w-full object-cover ${locked ? "blur-xl scale-110" : ""}`}
        />
      ) : (
        <video
          src={proof.mediaUrl}
          autoPlay
          loop
          muted
          playsInline
          className={`h-full w-full object-cover ${locked ? "blur-xl scale-110" : ""}`}
        />
      )}

      {/* 상단 그라데이션 + 이름/시각 */}
      <figcaption className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-3">
        <span className="flex items-center gap-1.5 text-sm font-bold text-white drop-shadow">
          {member.name}
          {member.isMe ? (
            <span className="rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              나
            </span>
          ) : null}
        </span>
        <span className="text-xs font-semibold text-white/90 drop-shadow">
          {formatTime(proof.createdAt)}
        </span>
      </figcaption>

      {proof.caption && !locked ? (
        <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 text-sm font-medium text-white drop-shadow">
          {proof.caption}
        </p>
      ) : null}

      {locked ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-white/90">
          <Lock size={26} />
          <span className="text-xs font-bold">인증하면 보여요</span>
        </div>
      ) : null}
    </figure>
  );
}

/** 아직 인증 안 한 멤버 — 흐린 플레이스홀더. */
function PendingCard({ member }: { member: ProofMember }) {
  return (
    <div className="relative flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/50">
      <Dumbbell size={26} className="text-zinc-400" />
      <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
        {member.name}
        {member.isMe ? " (나)" : ""}
      </span>
      <span className="text-[11px] text-zinc-400">아직 인증 전</span>
    </div>
  );
}

/**
 * 오늘 운동 인증 움짤 피드 — BeReal 스타일.
 *  - 내가 인증해야 그룹원 인증이 보인다(안 하면 블러+잠금).
 *  - 인증한 사람이 먼저, 최신순. 각 카드에 인증 시각 표시.
 */
export function GroupProofBoard({
  board,
  groups,
}: {
  board: ProofBoard;
  groups: GroupSummary[];
}) {
  const router = useRouter();
  const [recording, setRecording] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // 탭한 그룹원 — 그 사람의 오늘 운동·식단 시트를 연다.
  const [selected, setSelected] = useState<ProofMember | null>(null);

  const iPosted = board.myProof !== null;
  const posted = board.members.filter((m) => m.proof);
  const pending = board.members.filter((m) => !m.proof);

  async function removeMine() {
    if (deleting) return;
    if (!confirm("오늘 인증을 삭제할까요?")) return;
    setDeleting(true);
    await deleteGroupProofAction(board.id);
    setDeleting(false);
    router.refresh();
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-2xl flex-col">
      {/* 헤더 — fixed top-0 라 상태바(시계·배터리)와 안 겹치게 상단 safe-area 인셋. */}
      <header className="shrink-0 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] sm:px-6">
        <GroupSwitcher groups={groups} currentId={board.id} />
        <div className="mt-1 flex items-end justify-between">
          <div>
            <h1 className="text-xl font-black text-zinc-950 dark:text-zinc-50">
              오늘 운동 인증
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              오늘{" "}
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {board.doneCount}
              </span>
              /{board.totalCount}명 인증
            </p>
          </div>
        </div>
      </header>

      {/* 피드 */}
      <div className="flex-1 overflow-y-auto px-4 pb-28 pt-3 sm:px-6">
        {!iPosted ? (
          <div className="mb-4 rounded-2xl bg-emerald-50 p-4 text-center dark:bg-emerald-500/10">
            <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">
              아직 오늘 인증 전이에요
            </p>
            <p className="mt-0.5 text-xs text-emerald-700/80 dark:text-emerald-400/80">
              운동 인증을 올리면 그룹원들의 인증도 볼 수 있어요.
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-3">
          {posted.map((m) => {
            const locked = !iPosted && !m.isMe;
            const card = <ProofCard member={m} locked={locked} />;
            // 잠기지 않은(볼 수 있는) 카드는 탭하면 그 사람의 오늘 운동·식단.
            return locked ? (
              <div key={m.userId}>{card}</div>
            ) : (
              <button
                key={m.userId}
                type="button"
                onClick={() => setSelected(m)}
                className="block rounded-2xl text-left transition active:scale-[0.98]"
              >
                {card}
              </button>
            );
          })}
          {pending.map((m) => (
            <PendingCard key={m.userId} member={m} />
          ))}
        </div>

        {iPosted && posted.length > 0 ? (
          <p className="mt-3 text-center text-[11px] text-zinc-400">
            그룹원을 탭하면 오늘 운동·식단을 볼 수 있어요.
          </p>
        ) : null}

        {board.totalCount === 1 ? (
          <p className="mt-6 text-center text-xs text-zinc-400">
            그룹원을 초대하면 서로의 오늘 운동 인증을 볼 수 있어요.
          </p>
        ) : null}
      </div>

      {/* 하단 고정 CTA */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-10 flex justify-center px-4 pb-3">
        {iPosted ? (
          <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-zinc-900/95 p-1.5 pl-4 shadow-xl backdrop-blur dark:bg-zinc-800/95">
            <span className="text-sm font-bold text-white">오늘 인증 완료 ✓</span>
            <button
              type="button"
              onClick={() => setRecording(true)}
              className="flex items-center gap-1 rounded-full bg-white/15 px-3 py-2 text-xs font-bold text-white active:scale-95"
            >
              <RefreshCw size={14} /> 다시
            </button>
            <button
              type="button"
              onClick={removeMine}
              disabled={deleting}
              aria-label="오늘 인증 삭제"
              className="flex items-center rounded-full bg-white/15 px-3 py-2 text-xs font-bold text-white active:scale-95 disabled:opacity-50"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setRecording(true)}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-emerald-600 px-7 py-3.5 text-base font-black text-white shadow-xl active:scale-95"
          >
            <Camera size={20} /> 운동 인증하기
          </button>
        )}
      </div>

      {recording ? (
        <ProofRecorder groupId={board.id} onClose={() => setRecording(false)} />
      ) : null}

      {selected ? (
        <ProofMemberSheet
          groupId={board.id}
          member={{ userId: selected.userId, name: selected.name }}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </div>
  );
}