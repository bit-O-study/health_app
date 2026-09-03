# Workout Timer Cold Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve an unfinished workout's elapsed time while keeping it paused after an app remount until the user explicitly taps `다시 운동하기`.

**Architecture:** Add one pure mount-restoration state transition in `timer-store.ts`. The workout component passes the existing internal-detail-return flag into that transition so cold restores pause at the last heartbeat while the intentional exercise-detail round trip keeps running.

**Tech Stack:** TypeScript, React 19, Next.js 16, Vitest

## Global Constraints

- Do not remove or reset the `다시 운동하기` flow.
- `운동 시작` must still create a zeroed timer.
- A general app remount must not count time after the stored `lastSeenAt`.
- The existing within-mount 10-minute background-gap policy remains unchanged.
- Returning from `운동법·꿀팁` with `heltch.resumeWorkout=1` must keep the active timer running.
- Add no dependency and do not refactor unrelated workout code.

---

### Task 1: Pause persisted running timers on a general app remount

**Files:**
- Modify: `tests/be/logic/workout-timer-resume.test.ts`
- Modify: `src/features/workout-timer/timer-store.ts`
- Modify: `src/features/workout-timer/workout-session-timer.tsx`

**Interfaces:**
- Consumes: existing `TimerState` and `reconcileResume(s, now, gapMs?)`.
- Produces: `restoreTimerOnMount(s: TimerState | null, now: number, resumeImmediately?: boolean): TimerState | null`.

- [ ] **Step 1: Write the failing state-transition tests**

Add `restoreTimerOnMount` to the import and append these tests to
`tests/be/logic/workout-timer-resume.test.ts`:

```ts
describe("restoreTimerOnMount — 앱 재진입은 명시적 재개까지 정지", () => {
  it("일반 재진입은 마지막 하트비트까지만 누적하고 일시정지한다", () => {
    const s = base({
      startedAt: 1_000,
      lastSeenAt: 241_000,
      accumulated: 30_000,
    });
    const r = restoreTimerOnMount(s, 541_000)!;

    expect(r.pausedAt).toBe(541_000);
    expect(r.accumulated).toBe(270_000);
    expect(r.lastSeenAt).toBe(241_000);
  });

  it("운동 상세에서 자동복귀하면 실행 상태를 유지한다", () => {
    const s = base({ startedAt: 1_000, lastSeenAt: 2_000 });
    const r = restoreTimerOnMount(s, 5_000, true)!;

    expect(r.pausedAt).toBeNull();
    expect(r.startedAt).toBe(1_000);
    expect(r.lastSeenAt).toBe(5_000);
  });

  it("이미 일시정지된 저장본은 그대로 둔다", () => {
    const s = base({ pausedAt: 4_000, accumulated: 3_000 });
    expect(restoreTimerOnMount(s, 50_000)).toBe(s);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
pnpm vitest run tests/be/logic/workout-timer-resume.test.ts --reporter=verbose
```

Expected: FAIL because `restoreTimerOnMount` is not exported.

- [ ] **Step 3: Implement the minimal pure transition**

Add this immediately after `reconcileResume` in
`src/features/workout-timer/timer-store.ts`:

```ts
export function restoreTimerOnMount(
  s: TimerState | null,
  now: number,
  resumeImmediately = false,
): TimerState | null {
  if (!s || s.pausedAt !== null) return s;
  if (resumeImmediately) return reconcileResume(s, now);

  const seen = s.lastSeenAt ?? s.startedAt;
  const segmentEnd = Math.max(s.startedAt, Math.min(now, seen));
  return {
    ...s,
    pausedAt: now,
    accumulated: s.accumulated + (segmentEnd - s.startedAt),
    lastSeenAt: segmentEnd,
  };
}
```

- [ ] **Step 4: Route the component's initial restore through the transition**

In `src/features/workout-timer/workout-session-timer.tsx`:

1. Import `restoreTimerOnMount` from `timer-store`.
2. Add `const resumeFromDetailRef = useRef(false);` beside `rolledOverRef`.
3. When `heltch.resumeWorkout` is consumed, set
   `resumeFromDetailRef.current = true` before `setGuided(true)`.
4. Replace the initial mount's `reconcileResume(raw, Date.now())` call with:

```ts
const restored = restoreTimerOnMount(
  raw,
  Date.now(),
  resumeFromDetailRef.current,
);
```

Keep the visibility-change effect on `reconcileResume`; it implements the existing
within-mount background policy and is not a cold restore.

- [ ] **Step 5: Run focused timer tests and verify GREEN**

Run:

```bash
pnpm vitest run tests/be/logic/workout-timer-resume.test.ts tests/be/logic/timer-delta.test.ts --reporter=verbose
```

Expected: all tests PASS.

- [ ] **Step 6: Run the existing detail-return regression**

Run against an available authenticated E2E environment:

```bash
pnpm playwright test tests/e2e/guided-guide-back-keeps-position.spec.ts --project=mobile-chromium
```

Expected: PASS; returning from exercise detail reopens the workout mode at the
saved exercise. If the live E2E environment is unavailable, report that gap and
retain the pure `resumeImmediately` unit test as the next-best evidence.

- [ ] **Step 7: Commit the timer fix**

```bash
git add tests/be/logic/workout-timer-resume.test.ts src/features/workout-timer/timer-store.ts src/features/workout-timer/workout-session-timer.tsx
git commit -m "fix(workout): pause restored timer until explicit resume"
```
