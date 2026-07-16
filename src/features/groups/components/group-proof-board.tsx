"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Dumbbell, X } from "lucide-react";

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

/** 인증한 멤버의 큰 카드 — 무음 루프 영상 + 이름 + 시각. */
function ProofCard({ member }: { member: ProofMember }) {
  const proof = member.proof!;
  return (
    <figure className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-zinc-900">
      {proof.mediaType === "gif" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={proof.mediaUrl}
          alt={`${member.name} 인증`}
          className="h-full w-full object-cover"
        />
      ) : (
        <video
          src={proof.mediaUrl}
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover"
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

      {proof.caption ? (
        <p className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 text-sm font-medium text-white drop-shadow">
          {proof.caption}
        </p>
      ) : null}
    </figure>
  );
}

/** 아직 인증 안 한 다른 그룹원 — 흐린 플레이스홀더. */
function PendingCard({ member }: { member: ProofMember }) {
  return (
    <div className="relative flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-zinc-300 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800/50">
      <Dumbbell size={26} className="text-zinc-400" />
      <span className="text-sm font-bold text-zinc-500 dark:text-zinc-400">
        {member.name}
      </span>
      <span className="text-[11px] text-zinc-400">아직 인증 전</span>
    </div>
  );
}

/** 내 카드(아직 인증 전) — 탭하면 카메라를 열어 인증한다. */
function MyRecordCard() {
  return (
    <div className="relative flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/30">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white">
        <Camera size={24} />
      </span>
      <span className="text-sm font-black text-emerald-800 dark:text-emerald-300">
        탭하여 오늘 인증
      </span>
      <span className="text-[11px] text-emerald-700/70 dark:text-emerald-400/70">
        3초 운동 인증
      </span>
    </div>
  );
}

/**
 * 오늘 운동 인증 움짤 피드.
 *  - 내 카드(아직 인증 전)를 탭하면 카메라로 인증. 내가 올린 영상은 우하단 X 로 삭제.
 *  - 다른 그룹원 카드를 탭하면 그 사람 오늘 운동·식단을 본다.
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
    <div className="w-full">
      {/* 헤더 — 그룹 전환 칩 + 위쪽 빈 여백(패딩) */}
      <header className="px-4 pt-3 sm:px-6">
        <GroupSwitcher groups={groups} currentId={board.id} />
        <div className="h-8" />
      </header>

      {/* 피드 */}
      <div className="px-4 pb-10 sm:px-6">
        <div className="grid grid-cols-2 gap-3">
          {posted.map((m) =>
            m.isMe ? (
              // 내가 올린 영상 — 탭하면 내 오늘 기록, 우하단 X 로 삭제.
              <div key={m.userId} className="relative">
                <button
                  type="button"
                  onClick={() => setSelected(m)}
                  className="block w-full rounded-2xl text-left transition active:scale-[0.98]"
                >
                  <ProofCard member={m} />
                </button>
                <button
                  type="button"
                  onClick={removeMine}
                  disabled={deleting}
                  aria-label="내 인증 삭제"
                  className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white shadow-lg active:scale-90 disabled:opacity-50"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                key={m.userId}
                type="button"
                onClick={() => setSelected(m)}
                className="block rounded-2xl text-left transition active:scale-[0.98]"
              >
                <ProofCard member={m} />
              </button>
            ),
          )}
          {pending.map((m) =>
            m.isMe ? (
              // 내 카드(아직 인증 전) — 탭하면 카메라로 인증.
              <button
                key={m.userId}
                type="button"
                onClick={() => setRecording(true)}
                className="block rounded-2xl text-left transition active:scale-[0.98]"
              >
                <MyRecordCard />
              </button>
            ) : (
              <button
                key={m.userId}
                type="button"
                onClick={() => setSelected(m)}
                className="block rounded-2xl text-left transition active:scale-[0.98]"
              >
                <PendingCard member={m} />
              </button>
            ),
          )}
        </div>
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
