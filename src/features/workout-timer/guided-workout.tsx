"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Crosshair,
  ListChecks,
  Pause,
  Play,
  StickyNote,
  Target,
  Timer,
  X,
} from "lucide-react";

import { setExerciseStatusAction } from "@/features/routine/exercise-completion-actions";
import { setConditioningStatusAction } from "@/features/routine/conditioning-completion-actions";
import { useTodayOrder } from "@/features/routine/components/today-order-scope";
import { useRestTimer } from "@/features/workout-timer/rest-timer";
import {
  REST_PRESETS,
  formatRest,
  isLastSet,
  setProgressLabel,
} from "@/features/workout-timer/rest-logic";
import {
  ExercisePhotoDemo,
  ExerciseTutorial,
} from "@/features/workout-timer/exercise-photo-demo";
import {
  conditioningPhotoFrames,
  exercisePhotoFrames,
} from "@/features/workout-timer/exercise-photo-map";
import { MediaEmbed } from "@/features/exercises/components/media-embed";
import type { MediaKind } from "@/features/exercises/exercise-media";
import {
  guideFor,
  type ExerciseGuide,
} from "@/features/workout-timer/exercise-guides";
import { ConfirmDialog } from "@/components/confirm-dialog";

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
      /** 개인 메모. null = 없음. */
      memo: string | null;
      /** 관리자 등록 시범 미디어. null = 없음(기본 일러스트 사용). */
      media: { url: string; kind: MediaKind } | null;
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
      /** 개인 메모. null = 없음. */
      memo: string | null;
    };

/** 저장 실패 항목 — 배너 표시 + 재시도용. */
type SaveFailure = {
  key: string;
  name: string;
  status: "done" | "skipped";
  captured: GuidedItem;
  error: string;
};

/** 항목별 안정 키 — 같은 행의 실패는 하나로 합쳐 중복 배너 방지. */
function failureKey(item: GuidedItem): string {
  return item.kind === "main"
    ? `main:${item.rowId}`
    : `${item.kind}:${item.rowId}:${item.itemId}`;
}

/** 항목의 실사 시연 사진(2프레임). 본운동=기구별 매핑, 워밍업·마무리=컨디셔닝 매핑. */
function framesForItem(item: GuidedItem): [string, string] | null {
  return item.kind === "main"
    ? exercisePhotoFrames(item.exerciseId, item.equipment)
    : conditioningPhotoFrames(item.itemId);
}

/**
 * 사진 위로 한 장면씩 넘기는 튜토리얼 자막.
 * 본운동은 방법 3줄 대신 가이드의 상세 폼 큐(어떻게 하는지) + 💡꿀팁(초보 팁)으로
 * 훨씬 자세하게 — "견갑을 모은다"면 어떻게 모으는지, 흔한 실수까지 한 장면씩.
 * 워밍업·마무리는 컨디셔닝 방법 문구 그대로.
 */
function tutorialStepsFor(item: GuidedItem): string[] {
  if (item.kind !== "main") return item.method;
  const g = guideFor(item.exerciseId);
  return [...g.cues, ...g.beginnerTips.map((t) => `💡 ${t}`)];
}

/**
 * 가이드 운동 오버레이. `items` 큐를 처음부터 끝까지 진행하며 한 번에 한 운동을
 * 풀스크린으로 보여준다. 운동 방법 단계는 3초마다 자동 강조 순환.
 */
export function GuidedOverlay({
  items,
  onClose,
  onAllComplete,
  elapsedLabel,
  running = true,
  onPauseResume,
  showGuide = true,
}: {
  items: GuidedItem[];
  onClose: () => void;
  /** 마지막 항목까지 완료/넘기기 처리되면 호출. 부모가 운동시간 저장 등 후처리. */
  onAllComplete?: () => void;
  /** 세션 경과 시간(mm:ss). 운동 페이지 안에 표시. undefined 면 표시 안 함. */
  elapsedLabel?: string;
  /** 타이머가 흐르는 중인지 — 버튼이 '중단하기'/'운동 다시 시작하기'로 토글. */
  running?: boolean;
  /** 중단/다시 시작 토글. */
  onPauseResume?: () => void;
  /** 개인설정: 상세 가이드 카드 표시. 기본 true. */
  showGuide?: boolean;
}) {
  const router = useRouter();
  const rest = useRestTimer();
  const orderScope = useTodayOrder();
  const [index, setIndex] = useState(0);
  const workingRef = useRef(false);
  const [working, setWorking] = useState(false);
  const dirtyRef = useRef(false);
  /** 진행 중인 완료/넘기기 저장들 — 화면을 닫고 새로고침하기 전에 모두 끝났는지 기다린다.
   * (백그라운드로 쏘고 곧바로 refresh 하면 저장 전 stale 데이터를 읽어 일부가 반영 안 됨.) */
  const pendingRef = useRef<Promise<unknown>[]>([]);
  const [closeAsk, setCloseAsk] = useState(false);
  /** 저장 실패한 항목들 — 사용자에게 배너로 알리고 재시도 제공. */
  const [failures, setFailures] = useState<SaveFailure[]>([]);

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

  // 현재 본운동에서 완료한 세트 수(0-base). 항목이 바뀌면 0으로 리셋.
  const [setsDone, setSetsDone] = useState(0);
  useEffect(() => {
    // 의도된 리셋 — 운동(인덱스)이 바뀌면 세트 카운트 초기화.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSetsDone(0);
  }, [index]);

  // 다음 1~2개 운동의 시연 사진을 미리 받아둔다 → '다음 운동'으로 넘길 때
  // 빈 화면/지연 없이 즉시 표시(브라우저 캐시 워밍). 현재 항목이 바뀔 때마다.
  useEffect(() => {
    for (let k = 1; k <= 2; k++) {
      const next = sessionItems[index + k];
      if (!next) break;
      const frames = framesForItem(next);
      if (!frames) continue;
      for (const src of frames) {
        const img = new Image();
        img.decoding = "async";
        img.src = src;
      }
    }
  }, [index, sessionItems]);

  // 튜토리얼 자막(상세 큐 + 💡꿀팁) — 참조를 안정화한다. 인라인으로 만들면 매 렌더
  // (타이머 경과시간 갱신 등)마다 새 배열이라 ExerciseTutorial 의 자동 전환이 0으로
  // 리셋돼 첫 장면에 갇힌다.
  const tutorialSteps = useMemo(
    () => (item ? tutorialStepsFor(item) : []),
    [item],
  );

  // 본운동이고 세트가 2개 이상이면 세트별 휴식 안내 노출.
  const mainSets =
    item && item.kind === "main" && item.sets > 1 ? item.sets : 0;
  const onLastSet = mainSets > 0 ? isLastSet(setsDone, mainSets) : true;

  /** 세트 완료 — 운동을 넘기지 않고 휴식만 시작 + 세트 카운트 증가. */
  function completeSet() {
    rest.trigger();
    setSetsDone((d) => Math.min(d + 1, Math.max(0, mainSets - 1)));
  }

  function advance() {
    if (isLast) {
      onClose();
      // 모든 항목 종료 — 부모(타이머)가 운동시간 저장 처리
      onAllComplete?.();
      // 진행 중인 완료/넘기기 저장이 모두 끝난 뒤 화면 합계를 새로 가져온다.
      refreshAfterPending();
      return;
    }
    setIndex((i) => i + 1);
  }

  /** 해당 항목의 서버 액션 호출. 성공/실패 결과를 반환. */
  function runAction(captured: GuidedItem, status: "done" | "skipped") {
    if (captured.kind === "main") {
      return setExerciseStatusAction(captured.rowId, status, {
        exerciseId: captured.exerciseId,
        equipment: captured.equipment,
        sets: captured.sets,
        reps: captured.reps,
        weightKg: captured.weightKg,
        focus: captured.focus,
      });
    }
    return setConditioningStatusAction(captured.kind, captured.rowId, captured.itemId, status, {
      durationMin: captured.durationMin,
      speed: captured.speed,
      incline: captured.incline,
    });
  }

  /**
   * 액션을 background 로 fire 하고 결과를 추적.
   * 실패(서버가 ok:false 반환 또는 네트워크 예외) 시 failures 배너에 기록,
   * 성공 시 같은 항목의 기존 실패 기록을 제거.
   */
  function fireAndTrack(captured: GuidedItem, status: "done" | "skipped") {
    const key = failureKey(captured);
    const p = runAction(captured, status)
      .then((res) => {
        if (res && res.ok === false) {
          setFailures((f) => [
            ...f.filter((x) => x.key !== key),
            { key, name: captured.name, status, captured, error: res.error },
          ]);
        } else {
          setFailures((f) => f.filter((x) => x.key !== key));
        }
      })
      .catch((e: unknown) => {
        const error = e instanceof Error ? e.message : "알 수 없는 오류";
        setFailures((f) => [
          ...f.filter((x) => x.key !== key),
          { key, name: captured.name, status, captured, error },
        ]);
      });
    // 닫기/새로고침 전에 이 저장이 끝났는지 기다릴 수 있게 모아둔다.
    pendingRef.current.push(p);
  }

  /**
   * 진행 중인 모든 완료/넘기기 저장이 끝난 뒤에 화면을 새로고침한다.
   * 저장 전에 refresh 하면 서버가 옛 데이터를 읽어 일부 항목이 홈에 반영되지 않는다
   * (= 새로고침하면 그제서야 보이던 버그). 저장 완료를 기다린 뒤 한 번만 refresh.
   */
  function refreshAfterPending() {
    const pend = pendingRef.current;
    pendingRef.current = [];
    void (async () => {
      await Promise.allSettled(pend);
      router.refresh();
    })();
  }

  /**
   * 완료·넘기기 — 낙관적 업데이트.
   * 서버 응답을 기다리지 않고 advance + 휴식 타이머 즉시 트리거.
   * 액션 실패 시 상단 배너로 알리고 재시도 가능(fireAndTrack).
   * 더블 탭은 workingRef 로 300ms 차단.
   */
  function dispatch(status: "done" | "skipped") {
    if (workingRef.current || !item) return;
    workingRef.current = true;
    setWorking(true);

    const captured = item; // advance 직전에 캡쳐
    const isMain = captured.kind === "main";

    // 0) 공유 오버라이드 즉시 갱신 — 운동 끝나고 바로 다시 시작해도(서버 새로고침 전)
    //    완료/넘긴 운동이 큐에 다시 안 뜨게. (리스트 스킵/완료와 동일한 경로.)
    orderScope?.setCompletion(captured.rowId, status);

    // 1) 서버 액션은 background — await 없음, 결과는 fireAndTrack 이 추적
    fireAndTrack(captured, status);

    // 2) 완료 면 휴식 타이머 즉시(사용자 설정 휴식 시간)
    if (status === "done" && isMain) {
      rest.trigger();
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

  /** 배너에서 실패 항목 재시도. */
  function retryFailure(f: SaveFailure) {
    fireAndTrack(f.captured, f.status);
  }
  function dismissFailure(key: string) {
    setFailures((list) => list.filter((x) => x.key !== key));
  }

  function complete() {
    dispatch("done");
  }
  function skip() {
    dispatch("skipped");
  }

  // 닫기 — 완료/넘기기 누르기 전엔 confirm 으로 우발적 종료 방지.
  function requestClose() {
    setCloseAsk(true);
  }
  function confirmClose() {
    onClose();
    setCloseAsk(false);
    if (dirtyRef.current) {
      // 중간에 닫아도, 그동안의 완료/넘기기 저장이 끝난 뒤 새로고침해 stale 방지.
      refreshAfterPending();
    }
  }

  // ESC 로 닫기 — 동일하게 confirm 거침
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") requestClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // 오버레이가 떠 있는 동안 휴식 알약을 하단 버튼 바 위로 올려, 알약이 완료/넘기기 탭을 가리지 않게 한다.
  useEffect(() => {
    rest.setLifted(true);
    return () => rest.setLifted(false);
  }, [rest]);

  if (!item) return null;

  // 이 항목의 실사 시연 사진(2프레임).
  const photoFrames = item ? framesForItem(item) : null;
  // 방법 문구를 사진 위 장면으로 넘기는 '튜토리얼 영상'.
  // - 본운동: 등록 영상이 없고 방법 문구가 있으면(사진 없어도 그라데이션 위 문구로).
  // - 워밍업·마무리: 방법 문구가 있으면(사진 없으면 그라데이션 위 문구로). 막대인간 일러스트는 쓰지 않는다.
  const tutorial =
    item.method.length > 0 && (item.kind === "main" ? !item.media : true);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-zinc-50 dark:bg-zinc-950">
      {/* 상단 바 — 진행률 + 닫기 */}
      <div className="flex items-center justify-between px-4 pb-2 pt-[max(env(safe-area-inset-top),1rem)]">
        <span className="font-mono text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
          {index + 1} / {total}
        </span>
        <div className="mx-3 h-1 flex-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
        <button
          type="button"
          aria-label="닫기"
          onClick={requestClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200 text-zinc-700 transition hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
        >
          <X aria-hidden="true" size={18} />
        </button>
      </div>

      {/* 세션 운동 시간 — 운동 페이지 안에서 보여준다(+ 중단하기/다시 시작하기). */}
      {elapsedLabel !== undefined ? (
        <div className="flex items-center justify-center gap-2 px-4 pb-1">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 dark:border-emerald-800 dark:bg-emerald-950/40">
            <Timer
              aria-hidden="true"
              size={14}
              className={`text-emerald-700 dark:text-emerald-300 ${running ? "animate-pulse" : ""}`}
            />
            <span className="font-mono text-sm font-bold tabular-nums text-emerald-900 dark:text-emerald-100">
              {elapsedLabel}
            </span>
          </span>
          {onPauseResume ? (
            <button
              type="button"
              onClick={onPauseResume}
              className="inline-flex h-8 items-center gap-1 rounded-full border border-emerald-300 bg-white px-3 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-700 dark:bg-zinc-900 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
            >
              {running ? (
                <>
                  <Pause aria-hidden="true" size={13} />
                  중단하기
                </>
              ) : (
                <>
                  <Play aria-hidden="true" size={13} />
                  운동 다시 시작하기
                </>
              )}
            </button>
          ) : null}
        </div>
      ) : null}

      {/* 저장 실패 배너 — 액션이 실패하면(예: RLS/네트워크) 알리고 재시도 */}
      {failures.length > 0 && (
        <div
          role="alert"
          className="mx-4 mb-1 space-y-1.5 rounded-xl border border-red-300 bg-red-50 p-3 text-sm dark:border-red-500/40 dark:bg-red-500/10"
        >
          {failures.map((f) => (
            <div key={f.key} className="flex items-center gap-2">
              <span className="flex-1 text-red-800 dark:text-red-200">
                <strong className="font-bold">{f.name}</strong> 저장 실패 —{" "}
                {f.status === "done" ? "완료" : "넘기기"}가 기록되지 않았습니다.
              </span>
              <button
                type="button"
                onClick={() => retryFailure(f)}
                className="shrink-0 rounded-lg bg-red-600 px-3 py-1 text-xs font-bold text-white transition hover:bg-red-500"
              >
                다시 시도
              </button>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => dismissFailure(f.key)}
                className="shrink-0 rounded-lg p-1 text-red-700 transition hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-500/20"
              >
                <X aria-hidden="true" size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 본문 — 스크롤 가능. justify-center 는 내용이 길면 위쪽이 잘려 스크롤이 막히므로
          (flexbox 한계), m-auto 래퍼로 대체 — 짧으면 가운데, 길면 위부터 끝까지 스크롤. */}
      <div
        data-testid="guided-scroll"
        className="flex flex-1 flex-col overflow-y-auto px-6 py-4"
      >
        <div className="m-auto flex w-full flex-col items-center">
        <KindBadge kind={item.kind} />
        {/* 본운동에 등록 영상이 없고 방법 문구가 있으면, 문구를 사진 위에 한 장면씩
            넘기는 '튜토리얼 영상'으로 보여준다. 그 외(영상 등록/워밍업·마무리)는 기존대로. */}
        {tutorial ? (
          <>
            {photoFrames ? (
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                실제 자세
              </p>
            ) : null}
            <ExerciseTutorial frames={photoFrames} steps={tutorialSteps} />
          </>
        ) : (
          <ItemVisual item={item} />
        )}

        <h2 className="mt-4 text-center text-2xl font-bold text-zinc-950 dark:text-zinc-50 sm:text-3xl">
          {item.name}
        </h2>
        <p className="mt-1.5 text-center text-sm text-zinc-600 dark:text-zinc-300">
          {item.subtitle}
        </p>

        {/* 기구별 빠른 단계 — 튜토리얼(사진 위 자막)이 아닐 때만 목록으로. */}
        {tutorial ? null : item.method.length > 0 ? (
          <MethodSteps steps={item.method} />
        ) : item.kind !== "main" ? (
          <p className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
            운동 방법 안내가 없습니다.
          </p>
        ) : null}

        {/* 본운동: 자세 잡기·자극 부위·핵심 포인트·초보 팁 상세 가이드.
            따라 하면서 운동할 수 있게 방법 문구보다 훨씬 구체적으로. (개인설정으로 끌 수 있음) */}
        {item.kind === "main" && showGuide ? (
          <ExerciseGuideCard guide={guideFor(item.exerciseId)} />
        ) : null}

        {/* 개인 메모 — 메모가 있으면 표시 (본운동·워밍업·마무리 공통) */}
        {item.memo ? (
          <div className="mt-6 w-full max-w-md rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-500/40 dark:bg-amber-500/10">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              <StickyNote aria-hidden="true" size={13} />
              메모
            </p>
            <p className="whitespace-pre-wrap text-sm leading-6 text-amber-900 dark:text-amber-100">
              {item.memo}
            </p>
          </div>
        ) : null}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="space-y-2.5 border-t border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95 p-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
        {/* 휴식 시간 설정 — 운동 시작 화면에서 바로 조절 */}
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            <Timer aria-hidden="true" size={13} />
            휴식
          </span>
          {REST_PRESETS.map((sec) => {
            const active = rest.defaultSec === sec;
            return (
              <button
                key={sec}
                type="button"
                onClick={() => rest.setDefaultSec(sec)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold transition ${
                  active
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
                }`}
              >
                {formatRest(sec)}
              </button>
            );
          })}
        </div>

        {/* 본운동 세트 진행 + 세트 완료(휴식) — 세트가 여러 개일 때만 */}
        {mainSets > 0 ? (
          <div className="flex items-center gap-2">
            <span className="shrink-0 rounded-lg bg-emerald-50 px-2.5 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300">
              {setProgressLabel(setsDone, mainSets)}
            </span>
            <button
              type="button"
              onClick={completeSet}
              disabled={working || onLastSet}
              className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 text-sm font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-40 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
            >
              <Timer aria-hidden="true" size={16} />
              {onLastSet ? "마지막 세트" : `세트 완료 · 휴식 ${formatRest(rest.defaultSec)}`}
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={skip}
            disabled={working}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white text-base font-bold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <ChevronRight aria-hidden="true" size={20} />
            넘기기
          </button>
          <button
            type="button"
            onClick={complete}
            disabled={working}
            className="inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-emerald-600 text-base font-bold text-white shadow-lg transition hover:bg-emerald-500 disabled:opacity-50"
          >
            <Check aria-hidden="true" size={20} />
            {isLast ? "완료하고 종료" : mainSets > 0 ? "운동 완료" : "완료"}
          </button>
        </div>
      </div>
      <ConfirmDialog
        open={closeAsk}
        title="운동 중단"
        message="운동을 중단할까요? 완료하지 않은 운동은 다음에 다시 보입니다."
        confirmLabel="중단"
        tone="danger"
        onConfirm={confirmClose}
        onCancel={() => setCloseAsk(false)}
      />
    </div>
  );
}

function KindBadge({ kind }: { kind: GuidedItem["kind"] }) {
  const label =
    kind === "warmup" ? "워밍업" : kind === "cooldown" ? "마무리" : "본운동";
  const tone =
    kind === "warmup"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
      : kind === "cooldown"
        ? "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300"
        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300";
  return (
    <span
      className={`mb-3 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${tone}`}
    >
      {label}
    </span>
  );
}

/**
 * 방법 문구가 없는 항목(튜토리얼이 아닌 경우)의 시각 자료.
 * 막대인간(SVG) 일러스트는 쓰지 않는다 — 실사 사진이 있으면 사진, 없으면 빈 그라데이션.
 * - main: 관리자 영상 > 실사 사진
 * - warmup/cooldown: 컨디셔닝 실사 사진(없으면 그라데이션)
 */
function ItemVisual({ item }: { item: GuidedItem }) {
  if (item.kind === "main") {
    if (item.media) {
      return (
        <div className="w-full max-w-md">
          {/* 운동 차례가 되면 자동 재생(음소거). 버튼 안 눌러도 실행됨. */}
          <MediaEmbed url={item.media.url} kind={item.media.kind} autoPlay />
        </div>
      );
    }
    // 실사 시연 사진(매핑 없으면 null → 표시 안 함).
    return (
      <ExercisePhotoDemo exerciseId={item.exerciseId} equipment={item.equipment} />
    );
  }
  // 워밍업·마무리: 실사 사진(없으면 그라데이션). steps 없이 사진/배경만.
  return <ExerciseTutorial frames={conditioningPhotoFrames(item.itemId)} steps={[]} />;
}

/**
 * 본운동 상세 가이드 — 자세 잡기 / 자극 부위(어디가 느껴져야 하는지) / 핵심 포인트 /
 * 초보가 자주 놓치는 것. 방법 3줄보다 훨씬 구체적으로 "따라 하면서" 운동하게 한다.
 */
function ExerciseGuideCard({ guide }: { guide: ExerciseGuide }) {
  return (
    <div className="mt-6 w-full max-w-md space-y-3 text-left">
      {/* 자세 잡기 */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
        <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          <Crosshair aria-hidden="true" size={13} className="text-emerald-500" />
          자세 잡기
        </h3>
        <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-200">
          {guide.setup}
        </p>
      </section>

      {/* 자극 부위 */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          <Target aria-hidden="true" size={13} className="text-rose-500" />
          자극 부위 — 여기가 느껴져야 정상
        </h3>
        <ul className="space-y-1.5">
          {guide.targets.map((t) => (
            <li key={t.name} className="text-sm leading-6">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {t.name}
              </span>
              <span className="text-zinc-500 dark:text-zinc-400">
                {" "}
                — {t.feel}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* 핵심 포인트(폼 큐) */}
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
          <ListChecks aria-hidden="true" size={13} />
          핵심 포인트
        </h3>
        <ol className="space-y-2">
          {guide.cues.map((c, i) => (
            <li key={i} className="flex gap-2.5 text-sm leading-6">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-extrabold text-white">
                {i + 1}
              </span>
              <span className="text-zinc-800 dark:text-zinc-100">{c}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* 초보가 자주 놓치는 것 */}
      <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
          <AlertTriangle aria-hidden="true" size={13} />
          초보가 자주 놓치는 것
        </h3>
        <ul className="space-y-1.5">
          {guide.beginnerTips.map((t, i) => (
            <li
              key={i}
              className="flex gap-2 text-sm leading-6 text-amber-900 dark:text-amber-100"
            >
              <span aria-hidden="true" className="shrink-0 text-amber-500">
                •
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>
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
                ? "border-emerald-400 bg-emerald-50 text-emerald-900 shadow-lg shadow-emerald-500/10 dark:bg-emerald-500/10 dark:text-white"
                : "border-zinc-200 bg-zinc-50 text-zinc-500 opacity-80 dark:border-white/10 dark:bg-white/[0.03] dark:text-zinc-400"
            }`}
            style={{
              transform: isActive ? "scale(1.02)" : "scale(1)",
            }}
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition ${
                isActive
                  ? "bg-emerald-500 text-white"
                  : "bg-zinc-200 text-zinc-500 dark:bg-white/10 dark:text-zinc-400"
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

