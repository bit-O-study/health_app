"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Heart,
  Loader2,
  MessageCircle,
  Search,
  Send,
  Trash2,
  Video,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { characterEmoji, pastelClass } from "@/features/groups/avatar";
import { relativeTime } from "../community";
import type { FeedPost } from "../data-access";
import { ReportButton } from "./report-button";
import {
  addTeachingCommentAction,
  deleteTeachingCommentAction,
  deleteTeachingPostAction,
  listTeachingCommentsAction,
  toggleTeachingLikeAction,
  type TeachingComment,
} from "@/features/teaching/teaching-actions";

/**
 * 운동(티칭) 게시판 — 유튜브 숏츠/인스타 릴스 스타일 세로 풀스크린 피드.
 * 스크롤 스냅으로 한 화면에 한 영상. 화면 중앙에 온 영상만 자동재생(음소거 시작),
 * 나머지는 정지. 탭으로 재생/일시정지, 우측 하단 스피커로 음소거 토글.
 */
export function TeachingReels({
  posts,
  canModerate,
  onChanged,
}: {
  posts: FeedPost[];
  canModerate: boolean;
  onChanged: () => void;
}) {
  // 음소거 상태는 슬라이드 간 유지(한 번 켜면 계속 소리).
  const [muted, setMuted] = useState(true);

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-fuchsia-50 text-fuchsia-500 dark:bg-fuchsia-950/40">
          <Search size={28} />
        </div>
        <p className="text-sm font-bold text-zinc-500 dark:text-zinc-300">
          해당하는 운동 영상이 없어요
        </p>
        <p className="text-xs text-zinc-400">
          운동모드에서 티칭 영상을 올리면 여기에 숏츠처럼 쌓여요! 🎬
        </p>
      </div>
    );
  }

  return (
    <div className="h-full snap-y snap-mandatory overflow-y-scroll overscroll-contain bg-black [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {posts.map((p) => (
        <ReelSlide
          key={p.id}
          post={p}
          muted={muted}
          onToggleMute={() => setMuted((m) => !m)}
          canModerate={canModerate}
          onChanged={onChanged}
        />
      ))}
    </div>
  );
}

function ReelSlide({
  post,
  muted,
  onToggleMute,
  canModerate,
  onChanged,
}: {
  post: FeedPost;
  muted: boolean;
  onToggleMute: () => void;
  canModerate: boolean;
  onChanged: () => void;
}) {
  const slideRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [now] = useState(() => Date.now());
  const [active, setActive] = useState(false);
  const [paused, setPaused] = useState(false);
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [burst, setBurst] = useState(false);
  const [gone, setGone] = useState(false);
  const [comments, setComments] = useState(false);
  const [pending, start] = useTransition();

  // 화면 중앙에 온 영상만 재생, 벗어나면 정지(+처음으로).
  useEffect(() => {
    const el = slideRef.current;
    const v = videoRef.current;
    if (!el || !v) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const on = e.isIntersecting && e.intersectionRatio >= 0.6;
          setActive(on);
          if (on) {
            setPaused(false);
            v.play().catch(() => {});
          } else {
            v.pause();
            try {
              v.currentTime = 0;
            } catch {
              /* noop */
            }
          }
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // 음소거 상태 동기화.
  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
  }

  function setLike(next: boolean) {
    if (next === liked) return;
    setLiked(next);
    setLikeCount((c) => c + (next ? 1 : -1));
    start(async () => {
      const r = await toggleTeachingLikeAction(post.id);
      if (!r.ok) {
        setLiked(!next);
        setLikeCount((c) => c + (next ? -1 : 1));
      }
    });
  }
  function doubleTapLike() {
    setLike(true);
    setBurst(true);
    window.setTimeout(() => setBurst(false), 650);
  }

  function remove() {
    if (!confirm("이 영상을 삭제할까요?")) return;
    start(async () => {
      const r = await deleteTeachingPostAction(post.id);
      if (r.ok) {
        setGone(true);
        onChanged();
      } else {
        alert(r.error);
      }
    });
  }

  if (gone) return null;
  const when = relativeTime(new Date(post.createdAt).getTime(), now);

  return (
    <div
      ref={slideRef}
      className="relative flex h-full w-full snap-start snap-always items-center justify-center bg-black"
    >
      <video
        ref={videoRef}
        src={post.videoUrl ?? undefined}
        loop
        muted
        playsInline
        preload="none"
        onClick={togglePlay}
        onDoubleClick={doubleTapLike}
        className="h-full w-full object-contain"
      />

      {/* 일시정지 표시 */}
      {active && paused ? (
        <span className="pointer-events-none absolute flex h-16 w-16 items-center justify-center rounded-full bg-black/40 text-white">
          <Video size={28} />
        </span>
      ) : null}

      {/* 더블탭 하트 */}
      {burst ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <Heart size={100} className="animate-ping fill-white/90 text-white/90 drop-shadow" />
        </span>
      ) : null}

      {/* 좌하단: 작성자 · 태그 · 캡션 */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 pr-16 text-white">
        <div className="flex items-center gap-2">
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ${pastelClass(
              post.authorName,
            )}`}
          >
            {characterEmoji(post.authorName)}
          </span>
          <span className="truncate text-sm font-bold">{post.authorName}</span>
          <span className="text-[11px] text-white/70">{when}</span>
        </div>
        {post.exerciseTag ? (
          <span className="mt-2 inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-[12px] font-bold backdrop-blur">
            #{post.exerciseTag}
          </span>
        ) : null}
        {post.caption ? (
          <p className="mt-2 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-relaxed">
            {post.caption}
          </p>
        ) : null}
      </div>

      {/* 우측 액션 레일: 댓글 · 좋아요 · 음소거 · (신고) · (삭제)
          ⚠ 레일은 아래에서 위로 쌓여 맨 아래 항목(삭제)이 하단 탭바에 가장 가깝다.
          데스크톱 실측 여유가 16px 뿐이라 실기기(safe-area/제스처바)에선 삭제 버튼이
          탭바에 가려진다는 제보가 있어, 기기 inset 만큼 여유를 더 준다.
          (데스크톱은 inset=0 이라 기존과 동일) */}
      <div className="absolute bottom-[calc(1rem+env(safe-area-inset-bottom))] right-2 flex flex-col items-center gap-4 text-white">
        <button
          type="button"
          onClick={() => setComments(true)}
          aria-label="댓글"
          className="flex flex-col items-center gap-0.5 transition-transform active:scale-110"
        >
          <MessageCircle size={30} className="text-white drop-shadow" />
          <span className="text-xs font-bold drop-shadow">{commentCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setLike(!liked)}
          disabled={pending}
          aria-label="좋아요"
          className="flex flex-col items-center gap-0.5 transition-transform active:scale-125 disabled:opacity-60"
        >
          <Heart
            size={30}
            className={liked ? "fill-rose-500 text-rose-500" : "text-white drop-shadow"}
          />
          <span className="text-xs font-bold drop-shadow">{likeCount}</span>
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={muted ? "소리 켜기" : "소리 끄기"}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 backdrop-blur"
        >
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>

        {!post.isMine ? (
          <ReportButton
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white/90 backdrop-blur hover:text-rose-400"
            targetKind="teaching_post"
            targetId={post.id}
            targetUserId={post.userId}
            targetAuthor={post.authorName}
            targetPreview={post.caption}
            iconSize={18}
          />
        ) : null}

        {canModerate || post.isMine ? (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            aria-label="삭제"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white/90 backdrop-blur hover:text-rose-400 disabled:opacity-50"
          >
            <Trash2 size={18} />
          </button>
        ) : null}
      </div>

      {comments ? (
        <CommentSheet
          postId={post.id}
          onClose={() => setComments(false)}
          onCountChange={setCommentCount}
        />
      ) : null}
    </div>
  );
}

/** 티칭 영상 댓글 시트 — 목록 + 작성 + 삭제(본인). */
function CommentSheet({
  postId,
  onClose,
  onCountChange,
}: {
  postId: string;
  onClose: () => void;
  onCountChange: (n: number) => void;
}) {
  const [now] = useState(() => Date.now());
  const [list, setList] = useState<TeachingComment[] | null>(null);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();

  useEffect(() => {
    let alive = true;
    listTeachingCommentsAction(postId).then((rows) => {
      if (alive) setList(rows);
    });
    return () => {
      alive = false;
    };
  }, [postId]);

  function submit() {
    const body = text.trim();
    if (!body) return;
    start(async () => {
      const r = await addTeachingCommentAction(postId, body);
      if (r.ok) {
        setText("");
        const rows = await listTeachingCommentsAction(postId);
        setList(rows);
        onCountChange(rows.length);
      } else {
        alert(r.error);
      }
    });
  }

  function remove(id: string) {
    start(async () => {
      const r = await deleteTeachingCommentAction(id);
      if (r.ok) {
        const rows = await listTeachingCommentsAction(postId);
        setList(rows);
        onCountChange(rows.length);
      } else {
        alert(r.error);
      }
    });
  }

  return (
    <div
      className="absolute inset-0 z-30 flex flex-col justify-end"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative flex max-h-[70%] flex-col rounded-t-3xl bg-white text-zinc-900 dark:bg-zinc-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <span className="text-sm font-extrabold">
            댓글 {list?.length ?? 0}
          </span>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="rounded-full p-1 text-zinc-400"
          >
            <X size={20} />
          </button>
        </div>

        <div className="min-h-[120px] flex-1 overflow-y-auto px-4 py-3">
          {list === null ? (
            <div className="flex justify-center py-8 text-zinc-400">
              <Loader2 size={20} className="animate-spin" />
            </div>
          ) : list.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-400">
              첫 댓글을 남겨보세요 💬
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {list.map((c) => (
                <li key={c.id} className="flex items-start gap-2">
                  <span
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm ${pastelClass(
                      c.authorName,
                    )}`}
                  >
                    {characterEmoji(c.authorName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs">
                      <span className="font-bold">{c.authorName}</span>
                      <span className="ml-1.5 text-zinc-400">
                        {relativeTime(new Date(c.createdAt).getTime(), now)}
                      </span>
                    </p>
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {c.body}
                    </p>
                  </div>
                  {c.isMine ? (
                    <button
                      type="button"
                      aria-label="댓글 삭제"
                      onClick={() => remove(c.id)}
                      disabled={pending}
                      className="text-zinc-300 hover:text-rose-500 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  ) : (
                    <ReportButton
                      className="text-zinc-300 hover:text-rose-500"
                      targetKind="teaching_comment"
                      targetId={c.id}
                      targetAuthor={c.authorName}
                      targetPreview={c.body}
                      iconSize={13}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          className="flex items-center gap-2 border-t border-zinc-100 px-3 py-2.5 dark:border-zinc-800"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.625rem)" }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 300))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
            }}
            placeholder="댓글 달기…"
            className="h-10 flex-1 rounded-full border border-zinc-200 bg-zinc-50 px-4 text-sm outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-800"
          />
          <button
            type="button"
            onClick={submit}
            disabled={pending || !text.trim()}
            aria-label="댓글 등록"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white disabled:opacity-40"
          >
            {pending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
