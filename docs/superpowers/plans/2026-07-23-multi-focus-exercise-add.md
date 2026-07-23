# 복합 부위 운동 추가 선택 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 어깨+이두처럼 한 일차에 여러 부위가 배정된 경우, 운동 추가 전에 대상 부위를 선택하게 하고 선택한 부위의 운동 목록과 행에 정확히 추가한다.

**Architecture:** 기존 `PlanEditor`의 `FocusData` 단위를 그대로 유지한다. 단일 부위 일차는 현재처럼 즉시 추가하고, 복합 부위 일차만 인라인 선택 메뉴를 연다. 대상 결정 규칙은 기존 순수 로직 모듈에 작은 함수로 두어 단위 테스트하고, 실제 화면 흐름은 Playwright로 검증한다.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind CSS, Vitest, Playwright

## Global Constraints

- 기존 저장 형식과 DB 스키마는 변경하지 않는다.
- 선택지는 해당 일차의 `day.focuses`만 사용한다. 다른 부위나 전체 운동 타입으로 확장하지 않는다.
- 단일 부위 일차의 `운동 추가` 동작은 한 번의 클릭으로 유지한다.
- 복합 부위에서는 첫 번째/메인 부위로 자동 귀속하지 않는다.
- 선택 후에는 기존 `addRow(focus)` 경로를 사용해 슬롯별 운동 필터를 그대로 보존한다.
- 이 작업과 무관한 편집 화면 구조나 스타일은 리팩터링하지 않는다.

---

## File Map

- Modify: `src/features/routine/plan-order.ts`
  - 단일/복합 일차의 운동 추가 대상을 결정하는 순수 함수 `resolvePlanAddTarget`을 추가한다.
- Modify: `tests/be/logic/plan-order.test.ts`
  - 첫 부위 자동 선택 방지, 명시적 부위 선택, 단일 부위 즉시 선택 규칙을 단위 테스트한다.
- Modify: `src/features/routine/components/plan-editor.tsx`
  - 복합 일차 선택 메뉴 상태와 이벤트를 추가하고, 선택한 `FocusData`로 기존 `addRow`를 호출한다.
  - Playwright가 정확한 일차와 슬롯 행을 검증할 수 있도록 최소한의 안정적인 식별자를 추가한다.
- Create: `tests/e2e/plan-editor-multi-focus-add.spec.ts`
  - 어깨+이두 일차에서 이두를 골랐을 때 이두 슬롯에만 행이 생기는 회귀 테스트를 추가한다.

---

### Task 1: 운동 추가 대상 결정 규칙을 순수 로직으로 고정

**Files:**

- Modify: `tests/be/logic/plan-order.test.ts`
- Modify: `src/features/routine/plan-order.ts`

- [ ] **Step 1: 실패하는 단위 테스트 작성**

`tests/be/logic/plan-order.test.ts`에서 `resolvePlanAddTarget`을 import하고 다음 케이스를 추가한다.

```ts
describe("resolvePlanAddTarget — 복합 일차 운동 추가 대상", () => {
  const shoulder = { key: "0:shoulder", label: "어깨" };
  const arm = { key: "0:arm", label: "이두" };

  it("복합 일차는 요청 전 첫 슬롯으로 자동 귀속하지 않는다", () => {
    expect(resolvePlanAddTarget([shoulder, arm])).toBeNull();
  });

  it("사용자가 고른 슬롯을 반환한다", () => {
    expect(resolvePlanAddTarget([shoulder, arm], "0:arm")).toBe(arm);
  });

  it("단일 일차는 선택 메뉴 없이 즉시 추가할 슬롯을 반환한다", () => {
    expect(resolvePlanAddTarget([shoulder])).toBe(shoulder);
  });

  it("없는 슬롯 키는 추가 대상으로 사용하지 않는다", () => {
    expect(resolvePlanAddTarget([shoulder, arm], "0:back")).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트가 올바른 이유로 실패하는지 확인**

Run:

```bash
pnpm exec vitest run tests/be/logic/plan-order.test.ts
```

Expected: `resolvePlanAddTarget` export가 아직 없어 import/호출 단계에서 FAIL.

- [ ] **Step 3: 최소 구현 추가**

`src/features/routine/plan-order.ts`에 다음 함수를 추가한다.

```ts
export function resolvePlanAddTarget<T extends { key: string }>(
  focuses: readonly T[],
  requestedKey?: string,
): T | null {
  if (requestedKey !== undefined) {
    return focuses.find((focus) => focus.key === requestedKey) ?? null;
  }

  return focuses.length === 1 ? focuses[0] : null;
}
```

이 함수는 복합 일차에서 대상을 임의로 고르지 않고, 사용자가 고른 키가 실제 슬롯에 있을 때만 반환한다.

- [ ] **Step 4: 단위 테스트 통과 확인**

Run:

```bash
pnpm exec vitest run tests/be/logic/plan-order.test.ts
```

Expected: 해당 파일의 모든 테스트 PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/features/routine/plan-order.ts tests/be/logic/plan-order.test.ts
git commit -m "fix: 복합 일차 운동 추가 대상 규칙 고정"
```

---

### Task 2: 복합 일차에서 부위를 먼저 선택하는 UI 구현

**Files:**

- Modify: `src/features/routine/components/plan-editor.tsx`
- Create: `tests/e2e/plan-editor-multi-focus-add.spec.ts`

- [ ] **Step 1: 실패하는 화면 회귀 테스트 작성**

`tests/e2e/plan-editor-multi-focus-add.spec.ts`를 다음 내용으로 추가한다. 기존 `signUpAndOnboard`, `dbQuery`, `hasDb` 헬퍼를 사용하고, `public.user_routines`의 커스텀 주간 루틴을 직접 설정한다.

```ts
import { expect, test } from "@playwright/test";

import { signUpAndOnboard } from "./helpers/auth";
import { dbQuery, hasDb } from "./helpers/db";

const restOfWeek = [
  ["rest"],
  ["rest"],
  ["rest"],
  ["rest"],
  ["rest"],
  ["rest"],
];

async function setCustomWeek(email: string, firstDay: string[]) {
  await dbQuery(
    `update public.user_routines
        set splits=0, variant_id='custom', custom_week=$2::jsonb,
            start_date=(now() at time zone 'Asia/Seoul')::date,
            rest_date=null, override_date=null, override_block=null
      where user_id=(select id from auth.users where lower(email)=lower($1))`,
    [email, JSON.stringify([firstDay, ...restOfWeek])],
  );
}

test("복합 일차는 선택한 이두 슬롯에 운동 행을 추가한다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");

  const email = await signUpAndOnboard(page);
  await setCustomWeek(email, ["shoulder", "biceps"]);

  await page.goto("/plan", { waitUntil: "networkidle" });

  const day = page.locator('[data-plan-day-index="0"]');
  await day.getByRole("button", { name: "운동 추가" }).click();

  const chooser = day.getByRole("group", {
    name: "1일차 추가할 부위",
  });
  await expect(chooser).toBeVisible();

  await chooser.getByRole("button", { name: "이두 운동 추가" }).click();

  await expect(chooser).toHaveCount(0);
  await expect(day.getByTestId("plan-row-0:arm-0")).toBeVisible();
  await expect(day.getByTestId("plan-row-0:shoulder-0")).toHaveCount(0);
});

test("단일 부위 일차는 선택 메뉴 없이 바로 운동 행을 추가한다", async ({
  page,
}) => {
  test.skip(!hasDb, "needs .env.test.local DB creds");

  const email = await signUpAndOnboard(page);
  await setCustomWeek(email, ["biceps"]);

  await page.goto("/plan", { waitUntil: "networkidle" });

  const day = page.locator('[data-plan-day-index="0"]');
  await day.getByRole("button", { name: "운동 추가" }).click();

  await expect(
    day.getByRole("group", { name: "1일차 추가할 부위" }),
  ).toHaveCount(0);
  await expect(day.getByTestId("plan-row-0:arm-0")).toBeVisible();
});
```

- [ ] **Step 2: DB 사용 가능 환경에서 테스트가 실패하는지 확인**

Run:

```bash
pnpm exec playwright test tests/e2e/plan-editor-multi-focus-add.spec.ts --project=mobile-chromium
```

Expected before implementation: 첫 테스트가 `1일차 추가할 부위` 그룹을 찾지 못해 FAIL. 두 번째 테스트는 새 식별자가 아직 없어 FAIL.

`hasDb=false`라서 SKIP되면 환경 제약을 기록하고, 완료 주장 전에는 DB가 연결된 CI 또는 로컬 환경에서 같은 명령의 PASS 결과를 확보한다.

- [ ] **Step 3: 선택 메뉴 상태와 대상 선택 핸들러 추가**

`src/features/routine/components/plan-editor.tsx`에서 `resolvePlanAddTarget`을 import하고 선택 메뉴가 열린 일차를 저장한다.

```ts
const [addTargetDayIndex, setAddTargetDayIndex] = useState<number | null>(
  null,
);
```

기존 `addRowDay`를 다음 두 핸들러로 교체한다.

```ts
function requestAddRow(day: DayGroup) {
  const target = resolvePlanAddTarget(day.focuses);
  if (target) {
    addRow(target);
    return;
  }

  setAddTargetDayIndex((current) =>
    current === day.dayIndex ? null : day.dayIndex,
  );
}

function addRowToFocus(day: DayGroup, focusKey: string) {
  const target = resolvePlanAddTarget(day.focuses, focusKey);
  if (!target) return;

  addRow(target);
  setAddTargetDayIndex(null);
}
```

`운동 추가` 버튼은 `requestAddRow(day)`를 호출한다. 따라서:

- 단일 부위: 즉시 기존 `addRow` 실행
- 복합 부위: 첫 클릭으로 선택 메뉴 토글
- 선택 완료: 해당 슬롯에 행 추가 후 메뉴 닫힘

- [ ] **Step 4: 복합 일차 인라인 부위 선택 메뉴 렌더링**

각 일차 카드의 기존 `운동 추가` 버튼 아래, `addTargetDayIndex === day.dayIndex`일 때만 다음 구조를 렌더링한다.

```tsx
<div
  role="group"
  aria-label={`${day.dayIndex + 1}일차 추가할 부위`}
  className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-2 dark:border-zinc-700 dark:bg-zinc-900/50"
>
  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
    추가할 부위
  </span>
  {day.focuses.map((focus) => {
    const name = focusName(focus.label);

    return (
      <button
        key={focus.key}
        type="button"
        aria-label={`${name} 운동 추가`}
        onClick={() => addRowToFocus(day, focus.key)}
        className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
      >
        {name}
        {focus.isSide ? (
          <span className="ml-1 text-zinc-400">보조</span>
        ) : null}
      </button>
    );
  })}
</div>
```

프로젝트의 현재 색상/간격 클래스가 다르면 인접 버튼 스타일을 재사용한다. 접근 가능한 이름과 동작은 위 구조를 유지한다.

- [ ] **Step 5: 회귀 테스트용 최소 식별자 추가**

일차 래퍼에 일차 인덱스를 추가한다.

```tsx
<div
  key={`day-${day.dayIndex}`}
  data-plan-day-index={day.dayIndex}
  className="space-y-3"
>
```

각 운동 행 래퍼에 슬롯 키와 행 인덱스를 추가한다.

```tsx
data-testid={`plan-row-${f.key}-${idx}`}
```

이 식별자는 사용자에게 보이는 텍스트나 CSS 구조에 의존하지 않고, 선택한 슬롯에 행이 생성됐는지만 검증한다.

- [ ] **Step 6: 화면 회귀 테스트 통과 확인**

Run:

```bash
pnpm exec playwright test tests/e2e/plan-editor-multi-focus-add.spec.ts --project=mobile-chromium
```

Expected: 복합 부위 선택 1건과 단일 부위 즉시 추가 1건 모두 PASS. DB 미연결 환경에서는 SKIP이므로 DB 연결 환경의 PASS가 최종 완료 조건이다.

- [ ] **Step 7: 커밋**

```bash
git add src/features/routine/components/plan-editor.tsx tests/e2e/plan-editor-multi-focus-add.spec.ts
git commit -m "fix: 운동 추가 전 부위 선택 지원"
```

---

### Task 3: 전체 검증과 변경 범위 자체 검토

**Files:**

- Review: `src/features/routine/plan-order.ts`
- Review: `src/features/routine/components/plan-editor.tsx`
- Review: `tests/be/logic/plan-order.test.ts`
- Review: `tests/e2e/plan-editor-multi-focus-add.spec.ts`

- [ ] **Step 1: 변경 파일 린트**

Run:

```bash
pnpm exec eslint src/features/routine/plan-order.ts src/features/routine/components/plan-editor.tsx tests/be/logic/plan-order.test.ts tests/e2e/plan-editor-multi-focus-add.spec.ts
```

Expected: 새 error 없음. 기존 warning이 출력되면 이번 변경과의 관련 여부를 구분해 기록한다.

- [ ] **Step 2: 전체 Vitest 회귀 검사**

Run:

```bash
pnpm test
```

Expected: 기존 테스트와 새 `resolvePlanAddTarget` 테스트 모두 PASS.

- [ ] **Step 3: TypeScript 검사**

Run:

```bash
pnpm exec tsc --noEmit
```

Expected: 이번 변경에서 발생한 새 오류 없음. 현재 알려진 `.next/dev/types/app/icon-192.png/route.ts`의 `contentType` 오류만 남는다면 기존 오류로 명시한다.

- [ ] **Step 4: 패치 형식 및 범위 검사**

Run:

```bash
git diff --check HEAD~2
git diff --stat HEAD~2
git status --short
```

Expected:

- whitespace 오류 없음
- 변경이 File Map의 네 파일로 제한됨
- 테스트 코드나 구현 코드에 placeholder 주석, 임시 분기, 비어 있는 콜백이 없음

- [ ] **Step 5: 요구사항 대조 자체 검토**

다음을 코드와 테스트에서 한 항목씩 확인한다.

- 복합 일차의 첫 부위가 자동 선택되지 않는다.
- 어깨+이두에서 이두 선택 시 `0:arm` 슬롯에만 행이 생긴다.
- 새 행의 운동 옵션은 기존 `allExercisesForSlot(f.focus, f.blockIds)`를 그대로 사용한다.
- 단일 부위 일차는 선택 UI 없이 한 번의 클릭으로 추가된다.
- 선택 메뉴의 버튼 이름이 스크린리더와 Playwright에서 구분 가능하다.
- DB 스키마와 저장 payload는 변경되지 않았다.

- [ ] **Step 6: 필요 시 최종 정리 커밋**

검증 과정에서 이 작업 범위 안의 수정이 추가됐을 때만 실행한다.

```bash
git add src/features/routine/plan-order.ts src/features/routine/components/plan-editor.tsx tests/be/logic/plan-order.test.ts tests/e2e/plan-editor-multi-focus-add.spec.ts
git commit -m "test: 복합 부위 운동 추가 회귀 검증"
```
