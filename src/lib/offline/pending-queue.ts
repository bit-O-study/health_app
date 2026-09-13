"use client";

/**
 * 대기 큐의 **동작** — 담기·구독·다시 보내기. (순수 로직은 `pending-writes`,
 * 저장은 `pending-store`.)
 *
 * ## 왜 화면이 아니라 여기에 있나
 * 담는 쪽은 운동모드(`guided-workout`)인데, 올리는 건 **어느 화면에 있든** 돼야 한다.
 * 세트 몇 개를 오프라인으로 치고 홈으로 나가 버리면 그때부터 영영 못 올리는 게 지금
 * 구조다. 그래서 큐는 화면 밖의 단일 인스턴스로 두고, 전역 배너가 그 상태를 비춘다.
 *
 * ## 🔴 한 번에 하나씩, 순서대로 보낸다
 * 한꺼번에 던지면 지하에서 막 빠져나온 약한 회선에 동시 요청이 몰려 또 실패한다.
 * 그리고 실패한 건 **큐에 남겨 둔다** — 성공한 것만 뺀다.
 */

import { setExerciseStatusAction } from "@/features/routine/exercise-completion-actions";
import { setConditioningStatusAction } from "@/features/routine/conditioning-completion-actions";
import { callIdempotentAction } from "@/lib/actions/resilient-action";
import {
  prunePending,
  readPending,
  writePending,
} from "@/lib/offline/pending-store";
import {
  removePending,
  upsertPending,
  type PendingWrite,
} from "@/lib/offline/pending-writes";

export type QueueState = {
  pending: PendingWrite[];
  /** 지금 다시 보내는 중인가. */
  syncing: boolean;
  /**
   * 너무 오래돼 버린 건수. 0 이 아니면 화면이 알려야 한다 —
   * 사용자가 친 세트를 조용히 버리면 그게 제일 나쁘다.
   */
  dropped: number;
};

let state: QueueState = { pending: [], syncing: false, dropped: 0 };
const listeners = new Set<(s: QueueState) => void>();

function emit() {
  for (const fn of listeners) fn(state);
}

function setState(patch: Partial<QueueState>) {
  state = { ...state, ...patch };
  emit();
}

export function getQueueState(): QueueState {
  return state;
}

/**
 * 서버 렌더용 스냅샷 — **항상 같은 객체**여야 한다.
 * `useSyncExternalStore` 는 스냅샷이 매번 다른 객체면 무한 렌더로 본다.
 */
const SERVER_SNAPSHOT: QueueState = {
  pending: [],
  syncing: false,
  dropped: 0,
};

export function getQueueServerState(): QueueState {
  return SERVER_SNAPSHOT;
}

/**
 * 브라우저의 온라인 여부를 `useSyncExternalStore` 로 읽기 위한 구독자.
 * 🔴 `navigator` 는 렌더 중에 읽을 수 없다(서버 렌더). 그래서 effect 에서 setState 로
 *   맞추는 대신, React 가 정한 자리(외부 스토어)로 넘긴다.
 */
export function subscribeOnline(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

export function getOnlineSnapshot(): boolean {
  return navigator.onLine !== false;
}

/** 서버에서는 온라인으로 본다 — 오프라인 배너를 서버가 먼저 그릴 일은 없다. */
export function getOnlineServerSnapshot(): boolean {
  return true;
}

export function subscribeQueue(fn: (s: QueueState) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * 저장소에서 큐를 읽어 상태를 맞춘다(만료분은 여기서 버려진다).
 * 앱을 다시 켰을 때 **지난번에 못 올린 것**을 되살리는 자리다.
 */
export function hydrateQueue(): void {
  const { fresh, expired } = prunePending();
  setState({ pending: fresh, dropped: state.dropped + expired.length });
}

/** 한 건 담는다(같은 항목이면 덮어쓰기). 저장에 실패해도 메모리 큐엔 남긴다. */
export function enqueuePending(entry: PendingWrite): void {
  const next = upsertPending(readPending(), entry);
  writePending(next);
  setState({ pending: next });
}

/** '못 올린 기록이 있었다' 안내를 사용자가 확인했다. */
export function clearDropped(): void {
  setState({ dropped: 0 });
}

function send(w: PendingWrite) {
  return w.kind === "main"
    ? setExerciseStatusAction(w.rowId, w.status, w.snapshot, w.forDate)
    : setConditioningStatusAction(
        w.condKind,
        w.rowId,
        w.itemId,
        w.status,
        w.snapshot,
        w.forDate,
      );
}

/**
 * 큐를 비운다 — 하나씩 순서대로.
 *
 * @returns 실제로 올린 건수.
 */
export async function flushQueue(): Promise<number> {
  if (state.syncing) return 0;
  const { fresh, expired } = prunePending();
  if (expired.length > 0) setState({ dropped: state.dropped + expired.length });
  if (fresh.length === 0) {
    setState({ pending: [] });
    return 0;
  }
  setState({ pending: fresh, syncing: true });

  const sent: string[] = [];
  try {
    for (const w of fresh) {
      // 도중에 다시 끊기면 남은 건 그대로 두고 멈춘다 — 다음 'online' 에 이어서.
      if (typeof navigator !== "undefined" && navigator.onLine === false) break;
      let ok = false;
      try {
        const r = await callIdempotentAction(() => send(w));
        ok = r.ok && r.value?.ok !== false;
      } catch {
        ok = false;
      }
      if (!ok) break;
      sent.push(w.key);
    }
  } finally {
    const next = removePending(readPending(), sent);
    writePending(next);
    setState({ pending: next, syncing: false });
  }
  return sent.length;
}
