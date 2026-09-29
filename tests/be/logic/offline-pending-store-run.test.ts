import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { readPending, writePending } from "@/lib/offline/pending-store";
import { pendingKey, type PendingWrite } from "@/lib/offline/pending-writes";

/**
 * 끝난 런닝이 기기 대기 큐(localStorage)를 **왕복해도 살아남는지** — 2026-09-28 런닝 1단계.
 * 🔴 저장소는 읽을 때 모양을 검사해 모르는 항목을 버린다. 런닝(run)을 검사에서 빠뜨리면
 *   오프라인으로 끝낸 런닝이 앱을 다시 켜는 순간 조용히 사라진다.
 */
function fakeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

beforeEach(() => {
  vi.stubGlobal("window", { localStorage: fakeStorage() });
});
afterEach(() => vi.unstubAllGlobals());

const run: PendingWrite = {
  kind: "run",
  key: pendingKey({ kind: "run", clientSessionId: "c432b98c-51b6-49eb-9172-5b55553f883c" }),
  name: "야외 런닝 3.21km",
  session: {
    clientSessionId: "c432b98c-51b6-49eb-9172-5b55553f883c",
    mode: "outdoor",
    startedAt: "2026-09-28T07:00:00.000Z",
    endedAt: "2026-09-28T07:20:00.000Z",
    distanceM: 3210,
    route: [{ lat: 37.5, lng: 127, timestamp: 1, accuracyM: 5 }],
  },
  forDate: "2026-09-28",
  queuedAt: 5_000,
};

describe("대기 큐 저장소 — 런닝 왕복", () => {
  it("적은 런닝을 그대로 다시 읽는다(경로 포함)", () => {
    expect(writePending([run])).toBe(true);
    expect(readPending()).toEqual([run]);
  });

  it("세션이 망가진 런닝 항목은 버린다(모양 검사)", () => {
    const broken = { ...run, session: { ...run.session, mode: "bike" } } as unknown as PendingWrite;
    writePending([broken, run]);
    expect(readPending()).toEqual([run]);
  });
});
