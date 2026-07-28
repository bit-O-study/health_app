"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Heart,
  Loader2,
  MessageCircle,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";

import { characterEmoji, pastelClass } from "@/features/groups/avatar";
import { relativeTime, MAX_CAPTION } from "../community";
import type { CommunityComment, CommunityPost } from "../data-access";
import { ReportButton } from "./report-button";
import {
  addCommentAction,
  deleteCommentAction,
  deleteCommunityPostAction,
  editCommunityPostAction,
  listCommentsAction,
  toggleLikeAction,
} from "../community-actions";

/** 게시물 상세 — 좌상단 이름·작성시간 → 글내용 → 사진 → 좋아요/댓글. */
export function PostDetail({
  post,
  initialComments,
  canManage,
}: {
  post: CommunityPost;
  initialComments: CommunityComment[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [now] = useState(() => Date.now());

  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [comments, setComments] = useState<CommunityComment[]>(initialComments);
  const [body, setBody] = useState("");

  const [editing, setEditing] = useState(false);
  const [caption, setCaption] = useState(post.caption ?? "");
  const [menuOpen, setMenuOpen] = useState(false);

  const when = relativeTime(new Date(post.createdAt).getTime(), now);

  function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    start(async () => {
      const r = await toggleLikeAction(post.id);
      if (!r.ok) {
        setLiked(!next);
        setLikeCount((c) => c + (next ? -1 : 1));
      }
    });
  }

  async function reloadComments() {
    setComments(await listCommentsAction(post.id));
  }

  function addComment() {
    const text = body.trim();
    if (!text) return;
    start(async () => {
      const r = await addCommentAction(post.id, text);
      if (r.ok) {
        setBody("");
        await reloadComments();
      } else {
        alert(r.error);
      }
    });
  }

  function removeComment(id: string) {
    start(async () => {
      const r = await deleteCommentAction(id);
      if (r.ok) await reloadComments();
      else alert(r.error);
    });
  }

  function saveCaption() {
    start(async () => {
      const r = await editCommunityPostAction(post.id, caption);
      if (r.ok) {
        setEditing(false);
        router.refresh();
      } else {
        alert(r.error);
      }
    });
  }

  function removePost() {
    if (!confirm("이 게시물을 삭제할까요?")) return;
    start(async () => {
      const r = await deleteCommunityPostAction(post.id);
      if (r.ok) router.push("/community");
      else alert(r.error);
    });
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <Link
          href="/community"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          <ChevronLeft size={16} /> 커뮤니티
        </Link>
        {canManage || !post.isMine ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="더보기"
              aria-expanded={menuOpen}
              className="rounded-full p-1 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <MoreVertical size={18} />
            </button>
            {menuOpen ? (
              <>
                {/* 바깥 클릭 닫기 */}
                <button
                  type="button"
                  aria-label="메뉴 닫기"
                  onClick={() => setMenuOpen(false)}
                  className="fixed inset-0 z-10 cursor-default"
                />
                <div className="absolute right-0 top-9 z-20 w-28 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
                  {canManage ? (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          setEditing(true);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-700"
                      >
                        <Pencil size={14} /> 수정
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false);
                          removePost();
                        }}
                        disabled={pending}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-zinc-50 disabled:opacity-50 dark:hover:bg-zinc-700"
                      >
                        <Trash2 size={14} /> 삭제
                      </button>
                    </>
                  ) : null}
                  {!post.isMine ? (
                    <div onClick={() => setMenuOpen(false)}>
                      <ReportButton
                        targetKind="community_post"
                        targetId={post.id}
                        targetUserId={post.userId}
                        targetAuthor={post.authorName}
                        targetPreview={post.caption}
                        label="신고"
                        iconSize={14}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-zinc-50 dark:hover:bg-zinc-700"
                      />
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* 좌상단: 이름 + 작성시간 */}
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full text-lg ${pastelClass(
            post.authorName,
          )}`}
        >
          {characterEmoji(post.authorName)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{post.authorName}</p>
          <p className="text-[11px] text-zinc-400">{when}</p>
        </div>
        {post.groupName ? (
          <span className="ml-auto rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            # {post.groupName}
          </span>
        ) : null}
      </div>

      {/* 바로 밑: 글 내용 */}
      {editing ? (
        <div className="mb-3">
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))}
            rows={2}
            className="w-full resize-none rounded-xl border border-zinc-200 bg-white p-3 text-sm outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-800"
          />
          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setCaption(post.caption ?? "");
              }}
              className="rounded-lg px-3 py-1 text-xs font-bold text-zinc-500"
            >
              취소
            </button>
            <button
              type="button"
              onClick={saveCaption}
              disabled={pending}
              className="rounded-lg bg-emerald-500 px-3 py-1 text-xs font-bold text-white disabled:opacity-60"
            >
              저장
            </button>
          </div>
        </div>
      ) : post.caption ? (
        <p className="mb-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed">
          {post.caption}
        </p>
      ) : null}

      {/* 밑: 사진 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={post.photoUrl}
        alt="오운완 인증"
        className="w-full rounded-2xl bg-zinc-100 object-cover dark:bg-zinc-800"
      />

      {/* 좋아요 / 댓글 수 */}
      <div className="mt-3 flex items-center gap-4 border-b border-zinc-100 pb-3 dark:border-zinc-800">
        <button
          type="button"
          onClick={toggleLike}
          disabled={pending}
          className="inline-flex items-center gap-1.5 text-sm font-bold disabled:opacity-60"
        >
          <Heart
            size={20}
            className={liked ? "fill-rose-500 text-rose-500" : "text-zinc-400"}
          />
          {likeCount}
        </button>
        <span className="inline-flex items-center gap-1.5 text-sm font-bold text-zinc-500">
          <MessageCircle size={20} className="text-zinc-400" />
          {comments.length}
        </span>
      </div>

      {/* 댓글 */}
      <div className="space-y-3 py-3">
        {comments.length === 0 ? (
          <p className="py-4 text-center text-sm text-zinc-400">
            첫 댓글을 남겨보세요!
          </p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex items-start gap-2">
              <span
                className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm ${pastelClass(
                  c.authorName,
                )}`}
              >
                {characterEmoji(c.authorName)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
                  {c.authorName}
                  <span className="ml-1.5 font-normal text-zinc-400">
                    {relativeTime(new Date(c.createdAt).getTime(), now)}
                  </span>
                </p>
                <p className="whitespace-pre-wrap break-words text-sm">
                  {c.body}
                </p>
              </div>
              {c.isMine || canManage ? (
                <button
                  type="button"
                  onClick={() => removeComment(c.id)}
                  disabled={pending}
                  aria-label="댓글 삭제"
                  className="shrink-0 text-zinc-300 hover:text-rose-500 disabled:opacity-50"
                >
                  <Trash2 size={13} />
                </button>
              ) : (
                <ReportButton
                  className="shrink-0 text-zinc-300 hover:text-rose-500"
                  targetKind="community_comment"
                  targetId={c.id}
                  targetUserId={c.userId}
                  targetAuthor={c.authorName}
                  targetPreview={c.body}
                  iconSize={13}
                />
              )}
            </div>
          ))
        )}
      </div>

      {/* 댓글 입력 — 하단 고정탭(4rem) + 제스처바(safe-area) 위에 붙게 오프셋. */}
      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] flex items-center gap-2 bg-white py-2 dark:bg-zinc-900">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 300))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing) addComment();
          }}
          placeholder="댓글 달기…"
          className="h-10 min-w-0 flex-1 rounded-full border border-zinc-200 px-4 text-sm outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-800"
        />
        <button
          type="button"
          onClick={addComment}
          disabled={pending || !body.trim()}
          className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          {pending ? <Loader2 size={14} className="animate-spin" /> : null}등록
        </button>
      </div>
    </div>
  );
}
