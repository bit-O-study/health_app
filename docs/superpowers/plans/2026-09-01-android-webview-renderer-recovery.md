# Android WebView Renderer Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Android WebView renderer 종료를 감지해 앱을 새 WebView로 복구하고, 5분 안에 재발하면 RouteKeeper가 문제 경로를 다시 열지 않고 `/home`으로 안전 복구하게 한다.

**Architecture:** Android의 `onRenderProcessGone`이 종료 진단과 반복 횟수를 `SharedPreferences`에 기록하고 Activity를 재생성한다. 기존 JavaScript 브리지가 최신 복구 이벤트를 한 번 전달하면 웹의 순수 정책 함수와 `RouteKeeper`가 마지막 경로 복원 또는 안전 홈을 선택하고 6초 안내를 표시한다.

**Tech Stack:** Java 17, Android WebView API 26+, Capacitor 8.4.1, React 19, Next.js 16, TypeScript, JUnit 4, Vitest 4

**Spec:** `docs/superpowers/specs/2026-09-01-android-webview-renderer-recovery-design.md`

## Global Constraints

- 첫 renderer 종료는 `restore_once`, 5분 안의 두 번째 이상 종료는 `safe_home`이다.
- 안전 홈은 `/home`이며 `heltch.lastRoute`를 삭제해 문제 경로 복원을 차단한다.
- query string, 스택, 사용자 입력은 Android 진단에 저장하지 않는다.
- 종료된 WebView는 제거·파괴하고 절대 `reload()`하거나 재사용하지 않는다.
- 기존 네트워크 재시도와 일반 웹 RouteKeeper 동작은 유지한다.
- 새 런타임 의존성을 추가하지 않는다.
- 실제 기기 원인 확정은 기기가 준비될 때까지 완료로 주장하지 않는다.

---

### Task 1: Android 반복 종료 정책

**Files:**
- Create: `android/app/src/main/java/app/helssu/twa/RendererRecoveryPolicy.java`
- Create: `android/app/src/test/java/app/helssu/twa/RendererRecoveryPolicyTest.java`

**Interfaces:**
- Consumes: 직전 종료 시각 `long previousAt`, 직전 창의 횟수 `int previousCount`, 현재 시각 `long now`.
- Produces: `RendererRecoveryPolicy.decide(long, int, long)`과 `Decision.mode`, `Decision.count`; 모드는 `restore_once` 또는 `safe_home`.

- [ ] **Step 1: 최초·반복·경계 동작을 표현하는 실패 테스트 작성**

```java
package app.helssu.twa;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class RendererRecoveryPolicyTest {
    private static final long NOW = 1_000_000L;

    @Test
    public void firstExitAllowsOneRestore() {
        RendererRecoveryPolicy.Decision d = RendererRecoveryPolicy.decide(0L, 0, NOW);
        assertEquals(RendererRecoveryPolicy.MODE_RESTORE_ONCE, d.mode);
        assertEquals(1, d.count);
    }

    @Test
    public void secondExitInsideFiveMinutesUsesSafeHome() {
        RendererRecoveryPolicy.Decision d = RendererRecoveryPolicy.decide(NOW - 1_000L, 1, NOW);
        assertEquals(RendererRecoveryPolicy.MODE_SAFE_HOME, d.mode);
        assertEquals(2, d.count);
    }

    @Test
    public void exitAtFiveMinuteBoundaryStartsNewWindow() {
        RendererRecoveryPolicy.Decision d = RendererRecoveryPolicy.decide(
            NOW - RendererRecoveryPolicy.WINDOW_MS,
            4,
            NOW
        );
        assertEquals(RendererRecoveryPolicy.MODE_RESTORE_ONCE, d.mode);
        assertEquals(1, d.count);
    }

    @Test
    public void backwardsClockStartsNewWindow() {
        RendererRecoveryPolicy.Decision d = RendererRecoveryPolicy.decide(NOW + 1L, 2, NOW);
        assertEquals(RendererRecoveryPolicy.MODE_RESTORE_ONCE, d.mode);
        assertEquals(1, d.count);
    }
}
```

- [ ] **Step 2: Android 정책 테스트가 클래스 부재로 실패하는지 확인**

Run: `cd android; .\gradlew.bat :app:testDebugUnitTest --tests app.helssu.twa.RendererRecoveryPolicyTest`

Expected: FAIL because `RendererRecoveryPolicy` does not exist.

- [ ] **Step 3: 최소 순수 Java 정책 구현**

```java
package app.helssu.twa;

final class RendererRecoveryPolicy {
    static final long WINDOW_MS = 5L * 60L * 1000L;
    static final String MODE_RESTORE_ONCE = "restore_once";
    static final String MODE_SAFE_HOME = "safe_home";

    static Decision decide(long previousAt, int previousCount, long now) {
        boolean sameWindow = previousAt > 0L && now >= previousAt && now - previousAt < WINDOW_MS;
        int count = sameWindow ? Math.max(1, previousCount) + 1 : 1;
        String mode = count >= 2 ? MODE_SAFE_HOME : MODE_RESTORE_ONCE;
        return new Decision(mode, count);
    }

    static final class Decision {
        final String mode;
        final int count;

        Decision(String mode, int count) {
            this.mode = mode;
            this.count = count;
        }
    }

    private RendererRecoveryPolicy() {}
}
```

- [ ] **Step 4: Android 정책 테스트 통과 확인**

Run: `cd android; .\gradlew.bat :app:testDebugUnitTest --tests app.helssu.twa.RendererRecoveryPolicyTest`

Expected: 4 tests PASS.

- [ ] **Step 5: 정책 구현 커밋**

```powershell
git add android/app/src/main/java/app/helssu/twa/RendererRecoveryPolicy.java android/app/src/test/java/app/helssu/twa/RendererRecoveryPolicyTest.java
git commit -m "test(android): define renderer recovery policy"
```

### Task 2: 웹 복구 이벤트 파싱과 경로 결정

**Files:**
- Create: `src/lib/platform/renderer-recovery.ts`
- Create: `tests/be/logic/renderer-recovery.test.ts`

**Interfaces:**
- Consumes: `window.HelssuNative.consumeRendererRecovery()`이 반환한 JSON 문자열, 현재 시각, 저장 경로와 현재 경로.
- Produces: `parseRendererRecovery(raw, now)`과 `decideRendererRecovery(event, saved, currentPath, now)`; 결정은 `targetPath`, `clearSavedRoute`, `notice`를 가진다.

- [ ] **Step 1: 브리지 입력과 경로 정책의 실패 테스트 작성**

```ts
import { describe, expect, it } from "vitest";

import {
  decideRendererRecovery,
  parseRendererRecovery,
  RECOVERY_EVENT_MAX_AGE_MS,
} from "@/lib/platform/renderer-recovery";

const NOW = 1_000_000;
const saved = { path: "/community", ts: NOW - 1_000 };

describe("renderer recovery", () => {
  it("첫 종료는 기존 RouteKeeper 복원을 한 번 허용한다", () => {
    const event = parseRendererRecovery(
      JSON.stringify({ mode: "restore_once", occurredAt: NOW, count: 1, didCrash: false }),
      NOW,
    );
    expect(decideRendererRecovery(event, saved, "/", NOW)).toEqual({
      targetPath: "/community",
      clearSavedRoute: false,
      notice: "앱 화면을 복구했어요.",
    });
  });

  it("5분 안 반복 종료는 저장 경로를 버리고 홈으로 간다", () => {
    const event = parseRendererRecovery(
      JSON.stringify({ mode: "safe_home", occurredAt: NOW, count: 2, didCrash: true }),
      NOW,
    );
    expect(decideRendererRecovery(event, saved, "/", NOW)).toEqual({
      targetPath: "/home",
      clearSavedRoute: true,
      notice: "화면 오류가 반복되어 홈으로 안전하게 이동했어요.",
    });
  });

  it("손상되거나 오래된 이벤트는 무시한다", () => {
    expect(parseRendererRecovery("not-json", NOW)).toBeNull();
    expect(
      parseRendererRecovery(
        JSON.stringify({ mode: "safe_home", occurredAt: NOW - RECOVERY_EVENT_MAX_AGE_MS, count: 2, didCrash: false }),
        NOW,
      ),
    ).toBeNull();
  });
});
```

- [ ] **Step 2: Vitest가 모듈 부재로 실패하는지 확인**

Run: `pnpm vitest run tests/be/logic/renderer-recovery.test.ts`

Expected: FAIL because `@/lib/platform/renderer-recovery` does not exist.

- [ ] **Step 3: 최소 파서와 결정 함수 구현**

```ts
import { shouldRestoreRoute, type SavedRoute } from "@/lib/platform/route-restore";

export const RECOVERY_EVENT_MAX_AGE_MS = 5 * 60 * 1000;
export type RendererRecoveryEvent = {
  mode: "restore_once" | "safe_home";
  occurredAt: number;
  count: number;
  didCrash: boolean;
};

export function parseRendererRecovery(raw: string | null, now: number): RendererRecoveryEvent | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<RendererRecoveryEvent>;
    if (
      (value.mode !== "restore_once" && value.mode !== "safe_home") ||
      typeof value.occurredAt !== "number" ||
      typeof value.count !== "number" ||
      typeof value.didCrash !== "boolean" ||
      now < value.occurredAt ||
      now - value.occurredAt >= RECOVERY_EVENT_MAX_AGE_MS
    ) return null;
    return value as RendererRecoveryEvent;
  } catch {
    return null;
  }
}

export function decideRendererRecovery(
  event: RendererRecoveryEvent | null,
  saved: SavedRoute | null,
  currentPath: string,
  now: number,
) {
  if (event?.mode === "safe_home") {
    return {
      targetPath: "/home",
      clearSavedRoute: true,
      notice: "화면 오류가 반복되어 홈으로 안전하게 이동했어요.",
    };
  }
  const targetPath = shouldRestoreRoute(saved, currentPath, now) ? saved!.path : null;
  return {
    targetPath,
    clearSavedRoute: false,
    notice: event?.mode === "restore_once" ? "앱 화면을 복구했어요." : null,
  };
}
```

- [ ] **Step 4: 웹 복구 정책 테스트 통과 확인**

Run: `pnpm vitest run tests/be/logic/renderer-recovery.test.ts tests/be/logic/route-restore.test.ts`

Expected: both test files PASS.

- [ ] **Step 5: 웹 정책 구현 커밋**

```powershell
git add src/lib/platform/renderer-recovery.ts tests/be/logic/renderer-recovery.test.ts
git commit -m "test(app): define renderer recovery routing"
```

### Task 3: MainActivity renderer 종료 처리와 진단 브리지

**Files:**
- Modify: `android/app/src/main/java/app/helssu/twa/MainActivity.java`

**Interfaces:**
- Consumes: Task 1의 `RendererRecoveryPolicy.Decision`.
- Produces: `onRenderProcessGone(WebView, RenderProcessGoneDetail)` 처리와 `window.HelssuNative.consumeRendererRecovery(): string | null`.

- [ ] **Step 1: 종료 상태 저장 상수와 구조화 로그 추가**

`MainActivity`에 `HelssuWebView` 로그 태그, 전용 preference 이름, `lastExitAt`, `windowCount`, `pending`, `mode`, `didCrash`, `priority`, `path` 키를 추가한다. `recordRendererExit`은 URL을 `Uri.parse(url).getPath()`로 줄이고 Task 1 정책 결과를 `SharedPreferences.apply()`로 저장한 뒤 다음 형식으로 로그한다.

```java
Log.e(
    WEBVIEW_LOG_TAG,
    "renderer_gone mode=" + decision.mode
        + " count=" + decision.count
        + " didCrash=" + detail.didCrash()
        + " priority=" + detail.rendererPriorityAtExit()
        + " path=" + path
);
```

- [ ] **Step 2: `onRenderProcessGone`에서 종료된 WebView 폐기 후 Activity 재생성**

기존 `BridgeWebViewClient` 익명 클래스에 다음 순서를 구현한다.

```java
@Override
public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
    super.onRenderProcessGone(view, detail);
    recordRendererExit(view, detail);
    loadFailed = false;
    retryHandler.removeCallbacksAndMessages(null);
    ViewParent parent = view.getParent();
    if (parent instanceof ViewGroup) {
        ((ViewGroup) parent).removeView(view);
    }
    view.destroy();
    retryHandler.post(() -> {
        if (!isFinishing() && !isDestroyed()) recreate();
    });
    return true;
}
```

- [ ] **Step 3: 최신 pending 이벤트를 한 번 반환하는 브리지 메서드 추가**

`NativeBridge.consumeRendererRecovery()`는 pending이 없으면 `null`을 반환한다. 있으면
`mode`, `occurredAt`, `count`, `didCrash`만 `JSONObject`로 반환하고 pending만 `false`로
바꾼다. 진단 원본 필드는 삭제하지 않는다.

```java
@JavascriptInterface
public String consumeRendererRecovery() {
    SharedPreferences prefs = rendererRecoveryPrefs();
    if (!prefs.getBoolean(KEY_PENDING, false)) return null;
    prefs.edit().putBoolean(KEY_PENDING, false).apply();
    try {
        return new JSONObject()
            .put("mode", prefs.getString(KEY_MODE, RendererRecoveryPolicy.MODE_RESTORE_ONCE))
            .put("occurredAt", prefs.getLong(KEY_LAST_EXIT_AT, 0L))
            .put("count", prefs.getInt(KEY_WINDOW_COUNT, 1))
            .put("didCrash", prefs.getBoolean(KEY_DID_CRASH, false))
            .toString();
    } catch (JSONException error) {
        Log.e(WEBVIEW_LOG_TAG, "renderer_recovery_json_failed", error);
        return null;
    }
}
```

- [ ] **Step 4: Activity 종료 시 pending 네트워크 재시도 콜백 정리**

```java
@Override
public void onDestroy() {
    retryHandler.removeCallbacksAndMessages(null);
    super.onDestroy();
}
```

- [ ] **Step 5: Android 정책 회귀와 Java 컴파일 확인**

Run: `cd android; .\gradlew.bat :app:testDebugUnitTest :app:compileDebugJavaWithJavac`

Expected: BUILD SUCCESSFUL; Task 1 tests PASS; `MainActivity` compiles against API 26+.

- [ ] **Step 6: 네이티브 처리 커밋**

```powershell
git add android/app/src/main/java/app/helssu/twa/MainActivity.java
git commit -m "fix(android): recover terminated WebView renderer"
```

### Task 4: RouteKeeper 안전 홈과 복구 안내

**Files:**
- Modify: `src/app/_route-keeper.tsx`

**Interfaces:**
- Consumes: Task 2의 `parseRendererRecovery`, `decideRendererRecovery`; Task 3의 `consumeRendererRecovery` 브리지.
- Produces: renderer 종료 후 한 번의 경로 결정, localStorage 정리, 6초 `role="status"` 안내.

- [ ] **Step 1: 네이티브 브리지 읽기와 첫 저장 건너뛰기 추가**

`RouteKeeper`에 `notice` state와 `skipSave` ref를 추가한다. 최초 effect에서 브리지를
안전하게 호출하고 Task 2 함수를 사용한다. 목표 경로가 있으면 `skipSave.current = true`로
초기 `/` 저장이 기존 경로를 덮지 않게 한 뒤 `router.replace(targetPath)`를 호출한다.

```ts
type RecoveryBridge = { consumeRendererRecovery?: () => string | null };

function consumeNativeRecovery(): string | null {
  try {
    return (window as unknown as { HelssuNative?: RecoveryBridge })
      .HelssuNative?.consumeRendererRecovery?.() ?? null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: 안전 홈에서 마지막 경로 삭제 및 일반 저장 동작 유지**

```ts
const event = parseRendererRecovery(consumeNativeRecovery(), Date.now());
const decision = decideRendererRecovery(event, readSaved(), currentRoute(), Date.now());
if (decision.clearSavedRoute) localStorage.removeItem(KEY);
if (decision.notice) setNotice(decision.notice);
if (decision.targetPath) {
  skipSave.current = true;
  router.replace(decision.targetPath);
}
```

pathname 저장 effect 첫 줄에서 `skipSave.current`이면 값을 `false`로 바꾸고 return한다.
다음 pathname 변경에서는 정상적으로 새 경로를 저장한다.

- [ ] **Step 3: 6초 뒤 사라지는 접근 가능한 안내 렌더링**

```tsx
useEffect(() => {
  if (!notice) return;
  const timer = window.setTimeout(() => setNotice(null), 6_000);
  return () => window.clearTimeout(timer);
}, [notice]);

return notice ? (
  <div
    role="status"
    className="fixed inset-x-4 top-[calc(env(safe-area-inset-top)+1rem)] z-50 mx-auto max-w-md rounded-2xl bg-zinc-900/95 px-4 py-3 text-center text-sm font-bold text-white shadow-lg"
  >
    {notice}
  </div>
) : null;
```

- [ ] **Step 4: 웹 복구 정책과 기존 RouteKeeper 회귀 테스트 실행**

Run: `pnpm vitest run tests/be/logic/renderer-recovery.test.ts tests/be/logic/route-restore.test.ts tests/be/logic/is-native-app.test.ts`

Expected: all test files PASS.

- [ ] **Step 5: RouteKeeper 연동 커밋**

```powershell
git add src/app/_route-keeper.tsx
git commit -m "fix(app): stop renderer recovery route loops"
```

### Task 5: 전체 회귀 검증과 기기 검증 인계

**Files:**
- Modify only if verification exposes a defect in Tasks 1-4.

**Interfaces:**
- Consumes: Tasks 1-4의 Android와 웹 복구 흐름.
- Produces: 재현 가능한 자동 검증 결과와 실제 기기에서 실행할 logcat 절차.

- [ ] **Step 1: 전체 웹 테스트 실행**

Run: `pnpm test`

Expected: all configured Vitest tests PASS; configured skips only.

- [ ] **Step 2: 프로덕션 웹 빌드 실행**

Run: `pnpm build`

Expected: Next.js build exits 0. Google Fonts 다운로드가 샌드박스에서 차단되면 같은 명령을 네트워크 승인으로 다시 실행한다.

- [ ] **Step 3: Android 단위 테스트와 debug Java 컴파일 실행**

Run: `cd android; .\gradlew.bat :app:testDebugUnitTest :app:compileDebugJavaWithJavac`

Expected: BUILD SUCCESSFUL.

- [ ] **Step 4: 변경 범위와 공백 오류 확인**

Run: `git diff --check; git status --short; git diff --stat HEAD~4..HEAD`

Expected: whitespace errors 없음; `.playwright-mcp/` 외 예상하지 않은 파일 없음.

- [ ] **Step 5: 실제 기기 후속 검증 명령 기록**

기기가 준비되면 실제 종료 재현과 동시에 다음을 실행한다.

```text
adb logcat -v threadtime HelssuWebView:V chromium:V AndroidRuntime:E *:S
```

`didCrash`, `priority`, `count`, `path`를 실제 탭 이동 시각과 대조한다. 기기가 없으므로 이
단계는 미검증으로 보고하며 코드 완료 주장과 원인 확정 주장을 분리한다.

