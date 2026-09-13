"use client";

/**
 * 연결 상태 + 못 올린 운동 기록 배너 — 로그인한 모든 화면 위에 얹힌다.
 *
 * ## 왜 전역인가
 * 담는 곳은 운동모드지만, **올릴 수 있게 되는 순간**은 사용자가 어디에 있든 온다.
 * 세트 몇 개를 지하에서 치고 홈으로 나가 버리면 지금 구조로는 영영 못 올린다.
 *
 * ## 🔴 "실패" 와 "대기" 를 같은 색으로 칠하지 않는다
 * 운동모드의 빨간 배너는 **사용자가 할 일이 있다**는 뜻이다(다시 시도 눌러라).
 * 오프라인 대기는 반대로 **아무것도 안 해도 된다**는 뜻이다. 둘을 같은 빨강으로
 * 칠하면 사용자는 연결이 돌아올 때까지 의미 없는 재시도를 누른다.
 * 그래서 대기는 주황, 못 올리고 버린 것만 빨강.
 *
 * ## 🔴 `navigator.onLine` 하나만 믿지 않는다
 * 이 값은 "네트워크 인터페이스가 붙어 있나" 에 가깝다 — 헬스장 와이파이에 연결은
 * 됐는데 바깥으로 안 나가는 상태를 못 잡는다. 그래서 **실제로 저장이 실패해서
 * 큐에 쌓인 것**도 같이 근거로 쓴다. 큐가 비어 있으면 온라인이라고 우기지 않고
 * 그냥 아무것도 안 보여 준다(틀린 경고보다 조용한 게 낫다).
 */

import { useEffect, useSyncExternalStore } from "react";
import { CloudOff, RefreshCw, X } from "lucide-react";

import {
  clearDropped,
  flushQueue,
  getOnlineServerSnapshot,
  getOnlineSnapshot,
  getQueueServerState,
  getQueueState,
  hydrateQueue,
  subscribeOnline,
  subscribeQueue,
} from "@/lib/offline/pending-queue";
import { pendingLabel } from "@/lib/offline/pending-writes";

export function OfflineBanner() {
  /**
   * 🔴 큐와 온라인 여부는 **React 바깥의 상태**다. effect 에서 setState 로 따라가면
   *   렌더가 한 박자 늦고(첫 프레임이 항상 "온라인·큐 없음"), 린트도 잡는다.
   *   `useSyncExternalStore` 가 React 가 정해 둔 자리다 — 서버 스냅샷을 따로 주므로
   *   `navigator` 를 렌더 중에 읽는 문제도 없다.
   */
  const queue = useSyncExternalStore(
    subscribeQueue,
    getQueueState,
    getQueueServerState,
  );
  const online = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getOnlineServerSnapshot,
  );

  useEffect(() => {
    // 지난번에 못 올린 게 있으면 되살린다(만료분은 여기서 버려진다).
    hydrateQueue();
    /**
     * 🔴 복귀(포그라운드)에서도 한 번 시도한다. 안드로이드 WebView 는 백그라운드에
     * 들어가 있는 동안 `online` 이벤트를 못 받고 넘어가는 일이 있어, 그 경우 앱을
     * 다시 열어도 큐가 그대로 남는다.
     */
    function tryFlush() {
      if (navigator.onLine !== false) void flushQueue();
    }
    function onVisible() {
      if (document.visibilityState === "visible") tryFlush();
    }
    window.addEventListener("online", tryFlush);
    document.addEventListener("visibilitychange", onVisible);
    tryFlush(); // 앱을 켠 직후
    return () => {
      window.removeEventListener("online", tryFlush);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const waiting = queue.pending.length;

  if (queue.dropped > 0) {
    return (
      <Bar tone="red" testId="offline-dropped">
        <span className="flex-1">
          연결이 오래 끊겨 <strong className="font-bold">{queue.dropped}건</strong>
          의 운동 기록을 올리지 못했어요. 기록 화면에서 직접 추가해 주세요.
        </span>
        <IconButton label="닫기" onClick={clearDropped}>
          <X aria-hidden="true" size={14} />
        </IconButton>
      </Bar>
    );
  }

  // 큐가 비어 있으면 오프라인이어도 말하지 않는다 — 잃을 게 없는데 경고만 띄우면
  // 다음에 진짜 필요할 때 이 자리를 아무도 안 본다.
  if (waiting === 0) return null;

  if (!online) {
    return (
      <Bar tone="amber" testId="offline-waiting">
        <CloudOff aria-hidden="true" size={16} className="shrink-0" />
        <span className="flex-1">
          오프라인 — <strong className="font-bold">{waiting}건</strong>이 기기에
          저장됐어요. 연결되면 자동으로 올라갑니다.
          <span className="block text-xs opacity-80">{pendingLabel(queue.pending)}</span>
        </span>
      </Bar>
    );
  }

  return (
    <Bar tone="amber" testId="offline-syncing">
      <RefreshCw
        aria-hidden="true"
        size={16}
        className={`shrink-0 ${queue.syncing ? "animate-spin" : ""}`}
      />
      <span className="flex-1">
        운동 기록 <strong className="font-bold">{waiting}건</strong>을 올리는 중…
      </span>
      {!queue.syncing && (
        <IconButton label="지금 올리기" onClick={() => void flushQueue()}>
          <RefreshCw aria-hidden="true" size={14} />
        </IconButton>
      )}
    </Bar>
  );
}

function Bar({
  tone,
  testId,
  children,
}: {
  tone: "amber" | "red";
  testId: string;
  children: React.ReactNode;
}) {
  const cls =
    tone === "red"
      ? "border-red-300 bg-red-50 text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200"
      : "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200";
  return (
    <div
      role="status"
      data-testid={testId}
      /* 🔴 z 는 운동모드 오버레이(z-40)·마무리 화면(z-70)보다 위, 모달(z-80)보다 아래.
         오프라인이 제일 아쉬운 순간이 **운동모드 한복판**인데 그때 안 보이면 의미가 없다.
         sticky 라 일반 화면에서는 내용을 밀어내고, 고정 오버레이 위에서는 덮어 그린다. */
      className={`sticky top-0 z-[75] flex items-center gap-2 border-b px-4 py-2 text-sm ${cls}`}
    >
      {children}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="shrink-0 rounded-lg p-1 transition hover:bg-black/5 dark:hover:bg-white/10"
    >
      {children}
    </button>
  );
}
