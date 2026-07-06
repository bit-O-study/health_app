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
  Trash2,
  Video,
  X,
} from "lucide-react";

import { MAX_CAPTION } from "../community";
import {
  applyFeedFilter,
  feedTags,
  forTab,
  resolveVisibility,
  VISIBILITY_OPTIONS,
  type FeedFilter,
  type Visibility,
} from "../feed";
import type { FeedPost } from "../data-access";
import { uploadCommunityPhoto } from "../upload-photo";
import {
  createCommunityPostAction,
  deleteCommunityPostAction,
  toggleLikeAction,
} from "../community-actions";
import {
  MAX_TAG,
  MAX_TEACHING_CAPTION,
  TEACHING_MAX_SECONDS,
  TEACHING_RULES,
  normalizeTag,
} from "@/features/teaching/teaching";
import { uploadTeachingVideo } from "@/features/teaching/upload-video";
import {
  createTeachingPostAction,
  deleteTeachingPostAction,
} from "@/features/teaching/teaching-actions";

type Group = { id: string; name: string };

/** 피드 보기 모드 — 전체 / 티칭만 / 티칭 숨김. */
type FeedMode = "all" | "teaching" | "hide";

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
  const [tab, setTab] = useState<"all" | "group">("all");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(groups.map((g) => g.id)),
  );
  const [mode, setMode] = useState<FeedMode>("all");
  const [tags, setTags] = useState<string[]>([]); // 빈 배열 = 전체 태그
  const [compose, setCompose] = useState(false);

  const groupAllSelected =
    groups.length > 0 && groups.every((g) => selected.has(g.id));

  // 1) 탭(전체/그룹) → 2) 종류·태그 필터.
  const tabPosts = useMemo(
    () => forTab(initialPosts, tab, [...selected]),
    [initialPosts, tab, selected],
  );
  const availableTags = useMemo(() => feedTags(tabPosts), [tabPosts]);
  const filter: FeedFilter = useMemo(
    () => ({
      scope: mode === "teaching" ? "teaching" : "all",
      hideTeaching: mode === "hide",
      tags,
    }),
    [mode, tags],
  );
  const visible = useMemo(
    () => applyFeedFilter(tabPosts, filter),
    [tabPosts, filter],
  );

  function toggleGroup(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleTag(t: string) {
    setTags((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }
  function setModeSafe(m: FeedMode) {
    setMode(m);
    if (m === "hide") setTags([]); // 티칭 숨김이면 태그필터 무의미
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col">
      <div className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 px-4 pb-2 pt-3 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
        <h1 className="mb-2 text-lg font-extrabold">커뮤니티</h1>

        {/* 상단 탭 — 전체 / 그룹 */}
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

        {/* 종류 필터: 전체 / 운동티칭만 / 티칭 숨김 */}
        <div className="mt-2 flex gap-1.5">
          {(
            [
              ["all", "전체"],
              ["teaching", "🎬 운동티칭만"],
              ["hide", "티칭 숨김"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setModeSafe(k)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition-colors ${
                mode === k
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 태그 필터(운동 태그 다중선택). 티칭 숨김이면 숨긴다. */}
        {mode !== "hide" && availableTags.length > 0 ? (
          <div className="-mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 pb-1">
            <Chip
              active={tags.length === 0}
              onClick={() => setTags([])}
              label="전체 태그"
            />
            {availableTags.map((t) => (
              <Chip
                key={t}
                active={tags.includes(t)}
                onClick={() => toggleTag(t)}
                label={`#${t}`}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* 피드 */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-16 text-center text-zinc-400">
          <Camera size={40} className="opacity-40" />
          <p className="text-sm">
            아직 글이 없어요. 오늘 운동 인증·티칭 첫 타자가 되어보세요! 💪
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-2 px-2 py-3">
          {visible.map((p) => (
            <PostCard key={`${p.kind}:${p.id}`} post={p} router={router} canModerate={canModerate} />
          ))}
        </ul>
      )}

      {/* 글쓰기 FAB */}
      <button
        type="button"
        onClick={() => setCompose(true)}
        aria-label="글쓰기"
        className="fixed right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-lg active:scale-95"
        style={{ bottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}
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
      className={`shrink-0 rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
        active
          ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-zinc-200 text-zinc-500 dark:border-zinc-700"
      }`}
    >
      {label}
    </button>
  );
}

function PostCard({
  post,
  router,
  canModerate,
}: {
  post: FeedPost;
  router: ReturnType<typeof useRouter>;
  canModerate: boolean;
}) {
  const [pending, start] = useTransition();
  const [gone, setGone] = useState(false);
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [showVideo, setShowVideo] = useState(false);
  if (gone) return null;

  const isTeaching = post.kind === "teaching";

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
    <li className="overflow-hidden rounded-xl bg-white dark:bg-zinc-900">
      {isTeaching ? (
        // 운동 티칭 영상 — 탭하면 그 자리에서 재생(preload=none 으로 메모리 절약).
        <div className="relative aspect-[3/2] w-full bg-black">
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
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/85 text-emerald-700 shadow">
                <Play size={22} className="translate-x-0.5 fill-current" />
              </span>
            </button>
          )}
          <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-bold text-white">
            <Video size={11} /> 티칭
          </span>
        </div>
      ) : (
        <Link href={`/community/${post.id}`} className="block" aria-label="게시물 열기">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.photoUrl ?? undefined}
            alt="오운완 인증"
            loading="lazy"
            className="aspect-[3/2] w-full bg-zinc-100 object-cover dark:bg-zinc-800"
          />
        </Link>
      )}

      <div className="space-y-1 px-1.5 py-1.5">
        {post.caption ? (
          isTeaching ? (
            <p className="line-clamp-2 break-words text-xs leading-snug">{post.caption}</p>
          ) : (
            <Link href={`/community/${post.id}`} className="block">
              <p className="line-clamp-2 break-words text-xs leading-snug">{post.caption}</p>
            </Link>
          )
        ) : null}

        <div className="flex flex-wrap gap-1">
          {isTeaching && post.exerciseTag ? (
            <span className="inline-block rounded-full bg-fuchsia-50 px-1.5 py-0.5 text-[10px] font-bold text-fuchsia-700 dark:bg-fuchsia-950/40 dark:text-fuchsia-300">
              #{post.exerciseTag}
            </span>
          ) : null}
          {post.groupName ? (
            <span className="inline-block rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              # {post.groupName}
              {post.visibility === "public_except_group" ? " 제외" : ""}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-3 pt-0.5 text-zinc-500 dark:text-zinc-400">
          {isTeaching ? (
            <span className="text-[11px] font-bold text-zinc-400">{post.authorName}</span>
          ) : (
            <>
              <button
                type="button"
                onClick={toggleLike}
                disabled={pending}
                className="inline-flex items-center gap-1 text-xs font-bold disabled:opacity-60"
                aria-label="좋아요"
              >
                <Heart size={15} className={liked ? "fill-rose-500 text-rose-500" : "text-zinc-400"} />
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
            </>
          )}
          {canModerate || post.isMine ? (
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

/** 글쓰기 — 사진 인증 / 운동 티칭 영상 + 공개범위(전체/그룹만/그룹제외). */
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
  const [kind, setKind] = useState<"photo" | "teaching">("photo");
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [tag, setTag] = useState("");
  const [visibility, setVisibility] = useState<Visibility>(
    defaultGroupId ? "group" : "public",
  );
  const [groupId, setGroupId] = useState<string | null>(defaultGroupId);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const needsGroup = visibility !== "public";

  function pickPhoto(f: File | null) {
    setError(null);
    setFile(f);
    setPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return f ? URL.createObjectURL(f) : null;
    });
  }

  function pickVideo(f: File | null) {
    setError(null);
    if (preview) URL.revokeObjectURL(preview);
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(f);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      if (Number.isFinite(v.duration) && v.duration > TEACHING_MAX_SECONDS) {
        setError(`영상은 30초 이내로 올려주세요. (현재 ${Math.round(v.duration)}초)`);
        setFile(null);
        setPreview(null);
        URL.revokeObjectURL(url);
        return;
      }
      setFile(f);
      setPreview(url);
    };
    v.onerror = () => {
      setFile(f);
      setPreview(url);
    };
    v.src = url;
  }

  function switchKind(k: "photo" | "teaching") {
    if (k === kind) return;
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setError(null);
    setKind(k);
  }

  function submit() {
    setError(null);
    if (!file) {
      setError(kind === "photo" ? "사진을 골라주세요." : "영상을 골라주세요.");
      return;
    }
    if (kind === "teaching" && !normalizeTag(tag)) {
      setError("어떤 운동인지 태그를 입력해주세요.");
      return;
    }
    // 공개범위/그룹 정합성 미리 확인(서버도 재검증).
    const vis = resolveVisibility(visibility, groupId);
    if (!vis.ok) {
      setError(vis.error);
      return;
    }
    start(async () => {
      try {
        if (kind === "photo") {
          const url = await uploadCommunityPhoto(file);
          const r = await createCommunityPostAction({
            photoUrl: url,
            caption,
            groupId: vis.groupId,
            visibility: vis.visibility,
          });
          if (r.ok) onDone();
          else setError(r.error);
        } else {
          const videoUrl = await uploadTeachingVideo(file);
          const r = await createTeachingPostAction({
            videoUrl,
            exerciseTag: tag,
            caption,
            groupId: vis.groupId,
            visibility: vis.visibility,
          });
          if (r.ok) onDone();
          else setError(r.error);
        }
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
          <h2 className="text-base font-extrabold">글쓰기</h2>
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded-full p-1 text-zinc-400">
            <X size={20} />
          </button>
        </div>

        {/* 종류 선택 */}
        <div className="mb-3 flex gap-1.5">
          {(
            [
              ["photo", "📷 사진 인증"],
              ["teaching", "🎬 운동 티칭 영상"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => switchKind(k)}
              className={`h-9 flex-1 rounded-xl text-sm font-bold transition ${
                kind === k
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 미디어 */}
        <input
          ref={fileRef}
          type="file"
          accept={kind === "photo" ? "image/*" : "video/*"}
          capture="environment"
          className="hidden"
          onChange={(e) =>
            kind === "photo"
              ? pickPhoto(e.target.files?.[0] ?? null)
              : pickVideo(e.target.files?.[0] ?? null)
          }
        />
        {kind === "teaching" && preview ? (
          <video src={preview} controls playsInline className="aspect-video w-full rounded-2xl bg-black object-contain" />
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className={`flex w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800 ${
              kind === "photo" ? "aspect-square" : "aspect-video"
            }`}
          >
            {kind === "photo" && preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="미리보기" className="h-full w-full object-cover" />
            ) : (
              <span className="flex flex-col items-center gap-1 text-sm">
                {kind === "photo" ? <ImagePlus size={32} /> : <Video size={32} />}
                {kind === "photo" ? "사진 올리기" : "30초 이내 영상 찍기 / 올리기"}
              </span>
            )}
          </button>
        )}
        {kind === "teaching" && preview ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-2 w-full rounded-xl border border-zinc-200 py-2 text-xs font-bold text-zinc-500 dark:border-zinc-700"
          >
            다시 찍기 / 다른 영상
          </button>
        ) : null}

        {/* 티칭: 운동 태그 */}
        {kind === "teaching" ? (
          <>
            <label className="mt-3 block text-xs font-bold text-zinc-500">어떤 운동인가요? (태그)</label>
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value.slice(0, MAX_TAG))}
              placeholder="예: 스쿼트, 벤치프레스"
              className={field}
            />
          </>
        ) : null}

        {/* 한마디 */}
        <textarea
          value={caption}
          onChange={(e) =>
            setCaption(
              e.target.value.slice(0, kind === "teaching" ? MAX_TEACHING_CAPTION : MAX_CAPTION),
            )
          }
          rows={2}
          placeholder={kind === "teaching" ? "자세 팁 한마디 (선택)" : "오늘 운동 한마디 (선택)"}
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
          {kind === "teaching" ? TEACHING_RULES : RULES}
        </p>

        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 text-sm font-extrabold text-white active:scale-[0.99] disabled:opacity-60"
        >
          {pending ? (
            <>
              <Loader2 size={18} className="animate-spin" /> 올리는 중…
            </>
          ) : kind === "teaching" ? (
            "티칭 영상 올리기"
          ) : (
            "인증 올리기"
          )}
        </button>
      </div>
    </div>
  );
}
