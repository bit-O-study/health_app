"use client";

/**
 * 서버 액션이 **응답도 오류도 없이 멈추는** 경우를 막는 껍데기.
 *
 * 🔴 무엇을 막는가 — 2026-09-02 측정. `/routine` 의 서버 액션 POST 가 스트리밍 도중
 * 끊기는(`net::ERR_ABORTED`) 일이 약 30% 확률로 일어난다. 그러면 `await 액션()` 이
 * **영원히 안 끝난다**(거부도 아니다). 그 다음 줄이 통째로 실행되지 않아
 *  - 버튼은 `pending` 인 채로 굳어 계속 돌고
 *  - `router.refresh()` 가 안 돌아 화면이 안 바뀌고
 *  - 끊긴 시점에 따라 **DB 쓰기 자체가 안 된 경우도 있었다**(눌렀는데 기록이 없음)
 *
 * `try/catch` 로는 못 잡는다 — 거부되지 않고 **아무 일도 안 일어나기** 때문이다.
 * 그래서 시간을 재서 판단한다.
 *
 * ⚠ **멱등한 액션에만 쓴다.** 다시 보내면 서버에서 한 번 더 실행될 수 있다.
 * upsert·"이 행을 done 으로" 처럼 여러 번 해도 결과가 같은 것만 대상이다.
 * 예를 들어 완료 '취소'(clear)는 후보 중 한 건을 골라 지우므로 두 번 돌면 두 건이
 * 지워진다 — 그런 액션에 이걸 씌우면 안 된다.
 */

/** 이만큼 답이 없으면 끊긴 것으로 본다. 정상 왕복은 1초 안쪽이라 넉넉한 값. */
export const ACTION_TIMEOUT_MS = 12_000;
/** 총 시도 횟수(처음 1 + 재시도). 두 번으로 충분하다 — 세 번째까지 가면 다른 문제다. */
export const ACTION_ATTEMPTS = 2;

export type ResilientResult<T> =
  | { ok: true; value: T }
  /** 정해진 횟수만큼 보냈는데 전부 답이 없었다. 화면은 스피너를 멈추고 알려야 한다. */
  | { ok: false; reason: "timeout" };

/** 시간 안에 끝나면 값을, 아니면 `TIMED_OUT` 을. **거부는 그대로 던진다** — 진짜 오류는
 *  재시도할 게 아니라 호출부가 처리해야 한다. */
const TIMED_OUT = Symbol("timed-out");

function withDeadline<T>(
  p: Promise<T>,
  ms: number,
): Promise<T | typeof TIMED_OUT> {
  return new Promise<T | typeof TIMED_OUT>((resolve, reject) => {
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      // 버려진 promise 가 나중에 끝나도 무시된다(여기서 이미 결과를 냈다).
      resolve(TIMED_OUT);
    }, ms);
    p.then(
      (v) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/**
 * 멱등한 서버 액션을 '멈추지 않게' 부른다.
 *
 * @param run 매번 **새로 호출**해야 하므로 promise 가 아니라 함수를 받는다
 *            (같은 promise 를 다시 기다리면 재시도가 아니라 같은 멈춤을 또 기다린다).
 */
export async function callIdempotentAction<T>(
  run: () => Promise<T>,
  opts: { timeoutMs?: number; attempts?: number } = {},
): Promise<ResilientResult<T>> {
  const timeoutMs = opts.timeoutMs ?? ACTION_TIMEOUT_MS;
  const attempts = Math.max(1, opts.attempts ?? ACTION_ATTEMPTS);
  for (let i = 0; i < attempts; i++) {
    const res = await withDeadline(run(), timeoutMs);
    if (res !== TIMED_OUT) return { ok: true, value: res };
  }
  return { ok: false, reason: "timeout" };
}
