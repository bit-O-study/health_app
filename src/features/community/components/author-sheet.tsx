"use client";

import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ban, Loader2, Play, X } from "lucide-react";

import { useBackClose } from "@/lib/platform/use-back-close";
import { characterEmoji, pastelClass } from "@/features/groups/avatar";
import type { AuthorProfile, FeedPost } from "../data-access";
import type { ReportTargetKind } from "../report";
import { getAuthorProfileAction } from "../community-actions";
import { blockAuthorAction } from "../report-actions";

/**
 * 작성자 이름 — 누르면 그 사람의 프로필 시트(커뮤니티 4-2).
 * 카드(누르면 상세로 가는 목록 줄) 안에 있어도 클릭이 카드로 올라가지 않게 막는다.
 */
export function AuthorName({
  userId,
  name,
  isMine = false,
  blockTarget,
  leaveOnBlock,
  onBlocked,
  className,
}: {
  userId: string;
  name: string;
  isMine?: boolean;
  /** 차단할 때 서버가 작성자를 찾을 원본(글·댓글). 없으면 차단 버튼을 안 보인다. */
  blockTarget?: { kind: ReportTargetKind; id: string };
  /** 차단 뒤 이 화면을 떠난다(상세 — 그 글이 이제 안 보인다). */
  leaveOnBlock?: () => void;
  /** 차단 뒤(시트를 닫고) — 댓글 목록 다시 읽기 등. 없으면 화면을 새로 그린다. */
  onBlocked?: () => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`${name} 프로필 보기`}
        className={className ?? "truncate text-left font-semibold hover:underline"}
      >
        {name}
      </button>
      {open ? (
        <AuthorSheet
          userId={userId}
          name={name}
          isMine={isMine}
          blockTarget={blockTarget}
          leaveOnBlock={leaveOnBlock}
          onBlocked={onBlocked}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
}

function tileLabel(p: FeedPost): string {
  if (p.kind === "teaching") return p.exerciseTag ? `#${p.exerciseTag}` : "영상";
  if (p.postType === "question") return p.title ?? "질문";
  return p.workoutSnapshot?.exercises[0]?.name ?? "오운완";
}

function AuthorSheet({
  userId,
  name,
  isMine,
  blockTarget,
  leaveOnBlock,
  onBlocked,
  onClose,
}: {
  userId: string;
  name: string;
  isMine: boolean;
  blockTarget?: { kind: ReportTargetKind; id: string };
  leaveOnBlock?: () => void;
  onBlocked?: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<AuthorProfile | null | undefined>(undefined);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  useBackClose(true, () => {
    if (!pending) onClose();
  });

  useEffect(() => {
    let alive = true;
    getAuthorProfileAction(userId).then((p) => {
      if (alive) setProfile(p);
    });
    return () => {
      alive = false;
    };
  }, [userId]);

  function block() {
    if (!blockTarget) return;
    setError(null);
    start(async () => {
      const r = await blockAuthorAction({ targetKind: blockTarget.kind, targetId: blockTarget.id });
      if (!r.ok) {
        setError(r.error);
        return;
      }
      // 화면을 옮길 거면 시트를 먼저 닫지 않는다(닫기가 쌓아 둔 '뒤로'가 이동을 되돌린다).
      if (leaveOnBlock) {
        leaveOnBlock();
        return;
      }
      onClose();
      if (onBlocked) onBlocked();
      else router.refresh();
    });
  }

  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center"
      onClick={(e) => {
        e.stopPropagation();
        if (!pending) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`${name} 프로필`}
        className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100 sm:rounded-3xl sm:pb-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl ${pastelClass(name)}`}>
            {characterEmoji(name)}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-bold">{name}</h3>
            {profile ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400" data-testid="author-stats">
                이번 달 글 <b className="text-zinc-900 dark:text-zinc-100">{profile.monthPosts}</b>개 · 채택된 답변{" "}
                <b className="text-zinc-900 dark:text-zinc-100">{profile.acceptedAnswers}</b>개
              </p>
            ) : null}
          </div>
          <button type="button" aria-label="닫기" onClick={() => !pending && onClose()} className="self-start rounded-full p-1 text-zinc-400">
            <X size={20} />
          </button>
        </div>

        <div className="mt-4">
          {profile === undefined ? (
            <p className="flex justify-center py-8 text-zinc-400">
              <Loader2 aria-label="불러오는 중" size={20} className="animate-spin" />
            </p>
          ) : !profile || profile.posts.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">볼 수 있는 글이 없어요</p>
          ) : (
            <ul className="grid grid-cols-3 gap-1" data-testid="author-posts">
              {profile.posts.map((p) => (
                <li key={`${p.kind}:${p.id}`}>
                  <Link
                    href={p.kind === "teaching" ? `/community/reel/${p.id}` : `/community/${p.id}`}
                    className="relative flex aspect-square items-center justify-center overflow-hidden rounded-md bg-zinc-100 p-1.5 text-center text-xs font-semibold text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {p.photoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.photoUrl} alt={tileLabel(p)} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                    ) : (
                      <span className="line-clamp-3 break-words">
                        {p.kind === "teaching" ? <Play aria-hidden="true" size={14} className="mx-auto mb-0.5" /> : null}
                        {p.postType === "question" ? <span className="block text-brand">질문</span> : null}
                        {tileLabel(p)}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-zinc-400">내가 볼 수 있는 글만 보여요.<br />몸무게·신체 정보는 보이지 않아요.</p>
        </div>

        {!isMine && blockTarget ? (
          confirmBlock ? (
            <div className="mt-4 flex flex-col gap-2 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800/60">
              <p className="text-sm">
                <b>{name}</b>님을 차단할까요? 서로의 글과 댓글이 보이지 않아요.
              </p>
              {error ? (
                <p role="alert" className="text-sm font-semibold text-danger">
                  {error}
                </p>
              ) : null}
              <div className="flex gap-2">
                <button type="button" disabled={pending} onClick={() => setConfirmBlock(false)} className="min-h-11 flex-1 rounded-xl border border-zinc-200 text-sm font-semibold dark:border-zinc-700">
                  취소
                </button>
                <button type="button" disabled={pending} onClick={block} className="min-h-11 flex-1 rounded-xl bg-danger text-sm font-semibold text-white disabled:opacity-60">
                  {pending ? <Loader2 size={15} className="mx-auto animate-spin" /> : "차단"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmBlock(true)}
              className="mt-4 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-zinc-500 hover:text-danger dark:text-zinc-400"
            >
              <Ban size={15} /> 차단하기
            </button>
          )
        ) : null}
      </section>
    </div>,
    document.body,
  );
}
