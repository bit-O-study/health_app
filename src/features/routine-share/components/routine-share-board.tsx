"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronRight,
  Dumbbell,
  Heart,
  Loader2,
  StickyNote,
  Trash2,
  Wind,
  X,
} from "lucide-react";

import {
  applyRoutineShareAction,
  deleteRoutineShareAction,
  toggleRoutineShareLikeAction,
} from "@/features/routine-share/actions";
import {
  applyTargetNote,
  sortApplyTargets,
  type ApplyTarget,
  type RoutineShareItem,
} from "@/features/routine-share/share";

/**
 * 커뮤니티 '루틴' 세그먼트 — 남이 소개한 **하루치 루틴**을 보고 내 루틴의 한 일차로 담는다.
 * 카드 → 상세(운동 순서·메모) → 일차 선택 시트(줄을 누르면 바로 담김).
 */
export function RoutineShareBoard({
  items,
  targets,
}: {
  items: RoutineShareItem[];
  targets: ApplyTarget[];
}) {
  const [focus, setFocus] = useState<string | null>(null);
  const [open, setOpen] = useState<RoutineShareItem | null>(null);

  // 부위 칩 — 올라온 글에 실제로 있는 부위만 보여준다(빈 칩 방지).
  const chips = useMemo(() => {
    const seen = new Map<string, string>();
    for (const it of items) {
      it.focusBlocks.forEach((f, i) => {
        if (!seen.has(f)) seen.set(f, it.focusNames[i] ?? f);
      });
    }
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  }, [items]);

  const visible = useMemo(
    () => (focus ? items.filter((it) => it.focusBlocks.includes(focus)) : items),
    [items, focus],
  );

  return (
    <div className="flex flex-col gap-3 px-4 pb-6 pt-3">
      <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
        다른 사람의 <strong>하루치 루틴</strong>을 그대로 내 루틴에 담을 수 있어요.
        운동 순서와 메모까지 그대로 옵니다.
      </p>

      {chips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip active={focus === null} onClick={() => setFocus(null)}>
            전체
          </Chip>
          {chips.map((c) => (
            <Chip
              key={c.value}
              active={focus === c.value}
              onClick={() => setFocus(focus === c.value ? null : c.value)}
            >
              {c.label}
            </Chip>
          ))}
        </div>
      ) : null}

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-4 py-10 text-center text-sm font-semibold text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          아직 소개된 루틴이 없어요.
          <span className="mt-1 block text-xs font-medium">
            운동 › 운동 등록에서 “이 일차 소개하기”로 내 루틴을 올려보세요.
          </span>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => setOpen(it)}
                className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50/40 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/20"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-bold text-zinc-950 dark:text-zinc-100">
                    {it.title}
                    <span className="ml-2 whitespace-nowrap rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                      운동 {it.exerciseCount}개
                    </span>
                  </h3>
                  <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                    {it.authorName} · {it.focusNames.join(" · ")}
                  </p>
                  <p className="mt-1 truncate text-sm text-zinc-600 dark:text-zinc-300">
                    {it.preview}
                  </p>
                  <p className="mt-1 text-[11px] font-semibold text-zinc-400 dark:text-zinc-500">
                    ♥ {it.likeCount} · 담기 {it.saveCount}
                  </p>
                </div>
                <ChevronRight
                  aria-hidden="true"
                  size={18}
                  className="shrink-0 text-zinc-400 dark:text-zinc-500"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {open ? (
        <ShareDetailSheet
          item={open}
          targets={targets}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 rounded-full border px-3 text-xs font-bold transition ${
        active
          ? "border-emerald-600 bg-emerald-600 text-white"
          : "border-zinc-300 bg-white text-zinc-600 hover:border-emerald-300 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

/** 상세 — 운동 순서를 번호 리스트로, 메모는 운동 밑에 쪽지로(메인 화면과 같은 표현). */
function ShareDetailSheet({
  item,
  targets,
  onClose,
}: {
  item: RoutineShareItem;
  targets: ApplyTarget[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [liked, setLiked] = useState(item.likedByMe);
  const [likes, setLikes] = useState(item.likeCount);
  const [picking, setPicking] = useState(false);
  const [pending, start] = useTransition();

  const warmup = item.conditioning.filter((c) => c.kind !== "cooldown");
  const cooldown = item.conditioning.filter((c) => c.kind === "cooldown");

  function toggleLike() {
    const next = !liked;
    setLiked(next);
    setLikes((n) => n + (next ? 1 : -1));
    void toggleRoutineShareLikeAction(item.id).catch(() => {});
  }

  function remove() {
    start(async () => {
      await deleteRoutineShareAction(item.id);
      onClose();
      router.refresh();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[86dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl dark:bg-zinc-900 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-2 border-b border-zinc-200 p-4 dark:border-zinc-700">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-lg font-bold text-zinc-950 dark:text-zinc-50">
              {item.title}
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {item.authorName} · {item.focusNames.join(" · ")} · 운동{" "}
              {item.exerciseCount}개
              {item.includeWeight ? " · 무게는 작성자 기준" : ""}
            </p>
          </div>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {item.caption ? (
            <p className="mb-3 whitespace-pre-wrap rounded-lg bg-zinc-50 px-3 py-2 text-sm leading-6 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {item.caption}
            </p>
          ) : null}

          {warmup.length > 0 ? (
            <CondBlock title="워밍업" rows={warmup} tone="amber" />
          ) : null}

          <h4 className="mb-1.5 mt-3 flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
            <Dumbbell aria-hidden="true" size={14} className="text-emerald-600" />
            본운동
          </h4>
          <ol className="flex flex-col gap-1.5">
            {item.exercises.map((e, i) => (
              <li
                key={`${e.exercise_id}-${i}`}
                className="rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700"
              >
                <p className="text-sm font-bold text-zinc-950 dark:text-zinc-100">
                  <span className="mr-1.5 text-emerald-700 dark:text-emerald-400">
                    {i + 1}
                  </span>
                  {e.name}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {e.sets}세트 × {e.reps}회
                  {e.weight_kg != null ? ` · ${e.weight_kg}kg` : ""}
                </p>
                {e.memo ? (
                  <p className="mt-1 flex items-start gap-1 text-xs leading-5 text-amber-700 dark:text-amber-400">
                    <StickyNote
                      aria-hidden="true"
                      size={12}
                      className="mt-0.5 shrink-0"
                    />
                    <span className="whitespace-pre-wrap">{e.memo}</span>
                  </p>
                ) : null}
              </li>
            ))}
          </ol>

          {cooldown.length > 0 ? (
            <CondBlock title="마무리" rows={cooldown} tone="sky" />
          ) : null}
        </div>

        <div className="flex items-center gap-2 border-t border-zinc-200 p-4 dark:border-zinc-700">
          <button
            type="button"
            onClick={toggleLike}
            aria-pressed={liked}
            className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-sm font-bold transition ${
              liked
                ? "border-rose-300 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-400"
                : "border-zinc-300 bg-white text-zinc-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            <Heart aria-hidden="true" size={16} fill={liked ? "currentColor" : "none"} />
            {likes}
          </button>
          {item.mine ? (
            <button
              type="button"
              onClick={remove}
              disabled={pending}
              className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border border-red-300 bg-white px-3 text-sm font-bold text-red-600 transition disabled:opacity-60 dark:border-red-800 dark:bg-zinc-800 dark:text-red-400"
            >
              {pending ? (
                <Loader2 aria-hidden="true" size={16} className="animate-spin" />
              ) : (
                <Trash2 aria-hidden="true" size={16} />
              )}
              삭제
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setPicking(true)}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-500"
          >
            내 루틴에 담기
          </button>
        </div>
      </div>

      {picking ? (
        <ApplyDaySheet
          shareId={item.id}
          targets={targets}
          onClose={() => setPicking(false)}
          onApplied={() => {
            setPicking(false);
            onClose();
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}

function CondBlock({
  title,
  rows,
  tone,
}: {
  title: string;
  rows: RoutineShareItem["conditioning"];
  tone: "amber" | "sky";
}) {
  const color =
    tone === "amber"
      ? "text-amber-600 dark:text-amber-400"
      : "text-sky-600 dark:text-sky-400";
  return (
    <div className="mt-3">
      <h4 className="mb-1.5 flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
        <Wind aria-hidden="true" size={14} className={color} />
        {title}
      </h4>
      <ul className="flex flex-col gap-1">
        {rows.map((c, i) => (
          <li
            key={`${c.item_id}-${i}`}
            className="rounded-lg bg-zinc-50 px-3 py-1.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
          >
            <span className="font-bold text-zinc-800 dark:text-zinc-100">
              {c.name}
            </span>
            {c.duration_min != null ? ` · ${c.duration_min}분` : ""}
            {c.speed != null ? ` · ${c.speed}km/h` : ""}
            {c.incline != null ? ` · 경사 ${c.incline}` : ""}
            {c.sets != null ? ` · ${c.sets}세트` : ""}
            {c.reps != null ? ` · ${c.reps}회` : ""}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * 일차 선택 — **줄을 누르면 바로 담긴다.** 고르고 나서 또 '담기'를 누르는 두 번 손이 없다.
 * 비어 있는 일차는 즉시, 운동이 든 일차만 "덮어씁니다" 확인을 한 번 받는다.
 */
function ApplyDaySheet({
  shareId,
  targets,
  onClose,
  onApplied,
}: {
  shareId: string;
  targets: ApplyTarget[];
  onClose: () => void;
  onApplied: () => void;
}) {
  const [confirm, setConfirm] = useState<ApplyTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const sorted = useMemo(() => sortApplyTargets(targets), [targets]);

  function apply(t: ApplyTarget) {
    start(async () => {
      const res = await applyRoutineShareAction(shareId, t.dayIndex);
      if (res.ok) onApplied();
      else setError(res.error);
    });
  }

  function pick(t: ApplyTarget) {
    if (applyTargetNote(t.exerciseCount).overwrites) setConfirm(t);
    else apply(t);
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl dark:bg-zinc-900 sm:rounded-2xl sm:pb-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
          어느 일차에 담을까요?
        </h3>
        <p className="mt-1 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          누르면 바로 담깁니다. <strong>오늘만이 아니라 루틴이 바뀝니다.</strong>
        </p>

        {sorted.length === 0 ? (
          <p className="mt-4 text-sm font-semibold text-zinc-500">
            먼저 루틴을 만들어 주세요.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {sorted.map((t) => {
              const { note, overwrites } = applyTargetNote(t.exerciseCount);
              return (
                <li key={t.dayIndex}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => pick(t)}
                    className="flex w-full items-center justify-between gap-2 rounded-xl border border-zinc-300 bg-white px-3 py-3 text-left transition hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-zinc-950 dark:text-zinc-100">
                        {t.label}
                      </span>
                      <span
                        className={`block text-xs font-semibold ${
                          overwrites
                            ? "text-red-600 dark:text-red-400"
                            : "text-zinc-500 dark:text-zinc-400"
                        }`}
                      >
                        {note}
                      </span>
                    </span>
                    <ChevronRight
                      aria-hidden="true"
                      size={18}
                      className="shrink-0 text-zinc-400"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {error ? (
          <p className="mt-3 text-xs font-semibold text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="mt-3 h-11 w-full rounded-xl border border-zinc-300 bg-white text-sm font-bold text-zinc-700 transition disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
        >
          취소
        </button>
      </div>

      {confirm ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
          onClick={() => setConfirm(null)}
        >
          <div
            className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-2xl dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-base font-bold text-zinc-950 dark:text-zinc-50">
              {confirm.label} 을 덮어쓸까요?
            </h4>
            <p className="mt-1.5 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
              지금 등록된 운동 {confirm.exerciseCount}개가 지워지고 이 루틴으로 바뀝니다.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                disabled={pending}
                className="h-11 flex-1 rounded-xl border border-zinc-300 bg-white text-sm font-bold text-zinc-700 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  const t = confirm;
                  setConfirm(null);
                  apply(t);
                }}
                disabled={pending}
                className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-600 text-sm font-bold text-white disabled:opacity-60"
              >
                {pending ? (
                  <Loader2 aria-hidden="true" size={16} className="animate-spin" />
                ) : null}
                덮어쓰기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
