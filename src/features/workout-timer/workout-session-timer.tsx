"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { CheckCircle2, Pause, Play, Save, Timer } from "lucide-react";

import { useTodayOrder } from "@/features/routine/components/today-order-scope";
import { isQueueItemActive } from "@/features/workout-timer/queue-filter";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { addWorkoutDurationAction } from "@/features/workout-timer/workout-session-actions";
import {
  clearSavedMark,
  elapsedMs,
  formatElapsed,
  readTimer,
  reconcileResume,
  seoulTodayYmd,
  takeUnsavedDelta,
  writeTimer,
  type TimerState,
} from "@/features/workout-timer/timer-store";
import type { GuidedItem } from "@/features/workout-timer/guided-workout";
import { useNotificationCenter } from "@/features/notifications/notification-center";
import {
  NO_RESPONSE_LIMIT_MS,
  shouldPrompt,
} from "@/features/workout-timer/inactivity";
import { queueToRestInputs } from "@/features/routine/rest-remaining";
import { restRemainingTodayAction } from "@/features/routine/rest-remaining-actions";
import { ensurePushSubscribed } from "@/features/notifications/push-client";
import {
  startActiveSessionAction,
  updateActiveActivityAction,
  snoozeActiveAction,
  endActiveSessionAction,
} from "@/features/workout-timer/active-state-actions";

// 가이드 오버레이(일러스트/플립북 등 ~1.5k줄)는 "운동 시작" 탭 전까지 필요 없으므로
// 동적 로드해 홈 화면 초기 번들에서 제외한다.
const GuidedOverlay = dynamic(
  () =>
    import("@/features/workout-timer/guided-workout").then(
      (m) => m.GuidedOverlay,
    ),
  { ssr: false },
);

/** 폰/앱 로컬 알림 — 권한이 있을 때만. 서비스워커가 있으면 액션(예/아니오) 버튼 포함. */
function showLocalNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  const opts: NotificationOptions = {
    body,
    tag: "workout-end",
    requireInteraction: true,
    // 일부 타입 정의엔 actions 가 없지만 SW showNotification 에선 동작.
    actions: [
      { action: "yes", title: "예" },
      { action: "no", title: "아니오" },
    ],
  } as NotificationOptions;
  try {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker
        .getRegistration()
        .then((reg) => {
          if (reg) reg.showNotification(title, opts);
          else new Notification(title, { body });
        })
        .catch(() => {
          try {
            new Notification(title, { body });
          } catch {
            /* noop */
          }
        });
    } else {
      new Notification(title, { body });
    }
  } catch {
    /* noop */
  }
}

/**
 * 경과 시간 표시 — 자체 1초 틱으로 갱신해, 부모(WorkoutSessionTimer/GuidedOverlay)가
 * 매초 리렌더되지 않게 격리한다. 정지 상태(pausedAt!=null)면 틱하지 않음.
 */
function LiveElapsed({
  state,
  className,
}: {
  state: TimerState;
  className?: string;
}) {
  const [, setT] = useState(0);
  useEffect(() => {
    if (state.pausedAt !== null) return;
    const id = window.setInterval(() => setT((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [state]);
  return <span className={className}>{formatElapsed(elapsedMs(state))}</span>;
}

/**
 * "오늘 할 운동" 상단 세션 스톱워치 + 가이드 트리거.
 *
 * 동작
 * - 운동 시작: 새 세션. forDate = 오늘
 * - 일시정지/재개: 누적 시간 freeze/unfreeze
 * - 정지(Save): 그때까지 누적된 시간을 DB 에 더하고 타이머 reset (캘린더에 반영)
 * - 자정 롤오버: forDate 와 오늘이 다르면 자동으로 어제 분 저장 + 새 세션 시작
 *   (사용자가 자정 넘긴 후 앱을 켜도 어제분이 캘린더에 정확히 기록됨)
 */
export function WorkoutSessionTimer({
  queueItems = [],
  doneOrSkippedIds = [],
  hideVideos = false,
  showGuide = true,
  lockWeightReps = false,
}: {
  /** 워밍업·본운동·마무리 '모든' 항목(완료/스킵 포함). 필터는 아래에서. */
  queueItems?: GuidedItem[];
  /** 서버 기준 완료/스킵된 row id. 로컬 오버라이드가 없으면 이걸로 큐에서 제외. */
  doneOrSkippedIds?: string[];
  /** 개인설정 '운동영상 안 보기'. true 면 영상 가이드 없이 타이머(중지/시작/저장)만. */
  hideVideos?: boolean;
  /** 개인설정: 상세 가이드 카드 표시. */
  showGuide?: boolean;
  /** 무게·횟수 고정. false 면 운동모드에서 무게·횟수·세트를 그때그때 설정. */
  lockWeightReps?: boolean;
}) {
  const router = useRouter();
  const { showPrompt, clearPrompt } = useNotificationCenter();
  const orderScope = useTodayOrder();
  // 드래그로 순서를 바꿨으면(공유 컨텍스트) 가이드 큐의 해당 종류 항목들을 그 순서로
  // 재정렬한다. 워밍업 → 본운동 → 마무리 블록 위치는 그대로 두고, 각 블록 안에서만
  // 정렬한다. 해당 종류 order 가 null(정렬 안 함)이면 서버가 내려준 순서를 쓴다.
  const mainOrder = orderScope?.order.main ?? null;
  const warmupOrder = orderScope?.order.warmup ?? null;
  const cooldownOrder = orderScope?.order.cooldown ?? null;
  const completion = orderScope?.completion ?? null;
  const queue = useMemo(() => {
    // 1) 완료/스킵 항목 제외 — 로컬 오버라이드 우선, 없으면 서버 상태.
    //    (휴식 취소 후 바로 시작해도 그 운동이 뜨고, 방금 스킵한 건 빠진다.)
    const serverInactive = new Set(doneOrSkippedIds);
    const active = queueItems.filter((it) =>
      isQueueItemActive(it.rowId, serverInactive, completion),
    );
    const result = [...active];
    const byKind: { kind: GuidedItem["kind"]; ord: string[] | null }[] = [
      { kind: "warmup", ord: warmupOrder },
      { kind: "main", ord: mainOrder },
      { kind: "cooldown", ord: cooldownOrder },
    ];
    for (const { kind, ord } of byKind) {
      if (!ord) continue;
      const rank = new Map(ord.map((id, i) => [id, i]));
      const idxs: number[] = [];
      active.forEach((q, i) => {
        if (q.kind === kind) idxs.push(i);
      });
      const sorted = idxs
        .map((i) => active[i])
        .sort((a, b) => (rank.get(a.rowId) ?? 0) - (rank.get(b.rowId) ?? 0));
      idxs.forEach((i, j) => {
        result[i] = sorted[j];
      });
    }
    return result;
  }, [queueItems, doneOrSkippedIds, completion, mainOrder, warmupOrder, cooldownOrder]);
  const [state, setState] = useState<TimerState | null>(null);
  const [guided, setGuided] = useState(false);
  const [saveAsk, setSaveAsk] = useState(false);
  const [savingErr, setSavingErr] = useState<string | null>(null);
  // 자정 롤오버 중복 방지 — 한 번 처리한 forDate 는 다시 처리 안 함
  const rolledOverRef = useRef<string | null>(null);

  // ── 무활동 종료 감지용 refs (콜백에서 최신값을 읽기 위해 ref 로 동기화) ──
  const queueRef = useRef<GuidedItem[]>([]);
  const stateRef = useRef<TimerState | null>(null);
  const lastActivityRef = useRef<number>(0); // 마운트 시 effect 에서 now 로 설정
  const promptedRef = useRef(false); // 종료 알림이 떠 있는지
  const noRespTimerRef = useRef<number | null>(null); // 10분 무응답 타이머
  const prevQueueLenRef = useRef(0);
  const hadItemsRef = useRef(false); // 한 번이라도 남은 운동이 있었는지(자동 종료 판정)
  const handlersRef = useRef<{
    endWithRest: () => void;
    snooze: () => void;
    endTimerOnly: () => void;
  }>({ endWithRest: () => {}, snooze: () => {}, endTimerOnly: () => {} });
  // 콜백/인터벌에서 최신 값을 읽도록 ref 동기화(렌더 중 직접 대입 금지 → effect).
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  /** 서버 액션 호출 + 결과 처리. 실패 시 사용자에게 알림. */
  async function saveDuration(forDate: string, sec: number): Promise<boolean> {
    if (sec <= 0) return true;
    try {
      const res = await addWorkoutDurationAction(forDate, sec);
      if (!res.ok) {
        setSavingErr(res.error);
        // 콘솔에도 — 실패 원인이 schema 미적용일 가능성 높음
        // eslint-disable-next-line no-console
        console.error("[workout] 저장 실패:", res.error);
        return false;
      }
      // 캘린더·히스토리 화면 즉시 반영
      router.refresh();
      return true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setSavingErr(msg);
      // eslint-disable-next-line no-console
      console.error("[workout] 저장 예외:", e);
      return false;
    }
  }

  // 운동모드에서 운동상세로 갔다가 돌아오면(세션 플래그) 운동모드를 자동 재오픈.
  // (상세 → 뒤로/홈 → /routine 재마운트 시 1회 소비.)
  useEffect(() => {
    try {
      if (sessionStorage.getItem("heltch.resumeWorkout") === "1") {
        sessionStorage.removeItem("heltch.resumeWorkout");
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setGuided(true);
      }
    } catch {
      /* noop */
    }
  }, []);

  // 1) localStorage 복원 + 자정 롤오버 체크
  useEffect(() => {
    lastActivityRef.current = Date.now(); // 무활동 기준 시각 초기화
    const raw = readTimer();
    // ⚠ 먼저 '안 보던 동안'의 시간을 제외한다(reconcile). 타이머를 켜둔 채 앱을
    //    며칠 닫아두면 그 며칠(어제·그제·일주일)이 경과시간으로 잡히는데, 이를
    //    빼고 나서 롤오버를 판정해야 옛 날짜 캘린더에 그 시간이 잘못 가산되지 않는다.
    const restored = reconcileResume(raw, Date.now());
    if (restored) {
      // forDate 와 오늘이 다르면: 어제까지의 (실제 운동)시간을 저장하고 타이머는 reset
      const today = seoulTodayYmd();
      if (restored.forDate !== today && rolledOverRef.current !== restored.forDate) {
        rolledOverRef.current = restored.forDate;
        const d = takeUnsavedDelta(restored);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (d) void saveDuration(d.forDate, d.deltaSec);
        clearSavedMark();
        // 새 세션 시작 (계속 운동 중이라고 가정 — 일시정지 상태였으면 유지)
        const fresh: TimerState = {
          startedAt: Date.now(),
          pausedAt: restored.pausedAt !== null ? Date.now() : null,
          accumulated: 0,
          forDate: today,
          lastSeenAt: Date.now(),
        };
        writeTimer(fresh);
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState(fresh);
        return;
      }
      // 같은 날: 보정된 상태로 복원(닫힌 시간 제외).
      writeTimer(restored);
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(restored);
    // saveDuration 은 closure 로 고정 — deps 에 넣을 필요 없음
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) 1초마다 리렌더 + 자정 체크
  useEffect(() => {
    if (!state) return;
    const id = window.setInterval(() => {
      // 자정 체크 — 실행 중일 때만 (일시정지면 시간 흐르지 않으니 굳이 X)
      if (state.pausedAt === null) {
        const today = seoulTodayYmd();
        if (state.forDate !== today && rolledOverRef.current !== state.forDate) {
          rolledOverRef.current = state.forDate;
          const d = takeUnsavedDelta(state);
          if (d) void saveDuration(d.forDate, d.deltaSec);
          clearSavedMark();
          const fresh: TimerState = {
            startedAt: Date.now(),
            pausedAt: null,
            accumulated: 0,
            forDate: today,
          };
          writeTimer(fresh);
          setState(fresh);
          return;
        }
        // 하트비트 — 앱이 떠 있는 동안 매 틱 lastSeenAt 갱신(닫힌 시간 구분용).
        // setState 없이 localStorage 만 갱신(startedAt/accumulated 불변).
        writeTimer({ ...state, lastSeenAt: Date.now() });
      }
      // 경과 시간 표시는 LiveElapsed 가 자체 틱으로 갱신 → 여기선 리렌더 불필요.
    }, 1000);
    return () => window.clearInterval(id);
    // saveDuration 은 closure 로 고정 — state 만 deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // 3) 백그라운드에서 다시 보일 때 — 안 보던 동안 시간을 경과에서 제외(하트비트 기반).
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== "visible") return;
      const cur = readTimer(); // 하트비트로 갱신된 최신 lastSeenAt 사용
      if (!cur || cur.pausedAt !== null) return;
      const rec = reconcileResume(cur, Date.now());
      if (rec && rec.startedAt !== cur.startedAt) {
        writeTimer(rec);
        setState(rec);
      }
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  function start() {
    const s: TimerState = {
      startedAt: Date.now(),
      pausedAt: null,
      accumulated: 0,
      forDate: seoulTodayYmd(),
      lastSeenAt: Date.now(),
    };
    clearSavedMark(); // 새 세션은 0 부터 누적
    writeTimer(s);
    setState(s);
    lastActivityRef.current = Date.now();
    promptedRef.current = false;
    // 폰 알림(30분 무활동 종료 확인)용 권한 요청 + 웹푸시 구독(닫힌 앱 대응).
    try {
      if ("Notification" in window) {
        if (Notification.permission === "default") {
          void Notification.requestPermission().then(() => void ensurePushSubscribed());
        } else if (Notification.permission === "granted") {
          void ensurePushSubscribed();
        }
      }
    } catch {
      /* noop */
    }
    // 서버에 활성 세션 등록(닫힌 앱에서도 cron 이 무활동 감지).
    void startActiveSessionAction(queueToRestInputs(queue));
    // 영상 보기 모드에서만 가이드 오버레이를 연다. '안 보기'면 타이머만.
    if (!hideVideos && queue.length > 0) setGuided(true);
  }
  function pause() {
    if (!state || state.pausedAt !== null) return;
    const now = Date.now();
    const s: TimerState = {
      startedAt: state.startedAt,
      pausedAt: now,
      accumulated: state.accumulated + (now - state.startedAt),
      forDate: state.forDate,
    };
    writeTimer(s);
    setState(s);
  }
  function resume() {
    if (!state || state.pausedAt === null) return;
    const s: TimerState = {
      startedAt: Date.now(),
      pausedAt: null,
      accumulated: state.accumulated,
      forDate: state.forDate,
      lastSeenAt: Date.now(),
    };
    writeTimer(s);
    setState(s);
    lastActivityRef.current = Date.now();
    // 돌아와서 이어서 운동 — 서버 활성 세션 재활성화(닫힌 앱 감지 재개).
    void updateActiveActivityAction(queueToRestInputs(queue));
    // 영상 보기 모드: '운동 다시 시작하기'가 가이드도 다시 연다.
    if (!hideVideos && queue.length > 0) setGuided(true);
  }
  function requestSave() {
    setSaveAsk(true);
  }
  function clearNoRespTimer() {
    if (noRespTimerRef.current !== null) {
      window.clearTimeout(noRespTimerRef.current);
      noRespTimerRef.current = null;
    }
  }

  /**
   * 타이머 종료 공통 — '아직 안 올린' 누적 시간을 DB 에 더하고(=기록) 타이머 reset.
   * 종료 알림/무응답 타이머도 정리한다. 다시 운동을 시작하면 그날 누적에 이어 더해진다.
   */
  async function endSession(): Promise<boolean> {
    const s = stateRef.current;
    if (!s) return true;
    // 운동 완료마다 이미 누적했을 수 있으니 '아직 안 올린 만큼'만 더한다(이중 가산 방지).
    const d = takeUnsavedDelta(s);
    if (d) {
      const ok = await saveDuration(d.forDate, d.deltaSec);
      if (!ok) return false; // 실패 시 상태 유지해 재시도 가능
    }
    clearSavedMark();
    writeTimer(null);
    setState(null);
    promptedRef.current = false;
    clearNoRespTimer();
    clearPrompt();
    void endActiveSessionAction(); // 서버 활성 세션 종료(더 이상 푸시 안 함)
    return true;
  }

  /** 정지(Save) = 누적 시간을 캘린더에 올리고 타이머 reset. */
  async function confirmSave() {
    setSaveAsk(false);
    await endSession();
  }

  /** 가이드 완주(마지막 항목까지 처리) 시 자동 종료(기록). */
  async function handleGuidedAllComplete() {
    await endSession();
  }

  // '예' — 완료 외 남은 운동을 휴식(skip) 처리하고 타이머 종료(기록).
  async function endWithRest() {
    promptedRef.current = false;
    clearNoRespTimer();
    clearPrompt();
    const inputs = queueToRestInputs(queueRef.current);
    if (inputs.planRows.length || inputs.warmup.length || inputs.cooldown.length) {
      try {
        await restRemainingTodayAction(inputs);
      } catch {
        /* 휴식 처리 실패해도 타이머는 종료 */
      }
    }
    await endSession();
    router.refresh();
  }

  // '아니오' — 닫고 다시 30분 무활동 감지(타이머는 계속).
  function snooze() {
    promptedRef.current = false;
    clearNoRespTimer();
    clearPrompt();
    lastActivityRef.current = Date.now();
    void snoozeActiveAction(); // 서버: 다시 30분 무활동 감지
  }

  // 10분 무응답 — 휴식 처리 없이 타이머만 자동 종료(기록).
  async function endTimerOnly() {
    await endSession();
  }

  // 종료 알림 띄우기(앱 내 벨 + 폰 로컬 알림). 10분 무응답이면 타이머만 종료.
  function raiseEndPrompt() {
    if (promptedRef.current) return;
    promptedRef.current = true;
    showPrompt({
      id: `end-${Date.now()}`,
      title: "운동을 종료하시겠습니까?",
      body: "30분 동안 완료된 운동이 없어요. ‘예’를 누르면 남은 운동을 휴식 처리하고 타이머를 종료합니다.",
      onYes: () => void handlersRef.current.endWithRest(),
      onNo: () => handlersRef.current.snooze(),
    });
    showLocalNotification(
      "운동을 종료하시겠습니까?",
      "30분 동안 완료된 운동이 없어요. 예/아니오를 눌러주세요.",
    );
    noRespTimerRef.current = window.setTimeout(() => {
      void handlersRef.current.endTimerOnly();
    }, NO_RESPONSE_LIMIT_MS);
  }

  // 콜백(앱 내 벨/SW 알림)에서 최신 핸들러를 부르도록 ref 동기화(매 렌더).
  useEffect(() => {
    handlersRef.current = { endWithRest, snooze, endTimerOnly };
  });

  // 4) 무활동 감지 — 30초마다 점검. 실행 중 30분간 완료가 없으면 종료 알림.
  useEffect(() => {
    const id = window.setInterval(() => {
      const s = stateRef.current;
      if (!s || s.pausedAt !== null) return;
      if (
        shouldPrompt({
          running: true,
          alreadyPrompted: promptedRef.current,
          remainingCount: queueRef.current.length,
          lastActivityMs: lastActivityRef.current,
          nowMs: Date.now(),
        })
      ) {
        raiseEndPrompt();
      }
    }, 30_000);
    return () => window.clearInterval(id);
    // raiseEndPrompt 는 ref 기반 — deps 불필요
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 5) 완료/스킵으로 남은 큐가 줄면 = 활동 → 무활동 카운트 리셋(+알림 떠 있으면 닫기).
  useEffect(() => {
    if (queue.length < prevQueueLenRef.current) {
      lastActivityRef.current = Date.now();
      // 서버 활성 상태도 갱신(남은 운동 스냅샷 + 무활동 카운트 리셋).
      void updateActiveActivityAction(queueToRestInputs(queue));
      if (promptedRef.current) {
        promptedRef.current = false;
        clearNoRespTimer();
        clearPrompt();
      }
    }
    prevQueueLenRef.current = queue.length;
    if (queue.length > 0) hadItemsRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.length]);

  // 6) 오늘 운동을 전부 끝내면(완료/스킵으로 큐가 0) 타이머 자동 종료(기록).
  useEffect(() => {
    if (!stateRef.current) return;
    if (hadItemsRef.current && queue.length === 0) {
      hadItemsRef.current = false;
      void handlersRef.current.endTimerOnly();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.length]);

  // 7) 서비스워커 알림(예/아니오) 클릭 → 앱 내와 동일 처리.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    function onMsg(e: MessageEvent) {
      const d = e.data as { type?: string; action?: string } | null;
      if (!d || d.type !== "workout-end-response") return;
      if (!promptedRef.current) return;
      if (d.action === "yes") handlersRef.current.endWithRest();
      else handlersRef.current.snooze();
    }
    navigator.serviceWorker.addEventListener("message", onMsg);
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, []);

  if (!state) {
    // 오늘 할 운동이 있었는데 전부 완료/스킵돼 남은 게 없으면 '수고하셨습니다'(비활성).
    // queue 는 로컬 오버라이드(완료/휴식 취소)로 즉시 갱신 → 미완료가 다시 생기면 바로 '운동 시작' 복귀.
    const allDone = queueItems.length > 0 && queue.length === 0;
    if (allDone) {
      return (
        <span className="inline-flex h-10 items-center gap-2 rounded-full bg-emerald-100 px-4 text-sm font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
          <CheckCircle2 aria-hidden="true" size={16} />
          수고하셨습니다
        </span>
      );
    }
    return (
      <button
        type="button"
        onClick={start}
        className="inline-flex h-10 items-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
      >
        <Play aria-hidden="true" size={16} />
        운동 시작
      </button>
    );
  }

  const running = state.pausedAt === null;

  const overlay =
    guided && queue.length > 0 ? (
      <GuidedOverlay
        items={queue}
        // 운동모드에서 나오면(X→중단) 시간 정지. '다시 운동하기'로 들어오면 재개.
        onClose={() => {
          pause();
          setGuided(false);
        }}
        onAllComplete={handleGuidedAllComplete}
        // 운동 페이지(가이드) 안에는 경과 시간만 표시(중단/다시 시작 버튼 없음).
        elapsedLabel={<LiveElapsed state={state} />}
        running={running}
        showGuide={showGuide}
        lockWeightReps={lockWeightReps}
      />
    ) : null;

  return (
    <>
      {hideVideos ? (
        /* 영상 끄기 모드: 운동모드(가이드)가 없으니 시간 + 중지/시작/저장을 밖에 표시. */
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1.5 shadow-sm dark:border-emerald-800 dark:bg-emerald-950/40">
          <Timer
            aria-hidden="true"
            size={16}
            className={`text-emerald-700 dark:text-emerald-300 ${running ? "animate-pulse" : ""}`}
          />
          <LiveElapsed
            state={state}
            className="font-mono text-sm font-bold tabular-nums text-emerald-900 dark:text-emerald-100"
          />
          {running ? (
            <button
              type="button"
              aria-label="일시정지"
              title="일시정지"
              onClick={pause}
              className="flex h-7 w-7 items-center justify-center rounded-full text-emerald-700 transition hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
            >
              <Pause aria-hidden="true" size={14} />
            </button>
          ) : (
            <button
              type="button"
              aria-label="재개"
              title="재개"
              onClick={resume}
              className="flex h-7 w-7 items-center justify-center rounded-full text-emerald-700 transition hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
            >
              <Play aria-hidden="true" size={14} />
            </button>
          )}
          <button
            type="button"
            aria-label="정지하고 시간 저장"
            title="정지하고 시간 저장"
            onClick={requestSave}
            className="flex h-7 w-7 items-center justify-center rounded-full text-emerald-700 transition hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
          >
            <Save aria-hidden="true" size={13} />
          </button>
        </div>
      ) : (
        /* 영상 보기 모드: 시간·중단/다시시작은 운동모드(오버레이) 안에만.
           밖(홈)에선 운동모드로 다시 들어가는 '다시 운동하기' 버튼 하나만. */
        <button
          type="button"
          onClick={() => {
            resume();
            setGuided(true);
          }}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500"
        >
          <Play aria-hidden="true" size={16} />
          다시 운동하기
        </button>
      )}
      {overlay}
      <ConfirmDialog
        open={saveAsk}
        title="운동 정지 + 저장"
        message={`${formatElapsed(elapsedMs(state))} 만큼 ${state.forDate} 에 누적합니다.`}
        confirmLabel="저장"
        tone="default"
        onConfirm={confirmSave}
        onCancel={() => setSaveAsk(false)}
      />
      <ConfirmDialog
        open={savingErr !== null}
        title="저장 실패"
        message={
          savingErr +
          "\n\n원인: 'workout_sessions' 테이블이 Supabase 에 없을 가능성이 큽니다. supabase/schema.sql 의 workout_sessions 블록을 실행해주세요."
        }
        confirmLabel="확인"
        cancelLabel=""
        tone="danger"
        onConfirm={() => setSavingErr(null)}
        onCancel={() => setSavingErr(null)}
      />
    </>
  );
}
