/**
 * 뒤로가기 = 모달 닫기 — 순수 로직(window 없음 → 단위 테스트 가능).
 *
 * 모달이 열리면 히스토리 항목을 하나 쌓는다(URL 은 그대로). 뒤로가기(안드로이드 하드웨어
 * back → WebView goBack, 브라우저 뒤로)가 오면 그 항목이 빠지면서 popstate 가 오고,
 * 여기서 **맨 위 모달 하나만** 닫는다. 화면은 그대로다.
 *
 * 🔴 X·배경 클릭 등으로 닫으면 쌓아 둔 항목을 직접 `back()` 으로 빼 준다. 안 빼면
 *    다음 뒤로가기가 '아무 일도 안 하는 한 번' 이 된다. 그 back() 이 만드는 popstate 는
 *    무시한다(다른 모달을 닫으면 안 된다).
 * 🔴 빼는 건 **다음 틱으로 미룬다.** React StrictMode(dev) 는 effect 를 해제→재실행하는데,
 *    곧바로 back() 하면 재실행에서 다시 쌓은 항목을 그 back() 이 지워 버린다.
 *    같은 key 가 그 사이 다시 열리면 빼기를 취소한다.
 * 🔴 빼기 직전에 **지금 항목이 여전히 내 것인지** 다시 본다. 모달 안에서 다른 화면으로
 *    이동(router.push)했으면 그 항목은 이미 내 것이 아니고, back() 하면 이동을 되돌린다.
 * 🔴 Next App Router 는 pushState 를 감싸 `__NA` 를 복사해 준다 — 그래서 이 항목으로
 *    popstate 가 와도 새로고침하지 않는다(외부 pushState 에 __NA 가 없으면 reload 한다).
 */

export type HistoryLike = {
  readonly state: unknown;
  pushState(data: unknown, unused: string): void;
  back(): void;
};

export type Scheduler = {
  set(fn: () => void): unknown;
  clear(handle: unknown): void;
};

export const MODAL_STATE_KEY = "heltchModal";

function markerOf(state: unknown): string | undefined {
  if (state && typeof state === "object" && MODAL_STATE_KEY in state) {
    const v = (state as Record<string, unknown>)[MODAL_STATE_KEY];
    return typeof v === "string" ? v : undefined;
  }
  return undefined;
}

export function createModalHistory(history: HistoryLike, scheduler: Scheduler) {
  const stack: { key: string; close: () => void }[] = [];
  const pendingRelease = new Map<string, unknown>();
  let ignorePops = 0;
  // 모달 안에서 화면을 옮기면 빈 항목(주인 없는 모달 표식)이 남는다. 거기 도착하면 한 번
  // 더 뒤로 가 준다 — 단 연속으로는 안 한다(운동모드처럼 popstate 마다 항목을 다시 쌓는
  // 화면과 만나면 서로 되돌리며 무한히 돌 수 있다).
  let skippedDead = false;

  function open(key: string, close: () => void): void {
    const pending = pendingRelease.get(key);
    if (pending !== undefined) {
      scheduler.clear(pending);
      pendingRelease.delete(key);
    }
    const existing = stack.find((e) => e.key === key);
    if (existing) {
      existing.close = close;
      return;
    }
    stack.push({ key, close });
    if (markerOf(history.state) !== key) {
      history.pushState({ [MODAL_STATE_KEY]: key }, "");
    }
  }

  function release(key: string): void {
    const i = stack.findIndex((e) => e.key === key);
    if (i < 0) return; // 뒤로가기로 이미 닫힘 — 뺄 항목도 이미 빠졌다.
    stack.splice(i, 1);
    const handle = scheduler.set(() => {
      pendingRelease.delete(key);
      if (stack.some((e) => e.key === key)) return;
      if (markerOf(history.state) !== key) return;
      ignorePops++;
      history.back();
    });
    pendingRelease.set(key, handle);
  }

  function onPopState(state: unknown): void {
    if (ignorePops > 0) {
      ignorePops--;
      return;
    }
    const marker = markerOf(state);
    const top = stack[stack.length - 1];
    if (top) {
      if (marker === top.key) return; // 맨 위 모달의 항목에 도착(앞으로 가기) — 그대로.
      stack.pop();
      skippedDead = false;
      top.close();
      return;
    }
    if (marker !== undefined && !skippedDead) {
      skippedDead = true;
      ignorePops++;
      history.back();
      return;
    }
    skippedDead = false;
  }

  return {
    open,
    release,
    onPopState,
    /** 테스트용 — 지금 열려 있는 모달 key(아래→위). */
    openKeys: () => stack.map((e) => e.key),
  };
}
