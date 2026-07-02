"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Camera,
  Heart,
  ImagePlus,
  Loader2,
  MessageCircle,
  Plus,
  Trash2,
  X,
} from "lucide-react";

import { postsForFilter, publicOnly, MAX_CAPTION } from "../community";
import type { CommunityPost } from "../data-access";
import { uploadCommunityPhoto } from "../upload-photo";
import {
  createCommunityPostAction,
  deleteCommunityPostAction,
  toggleLikeAction,
} from "../community-actions";

type Group = { id: string; name: string };

export function CommunityBoard({
  groups,
  initialPosts,
  canModerate,
}: {
  groups: Group[];
  initialPosts: CommunityPost[];
  /** 게시물 관리자만 카드(밖)에서 바로 삭제 가능. 일반 유저는 상세페이지에서. */
  canModerate: boolean;
}) {
  const router = useRouter();
  // 상위 탭: 전체(공개글만) / 그룹(그룹 글, 하위 다중선택).
  const [tab, setTab] = useState<"all" | "group">("all");
  // 그룹 탭 하위 선택(다중). 초기값 = 모든 그룹(= 하위 '전체').
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(groups.map((g) => g.id)),
  );
  const [compose, setCompose] = useState(false);

  const groupAllSelected =
    groups.length > 0 && groups.every((g) => selected.has(g.id));
  // 전체 탭 → 공개글만. 그룹 탭 → 선택된 그룹들의 글만.
  const visible =
    tab === "all"
      ? publicOnly(initialPosts)
      : postsForFilter(initialPosts, [...selected]);

  function toggleGroup(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      {/* 헤더 + 2단 필터: [전체][그룹] → 그룹이면 [전체][#그룹…] */}
      <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 px-4 pb-2 pt-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <h1 className="mb-2 text-lg font-extrabold">커뮤니티</h1>
        {/* 상단 탭 — 왼쪽정렬 17px 텍스트 클릭식 */}
        <div className="flex items-center gap-4">
          {(
            [
              ["all", "전체"],
              ["group", "그룹"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setTab(k)}
              className={`text-[17px] font-bold transition-colors ${
                tab === k
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 그룹 탭: 하위 다중선택 칩 [전체][#그룹…] */}
        {tab === "group" ? (
          groups.length === 0 ? (
            <p className="py-2 text-center text-xs text-zinc-400">
              아직 속한 그룹이 없어요.
            </p>
          ) : (
            <div className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
              <button
                type="button"
                onClick={() => setSelected(new Set(groups.map((g) => g.id)))}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                  groupAllSelected
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-zinc-200 text-zinc-500 dark:border-zinc-700"
                }`}
              >
                전체
              </button>
              {groups.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => toggleGroup(g.id)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                    selected.has(g.id)
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border-zinc-200 text-zinc-500 dark:border-zinc-700"
                  }`}
                >
                  # {g.name}
                </button>
              ))}
            </div>
          )
        ) : null}
      </div>

      {/* 피드 — 한 줄에 2개(그리드) */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-zinc-400">
          <Camera size={40} className="opacity-40" />
          <p className="text-sm">
            아직 인증이 없어요. 오늘 운동 인증 첫 타자가 되어보세요! 💪
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-2 px-2 py-3">
          {visible.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              router={router}
              canModerate={canModerate}
            />
          ))}
        </ul>
      )}

      {/* 글쓰기 FAB */}
      <button
        type="button"
        onClick={() => setCompose(true)}
        aria-label="오운완 인증하기"
        className="fixed bottom-20 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg active:scale-95"
      >
        <Plus size={28} />
      </button>

      {compose ? (
        <ComposeModal
          groups={groups}
          defaultGroupId={
            tab === "group" && selected.size === 1 ? [...selected][0] : null
          }
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

function PostCard({
  post,
  router,
  canModerate,
}: {
  post: CommunityPost;
  router: ReturnType<typeof useRouter>;
  canModerate: boolean;
}) {
  const [pending, start] = useTransition();
  const [gone, setGone] = useState(false);
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  if (gone) return null;

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

  function remove() {
    if (!confirm("이 인증을 삭제할까요?")) return;
    start(async () => {
      const r = await deleteCommunityPostAction(post.id);
      if (r.ok) {
        setGone(true);
        router.refresh();
      } else {
        alert(r.error);
      }
    });
  }

  return (
    <li className="overflow-hidden rounded-xl bg-white dark:bg-zinc-900">
      {/* 사진 — 클릭하면 상세페이지 */}
      <Link href={`/community/${post.id}`} className="block" aria-label="게시물 열기">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.photoUrl}
          alt="오운완 인증"
          loading="lazy"
          className="aspect-[3/2] w-full bg-zinc-100 object-cover dark:bg-zinc-800"
        />
      </Link>

      <div className="space-y-1 px-1.5 py-1.5">
        {post.caption ? (
          <Link href={`/community/${post.id}`} className="block">
            <p className="line-clamp-2 break-words text-xs leading-snug">
              {post.caption}
            </p>
          </Link>
        ) : null}
        {post.groupName ? (
          <span className="inline-block rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            # {post.groupName}
          </span>
        ) : null}

        {/* 좋아요 / 댓글 수 */}
        <div className="flex items-center gap-3 pt-0.5 text-zinc-500 dark:text-zinc-400">
          <button
            type="button"
            onClick={toggleLike}
            disabled={pending}
            className="inline-flex items-center gap-1 text-xs font-bold disabled:opacity-60"
            aria-label="좋아요"
          >
            <Heart
              size={15}
              className={
                liked ? "fill-rose-500 text-rose-500" : "text-zinc-400"
              }
            />
            {likeCount}
          </button>
          <Link
            href={`/community/${post.id}`}
            className="inline-flex items-center gap-1 text-xs font-bold"
            aria-label="댓글"
          >
            <MessageCircle size={15} className="text-zinc-400" />
            {post.commentCount}
          </Link>
          {canModerate ? (
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
      </div>
    </li>
  );
}

function ComposeModal({
  groups,
  defaultGroupId,
  onClose,
  onDone,
}: {
  groups: Group[];
  defaultGroupId: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [target, setTarget] = useState<string | null>(defaultGroupId);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pick(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  function submit() {
    setError(null);
    if (!file) {
      setError("사진을 골라주세요.");
      return;
    }
    start(async () => {
      try {
        const url = await uploadCommunityPhoto(file);
        const r = await createCommunityPostAction({
          photoUrl: url,
          caption,
          groupId: target,
        });
        if (r.ok) onDone();
        else setError(r.error);
      } catch (e) {
        setError(e instanceof Error ? e.message : "업로드에 실패했어요.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="w-full max-w-md rounded-t-3xl bg-white p-4 dark:bg-zinc-900 sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-extrabold">오운완 인증 💪</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-full p-1 text-zinc-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* 사진 */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="미리보기"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex flex-col items-center gap-1 text-sm">
              <ImagePlus size={32} />
              사진 올리기
            </span>
          )}
        </button>

        {/* 한마디 */}
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value.slice(0, MAX_CAPTION))}
          rows={2}
          placeholder="오늘 운동 한마디 (선택)"
          className="mt-3 w-full resize-none rounded-2xl border border-zinc-200 bg-white p-3 text-sm outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-800"
        />

        {/* 공개 대상 */}
        <div className="mt-3">
          <p className="mb-1.5 text-xs font-bold text-zinc-500">어디에 올릴까요?</p>
          <div className="flex flex-wrap gap-1.5">
            <TargetChip
              active={target === null}
              onClick={() => setTarget(null)}
              label="전체 공개"
            />
            {groups.map((g) => (
              <TargetChip
                key={g.id}
                active={target === g.id}
                onClick={() => setTarget(g.id)}
                label={`# ${g.name}`}
              />
            ))}
          </div>
        </div>

        {error ? (
          <p className="mt-2 text-xs font-bold text-rose-500">{error}</p>
        ) : null}

        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 text-sm font-extrabold text-white active:scale-[0.99] disabled:opacity-60"
        >
          {pending ? (
            <>
              <Loader2 size={18} className="animate-spin" /> 올리는 중…
            </>
          ) : (
            "인증 올리기"
          )}
        </button>
      </div>
    </div>
  );
}

function TargetChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
        active
          ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-zinc-200 text-zinc-500 dark:border-zinc-700"
      }`}
    >
      {label}
    </button>
  );
}
