"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useBackClose } from "@/lib/platform/use-back-close";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/features/brand/logo";
import {
  Bell,
  Bookmark,
  Camera,
  EyeOff,
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

import type { FeedPage } from "../feed-page";
import { loadFeedPage } from "../feed-page-actions";
import { WorkoutShareCard } from "./workout-share-card";
import { WorkoutRecordPicker } from "./workout-record-picker";
import type { WorkoutSnapshot } from "../workout-snapshot";
import { createWorkoutSessionId } from "@/features/workout-timer/session-id";
import { MAX_CAPTION, MAX_QUESTION_BODY, MAX_QUESTION_TITLE, relativeTime } from "../community";
import {
  BOARD_TABS,
  MAIN_TABS,
  boardHref,
  mainTabOf,
  resolveVisibility,
  VISIBILITY_OPTIONS,
  type BoardTab,
  type Visibility,
} from "../feed";
import { unreadBadge } from "../community-notifications";
import type { FeedPost } from "../data-access";
import { TeachingReels } from "./teaching-reels";
import { ReportButton } from "./report-button";
import { Notice, useNotice } from "./notice";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { uploadCommunityPhoto } from "../upload-photo";
import {
  createCommunityPostAction,
  deleteCommunityPostAction,
  toggleLikeAction,
  toggleSaveAction,
} from "../community-actions";
import { deleteTeachingPostAction } from "@/features/teaching/teaching-actions";
import { RoutineShareBoard } from "@/features/routine-share/components/routine-share-board";
import { ShareDayButton } from "@/features/routine-share/components/share-day-button";
import type {
  ApplyTarget,
  RoutineShareItem,
} from "@/features/routine-share/share";
import { characterEmoji, pastelClass } from "@/features/groups/avatar";

type Group = { id: string; name: string };

const RULES =
  "비방·욕설·음란물·광고 등 부적절한 게시물은 예고 없이 삭제되며, 반복 시 계정이 정지될 수 있습니다.";

export function CommunityBoard({
  groups,
  initialPosts,
  canModerate,
  routineShares = [],
  applyTargets = [],
  initialView,
  initialSearch = "",
  initialPage,
  unreadNotifications = 0,
}: {
  groups: Group[];
  /** 안 읽은 커뮤니티 알림 수(머리글 종 뱃지 — 커뮤니티 3단계). */
  unreadNotifications?: number;
  initialView?: string;
  initialSearch?: string;
  initialPage?: FeedPage | null;
  initialPosts: FeedPost[];
  canModerate: boolean;
  /** '루틴' 탭 — 소개된 하루치 루틴(상세까지 한 번에). */
  routineShares?: RoutineShareItem[];
  /** '루틴' 탭 담기 시트 — 내 루틴의 일차 목록. */
  applyTargets?: ApplyTarget[];
}) {
  const router = useRouter();
  const [now] = useState(() => Date.now());
  const [tab, setTab] = useState<BoardTab>(BOARD_TABS.find(tab => tab.value === initialView)?.value ?? "workout");
  const [search, setSearch] = useState(initialSearch);
  const [visible, setVisible] = useState(initialPosts);
  const [feedAsOf, setFeedAsOf] = useState(initialPage?.asOf ?? "");
  const [restoring, setRestoring] = useState(false);
  const [cursor, setCursor] = useState(initialPage?.cursor ?? null);
  const [loadingMore, startMore] = useTransition();
  const [feedError, setFeedError] = useState<string | null>(null);
  const [seenPosts, setSeenPosts] = useState(initialPosts);
  if (seenPosts !== initialPosts) { setSeenPosts(initialPosts); setVisible(initialPosts); setCursor(initialPage?.cursor ?? null); setFeedAsOf(initialPage?.asOf ?? ""); }
  function remember() {
    window.history.replaceState({ ...window.history.state, communityFeed: { key: tab + ":" + initialSearch, count: visible.length, asOf: feedAsOf, scrollY: window.scrollY } }, "");
  }
  useEffect(() => {
    const saved = window.history.state?.communityFeed;
    if (!saved || saved.key !== tab + ":" + initialSearch || saved.count <= initialPosts.length || !saved.asOf) return;
    let active = true;
    async function restore() {
      setRestoring(true);
      let next = null;
      const posts: FeedPost[] = [];
      do {
        const result = await loadFeedPage(tab, initialSearch, next, saved.asOf);
        if (!active) return;
        if (!result.ok) { setFeedError(result.error); setRestoring(false); return; }
        posts.push(...result.page.posts);
        next = result.page.cursor;
      } while (next && posts.length < Math.min(saved.count, 2000));
      setVisible(posts);
      setCursor(next);
      setFeedAsOf(saved.asOf);
      setRestoring(false);
      requestAnimationFrame(() => requestAnimationFrame(() => { if (active) window.scrollTo(0, saved.scrollY); }));
    }
    void restore().catch(() => { if (active) { setFeedError("게시물을 불러오지 못했어요. 다시 시도해주세요."); setRestoring(false); } });
    return () => { active = false; };
  }, [initialPosts, initialSearch, tab]);
  function navigate(value: BoardTab, query = "") {
    router.replace(boardHref(value, query));
  }
  function more() {
    if (!cursor || loadingMore) return;
    setFeedError(null);
    startMore(async () => {
      try {
      const result = await loadFeedPage(tab, initialSearch, cursor, feedAsOf || new Date().toISOString());
      if (!result.ok) { setFeedError(result.error); return; }
      setVisible(old => { const ids = new Set(old.map(p => p.kind + ":" + p.id)); return [...old, ...result.page.posts.filter(p => !ids.has(p.kind + ":" + p.id))]; });
      setCursor(result.page.cursor);
      } catch { setFeedError("게시물을 불러오지 못했어요. 다시 시도해주세요."); }
    });
  }
  // 글쓰기 창 — 사진 인증 / 질문(커뮤니티 3단계). null = 닫힘.
  const [compose, setCompose] = useState<null | "photo" | "question">(initialView === "compose" ? "photo" : null);
  const [routineCompose, setRoutineCompose] = useState(false);
  // 밖에서 주소로 view 가 바뀌면(하단 메뉴·런처의 ?view= 링크) 그때만 탭을 맞춘다.
  // 예전엔 페이지가 key={view} 로 게시판을 통째로 새로 붙였는데, 탭 전환으로 바뀐 주소가
  // 다음 새로고침(글 올린 뒤 revalidate 등)에 실려 오면 게시판이 다시 붙으며 열린 창이 닫혔다.
  const [seenView, setSeenView] = useState(initialView);
  if (initialView !== seenView) {
    setSeenView(initialView);
    const next = BOARD_TABS.find((t) => t.value === initialView)?.value;
    if (next && next !== tab) setTab(next);
    if (initialView === "compose") setCompose("photo");
  }
  useBackClose(routineCompose, () => setRoutineCompose(false));

  // 게시판 탭별 분류. 오운완=사진(그룹글 포함), 운동=티칭(검색), 내 글=내가 쓴 것.
  // (그룹 게시판은 없앰 — 그룹원 공개 글도 오운완/운동에 섞여 그룹명 태그로 구분.)
  const isReels = tab === "teaching";

  return (
    <div
      className={
        isReels
          ? "app-page mx-auto flex h-[calc(100dvh-3.75rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-full max-w-3xl flex-col overflow-hidden"
          : "app-page mx-auto flex min-h-screen w-full max-w-3xl flex-col"
      }
    >
      <div className="app-header shrink-0 px-4 pb-0 pt-5 sm:px-6">
        {/* 제목은 다른 탭 머리글(PageHeader)과 같은 큰 제목(.app-title) — 2026-09-16 촘촘하게. */}
        <div className="mb-4 flex items-center justify-between">
          <Link href="/home" aria-label="짐꾼 홈" className="inline-flex min-h-11 items-center"><Logo size={40} wordClassName="text-2xl" /></Link><h1 className="sr-only">커뮤니티</h1>
          {/* 커뮤니티 알림(댓글·좋아요 묶음) — 커뮤니티 3단계. */}
          <Link
            href="/community/notifications"
            aria-label={unreadBadge(unreadNotifications) ? `알림 (안 읽은 알림 ${unreadBadge(unreadNotifications)}개)` : "알림"}
            data-testid="community-bell"
            className="relative inline-flex h-11 w-11 items-center justify-center rounded-full text-zinc-500 active:bg-zinc-100 dark:text-zinc-400 dark:active:bg-white/[0.06]"
          >
            <Bell aria-hidden="true" size={22} />
            {unreadBadge(unreadNotifications) ? (
              <span className="absolute right-0.5 top-0.5 min-w-4 rounded-full bg-rose-500 px-1 text-center text-xs font-bold leading-4 text-white">
                {unreadBadge(unreadNotifications)}
              </span>
            ) : null}
          </Link>
        </div>

        {/* 상단 탭 — 오운완 / 그룹 / 운동 / 내 글 (활성 언더라인) */}
        <div className="flex items-center gap-5 overflow-x-auto [scrollbar-width:none]">
          {MAIN_TABS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              // 탭별 서버 조회. 필터는 URL에 남아 뒤로 가기에도 복원된다.
              onClick={() => navigate(value)}
              aria-pressed={mainTabOf(tab) === value}
              className={`relative min-h-11 shrink-0 pb-3 text-sm font-semibold transition-colors ${
                mainTabOf(tab) === value
                  ? "text-zinc-900 dark:text-zinc-50"
                  : "text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
              }`}
            >
              {label}
              {mainTabOf(tab) === value ? (
                <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand" />
              ) : null}
            </button>
          ))}
        </div>

        {/* 운동(티칭) 탭: 운동 검색 → 해당 운동 영상만 */}
        {tab !== "routine" ? (
          <form onSubmit={e => { e.preventDefault(); navigate(tab, search); }} className="relative mb-2 mt-1.5 flex items-center gap-2">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="게시물 검색"
              placeholder={tab === "teaching" ? "운동 검색 (예: 스쿼트)" : mainTabOf(tab) === "question" ? "질문 검색" : "본문 · 운동명 검색"}
              className="h-11 min-w-0 w-full rounded-[10px] bg-zinc-100 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand/40 dark:bg-white/[0.08]"
            />
            <button type="submit" className="min-h-11 shrink-0 px-2 text-sm">검색</button>
          </form>
        ) : null}
        {tab === "workout" || tab === "popular" ? <div className="flex gap-3 pb-2"><button type="button" aria-pressed={tab === "workout"} onClick={() => navigate("workout", search)} className="min-h-11 text-sm text-zinc-500 aria-pressed:font-semibold aria-pressed:text-brand">최신순</button><button type="button" aria-pressed={tab === "popular"} onClick={() => navigate("popular", search)} className="min-h-11 text-sm text-zinc-500 aria-pressed:font-semibold aria-pressed:text-brand">이번 주 인기</button></div> : null}
        {mainTabOf(tab) === "question" ? <div className="flex gap-3 pb-2"><button type="button" aria-pressed={tab === "question"} onClick={() => navigate("question", search)} className="min-h-11 text-sm text-zinc-500 aria-pressed:font-semibold aria-pressed:text-brand">전체</button><button type="button" aria-pressed={tab === "question_open"} onClick={() => navigate("question_open", search)} className="min-h-11 text-sm text-zinc-500 aria-pressed:font-semibold aria-pressed:text-brand">답변 기다리는</button></div> : null}
        {mainTabOf(tab) === "mine" ? <div className="flex items-center gap-3 pb-2"><button type="button" aria-pressed={tab === "mine"} onClick={() => navigate("mine", search)} className="min-h-11 text-sm text-zinc-500 aria-pressed:font-semibold aria-pressed:text-brand">내가 쓴 글</button><button type="button" aria-pressed={tab === "saved"} onClick={() => navigate("saved", search)} className="min-h-11 text-sm text-zinc-500 aria-pressed:font-semibold aria-pressed:text-brand">저장한 글</button><Link href="/community/blocked" className="ml-auto inline-flex min-h-11 items-center text-xs text-zinc-400">차단한 사용자</Link></div> : null}
      </div>

      {tab === "popular" && <p className="px-4 pt-3 text-xs text-zinc-500">최근 7일 게시물을 좋아요 많은 순으로 보여드려요.</p>}
      {/* 피드 */}
      {tab === "routine" ? (
        // 루틴 소개 — 남의 하루치 루틴을 보고 내 루틴의 한 일차로 담는다.
        <RoutineShareBoard items={routineShares} targets={applyTargets} />
      ) : isReels ? (
        // 운동 탭 — 숏츠/릴스 스타일 세로 풀스크린 피드(이 영역만 스냅 스크롤)
        <div className="min-h-0 flex-1">
          <TeachingReels
            posts={visible}
            canModerate={canModerate}
            onChanged={() => router.refresh()}
          />
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-20 text-center">
          <Camera aria-hidden="true" size={28} className="text-zinc-300 dark:text-zinc-600" />
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {initialSearch
              ? "검색 결과가 없어요"
              : tab === "mine"
                ? "아직 내가 쓴 글이 없어요"
                : tab === "saved"
                  ? "저장한 글이 없어요. 글의 책갈피를 누르면 여기 모여요."
                  : tab === "question_open"
                    ? "답변을 기다리는 질문이 없어요"
                    : tab === "question"
                      ? "아직 질문이 없어요. 궁금한 걸 물어보세요."
                      : "아직 글이 없어요"}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3 px-4 py-3 sm:px-6">
          {visible.map((p) => (
            <PostCard
              key={`${p.kind}:${p.id}`}
              post={p}
              now={now}
              router={router}
              canModerate={canModerate}
              onOpen={remember}
            />
          ))}
        </ul>
      )}

      {feedError ? <p role="alert" className="px-4 text-sm text-rose-500">{feedError}</p> : null}
      {restoring ? <p role="status" className="px-4 text-sm text-zinc-500">보던 게시물을 불러오는 중…</p> : null}
      {cursor ? <button type="button" onClick={more} disabled={loadingMore || restoring} className="mx-4 mb-4 min-h-11 shrink-0 rounded-lg border border-zinc-200 text-sm disabled:opacity-50">{loadingMore ? "불러오는 중…" : "더 보기"}</button> : null}
      {/* 글쓰기 FAB — 루틴 탭에서는 내 영구 루틴의 일차를 골라 추천글을 쓴다. */}
      {tab !== "teaching" ? (
        <button
          type="button"
          onClick={() => tab === "routine" ? setRoutineCompose(true) : setCompose(mainTabOf(tab) === "question" ? "question" : "photo")}
          aria-label={tab === "routine" ? "루틴 추천글 쓰기" : mainTabOf(tab) === "question" ? "질문하기" : "오운완 인증하기"}
          className="fixed right-4 z-20 inline-flex h-11 items-center justify-center gap-1 rounded-full bg-brand px-4 text-sm font-semibold text-white shadow-lg transition-transform active:scale-95 dark:text-zinc-950"
          style={{ bottom: "calc(5rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <Plus aria-hidden="true" size={18} />
          글쓰기
        </button>
      ) : null}

      {routineCompose ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={() => setRoutineCompose(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="routine-compose-title" className="w-full max-w-md rounded-t-2xl bg-white p-5 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] shadow-2xl dark:bg-zinc-900 sm:rounded-2xl sm:pb-5" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="routine-compose-title" className="text-lg font-bold">내 루틴 추천글 쓰기</h2>
                <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">내가 설정한 루틴에서 소개할 일차를 골라보세요.</p>
              </div>
              <button type="button" aria-label="닫기" onClick={() => setRoutineCompose(false)} className="p-1 text-zinc-400"><X size={20} /></button>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {applyTargets.map((target) => (
                <ShareDayButton
                  key={target.dayIndex}
                  dayIndex={target.dayIndex}
                  groups={groups}
                  label={`${target.label} 추천글 쓰기`}
                />
              ))}
              {applyTargets.length === 0 ? <p className="py-6 text-center text-sm text-zinc-500">먼저 내 루틴을 설정해주세요.</p> : null}
            </div>
          </section>
        </div>
      ) : null}

      {compose ? (
        <ComposeModal
          groups={groups}
          defaultGroupId={null}
          initialMode={compose}
          onClose={() => { setCompose(null); if (initialView === "compose") router.replace("/community", { scroll: false }); }}
          onDone={() => {
            window.history.replaceState({ ...window.history.state, communityFeed: null }, "");
            setCompose(null);
            if (initialView === "compose") router.replace("/community", { scroll: false });
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
      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
        active
          ? "border-transparent bg-brand text-white dark:text-zinc-950"
          : "border-zinc-200 text-zinc-500 hover:border-brand/40 hover:text-brand dark:border-zinc-700"
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
  onOpen,
}: {
  post: FeedPost;
  now: number;
  router: ReturnType<typeof useRouter>;
  onOpen: () => void;
  canModerate: boolean;
}) {
  const [pending, start] = useTransition();
  const [navPending, startNav] = useTransition(); // 상세 이동 중 로딩 표시
  const [gone, setGone] = useState(false);
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [showVideo, setShowVideo] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [burst, setBurst] = useState(false); // 더블탭 좋아요 하트
  const [saved, setSaved] = useState(post.savedByMe);
  // 삭제 확인·오류 안내는 앱 안에서(브라우저 confirm/alert 대신 — 커뮤니티 2단계).
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notice, showNotice] = useNotice();
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
  // 저장(북마크) — 누르는 즉시 바꾸고, 실패하면 되돌린다(커뮤니티 3단계).
  function toggleSave() {
    const next = !saved;
    setSaved(next);
    start(async () => {
      const r = await toggleSaveAction(post.id);
      if (!r.ok) {
        setSaved(!next);
        showNotice(r.error);
      } else {
        setSaved(r.saved);
        if (next) showNotice("저장했어요. 내 글 › 저장한 글에서 볼 수 있어요.");
      }
    });
  }
  const isQuestion = post.postType === "question";
  function doubleTapLike() {
    setLike(true);
    setBurst(true);
    window.setTimeout(() => setBurst(false), 650);
  }

  function remove() {
    setConfirmDelete(false);
    start(async () => {
      const r = isTeaching
        ? await deleteTeachingPostAction(post.id)
        : await deleteCommunityPostAction(post.id);
      if (r.ok) {
        setGone(true);
        router.refresh();
      } else {
        showNotice(r.error);
      }
    });
  }

  // 사진 인증 카드는 전체를 눌러도 상세로 이동(티칭은 인라인 재생이라 제외).
  // 이동은 transition 으로 감싸 로딩(버퍼링)을 표시하고 중복 탭을 막는다.
  function goDetail() {
    if (isTeaching || navPending) return;
    onOpen();
    startNav(() => router.push(`/community/${post.id}`));
  }

  return (
    <li
      onClick={goDetail}
      aria-busy={navPending}
      className={`relative overflow-hidden app-card ${
        isTeaching ? "" : "cursor-pointer"
      }`}
    >
      {navPending ? (
        <span className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-white/60 backdrop-blur-[1px] dark:bg-zinc-900/60">
          <Loader2 aria-hidden="true" size={28} className="animate-spin text-brand" />
        </span>
      ) : null}
      {/* 헤더: 아바타 + 이름 + 시간 + 배지 */}
      <div className="flex items-center gap-2 px-3 pt-2.5">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ${pastelClass(
            post.authorName,
          )}`}
        >
          {characterEmoji(post.authorName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-5 text-zinc-900 dark:text-zinc-100">
            {post.authorName}
          </p>
          <p className="text-xs leading-4 text-zinc-400">{when} · {post.visibility === "public" ? "전체 공개" : post.visibility === "group" ? "그룹만 공개" : "그룹 제외 공개"}</p>
        </div>
        {isTeaching ? (
          <span className="inline-flex items-center gap-0.5 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">
            <Video size={11} /> 티칭
          </span>
        ) : null}
        {isQuestion ? (
          <span
            data-testid="question-status"
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              post.resolved ? "bg-zinc-100 text-zinc-500 dark:bg-white/[0.08] dark:text-zinc-400" : "bg-brand-soft text-brand"
            }`}
          >
            {post.resolved ? "해결됨" : "답변 기다리는 중"}
          </span>
        ) : null}
      </div>
      {post.hidden && post.isMine ? (
        <p className="mx-3 mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-xs leading-relaxed text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
          <EyeOff aria-hidden="true" size={14} className="mt-0.5 shrink-0" />
          신고가 여러 건 들어와 다른 사람에게는 잠시 숨겨졌어요. 관리자가 확인하고 있어요.
        </p>
      ) : null}
      {isQuestion && post.title ? (
        <p className="px-3 pt-2 text-base font-bold leading-snug text-zinc-900 dark:text-zinc-50">{post.title}</p>
      ) : null}

      {post.workoutSnapshot ? <WorkoutShareCard snapshot={post.workoutSnapshot} /> : null}
      {/* 미디어 */}
      {isTeaching ? (
        <div className="relative mt-2.5 aspect-square w-full bg-black">
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
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/90 text-brand shadow-lg">
                <Play size={26} className="translate-x-0.5 fill-current" />
              </span>
            </button>
          )}
          {/* 운동게시판(영상): 그룹명 태그 + 운동 태그를 왼쪽 아래에 세로로 오버레이 */}
          {post.groupName || post.exerciseTag ? (
            <div className="absolute bottom-2 left-2 flex flex-col items-start gap-1">
              {post.groupName ? (
                <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-bold text-white dark:text-zinc-950 backdrop-blur-sm">
                  # {post.groupName}
                  {post.visibility === "public_except_group" ? " 제외" : ""}
                </span>
              ) : null}
              {post.exerciseTag ? (
                <span className="rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white">
                  #{post.exerciseTag}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : post.photoUrl ? (
        <div
          className="relative mt-2.5 aspect-square w-full bg-zinc-100 dark:bg-zinc-800"
          onDoubleClick={doubleTapLike}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.photoUrl ?? undefined}
            alt={isQuestion ? "질문 사진" : "오운완 인증"}
            loading="lazy"
            onLoad={() => setImgLoaded(true)}
            className={`h-full w-full object-cover transition-opacity duration-300 ${
              imgLoaded ? "opacity-100" : "opacity-0"
            }`}
          />
          {burst ? (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Heart size={92} className="animate-ping fill-white/90 text-white/90 drop-shadow" />
            </span>
          ) : null}
          {/* 오운완(사진): 그룹명 태그를 오른쪽 위에 오버레이 */}
          {post.groupName ? (
            <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
              # {post.groupName}
              {post.visibility === "public_except_group" ? " 제외" : ""}
            </span>
          ) : null}
        </div>
      ) : null}

      {/* 액션 — 버튼 클릭은 카드 이동(상세)으로 전파되지 않게 막는다. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-4 px-3 pt-2 text-zinc-500 dark:text-zinc-400"
      >
        {!isTeaching ? (
          <>
            <button
              type="button"
              onClick={toggleLike}
              disabled={pending}
              className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums transition-transform active:scale-125 disabled:opacity-60"
              aria-label="좋아요"
              aria-pressed={liked}
            >
              <Heart size={20} className={liked ? "fill-rose-500 text-rose-500" : "text-zinc-400"} />
              {likeCount}
            </button>
            <Link
              href={`/community/${post.id}`}
              className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums"
              onClick={onOpen}
              aria-label={`게시물 보기 (댓글 ${post.commentCount}개)`}
            >
              <MessageCircle size={20} className="text-zinc-400" />
              {post.commentCount}
            </Link>
            <button
              type="button"
              onClick={toggleSave}
              disabled={pending}
              aria-label="저장"
              aria-pressed={saved}
              className="inline-flex items-center disabled:opacity-60"
            >
              <Bookmark size={20} className={saved ? "fill-brand text-brand" : "text-zinc-400"} />
            </button>
          </>
        ) : (
          <span className="text-xs font-bold text-zinc-400">자세 티칭 영상</span>
        )}
        {!post.isMine ? (
          <ReportButton
            className="ml-auto inline-flex items-center gap-1 text-zinc-300 hover:text-rose-500"
            targetKind={isTeaching ? "teaching_post" : "community_post"}
            targetId={post.id}
            targetUserId={post.userId}
            targetAuthor={post.authorName}
            targetPreview={post.caption}
            iconSize={16}
          />
        ) : null}
        {canModerate || post.isMine ? (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            disabled={pending}
            aria-label="삭제"
            className={`${post.isMine ? "ml-auto" : ""} text-zinc-300 hover:text-rose-500 disabled:opacity-50`}
          >
            <Trash2 size={16} />
          </button>
        ) : null}
      </div>

      {/* 상세로 가는 길은 카드 탭 + 댓글 링크 둘 — 따로 있던 '게시물 보기' 글자 링크는 뺐다(같은 곳으로 가는 길 셋). */}
      {/* 캡션 — 카드 전체가 상세로 이동하므로 별도 링크 없이 텍스트만. */}
      {post.caption ? (
        <div className="px-3 pb-2.5 pt-1">
          <p
            className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${
              isTeaching ? "" : "line-clamp-3"
            }`}
          >
            {isQuestion ? null : <span className="mr-1.5 font-semibold">{post.authorName}</span>}
            {post.caption}
          </p>
        </div>
      ) : (
        <div className="pb-2.5" />
      )}
      {/* 포털 안 클릭도 React 트리로는 카드까지 올라와 상세로 가 버린다 — 여기서 멈춘다. */}
      <span onClick={(e) => e.stopPropagation()}>
        <ConfirmDialog
          open={confirmDelete}
          title="게시물 삭제"
          message={isTeaching ? "이 영상을 삭제할까요?" : "이 게시물을 삭제할까요?"}
          confirmLabel="삭제"
          tone="danger"
          onConfirm={remove}
          onCancel={() => setConfirmDelete(false)}
        />
        <Notice text={notice} />
      </span>
    </li>
  );
}

/** 사진 인증 글쓰기 — 사진 + 한마디 + 공개범위(전체/그룹만/그룹제외). 티칭 영상은 운동모드에서만. */
function ComposeModal({
  groups,
  defaultGroupId,
  initialMode = "photo",
  onClose,
  onDone,
}: {
  groups: Group[];
  defaultGroupId: string | null;
  /** 사진 인증 / 질문(커뮤니티 3단계). 창 안에서도 바꿀 수 있다. */
  initialMode?: "photo" | "question";
  onClose: () => void;
  onDone: () => void;
}) {
  const [mode, setMode] = useState<"photo" | "question">(initialMode);
  const [title, setTitle] = useState("");
  const isQuestion = mode === "question";
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [workout, setWorkout] = useState<WorkoutSnapshot | null>(null);
  const submissionId = useRef<string | null>(null);
  const uploaded = useRef<{ file: File; url: string } | null>(null);
  useBackClose(true, onClose);
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
    if (pending) return;
    if (isQuestion) {
      if (!title.trim()) {
        setError("질문 제목을 써 주세요.");
        return;
      }
    } else if (!file && !workout) {
      setError("운동 기록이나 사진을 골라주세요.");
      return;
    }
    const vis = resolveVisibility(visibility, groupId);
    if (!vis.ok) {
      setError(vis.error);
      return;
    }
    start(async () => {
      try {
        submissionId.current ??= createWorkoutSessionId();
        const url = file ? (uploaded.current?.file === file ? uploaded.current.url : await uploadCommunityPhoto(file)) : "";
        if (file) uploaded.current = { file, url };
        const r = await createCommunityPostAction({
          photoUrl: url,
          workoutDate: isQuestion ? undefined : workout?.date,
          submissionId: submissionId.current,
          caption,
          groupId: vis.groupId,
          visibility: vis.visibility,
          ...(isQuestion ? { postType: "question" as const, title } : {}),
        });
        if (r.ok) onDone();
        else setError(r.error);
      } catch (e) {
        setError(e instanceof Error ? e.message : "업로드에 실패했어요.");
      }
    });
  }

  const field =
    "mt-1 w-full rounded-2xl border border-zinc-200 bg-white p-3 text-sm outline-none focus:border-brand/40 dark:border-zinc-700 dark:bg-zinc-800";

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 sm:items-center">
      <div role="dialog" aria-modal="true" aria-label={isQuestion ? "질문하기" : "오운완 인증"} className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] dark:bg-zinc-900 sm:rounded-3xl sm:pb-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex gap-1 rounded-full bg-zinc-100 p-1 dark:bg-white/[0.08]">
            {(["photo", "question"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                  // 종류가 바뀌면 다른 글이다 — 같은 제출 번호를 다시 쓰지 않는다.
                  submissionId.current = null;
                }}
                className="min-h-9 rounded-full px-3 text-sm font-semibold text-zinc-500 aria-pressed:bg-white aria-pressed:text-zinc-900 dark:aria-pressed:bg-zinc-700 dark:aria-pressed:text-zinc-50"
              >
                {m === "photo" ? "오운완 인증" : "질문"}
              </button>
            ))}
          </div>
          <button type="button" onClick={onClose} aria-label="닫기" className="rounded-full p-1 text-zinc-400">
            <X size={20} />
          </button>
        </div>

        {isQuestion ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, MAX_QUESTION_TITLE))}
            aria-label="질문 제목"
            placeholder="질문 제목 (예: 스쿼트할 때 무릎이 아파요)"
            className={`${field} mb-2 mt-0 font-semibold`}
          />
        ) : (
          <WorkoutRecordPicker value={workout} onChange={setWorkout} />
        )}
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
          className="flex min-h-24 w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="미리보기" className="h-full w-full object-cover" />
          ) : (
            <span className="flex flex-col items-center gap-1 text-sm">
              <ImagePlus size={32} />
              사진 올리기 (선택)
            </span>
          )}
        </button>

        {/* 한마디 */}
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value.slice(0, isQuestion ? MAX_QUESTION_BODY : MAX_CAPTION))}
          rows={isQuestion ? 5 : 2}
          aria-label={isQuestion ? "질문 내용" : "한마디"}
          placeholder={isQuestion ? "자세한 상황을 적어 주세요 (선택)" : "오늘 운동 한마디 (선택)"}
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
            <p className="mt-2 text-xs font-bold text-rose-500">
              속한 그룹이 없어 전체 공개만 가능해요.
            </p>
          ) : (
            <div className="mt-2">
              <p className="mb-1 text-xs font-bold text-zinc-400">
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

        <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-xs leading-relaxed text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
          {RULES}
        </p>

        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-[10px] bg-brand py-3.5 text-sm font-semibold text-white transition-transform active:scale-[0.99] disabled:opacity-60 dark:text-zinc-950"
        >
          {pending ? (
            <>
              <Loader2 size={18} className="animate-spin" /> 올리는 중…
            </>
          ) : isQuestion ? (
            "질문 올리기"
          ) : (
            "인증 올리기"
          )}
        </button>
      </div>
    </div>
  );
}
