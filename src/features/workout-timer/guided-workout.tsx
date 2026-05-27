"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, X } from "lucide-react";

import { setExerciseStatusAction } from "@/features/routine/exercise-completion-actions";
import { setConditioningStatusAction } from "@/features/routine/conditioning-completion-actions";
import { useRestTimer } from "@/features/workout-timer/rest-timer";
import { ExerciseDemo } from "@/features/workout-timer/exercise-demo";
import { ConditioningIcon } from "@/features/exercises/components/conditioning-icon";

/** 가이드 큐의 한 항목. 본운동·워밍업·마무리 통합 표현. */
export type GuidedItem =
  | {
      kind: "main";
      rowId: string;
      exerciseId: string;
      equipment: string;
      focus: string;
      name: string;
      subtitle: string;
      method: string[];
      sets: number;
      reps: number;
      weightKg: number | null;
    }
  | {
      kind: "warmup" | "cooldown";
      rowId: string;
      itemId: string;
      name: string;
      subtitle: string;
      method: string[];
      durationMin: number | null;
      speed: number | null;
      incline: number | null;
    };

/**
 * 가이드 운동 오버레이. `items` 큐를 처음부터 끝까지 진행하며 한 번에 한 운동을
 * 풀스크린으로 보여준다. 운동 방법 단계는 3초마다 자동 강조 순환.
 */
export function GuidedOverlay({
  items,
  onClose,
}: {
  items: GuidedItem[];
  onClose: () => void;
}) {
  const router = useRouter();
  const rest = useRestTimer();
  const [index, setIndex] = useState(0);
  const [pending, startTx] = useTransition();

  const item = items[index];
  const total = items.length;
  const isLast = index >= total - 1;

  function advance() {
    if (isLast) {
      onClose();
      // 모든 운동이 끝났으니 화면 합계도 새로 가져오기
      startTx(() => router.refresh());
      return;
    }
    setIndex((i) => i + 1);
  }

  function complete() {
    if (!item) return;
    if (item.kind === "main") {
      void setExerciseStatusAction(item.rowId, "done", {
        exerciseId: item.exerciseId,
        equipment: item.equipment,
        sets: item.sets,
        reps: item.reps,
        weightKg: item.weightKg,
        focus: item.focus,
      });
      // 자동 휴식 — 무게 있으면 90초, 맨몸이면 60초
      rest.trigger(item.weightKg !== null && item.weightKg > 0 ? 90 : 60);
    } else {
      void setConditioningStatusAction(item.kind, item.rowId, item.itemId, "done", {
        durationMin: item.durationMin,
        speed: item.speed,
        incline: item.incline,
      });
    }
    advance();
  }

  function skip() {
    if (!item) return;
    if (item.kind === "main") {
      void setExerciseStatusAction(item.rowId, "skipped", {
        exerciseId: item.exerciseId,
        equipment: item.equipment,
        sets: item.sets,
        reps: item.reps,
        weightKg: item.weightKg,
        focus: item.focus,
      });
    } else {
      void setConditioningStatusAction(
        item.kind,
        item.rowId,
        item.itemId,
        "skipped",
        {
          durationMin: item.durationMin,
          speed: item.speed,
          incline: item.incline,
        },
      );
    }
    advance();
  }

  // ESC 로 닫기
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-zinc-900/95 backdrop-blur-sm dark:bg-black/95">
      {/* 상단 바 — 진행률 + 닫기 */}
      <div className="flex items-center justify-between px-4 pb-2 pt-[max(env(safe-area-inset-top),1rem)]">
        <span className="font-mono text-sm font-bold tabular-nums text-white">
          {index + 1} / {total}
        </span>
        <div className="mx-3 h-1 flex-1 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        >
          <X aria-hidden="true" size={18} />
        </button>
      </div>

      {/* 본문 — 스크롤 가능 */}
      <div className="flex flex-1 flex-col items-center justify-center overflow-y-auto px-6 py-4">
        <KindBadge kind={item.kind} />
        <ItemVisual item={item} />
        <h2 className="mt-4 text-center text-2xl font-bold text-white sm:text-3xl">
          {item.name}
        </h2>
        <p className="mt-1.5 text-center text-sm text-zinc-300">
          {item.subtitle}
        </p>

        {item.method.length > 0 ? (
          <MethodSteps steps={item.method} />
        ) : (
          <p className="mt-8 text-center text-sm text-zinc-400">
            운동 방법 안내가 없습니다.
          </p>
        )}
      </div>

      {/* 하단 버튼 */}
      <div className="grid grid-cols-2 gap-2 border-t border-white/10 bg-zinc-950/80 p-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
        <button
          type="button"
          onClick={skip}
          disabled={pending}
          className="inline-flex h-14 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-base font-bold text-zinc-200 transition hover:bg-white/10 disabled:opacity-50"
        >
          <ChevronRight aria-hidden="true" size={20} />
          넘기기
        </button>
        <button
          type="button"
          onClick={complete}
          disabled={pending}
          className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-base font-bold text-white shadow-lg transition hover:bg-emerald-500 disabled:opacity-50"
        >
          <Check aria-hidden="true" size={20} />
          {isLast ? "완료하고 종료" : "완료"}
        </button>
      </div>
    </div>
  );
}

function KindBadge({ kind }: { kind: GuidedItem["kind"] }) {
  const label =
    kind === "warmup" ? "워밍업" : kind === "cooldown" ? "마무리" : "본운동";
  const tone =
    kind === "warmup"
      ? "bg-amber-500/20 text-amber-300"
      : kind === "cooldown"
        ? "bg-sky-500/20 text-sky-300"
        : "bg-emerald-500/20 text-emerald-300";
  return (
    <span
      className={`mb-3 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${tone}`}
    >
      {label}
    </span>
  );
}

/**
 * 본운동: 조심 포인트 마커가 펄스하는 실루엣 + 주의사항 카드 (ExerciseDemo).
 * 워밍업·마무리: 동그란 종목 아이콘 — 비교적 단순한 동작이라 강조 마커 불필요.
 */
function ItemVisual({ item }: { item: GuidedItem }) {
  if (item.kind === "main") {
    return <ExerciseDemo exerciseId={item.exerciseId} name={item.name} />;
  }
  const ring =
    item.kind === "warmup"
      ? "bg-amber-500/15 text-amber-300"
      : "bg-sky-500/15 text-sky-300";
  return (
    <div
      className={`flex h-24 w-24 items-center justify-center rounded-3xl ${ring}`}
    >
      <ConditioningIcon id={item.itemId} size={56} />
    </div>
  );
}

/**
 * 운동 방법 단계 — 3초마다 한 단계씩 강조 순환.
 * 강조된 단계: 더 크게, 밝게, 좌측에 인디케이터.
 */
function MethodSteps({ steps }: { steps: string[] }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    // 단계 배열이 바뀔 때마다 첫 단계부터 다시. 3초 간격 자동 순환. 의도된 setState.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActive(0);
    if (steps.length <= 1) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % steps.length);
    }, 3000);
    return () => window.clearInterval(id);
  }, [steps]);

  return (
    <ul className="mt-6 w-full max-w-md space-y-2">
      {steps.map((s, i) => {
        const isActive = i === active;
        return (
          <li
            key={i}
            className={`flex gap-3 rounded-2xl border px-4 py-3 transition-all duration-500 ${
              isActive
                ? "border-emerald-400 bg-emerald-500/10 text-white shadow-lg shadow-emerald-500/10"
                : "border-white/10 bg-white/[0.03] text-zinc-400 opacity-70"
            }`}
            style={{
              transform: isActive ? "scale(1.02)" : "scale(1)",
            }}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                isActive
                  ? "bg-emerald-500 text-white"
                  : "bg-white/10 text-zinc-400"
              }`}
            >
              {i + 1}
            </span>
            <span
              className={`text-sm leading-6 ${isActive ? "font-semibold" : ""}`}
            >
              {s}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

