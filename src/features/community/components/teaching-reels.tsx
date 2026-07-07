"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Heart, Search, Trash2, Video, Volume2, VolumeX } from "lucide-react";

import { characterEmoji, pastelClass } from "@/features/groups/avatar";
import { relativeTime } from "../community";
import type { FeedPost } from "../data-access";
import { toggleLikeAction } from "../community-actions";
import { deleteTeachingPostAction } from "@/features/teaching/teaching-actions";

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
    <div className="h-[calc(100dvh-10.5rem)] min-h-[440px] snap-y snap-mandatory overflow-y-scroll overscroll-contain rounded-t-xl bg-black">
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
  const [burst, setBurst] = useState(false);
  const [gone, setGone] = useState(false);
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
      const r = await toggleLikeAction(post.id);
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
        preload="metadata"
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

      {/* 우측 액션 레일: 좋아요 · 음소거 · (삭제) */}
      <div className="absolute bottom-4 right-2 flex flex-col items-center gap-4 text-white">
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
    </div>
  );
}
