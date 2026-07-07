"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Camera,
  Heart,
  ImagePlus,
  Loader2,
  MessageCircle,
  Play,
  Plus,
  Search,
  Trash2,
  Video,
  X,
} from "lucide-react";

import { MAX_CAPTION, relativeTime } from "../community";
import {
  forBoard,
  BOARD_TABS,
  resolveVisibility,
  VISIBILITY_OPTIONS,
  type BoardTab,
  type Visibility,
} from "../feed";
import type { FeedPost } from "../data-access";
import { TeachingReels } from "./teaching-reels";
import { uploadCommunityPhoto } from "../upload-photo";
import {
  createCommunityPostAction,
  deleteCommunityPostAction,
  toggleLikeAction,
} from "../community-actions";
import { deleteTeachingPostAction } from "@/features/teaching/teaching-actions";
import { characterEmoji, pastelClass } from "@/features/groups/avatar";

type Group = { id: string; name: string };

const RULES =
  "비방·욕설·음란물·광고 등 부적절한 게시물은 예고 없이 삭제되며, 반복 시 계정이 정지될 수 있습니다.";

export function CommunityBoard({
  groups,
  initialPosts,
  canModerate,
}: {
  groups: Group[];
  initialPosts: FeedPost[];
  canModerate: boolean;
}) {
  const router = useRouter();
  const [now] = useState(() => Date.now());
  const [tab, setTab] = useState<BoardTab>("workout");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(groups.map((g) => g.id)),
  );
  const [search, setSearch] = useState("");
  const [compose, setCompose] = useState(false);

  const groupAllSelected =
    groups.length > 0 && groups.every((g) => selected.has(g.id));

  // 게시판 탭별 분류. 오운완=사진, 그룹=그룹사진, 운동=티칭(검색), 내 글=내가 쓴 것.
  const visible = useMemo(
    () => forBoard(initialPosts, tab, [...selected], search),
    [initialPosts, tab, selected, search],
  );

  function toggleGroup(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const isReels = tab === "teaching";

  return (
    <div
      className={
        isReels
          ? "mx-auto flex h-[calc(100dvh-4rem-env(safe-area-inset-bottom))] w-full max-w-2xl flex-col overflow-hidden"
          : "mx-auto flex w-full max-w-2xl flex-col"
      }
    >
      <div className="sticky top-0 z-10 shrink-0 border-b border-zinc-200/70 bg-white/80 px-4 pb-0 pt-3 backdrop-blur-xl dark:border-zinc-800/70 dark:bg-zinc-950/80">
        <h1 className="mb-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-xl font-black tracking-tight text-transparent dark:from-emerald-400 dark:to-teal-300">
          커뮤니티
        </h1>

        {/* 상단 탭 — 오운완 / 그룹 / 운동 / 내 글 (활성 언더라인) */}
        <div className="flex items-center gap-5">
          {BOARD_TABS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className={`relative pb-2.5 text-[16px] font-bold transition-colors ${
                tab === value
                  ? "text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              }`}
            >
              {label}
              {tab === value ? (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-400" />
              ) : null}
            </button>
          ))}
        </div>

        {/* 그룹 탭: 하위 다중선택 칩 */}
        {tab === "group" ? (
          groups.length === 0 ? (
            <p className="py-2 text-center text-xs text-zinc-400">
              아직 속한 그룹이 없어요.
            </p>
          ) : (
            <div className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
              <Chip
                active={groupAllSelected}
                onClick={() => setSelected(new Set(groups.map((g) => g.id)))}
                label="전체"
              />
              {groups.map((g) => (
                <Chip
                  key={g.id}
                  active={selected.has(g.id)}
                  onClick={() => toggleGroup(g.id)}
                  label={`# ${g.name}`}
                />
              ))}
            </div>
          )
        ) : null}

        {/* 운동(티칭) 탭: 운동 검색 → 해당 운동 영상만 */}
        {tab === "teaching" ? (
          <div className="relative mb-2.5 mt-2">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="운동 검색 (예: 스쿼트, 벤치프레스)"
              className="w-full rounded-full border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-fuchsia-400 dark:border-zinc-700 dark:bg-zinc-800"
            />
          </div>
        ) : null}
      </div>

      {/* 피드 */}
      {isReels ? (
        // 운동 탭 — 숏츠/릴스 스타일 세로 풀스크린 피드(이 영역만 스냅 스크롤)
        <div className="min-h-0 flex-1">
          <TeachingReels
            posts={visible}
            canModerate={canModerate}
            onChanged={() => router.refresh()}
          />
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 dark:bg-emerald-950/40">
            <Camera size={30} />
          </div>
          <p className="text-sm font-bold text-zinc-500 dark:text-zinc-300">
            {tab === "group"
              ? "이 그룹엔 아직 글이 없어요"
              : tab === "mine"
                ? "아직 내가 쓴 글이 없어요"
                : "아직 글이 없어요"}
          </p>
          <p className="text-xs text-zinc-400">
            오늘 운동 인증 첫 타자가 되어보세요! 💪
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3 px-2 py-3 sm:px-0">
          {visible.map((p) => (
            <PostCard
              key={`${p.kind}:${p.id}`}
              post={p}
              now={now}
              router={router}
              canModerate={canModerate}
            />
          ))}
        </ul>
      )}

      {/* 글쓰기 FAB — 사진 인증(운동 탭은 운동모드에서 촬영하므로 숨김) */}
      {tab !== "teaching" ? (
        <button
          type="button"
          onClick={() => setCompose(true)}
          aria-label="오운완 인증하기"
          className="fixed right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-xl shadow-emerald-500/30 ring-4 ring-white/60 transition-transform active:scale-95 dark:ring-zinc-950/60"
          style={{ bottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <Plus size={28} />
        </button>
      ) : null}

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

function Chip({
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
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
        active
          ? "border-transparent bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-sm shadow-emerald-500/30"
          : "border-zinc-200 text-zinc-500 hover:border-emerald-300 hover:text-emerald-600 dark:border-zinc-700 dark:hover:border-emerald-800"
      }`}
    >
      {label}
    </button>
  );
}

function PostCard({
  post,
  now,
  router,
  canModerate,
}: {
  post: FeedPost;
  now: number;
  router: ReturnType<typeof useRouter>;
  canModerate: boolean;
}) {
  const [pending, start] = useTransition();
  const [gone, setGone] = useState(false);
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [showVideo, setShowVideo] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [burst, setBurst] = useState(false); // 더블탭 좋아요 하트
  if (gone) return null;

  const isTeaching = post.kind === "teaching";
  const when = relativeTime(new Date(post.createdAt).getTime(), now);

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
  function toggleLike() {
    setLike(!liked);
  }
  function doubleTapLike() {
    setLike(true);
    setBurst(true);
    window.setTimeout(() => setBurst(false), 650);
  }

  function remove() {
    if (!confirm("이 게시물을 삭제할까요?")) return;
    start(async () => {
      const r = isTeaching
        ? await deleteTeachingPostAction(post.id)
        : await deleteCommunityPostAction(post.id);
      if (r.ok) {
        setGone(true);
        router.refresh();
      } else {
        alert(r.error);
      }
    });
  }

  return (
    <li className="overflow-hidden rounded-2xl border border-zinc-100 bg-white shadow-sm ring-1 ring-black/[0.02] transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900 dark:ring-white/[0.03]">
      {/* 헤더: 아바타 + 이름 + 시간 + 배지 */}
      <div className="flex items-center gap-2 px-3 pt-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg ${pastelClass(
            post.authorName,
          )}`}
        >
          {characterEmoji(post.authorName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-zinc-800 dark:text-zinc-100">
            {post.authorName}
          </p>
          <p className="text-[11px] text-zinc-400">{when}</p>
        </div>
        {isTeaching ? (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-fuchsia-50 px-2 py-0.5 text-[10px] font-bold text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300">
            <Video size={11} /> 티칭
          </span>
        ) : null}
        {post.groupName ? (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            # {post.groupName}
            {post.visibility === "public_except_group" ? " 제외" : ""}
          </span>
        ) : null}
      </div>

      {/* 미디어 */}
      {isTeaching ? (
        <div className="relative mt-2 aspect-square w-full bg-black">
          {showVideo ? (
            <video
              src={post.videoUrl ?? undefined}
              controls
              autoPlay
              playsInline
              preload="none"
              className="h-full w-full object-contain"
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowVideo(true)}
              aria-label="영상 재생"
              className="flex h-full w-full items-center justify-center"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-emerald-700 shadow-lg">
                <Play size={26} className="translate-x-0.5 fill-current" />
              </span>
            </button>
          )}
          {post.exerciseTag ? (
            <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white">
              #{post.exerciseTag}
            </span>
          ) : null}
        </div>
      ) : (
        <div
          className="relative mt-2 aspect-square w-full bg-zinc-100 dark:bg-zinc-800"
          onDoubleClick={doubleTapLike}
        >
          <Link href={`/community/${post.id}`} aria-label="게시물 열기">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.photoUrl ?? undefined}
              alt="오운완 인증"
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              className={`h-full w-full object-cover transition-opacity duration-300 ${
                imgLoaded ? "opacity-100" : "opacity-0"
              }`}
            />
          </Link>
          {burst ? (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Heart size={92} className="animate-ping fill-white/90 text-white/90 drop-shadow" />
            </span>
          ) : null}
        </div>
      )}

      {/* 액션 */}
      <div className="flex items-center gap-4 px-3 pt-2.5 text-zinc-500 dark:text-zinc-400">
        {!isTeaching ? (
          <>
            <button
              type="button"
              onClick={toggleLike}
              disabled={pending}
              className="inline-flex items-center gap-1.5 text-sm font-bold transition-transform active:scale-125 disabled:opacity-60"
              aria-label="좋아요"
            >
              <Heart size={22} className={liked ? "fill-rose-500 text-rose-500" : "text-zinc-400"} />
              {likeCount}
            </button>
            <Link
              href={`/community/${post.id}`}
              className="inline-flex items-center gap-1.5 text-sm font-bold"
              aria-label="댓글"
            >
              <MessageCircle size={22} className="text-zinc-400" />
              {post.commentCount}
            </Link>
          </>
        ) : (
          <span className="text-xs font-bold text-zinc-400">운동 티칭 영상</span>
        )}
        {canModerate || post.isMine ? (
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            aria-label="삭제"
            className="ml-auto text-zinc-300 hover:text-rose-500 disabled:opacity-50"
          >
            <Trash2 size={16} />
          </button>
        ) : null}
      </div>

      {/* 캡션 */}
      {post.caption ? (
        <div className="px-3 pb-3 pt-1.5">
          {isTeaching ? (
            <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
              <span className="mr-1.5 font-bold">{post.authorName}</span>
              {post.caption}
            </p>
          ) : (
            <Link href={`/community/${post.id}`} className="block">
              <p className="line-clamp-3 whitespace-pre-wrap break-words text-sm leading-relaxed">
                <span className="mr-1.5 font-bold">{post.authorName}</span>
                {post.caption}
              </p>
            </Link>
          )}
        </div>
      ) : (
        <div className="pb-3" />
      )}
    </li>
  );
}

/** 사진 인증 글쓰기 — 사진 + 한마디 + 공개범위(전체/그룹만/그룹제외). 티칭 영상은 운동모드에서만. */
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
  const [visibility, setVisibility] = useState<Visibility>(
    defaultGroupId ? "group" : "public",
  );
  const [groupId, setGroupId] = useState<string | null>(defaultGroupId);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const needsGroup = visibility !== "public";

  function pick(f: File | null) {
    setError(null);
    setFile(f);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return f ? URL.createObjectURL(f) : null;
    });
  }

  function submit() {
    setError(null);
    if (!file) {
      setError("사진을 골라주세요.");
      return;
    }
    const vis = resolveVisibility(visibility, groupId);
    if (!vis.ok) {
      setError(vis.error);
      return;
    }
    start(async () => {
      try {
        const url = await uploadCommunityPhoto(file);
        const r = await createCommunityPostAction({
          photoUrl: url,
          caption,
          groupId: vis.groupId,
          visibility: vis.visibility,
        });
        if (r.ok) onDone();
        else setError(r.error);
      } catch (e) {
        setError(e instanceof Error ? e.message : "업로드에 실패했어요.");
      }
    });
  }

  const field =
    "mt-1 w-full rounded-2xl border border-zinc-200 bg-white p-3 text-sm outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-800";

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] dark:bg-zinc-900 sm:rounded-3xl sm:pb-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-extrabold">오운완 인증 💪</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded-full p-1 text-zinc-400">
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
            <img src={preview} alt="미리보기" className="h-full w-full object-cover" />
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
          className={`${field} resize-none`}
        />

        {/* 공개범위 */}
        <p className="mt-3 mb-1.5 text-xs font-bold text-zinc-500">공개 범위</p>
        <div className="flex flex-wrap gap-1.5">
          {VISIBILITY_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              active={visibility === o.value}
              onClick={() => {
                setVisibility(o.value);
                if (o.value !== "public" && !groupId && groups[0]) setGroupId(groups[0].id);
              }}
              label={o.label}
            />
          ))}
        </div>

        {/* 그룹 선택(그룹만/그룹제외일 때) */}
        {needsGroup ? (
          groups.length === 0 ? (
            <p className="mt-2 text-[11px] font-bold text-rose-500">
              속한 그룹이 없어 전체 공개만 가능해요.
            </p>
          ) : (
            <div className="mt-2">
              <p className="mb-1 text-[11px] font-bold text-zinc-400">
                {visibility === "group" ? "이 그룹에만 공개" : "이 그룹만 제외하고 공개"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {groups.map((g) => (
                  <Chip
                    key={g.id}
                    active={groupId === g.id}
                    onClick={() => setGroupId(g.id)}
                    label={`# ${g.name}`}
                  />
                ))}
              </div>
            </div>
          )
        ) : null}

        {error ? <p className="mt-2 text-xs font-bold text-rose-500">{error}</p> : null}

        <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-[11px] leading-relaxed text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
          {RULES}
        </p>

        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-emerald-500/25 transition-transform active:scale-[0.99] disabled:opacity-60"
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
