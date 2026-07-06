"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dumbbell, Plus, Search, Tag, Trash2, Video } from "lucide-react";

import { relativeTime } from "@/features/community/community";
import type { TeachingPost } from "@/features/teaching/data-access";
import { filterByTag, popularTags } from "@/features/teaching/teaching";
import { deleteTeachingPostAction } from "@/features/teaching/teaching-actions";
import { TeachingComposeModal } from "@/features/teaching/components/teaching-compose";

export function TeachingBoard({
  initialPosts,
  canModerate,
  nowMs,
}: {
  initialPosts: TeachingPost[];
  canModerate: boolean;
  /** 상대시간 계산 기준(서버에서 주입). */
  nowMs: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [compose, setCompose] = useState(false);

  const tags = useMemo(() => popularTags(initialPosts), [initialPosts]);
  const visible = useMemo(
    () => filterByTag(initialPosts, query),
    [initialPosts, query],
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      {/* 헤더 + 상단 태그 검색 */}
      <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 px-4 pb-2 pt-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <h1 className="mb-1 flex items-center gap-1.5 text-lg font-extrabold">
          <Video size={19} className="text-emerald-600" /> 운동 티칭
        </h1>
        <p className="mb-2 text-[11px] text-zinc-400">
          30초 시범 영상으로 자세를 나누고 배워요. 태그로 운동을 찾아보세요.
        </p>
        {/* 태그 검색 */}
        <div className="flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-900">
          <Search size={15} className="shrink-0 text-zinc-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="운동 태그 검색 (예: 스쿼트)"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="shrink-0 text-xs font-bold text-zinc-400"
            >
              지우기
            </button>
          ) : null}
        </div>
        {/* 인기 태그 칩 */}
        {tags.length > 0 ? (
          <div className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setQuery((q) => (q === t ? "" : t))}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                  query === t
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-zinc-200 text-zinc-500 dark:border-zinc-700"
                }`}
              >
                # {t}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* 피드 */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-zinc-400">
          <Dumbbell size={40} className="opacity-40" />
          <p className="text-sm">
            {query
              ? "이 태그의 티칭 영상이 아직 없어요."
              : "아직 티칭 영상이 없어요. 첫 시범 영상을 올려보세요! 🎬"}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3 p-3">
          {visible.map((p) => (
            <TeachingCard
              key={p.id}
              post={p}
              canModerate={canModerate}
              nowMs={nowMs}
              onDeleted={() => router.refresh()}
            />
          ))}
        </ul>
      )}

      {/* 올리기 FAB */}
      <button
        type="button"
        onClick={() => setCompose(true)}
        aria-label="티칭 영상 올리기"
        className="fixed right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg active:scale-95"
        style={{ bottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <Plus size={28} />
      </button>

      {compose ? (
        <TeachingComposeModal
          onClose={() => setCompose(false)}
          onDone={() => {
            setCompose(false);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function TeachingCard({
  post,
  canModerate,
  nowMs,
  onDeleted,
}: {
  post: TeachingPost;
  canModerate: boolean;
  nowMs: number;
  onDeleted: () => void;
}) {
  const [pending, start] = useTransition();
  const [gone, setGone] = useState(false);
  if (gone) return null;

  function remove() {
    if (!confirm("이 티칭 영상을 삭제할까요?")) return;
    start(async () => {
      const r = await deleteTeachingPostAction(post.id);
      if (r.ok) {
        setGone(true);
        onDeleted();
      } else {
        alert(r.error);
      }
    });
  }

  return (
    <li className="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <video
        src={post.videoUrl}
        controls
        playsInline
        preload="metadata"
        className="aspect-video w-full bg-black object-contain"
      />
      <div className="space-y-1.5 p-3">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <span className="font-bold text-zinc-700 dark:text-zinc-200">
            {post.authorName}
          </span>
          <span>· {relativeTime(new Date(post.createdAt).getTime(), nowMs)}</span>
          {post.isMine || canModerate ? (
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              aria-label="삭제"
              className="ml-auto text-zinc-300 hover:text-rose-500 disabled:opacity-50"
            >
              <Trash2 size={14} />
            </button>
          ) : null}
        </div>
        {post.caption ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-snug">
            {post.caption}
          </p>
        ) : null}
        {/* 게시물 하단 태그 */}
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <Tag size={11} />
          {post.exerciseTag}
        </span>
      </div>
    </li>
  );
}