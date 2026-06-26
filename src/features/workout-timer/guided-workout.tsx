"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Gauge,
  ListChecks,
  Pause,
  Play,
  StickyNote,
  Timer,
  TrendingUp,
  X,
} from "lucide-react";

import { setExerciseStatusAction } from "@/features/routine/exercise-completion-actions";
import { setConditioningStatusAction } from "@/features/routine/conditioning-completion-actions";
import {
  getConditioningItem,
  PARAM_LABEL,
  PARAM_UNIT,
} from "@/features/routine/conditioning-catalog";
import { adjacentActiveIndex } from "@/features/workout-timer/queue-filter";
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
 * 무게/횟수/세트 스크러버 — 한 줄(full-width) 행: 라벨 + [− 값 +].
 * 값은 좌우로 밀거나 ±로 조절하고, **더블클릭하면 직접 숫자 입력**도 된다.
 * (예전엔 3개를 가로로 나란히 둬서 모바일 폭에서 넘쳐 레이아웃이 깨졌다 → 세로 스택.)
 * 손가락을 가로로 끌면 값이 오르내린다(맨몸 허용 시 최소 아래로 더 내리면 '맨몸').
 */
function NumberScrubber({
  label,
  value,
  unit,
  min,
  max,
  step,
  allowBodyweight = false,
  onChange,
}: {
  label: string;
  value: number | null;
  unit: string;
  min: number;
  max: number;
  step: number;
  allowBodyweight?: boolean;
  onChange: (v: number | null) => void;
}) {
  const startRef = useRef<{ x: number; base: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const PX_PER_STEP = 12;
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const round = (v: number) => Math.round(v / step) * step;

  function applyDelta(base: number, dxSteps: number) {
    const nv = round(base + dxSteps * step);
    if (allowBodyweight && nv < min) onChange(null);
    else onChange(clamp(nv));
  }
  function onDown(e: PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    startRef.current = { x: e.clientX, base: value ?? min };
  }
  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (!startRef.current) return;
    e.stopPropagation();
    const dxSteps = Math.round((e.clientX - startRef.current.x) / PX_PER_STEP);
    applyDelta(startRef.current.base, dxSteps);
  }
  function onUp(e: PointerEvent<HTMLDivElement>) {
    startRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  }
  function dec() {
    if (value === null) return onChange(min);
    const nv = value - step;
    if (allowBodyweight && nv < min) onChange(null);
    else onChange(clamp(nv));
  }
  function inc() {
    onChange(value === null ? min : clamp(value + step));
  }
  // 더블클릭 직접 입력 — 빈칸은 (맨몸 허용 시) 맨몸, 아니면 변경 없음. step 단위로 스냅.
  function commitInput() {
    const raw = inputRef.current?.value.trim() ?? "";
    setEditing(false);
    if (raw === "") {
      if (allowBodyweight) onChange(null);
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    if (allowBodyweight && n < min) return onChange(null);
    onChange(clamp(round(n)));
  }
  const display = value === null ? "맨몸" : String(value);

  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <span className="text-xs font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label={`${label} 줄이기`}
          onClick={dec}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xl font-bold text-zinc-600 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
        >
          −
        </button>
        {editing ? (
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            aria-label={`${label} 직접 입력`}
            autoFocus
            defaultValue={value ?? ""}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={commitInput}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitInput();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setEditing(false);
              }
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="h-9 w-[4.75rem] rounded-lg border border-emerald-400 bg-white px-2 text-center text-xl font-extrabold tabular-nums text-emerald-700 outline-none focus:border-emerald-500 dark:border-emerald-500 dark:bg-zinc-900 dark:text-emerald-300"
          />
        ) : (
          <div
            role="slider"
            aria-label={label}
            aria-valuenow={value ?? 0}
            title="좌우로 끌거나 더블클릭해 직접 입력"
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditing(true);
            }}
            style={{ touchAction: "none" }}
            className="flex h-9 min-w-[4.75rem] cursor-ew-resize select-none items-center justify-center gap-0.5 rounded-lg bg-emerald-50 px-2 dark:bg-emerald-500/10"
          >
            <span className="text-xl font-extrabold tabular-nums text-emerald-700 dark:text-emerald-300">
              {display}
            </span>
            {value !== null ? (
              <span className="text-xs font-semibold text-emerald-700/70 dark:text-emerald-300/70">
                {unit}
              </span>
            ) : null}
          </div>
        )}
        <button
          type="button"
          aria-label={`${label} 늘리기`}
          onClick={inc}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xl font-bold text-zinc-600 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300"
        >
          +
        </button>
      </div>
    </div>
  );
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
  lockWeightReps = false,
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
  /** 무게·횟수 고정. false 면 운동모드에서 무게·횟수·세트를 그때그때 설정(스크러버). */
  lockWeightReps?: boolean;
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
  /** 드래그(스와이프) 네비게이션 — 시작 좌표 + 현재 가로 이동량(px).
   * dragDxRef 는 onPointerUp 이 리렌더 전이라도 최신 이동량을 동기적으로 읽기 위함. */
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragDxRef = useRef(0);
  const [dragDx, setDragDx] = useState(0);
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
  const rowIds = useMemo(() => sessionItems.map((i) => i.rowId), [sessionItems]);

  /**
   * 이번 세션에 완료/스킵 처리한 항목들(rowId). 가이드 큐는 시작 스냅샷이라 처리해도
   * 배열엔 남는데, 완료한 운동은 운동모드에 다시 안 떠야 하므로 ‹ › / 스와이프 이동
   * 시 이 항목들을 건너뛴다. (예전엔 ‹ 로 되돌아가면 방금 완료한 운동이 다시 보였음.)
   */
  const [processed, setProcessed] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  const item = sessionItems[index];
  const total = sessionItems.length;
  // '마지막'은 배열 끝이 아니라 "앞에 남은 활성(미처리) 항목이 없을 때".
  const isLast = adjacentActiveIndex(rowIds, processed, index, 1) === null;
  const prevIndex = adjacentActiveIndex(rowIds, processed, index, -1);
  const nextIndex = adjacentActiveIndex(rowIds, processed, index, 1);

  // 현재 본운동에서 완료한 세트 수(0-base). 항목이 바뀌면 0으로 리셋.
  const [setsDone, setSetsDone] = useState(0);

  // 무게·횟수 고정 끔(unlocked) → 운동모드에서 무게/횟수/세트를 그때그때 설정.
  const editable = !lockWeightReps && item?.kind === "main";
  const [editW, setEditW] = useState<number | null>(null);
  const [editReps, setEditReps] = useState(10);
  const [editSets, setEditSets] = useState(3);
  // 운동별로 정한 값을 보관 — ‹ › 로 다른 운동 갔다 와도 입력값이 유지된다.
  const editStoreRef = useRef<
    Map<string, { w: number | null; reps: number; sets: number }>
  >(new Map());

  // 컨디셔닝(워밍업/마무리) 고정 끔 → 운동모드에서 시간/속도/경사를 그때그때 설정.
  const condEditable =
    !lockWeightReps && (item?.kind === "warmup" || item?.kind === "cooldown");
  const [editDuration, setEditDuration] = useState<number | null>(null);
  const [editSpeed, setEditSpeed] = useState<number | null>(null);
  const [editIncline, setEditIncline] = useState<number | null>(null);
  const condEditStoreRef = useRef<
    Map<
      string,
      { duration: number | null; speed: number | null; incline: number | null }
    >
  >(new Map());

  useEffect(() => {
    // 운동(인덱스)이 바뀌면 세트 카운트 리셋 + 편집값은 보관분 있으면 복원, 없으면 계획값.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSetsDone(0);
    const it = sessionItems[index];
    if (it && it.kind === "main") {
      const saved = editStoreRef.current.get(it.rowId);
      const init = saved ?? {
        w: it.weightKg,
        reps: it.reps > 0 ? it.reps : 10,
        sets: it.sets > 0 ? it.sets : 3,
      };
      if (!saved) editStoreRef.current.set(it.rowId, init);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditW(init.w);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditReps(init.reps);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditSets(init.sets);
    } else if (it) {
      // 컨디셔닝: 그 항목이 가진 파라미터만 값 보유(없는 건 null → 기록 안 됨).
      const saved = condEditStoreRef.current.get(it.rowId);
      const p = getConditioningItem(it.itemId)?.params ?? [];
      const init = saved ?? {
        duration: p.includes("duration") ? (it.durationMin ?? 5) : null,
        speed: p.includes("speed") ? (it.speed ?? 1) : null,
        incline: p.includes("incline") ? (it.incline ?? 0) : null,
      };
      if (!saved) condEditStoreRef.current.set(it.rowId, init);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditDuration(init.duration);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditSpeed(init.speed);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditIncline(init.incline);
    }
  }, [index, sessionItems]);

  // 스크러버 값 변경 — 화면 state + 운동별 보관소를 함께 갱신.
  function putEdit(patch: { w?: number | null; reps?: number; sets?: number }) {
    const it = sessionItems[index];
    if (!it) return;
    const cur = editStoreRef.current.get(it.rowId) ?? {
      w: editW,
      reps: editReps,
      sets: editSets,
    };
    const next = { ...cur, ...patch };
    editStoreRef.current.set(it.rowId, next);
    if (patch.w !== undefined) setEditW(patch.w);
    if (patch.reps !== undefined) setEditReps(patch.reps);
    if (patch.sets !== undefined) setEditSets(patch.sets);
  }

  // 컨디셔닝 스크러버 값 변경 — 화면 state + 항목별 보관소 함께 갱신.
  function putCondEdit(patch: {
    duration?: number | null;
    speed?: number | null;
    incline?: number | null;
  }) {
    const it = sessionItems[index];
    if (!it) return;
    const cur = condEditStoreRef.current.get(it.rowId) ?? {
      duration: editDuration,
      speed: editSpeed,
      incline: editIncline,
    };
    const next = { ...cur, ...patch };
    condEditStoreRef.current.set(it.rowId, next);
    if (patch.duration !== undefined) setEditDuration(patch.duration);
    if (patch.speed !== undefined) setEditSpeed(patch.speed);
    if (patch.incline !== undefined) setEditIncline(patch.incline);
  }

  // 유효 세트 수 — 고정 끔이면 스크러버 값, 켜짐이면 계획값.
  const effSets =
    item && item.kind === "main"
      ? editable
        ? editSets
        : item.sets
      : 0;

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

  // 본운동이고 세트가 2개 이상이면 세트별 휴식 안내 노출. (고정 끔이면 스크러버 세트수 기준)
  const mainSets = item && item.kind === "main" && effSets > 1 ? effSets : 0;
  const onLastSet = mainSets > 0 ? isLastSet(setsDone, mainSets) : true;

  /** 세트 완료 — 운동을 넘기지 않고 휴식만 시작 + 세트 카운트 증가. */
  function completeSet() {
    rest.trigger();
    setSetsDone((d) => Math.min(d + 1, Math.max(0, mainSets - 1)));
  }

  /* ── 드래그(스와이프) 네비게이션 — 왼쪽으로 밀면 다음, 오른쪽으로 밀면 이전.
   *    완료·스킵 없이 운동 사이만 이동(상태 안 바뀜). 세로 스크롤과 구분. ── */
  function onSwipeDown(e: PointerEvent<HTMLDivElement>) {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    swipeStartRef.current = { x: e.clientX, y: e.clientY };
  }
  function onSwipeMove(e: PointerEvent<HTMLDivElement>) {
    const s = swipeStartRef.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    // 가로 제스처가 세로보다 우세하고 일정 이상일 때만 카드가 손가락을 따라온다.
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 6) {
      const clamped = Math.max(-120, Math.min(120, dx));
      dragDxRef.current = clamped;
      setDragDx(clamped);
    }
  }
  /** ‹ › / 스와이프 공용 이동 — 완료/스킵한 항목은 건너뛴다. 갈 곳 없으면 무동작. */
  function goTo(dir: 1 | -1) {
    const ni = adjacentActiveIndex(rowIds, processed, index, dir);
    if (ni !== null) setIndex(ni);
  }

  function onSwipeEnd() {
    const dx = dragDxRef.current; // 리렌더 전이라도 최신 이동량(stale state 회피)
    swipeStartRef.current = null;
    dragDxRef.current = 0;
    setDragDx(0);
    const THRESHOLD = 60;
    if (dx <= -THRESHOLD) goTo(1); // ← 다음
    else if (dx >= THRESHOLD) goTo(-1); // → 이전
  }

  /**
   * 다음 활성(미처리) 항목으로 진행. processedSet 은 방금 처리한 항목까지 포함한
   * 최신 집합(setState 비동기라 직접 전달). 남은 활성 항목이 없으면 세션 종료.
   */
  function advance(processedSet: ReadonlySet<string>) {
    const ni = adjacentActiveIndex(rowIds, processedSet, index, 1);
    if (ni === null) {
      onClose();
      // 모든 항목 종료 — 부모(타이머)가 운동시간 저장 처리
      onAllComplete?.();
      // 진행 중인 완료/넘기기 저장이 모두 끝난 뒤 화면 합계를 새로 가져온다.
      refreshAfterPending();
      return;
    }
    setIndex(ni);
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

    // 고정 끔이면 운동모드에서 정한 값을 완료 기록에 반영(계획은 불변).
    // 본운동=무게/횟수/세트, 컨디셔닝=시간/속도/경사.
    const captured: GuidedItem =
      item.kind === "main" && !lockWeightReps
        ? { ...item, weightKg: editW, reps: editReps, sets: editSets }
        : item.kind !== "main" && !lockWeightReps
          ? {
              ...item,
              durationMin: editDuration,
              speed: editSpeed,
              incline: editIncline,
            }
          : item; // advance 직전에 캡쳐
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

    // 3) UI 즉시 advance — 방금 처리한 항목은 이번 세션 동안 건너뛴다(‹ 로도 안 보임).
    dirtyRef.current = true;
    const nextProcessed = new Set(processed).add(captured.rowId);
    setProcessed(nextProcessed);
    advance(nextProcessed);

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

  // 운동모드에선 꿀팁·운동방법 텍스트를 빼고, 자세히 보려면 상세 페이지로 이동한다.
  function viewDetail() {
    if (!item || item.kind !== "main") return;
    router.push(`/exercises/${item.exerciseId}?eq=${item.equipment}`);
  }

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
        onPointerDown={onSwipeDown}
        onPointerMove={onSwipeMove}
        onPointerUp={onSwipeEnd}
        onPointerCancel={onSwipeEnd}
        style={{ touchAction: "pan-y" }}
        className="flex flex-1 flex-col overflow-y-auto px-6 py-4"
      >
        <div
          className="m-auto flex w-full flex-col items-center"
          style={{
            transform: dragDx ? `translateX(${dragDx}px)` : undefined,
            transition: dragDx ? "none" : "transform 200ms ease-out",
          }}
        >
        <KindBadge kind={item.kind} />
        {/* 시연(사진/영상). 좌우 화살표(‹ ›)로 운동 이동(탭/스와이프 보조).
            본운동·워밍업·마무리 모두 방법 자막(문구)을 빼고 사진/영상만 — 워밍업·마무리는
            설정값(시간·속도·경사) 칩을 이름 아래에 보여주고, 본운동은 상세 페이지로. */}
        <div className="relative w-full max-w-lg">
          <ItemVisual item={item} />

          {total > 1 ? (
            <>
              <button
                type="button"
                aria-label="이전 운동"
                onClick={() => goTo(-1)}
                disabled={prevIndex === null}
                className="absolute left-1.5 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-md backdrop-blur-sm transition hover:bg-black/65 disabled:pointer-events-none disabled:opacity-0"
              >
                <ChevronLeft aria-hidden="true" size={22} />
              </button>
              <button
                type="button"
                aria-label="다음 운동"
                onClick={() => goTo(1)}
                disabled={nextIndex === null}
                className="absolute right-1.5 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-md backdrop-blur-sm transition hover:bg-black/65 disabled:pointer-events-none disabled:opacity-0"
              >
                <ChevronRight aria-hidden="true" size={22} />
              </button>
            </>
          ) : null}
        </div>

        {item.kind === "main" ? (
          <button
            type="button"
            onClick={viewDetail}
            className="mt-4 inline-flex items-center gap-1.5"
          >
            <h2 className="text-2xl font-bold text-zinc-950 dark:text-zinc-50 sm:text-3xl">
              {item.name}
            </h2>
            <ChevronRight
              aria-hidden="true"
              size={22}
              className="text-emerald-600 dark:text-emerald-400"
            />
          </button>
        ) : (
          <h2 className="mt-4 text-center text-2xl font-bold text-zinc-950 dark:text-zinc-50 sm:text-3xl">
            {item.name}
          </h2>
        )}
        {/* 무게/횟수 표기: 고정 끔(스크러버)이면 숨김. 워밍업·마무리는 고정 켬이면
            설정값 칩, 고정 끔이면 아래 스크러버에서 설정(칩 숨김). 본운동(고정 켬)은 subtitle. */}
        {editable || condEditable ? null : item.kind === "main" ? (
          <p className="mt-1.5 text-center text-sm text-zinc-600 dark:text-zinc-300">
            {item.subtitle}
          </p>
        ) : (
          <ConditioningSettings item={item} />
        )}

        {/* 컨디셔닝 시간·속도·경사 스크러버 (고정 끔, 워밍업/마무리) */}
        {condEditable ? (
          <CondScrubbers
            itemId={item.itemId}
            duration={editDuration}
            speed={editSpeed}
            incline={editIncline}
            onChange={putCondEdit}
          />
        ) : null}

        {/* 무게·횟수·세트 스크러버 (고정 끔, 본운동) — 세로 스택(모바일 폭에서도 안 깨짐).
            좌우로 밀거나 ±로 조절, 더블클릭하면 직접 입력. */}
        {editable ? (
          <div className="mt-4 w-full max-w-xs rounded-2xl border border-zinc-200 bg-white px-4 py-1 dark:border-zinc-800 dark:bg-zinc-900/60">
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              <NumberScrubber
                label="무게"
                value={editW}
                unit="kg"
                min={0}
                max={500}
                step={1}
                allowBodyweight
                onChange={(v) => putEdit({ w: v })}
              />
              <NumberScrubber
                label="횟수"
                value={editReps}
                unit="회"
                min={1}
                max={100}
                step={1}
                onChange={(v) => putEdit({ reps: v ?? 1 })}
              />
              <NumberScrubber
                label="세트"
                value={editSets}
                unit="세트"
                min={1}
                max={20}
                step={1}
                onChange={(v) => putEdit({ sets: v ?? 1 })}
              />
            </div>
            <p className="py-2 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
              좌우로 끌거나 ± · 더블클릭해 직접 입력 · 완료 시 이 값으로 기록
            </p>
          </div>
        ) : null}

        {/* 운동법·꿀팁은 운동모드에서 빼고 상세 페이지에서. (개인설정으로 버튼 끌 수 있음) */}
        {item.kind === "main" && showGuide ? (
          <button
            type="button"
            onClick={viewDetail}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-700 transition hover:border-emerald-400 hover:text-emerald-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:text-emerald-400"
          >
            <ListChecks aria-hidden="true" size={15} />
            운동법·꿀팁 보기
          </button>
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
 * 워밍업·마무리 설정값 칩 — 운동마다 다른 파라미터를 그 운동의 것만 보여준다.
 * 런닝/유산소: 시간·속도·경사 / 스트레칭·모빌리티: 시간만. (방법 문구 대신 핵심 수치만.)
 */
function ConditioningSettings({
  item,
}: {
  item: Extract<GuidedItem, { kind: "warmup" | "cooldown" }>;
}) {
  const params = getConditioningItem(item.itemId)?.params ?? [];
  const chips: { key: string; icon: ReactNode; label: string; value: string }[] =
    [];
  if (params.includes("duration") && item.durationMin != null)
    chips.push({
      key: "duration",
      icon: <Timer size={15} aria-hidden="true" />,
      label: PARAM_LABEL.duration,
      value: `${item.durationMin}${PARAM_UNIT.duration}`,
    });
  if (params.includes("speed") && item.speed != null)
    chips.push({
      key: "speed",
      icon: <Gauge size={15} aria-hidden="true" />,
      label: PARAM_LABEL.speed,
      value: `${item.speed}${PARAM_UNIT.speed}`,
    });
  if (params.includes("incline") && item.incline != null)
    chips.push({
      key: "incline",
      icon: <TrendingUp size={15} aria-hidden="true" />,
      label: PARAM_LABEL.incline,
      value: `${item.incline}${PARAM_UNIT.incline}`,
    });
  if (chips.length === 0) return null;
  return (
    <div
      data-testid="cond-settings"
      className="mt-3 flex flex-wrap items-center justify-center gap-2"
    >
      {chips.map((c) => (
        <span
          key={c.key}
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 dark:border-emerald-500/30 dark:bg-emerald-500/10"
        >
          <span className="text-emerald-600 dark:text-emerald-400">{c.icon}</span>
          <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            {c.label}
          </span>
          <span className="text-sm font-extrabold tabular-nums text-emerald-700 dark:text-emerald-300">
            {c.value}
          </span>
        </span>
      ))}
    </div>
  );
}

/**
 * 컨디셔닝 시간/속도/경사 스크러버 (고정 끔) — 그 항목이 가진 파라미터만 보여준다.
 * 본운동 스크러버와 동일 UX(좌우 드래그·± ·더블클릭 입력). 완료 시 값이 기록된다.
 */
function CondScrubbers({
  itemId,
  duration,
  speed,
  incline,
  onChange,
}: {
  itemId: string;
  duration: number | null;
  speed: number | null;
  incline: number | null;
  onChange: (patch: {
    duration?: number | null;
    speed?: number | null;
    incline?: number | null;
  }) => void;
}) {
  const params = getConditioningItem(itemId)?.params ?? [];
  if (params.length === 0) return null;
  return (
    <div className="mt-4 w-full max-w-xs rounded-2xl border border-zinc-200 bg-white px-4 py-1 dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
        {params.includes("duration") ? (
          <NumberScrubber
            label={PARAM_LABEL.duration}
            value={duration}
            unit={PARAM_UNIT.duration}
            min={1}
            max={120}
            step={1}
            onChange={(v) => onChange({ duration: v ?? 1 })}
          />
        ) : null}
        {params.includes("speed") ? (
          <NumberScrubber
            label={PARAM_LABEL.speed}
            value={speed}
            unit={PARAM_UNIT.speed}
            min={1}
            max={30}
            step={1}
            onChange={(v) => onChange({ speed: v ?? 1 })}
          />
        ) : null}
        {params.includes("incline") ? (
          <NumberScrubber
            label={PARAM_LABEL.incline}
            value={incline}
            unit={PARAM_UNIT.incline}
            min={0}
            max={30}
            step={1}
            onChange={(v) => onChange({ incline: v ?? 0 })}
          />
        ) : null}
      </div>
      <p className="py-2 text-center text-[11px] text-zinc-400 dark:text-zinc-500">
        좌우로 끌거나 ± · 더블클릭해 직접 입력 · 완료 시 이 값으로 기록
      </p>
    </div>
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


