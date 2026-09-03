import { describe, expect, it } from "vitest";

import {
  ACTION_ATTEMPTS,
  ACTION_TIMEOUT_MS,
  callIdempotentAction,
} from "@/lib/actions/resilient-action";

/** 영원히 안 끝나는 호출 — 스트리밍이 끊긴 서버 액션이 딱 이 모양이다. */
const hang = () => new Promise<never>(() => {});

describe("callIdempotentAction", () => {
  it("정상이면 값을 그대로 준다", async () => {
    const r = await callIdempotentAction(async () => 42);
    expect(r).toEqual({ ok: true, value: 42 });
  });

  it("🔴 답도 오류도 없이 멈추면 timeout 으로 끝낸다 — 스피너가 영원히 돌면 안 된다", async () => {
    const r = await callIdempotentAction(hang, { timeoutMs: 20, attempts: 2 });
    expect(r).toEqual({ ok: false, reason: "timeout" });
  });

  it("멈추면 다시 보낸다 — 두 번째가 되면 성공", async () => {
    let calls = 0;
    const run = () => {
      calls++;
      return calls === 1 ? hang() : Promise.resolve("ok");
    };
    const r = await callIdempotentAction(run, { timeoutMs: 20, attempts: 2 });
    expect(r).toEqual({ ok: true, value: "ok" });
    expect(calls).toBe(2);
  });

  it("매번 새로 호출한다 — 같은 promise 를 다시 기다리면 재시도가 아니다", async () => {
    let calls = 0;
    const run = () => {
      calls++;
      return hang();
    };
    await callIdempotentAction(run, { timeoutMs: 10, attempts: 3 });
    expect(calls).toBe(3);
  });

  it("성공하면 더 보내지 않는다", async () => {
    let calls = 0;
    const r = await callIdempotentAction(
      async () => {
        calls++;
        return 1;
      },
      { timeoutMs: 20, attempts: 3 },
    );
    expect(r.ok).toBe(true);
    expect(calls).toBe(1);
  });

  it("🔴 진짜 오류(거부)는 그대로 던진다 — 재시도할 게 아니라 호출부가 처리한다", async () => {
    let calls = 0;
    await expect(
      callIdempotentAction(
        () => {
          calls++;
          return Promise.reject(new Error("권한 없음"));
        },
        { timeoutMs: 20, attempts: 3 },
      ),
    ).rejects.toThrow("권한 없음");
    expect(calls).toBe(1);
  });

  it("attempts 가 0 이하여도 최소 한 번은 보낸다", async () => {
    let calls = 0;
    await callIdempotentAction(
      async () => {
        calls++;
        return 1;
      },
      { attempts: 0 },
    );
    expect(calls).toBe(1);
  });

  it("기본값 — 정상 왕복(1초 안쪽)보다 넉넉하고, 시도는 두 번", () => {
    expect(ACTION_TIMEOUT_MS).toBeGreaterThanOrEqual(5_000);
    expect(ACTION_ATTEMPTS).toBe(2);
  });

  it("늦게 끝난 첫 호출이 결과를 덮어쓰지 않는다", async () => {
    let calls = 0;
    const run = () => {
      calls++;
      const mine = calls;
      // 첫 호출은 아주 늦게, 둘째는 즉시.
      return mine === 1
        ? new Promise<string>((r) => setTimeout(() => r("늦은첫번째"), 200))
        : Promise.resolve("두번째");
    };
    const r = await callIdempotentAction(run, { timeoutMs: 20, attempts: 2 });
    expect(r).toEqual({ ok: true, value: "두번째" });
    await new Promise((r) => setTimeout(r, 250));
    expect(r).toEqual({ ok: true, value: "두번째" });
  });
});
