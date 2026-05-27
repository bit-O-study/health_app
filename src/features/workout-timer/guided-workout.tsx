"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, X } from "lucide-react";

import { setExerciseStatusAction } from "@/features/routine/exercise-completion-actions";
import { setConditioningStatusAction } from "@/features/routine/conditioning-completion-actions";
import { useRestTimer } from "@/features/workout-timer/rest-timer";
import { ExerciseDemo } from "@/features/workout-timer/exercise-demo";
import { ExerciseFlipbook } from "@/features/workout-timer/exercise-flipbook";
import { conditioningMotionFor } from "@/features/workout-timer/exercise-motion";

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
  const workingRef = useRef(false);
  const [working, setWorking] = useState(false);
  const dirtyRef = useRef(false);

  /**
   * ⚠ 중요: items 를 시작 시점에 스냅샷으로 잡아둠. 서버 액션의 revalidatePath('/')
   * 가 Next.js 자동 RSC 재요청을 유발 → items prop 이 새로 와서 이미 처리한 항목이
   * 배열에서 빠짐 → 우리 index 가 다음 항목을 가리키는데 prop 의 같은 인덱스는
   * 그 다음 항목이라 한 칸 더 건너뛰는 버그. 세션 동안은 lazy init useState 의
   * 초기값(고정 배열) 만 사용. items prop 의 변화는 무시.
   */
  const [sessionItems] = useState(items);

  const item = sessionItems[index];
  const total = sessionItems.length;
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

  /**
   * 완료·넘기기 — 낙관적 업데이트.
   * 서버 응답을 기다리지 않고 advance + 휴식 타이머 즉시 트리거.
   * 액션은 background 로 fire — 실패 시 콘솔에 로그.
   * 더블 탭은 workingRef 로 300ms 차단.
   */
  function dispatch(status: "done" | "skipped") {
    if (workingRef.current || !item) return;
    workingRef.current = true;
    setWorking(true);

    const captured = item; // advance 직전에 캡쳐
    const isMain = captured.kind === "main";

    // 1) 서버 액션은 background — await 없음
    if (isMain) {
      setExerciseStatusAction(captured.rowId, status, {
        exerciseId: captured.exerciseId,
        equipment: captured.equipment,
        sets: captured.sets,
        reps: captured.reps,
        weightKg: captured.weightKg,
        focus: captured.focus,
      }).catch((e) => console.error("[guided] action failed", e));
    } else {
      setConditioningStatusAction(captured.kind, captured.rowId, captured.itemId, status, {
        durationMin: captured.durationMin,
        speed: captured.speed,
        incline: captured.incline,
      }).catch((e) => console.error("[guided] action failed", e));
    }

    // 2) 완료 면 휴식 타이머 즉시
    if (status === "done" && isMain) {
      rest.trigger(captured.weightKg !== null && captured.weightKg > 0 ? 90 : 60);
    }

    // 3) UI 즉시 advance
    dirtyRef.current = true;
    advance();

    // 4) 더블 탭 가드 짧게 — 300ms 후 다시 활성화
    window.setTimeout(() => {
      workingRef.current = false;
      setWorking(false);
    }, 300);
  }

  function complete() {
    dispatch("done");
  }
  function skip() {
    dispatch("skipped");
  }

  // 닫기 — 완료/넘기기 누르기 전엔 confirm 으로 우발적 종료 방지.
  // dirty 상태(한 번이라도 처리한 경우) 면 닫으면서 router.refresh 도 함께 트리거 —
  // 그래야 메인 화면의 완료/휴식 표시가 즉시 동기화됨.
  function requestClose() {
    if (confirm("운동을 중단할까요? 완료하지 않은 운동은 다음에 다시 보입니다.")) {
      onClose();
      if (dirtyRef.current) {
        startTx(() => router.refresh());
      }
    }
  }

  // ESC 로 닫기 — 동일하게 confirm 거침
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") requestClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-zinc-900 dark:bg-black">
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
          onClick={requestClose}
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
          disabled={pending || working}
          className="inline-flex h-14 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 text-base font-bold text-zinc-200 transition hover:bg-white/10 disabled:opacity-50"
        >
          <ChevronRight aria-hidden="true" size={20} />
          넘기기
        </button>
        <button
          type="button"
          onClick={complete}
          disabled={pending || working}
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
 * 본운동·워밍업·마무리 모두 일러스트 컨테이너 사용.
 * - main: ExerciseDemo (시각 코칭 오버레이 포함)
 * - warmup/cooldown: ExerciseFlipbook 의 컨디셔닝 모션 일러스트
 */
function ItemVisual({ item }: { item: GuidedItem }) {
  if (item.kind === "main") {
    return <ExerciseDemo exerciseId={item.exerciseId} name={item.name} />;
  }
  // 워밍업·마무리도 일러스트 — 컨디셔닝 모션 매핑 사용
  const conditioning = conditioningMotionFor(item.itemId);
  return (
    <div
      className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-700 bg-gradient-to-b from-zinc-800 to-zinc-900 p-4"
      style={
        {
          ["--cycle" as string]: `2200ms`,
          aspectRatio: "1 / 1",
        } as React.CSSProperties
      }
    >
      <ExerciseFlipbook conditioning={conditioning} />
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

