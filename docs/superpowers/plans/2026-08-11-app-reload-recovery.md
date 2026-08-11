# App Reload Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop arbitrary render errors from silently restarting the entire app while preserving one-shot recovery for stale chunks and transient load failures.

**Architecture:** Centralize error classification, recovery decision, and privacy-limited diagnostics as pure logic in `chunk-recovery.ts`. Both Next.js error boundaries use the decision result; only recoverable load failures may call `window.location.reload()`, while ordinary code errors remain on the existing retry UI.

**Tech Stack:** TypeScript, React 19, Next.js 16, Vitest

## Global Constraints

- Keep automatic recovery for chunk, dynamic import, CSS chunk, and transient network load failures.
- Never automatically reload for ordinary `TypeError` or render/data-access errors.
- Keep the existing 30-second reload-loop guard.
- Store only the latest diagnostic: timestamp, pathname without query string, message, optional digest, and recoverable classification.
- Truncate path and message to 500 characters and digest to 120 characters; never store a stack or user input.
- Keep `PWARegister`, Android main-frame retry, and `RouteKeeper` behavior unchanged.
- Add no dependency and do not refactor unrelated error UI.

---

### Task 1: Classify recoverable errors and build bounded diagnostics

**Files:**
- Modify: `tests/be/logic/chunk-recovery.test.ts`
- Modify: `src/lib/chunk-recovery.ts`

**Interfaces:**
- Consumes: existing `isChunkLoadError` and `shouldAutoReload`.
- Produces: `isRecoverableLoadError(message)`, `AppErrorDiagnostic`,
  `createAppErrorDiagnostic(error, path, occurredAt)`, and
  `shouldRecoverAppError(error, lastReloadAt, now)`.

- [ ] **Step 1: Write failing classifier and diagnostic tests**

Extend the import in `tests/be/logic/chunk-recovery.test.ts`, then append:

```ts
describe("isRecoverableLoadError", () => {
  it("청크와 일시적 네트워크 로드 오류만 복구 대상으로 본다", () => {
    for (const message of [
      "ChunkLoadError: Loading chunk 472 failed.",
      "TypeError: Failed to fetch",
      "NetworkError when attempting to fetch resource.",
      "net::ERR_NETWORK_CHANGED",
    ]) {
      expect(isRecoverableLoadError(message)).toBe(true);
    }
  });

  it("일반 코드·렌더 오류는 앱 전체 새로고침 대상으로 보지 않는다", () => {
    for (const message of [
      "TypeError: Cannot read properties of undefined",
      "Invariant: expected a routine row",
      "An error occurred while rendering the Server Component",
    ]) {
      expect(isRecoverableLoadError(message)).toBe(false);
    }
  });
});

describe("app error recovery decision", () => {
  const now = 1_000_000;

  it("복구 가능한 오류도 30초 가드를 통과할 때만 자동 새로고침한다", () => {
    const error = new Error("ChunkLoadError: Loading chunk 1 failed");
    expect(shouldRecoverAppError(error, 0, now)).toBe(true);
    expect(shouldRecoverAppError(error, now - 5_000, now)).toBe(false);
  });

  it("진단 정보는 허용 필드만 길이 제한해 만든다", () => {
    const error = Object.assign(new Error("m".repeat(700)), {
      digest: "d".repeat(200),
    });
    const diagnostic = createAppErrorDiagnostic(
      error,
      `/${"p".repeat(700)}`,
      now,
    );

    expect(diagnostic).toEqual({
      occurredAt: now,
      path: `/${"p".repeat(499)}`,
      message: "m".repeat(500),
      digest: "d".repeat(120),
      recoverable: false,
    });
    expect(Object.keys(diagnostic).sort()).toEqual(
      ["digest", "message", "occurredAt", "path", "recoverable"].sort(),
    );
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm vitest run tests/be/logic/chunk-recovery.test.ts --reporter=verbose
```

Expected: FAIL because the new helpers are not exported.

- [ ] **Step 3: Implement the minimal pure logic**

Add to `src/lib/chunk-recovery.ts`:

```ts
const NETWORK_LOAD_ERROR_RE =
  /Failed to fetch|NetworkError|Load failed|net::ERR_(?:INTERNET_DISCONNECTED|NETWORK_CHANGED|CONNECTION_(?:ABORTED|CLOSED|RESET|REFUSED|TIMED_OUT))/i;

export function isRecoverableLoadError(
  message: string | null | undefined,
): boolean {
  if (!message) return false;
  return isChunkLoadError(message) || NETWORK_LOAD_ERROR_RE.test(message);
}

export type AppErrorDiagnostic = {
  occurredAt: number;
  path: string;
  message: string;
  digest: string | null;
  recoverable: boolean;
};

type AppErrorLike = { message?: string; digest?: string };

export function createAppErrorDiagnostic(
  error: AppErrorLike,
  path: string,
  occurredAt: number,
): AppErrorDiagnostic {
  const message = String(error?.message || "Unknown error").slice(0, 500);
  return {
    occurredAt,
    path: path.slice(0, 500),
    message,
    digest:
      typeof error?.digest === "string" ? error.digest.slice(0, 120) : null,
    recoverable: isRecoverableLoadError(message),
  };
}

export function shouldRecoverAppError(
  error: AppErrorLike,
  lastReloadAt: number,
  now: number,
): boolean {
  return (
    isRecoverableLoadError(error?.message) &&
    shouldAutoReload(lastReloadAt, now)
  );
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
pnpm vitest run tests/be/logic/chunk-recovery.test.ts --reporter=verbose
```

Expected: all tests PASS.

### Task 2: Apply the decision in both error boundaries

**Files:**
- Modify: `src/lib/chunk-recovery.ts`
- Modify: `src/app/error.tsx`
- Modify: `src/app/global-error.tsx`
- Test: `tests/be/logic/chunk-recovery.test.ts`

**Interfaces:**
- Consumes: Task 1's `createAppErrorDiagnostic` and `shouldRecoverAppError`.
- Produces: `recordAppErrorDiagnostic(error, path, occurredAt)` and error boundaries
  that reload only when `shouldRecoverAppError` returns true.

- [ ] **Step 1: Write the failing storage-behavior test**

Append this test using a minimal in-memory storage stub:

```ts
it("최신 진단 한 건을 지정 저장소에 기록하고 결과를 반환한다", () => {
  const values = new Map<string, string>();
  const storage = {
    setItem: (key: string, value: string) => values.set(key, value),
  };
  const error = Object.assign(new Error("render failed"), { digest: "abc" });

  const diagnostic = recordAppErrorDiagnostic(
    error,
    "/routine",
    123,
    storage,
  );

  expect(JSON.parse(values.get(LAST_APP_ERROR_KEY)!)).toEqual(diagnostic);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm vitest run tests/be/logic/chunk-recovery.test.ts --reporter=verbose
```

Expected: FAIL because `recordAppErrorDiagnostic` and `LAST_APP_ERROR_KEY` do
not exist.

- [ ] **Step 3: Implement storage injection and production fallback**

Add to `src/lib/chunk-recovery.ts`:

```ts
export const LAST_APP_ERROR_KEY = "heltch.lastAppError";

type DiagnosticStorage = { setItem: (key: string, value: string) => void };

export function recordAppErrorDiagnostic(
  error: AppErrorLike,
  path: string,
  occurredAt: number,
  storage?: DiagnosticStorage,
): AppErrorDiagnostic {
  const diagnostic = createAppErrorDiagnostic(error, path, occurredAt);
  try {
    const target =
      storage ?? (typeof window !== "undefined" ? window.localStorage : undefined);
    target?.setItem(LAST_APP_ERROR_KEY, JSON.stringify(diagnostic));
  } catch {
    /* diagnostics must never break error recovery */
  }
  return diagnostic;
}
```

- [ ] **Step 4: Wire `src/app/error.tsx`**

Destructure `error`, import the new helpers, and in the mount effect:

```ts
const now = Date.now();
recordAppErrorDiagnostic(
  error,
  window.location.pathname,
  now,
);

let last = 0;
try {
  last = Number(sessionStorage.getItem(AUTO_RELOAD_KEY) || 0);
} catch {
  /* sessionStorage unavailable */
}
if (shouldRecoverAppError(error, last, now)) {
  try {
    sessionStorage.setItem(AUTO_RELOAD_KEY, String(now));
  } catch {
    /* noop */
  }
  window.location.reload();
  return;
}
setAutoReloading(false);
```

Use `[error]` as the effect dependency. Remove the direct
`shouldAutoReload` import; nonrecoverable errors must reach the existing retry UI.

- [ ] **Step 5: Wire `src/app/global-error.tsx` identically**

Use the same decision and diagnostic flow as Step 4. Preserve the required
`<html>/<body>` wrapper and the existing `reset()` button.

- [ ] **Step 6: Run targeted tests and static checks**

Run:

```bash
pnpm vitest run tests/be/logic/chunk-recovery.test.ts tests/be/logic/route-restore.test.ts --reporter=verbose
pnpm eslint src/lib/chunk-recovery.ts src/app/error.tsx src/app/global-error.tsx tests/be/logic/chunk-recovery.test.ts
```

Expected: all tests PASS and ESLint exits 0 with no warnings.

- [ ] **Step 7: Commit the reload recovery fix**

```bash
git add tests/be/logic/chunk-recovery.test.ts src/lib/chunk-recovery.ts src/app/error.tsx src/app/global-error.tsx
git commit -m "fix(app): reload only recoverable load failures"
```

### Task 3: Combined regression verification

**Files:**
- Verify only; no production changes expected.

**Interfaces:**
- Consumes: completed timer cold-restore and app reload-recovery tasks.
- Produces: fresh regression evidence for the final handoff.

- [ ] **Step 1: Run all affected unit suites together**

```bash
pnpm vitest run tests/be/logic/workout-timer-resume.test.ts tests/be/logic/timer-delta.test.ts tests/be/logic/chunk-recovery.test.ts tests/be/logic/route-restore.test.ts --reporter=verbose
```

Expected: all tests PASS.

- [ ] **Step 2: Run repository type and lint checks**

```bash
pnpm tsc --noEmit
pnpm eslint src/features/workout-timer/timer-store.ts src/features/workout-timer/workout-session-timer.tsx src/lib/chunk-recovery.ts src/app/error.tsx src/app/global-error.tsx tests/be/logic/workout-timer-resume.test.ts tests/be/logic/chunk-recovery.test.ts
```

Expected: both commands exit 0. If unrelated pre-existing failures appear, capture
their exact file and message separately rather than changing unrelated code.

- [ ] **Step 3: Inspect the final diff**

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only the planned source and test files differ,
plus pre-existing untracked `.playwright-mcp/` and `.worktrees/` directories.
