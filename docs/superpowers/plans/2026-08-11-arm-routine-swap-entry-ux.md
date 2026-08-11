# 팔 루틴 교환 진입 UX 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 운동 등록 화면의 일차별 팔 교환 버튼을 상단 단일 버튼과 순차 인라인 일차 선택 흐름으로 교체한다.

**Architecture:** 기존 `eligibleArmSwapTargets`, `requestArmSwap`, 확인 대화상자와 서버 액션을 그대로 재사용한다. `PlanEditor`에 선택 패널의 열림 상태만 추가하고, 첫 일차 선택은 기존 `swapSourceDayIndex`로 유지한다. 회귀 검증은 실제 사용자 흐름을 다루는 Playwright E2E를 갱신해 수행한다.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind CSS, Playwright

## Global Constraints

- `팔 루틴 교환` 진입 버튼은 운동 등록 화면 상단에 한 번만 표시한다.
- 인라인 패널에서 첫 번째 일차와 두 번째 일차를 순서대로 고른다.
- 기존 교환 가능 조건, 저장하지 않은 변경 차단, 확인 대화상자, 서버 요청 및 오류 처리는 그대로 유지한다.
- 팔 루틴 교환 규칙, 서버 RPC, 루틴 설정 화면과 주변 편집 기능은 변경하지 않는다.
- 교환 가능한 팔 일차 쌍이 없으면 진입 버튼을 표시하지 않는다.
- 운동 추가 대상 패널과 팔 루틴 교환 패널은 동시에 열지 않는다.

---

### Task 1: 단일 팔 루틴 교환 진입 흐름

**Files:**
- Modify: `tests/e2e/arm-routine-swap.spec.ts:225-240, 590-610, 775-790, 940-965`
- Modify: `src/features/routine/components/plan-editor.tsx:135-150, 375-430, 575-665`

**Interfaces:**
- Consumes: `eligibleArmSwapTargets(week: unknown, sourceDayIndex: number): number[]`
- Consumes: `requestArmSwap(sourceDayIndex: number, targetDayIndex: number): void`
- Produces: 단일 `data-testid="arm-swap-button"` 진입 버튼
- Produces: 접근성 이름이 `팔 루틴 교환 첫 번째 일차`, `팔 루틴 교환 두 번째 일차`인 선택 그룹
- Produces: 첫 일차 칩의 `aria-pressed` 선택 상태

- [ ] **Step 1: E2E 진입 헬퍼를 새 흐름으로 바꿔 실패 테스트 작성**

`tests/e2e/arm-routine-swap.spec.ts`의 `chooseDayOneAsSwapTarget`을 다음 흐름으로 변경한다. 첫 일차 이름은 레거시 문자열 주간에서도 동작하도록 정규식으로 찾는다.

```ts
async function chooseDayOneAsSwapTarget(
  page: Page,
  targetName = "2일차 · 어깨 + 팔",
) {
  const swapButton = page.getByTestId("arm-swap-button");
  await expect(swapButton).toHaveCount(1);
  await swapButton.click();

  const sources = page.getByRole("group", {
    name: "팔 루틴 교환 첫 번째 일차",
  });
  const source = sources.getByRole("button", { name: /^1일차 ·/ });
  await source.click();
  await expect(source).toHaveAttribute("aria-pressed", "true");

  const targets = page.getByRole("group", {
    name: "팔 루틴 교환 두 번째 일차",
  });
  await targets.getByRole("button", { name: targetName }).click();
}
```

기존 `arm-swap-button-0` 비활성화 검증은 `arm-swap-button`으로 바꾼다. 손상된 주간 테스트의 두 개 일차별 부재 검증은 단일 버튼 부재 검증으로 바꾼다.

```ts
await expect(page.getByTestId("arm-swap-button")).toBeDisabled();

await expect(page.getByTestId("arm-swap-button")).toHaveCount(0);
```

첫 정상 교환 테스트에서 헬퍼 호출 전 단일 진입점과 일차 헤더의 중복 제거를 명시적으로 검증한다.

```ts
const swapButton = page.getByTestId("arm-swap-button");
await expect(swapButton).toHaveCount(1);
await expect(page.getByTestId(/arm-swap-button-/)).toHaveCount(0);

await swapButton.click();
const sourceGroup = page.getByRole("group", {
  name: "팔 루틴 교환 첫 번째 일차",
});
await expect(sourceGroup).toBeVisible();
await expect(
  page.getByRole("group", { name: "팔 루틴 교환 두 번째 일차" }),
).toHaveCount(0);

await day0.getByRole("button", { name: "운동 추가" }).click();
await expect(sourceGroup).toHaveCount(0);
await expect(
  day0.getByRole("group", { name: "1일차 추가할 부위" }),
).toBeVisible();

await swapButton.click();
await expect(
  day0.getByRole("group", { name: "1일차 추가할 부위" }),
).toHaveCount(0);
const source = sourceGroup.getByRole("button", { name: /^1일차 ·/ });
await source.click();
await expect(
  page.getByRole("group", { name: "팔 루틴 교환 두 번째 일차" }),
).toBeVisible();

await swapButton.click();
await expect(sourceGroup).toHaveCount(0);
await swapButton.click();
await expect(
  page.getByRole("group", { name: "팔 루틴 교환 두 번째 일차" }),
).toHaveCount(0);
await swapButton.click();
```

- [ ] **Step 2: 대표 E2E를 실행해 기존 UI에서 실패하는지 확인**

Run:

```bash
pnpm exec playwright test tests/e2e/arm-routine-swap.spec.ts \
  --grep "운동 등록에서 팔 루틴만 교환하고 관련 없는 데이터를 보존한다"
```

Expected: FAIL. `data-testid="arm-swap-button"`이 없어 개수를 1로 기대하는 검증이 실패한다.

- [ ] **Step 3: 선택 패널 열림 상태와 상단 후보 목록 계산 추가**

`PlanEditor` 상태에 패널 열림 여부를 추가한다.

```ts
const [swapPickerOpen, setSwapPickerOpen] = useState(false);
const [swapSourceDayIndex, setSwapSourceDayIndex] = useState<number | null>(
  null,
);
```

`days`, `swapTargetsForDay` 선언 다음에 첫 일차 후보를 계산한다.

```ts
const swapSourceDayIndexes = days
  .map((day) => day.dayIndex)
  .filter((dayIndex) => swapTargetsForDay(dayIndex).length > 0);
```

패널 토글과 첫 일차 선택 함수를 추가한다. 패널을 닫으면 선택을 초기화하고, 열 때 운동 추가 대상 패널을 닫는다.

```ts
function toggleArmSwapPicker() {
  setAddTargetDayIndex(null);
  if (swapPickerOpen) setSwapSourceDayIndex(null);
  setSwapPickerOpen(!swapPickerOpen);
}

function selectArmSwapSource(dayIndex: number) {
  setAddTargetDayIndex(null);
  setSwapSourceDayIndex(dayIndex);
}
```

`requestAddRow` 시작 부분에서는 교환 선택 패널을 닫아 두 패널이 동시에 열리지 않게 한다.

```ts
function requestAddRow(day: DayGroup) {
  setSwapPickerOpen(false);
  setSwapSourceDayIndex(null);
  const target = resolvePlanAddTarget(day.focuses);
  if (target) {
    addRow(target);
    return;
  }

  setAddTargetDayIndex((current) =>
    current === day.dayIndex ? null : day.dayIndex,
  );
}
```

`requestArmSwap`의 기존 `setSwapSourceDayIndex(null)`은 제거한다. 확인창 취소 뒤 첫 일차가 유지되어 다른 두 번째 일차를 선택할 수 있어야 한다.

- [ ] **Step 4: 일차별 버튼을 상단 단일 버튼과 인라인 선택 패널로 교체**

`또는 직접 등록` 행 오른쪽을 버튼 그룹으로 만들고, 후보가 있을 때만 단일 버튼을 렌더링한다.

```tsx
<div className="flex flex-wrap items-center gap-2">
  {swapSourceDayIndexes.length > 0 ? (
    <button
      type="button"
      data-testid="arm-swap-button"
      aria-expanded={swapPickerOpen}
      disabled={pending}
      onClick={toggleArmSwapPicker}
      className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-md border border-zinc-300 bg-white px-2.5 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
    >
      <ArrowLeftRight aria-hidden="true" size={14} />
      팔 루틴 교환
    </button>
  ) : null}
  <button
    type="button"
    data-testid="clear-all-exercises"
    disabled={pending}
    onClick={() => setConfirm({ kind: "clear-all" })}
    className="inline-flex h-8 items-center gap-1 whitespace-nowrap rounded-md border border-red-300 bg-white px-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:bg-zinc-800 dark:text-red-400 dark:hover:bg-red-950/40"
  >
    <Trash2 aria-hidden="true" size={14} />
    전체 운동 초기화
  </button>
</div>
```

작업 행 아래에 첫 번째 일차 그룹과 조건부 두 번째 일차 그룹을 렌더링한다. `dayName`을 사용해 기존 일차 이름 표기를 유지한다.

```tsx
{swapPickerOpen ? (
  <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/50">
    <div
      role="group"
      aria-label="팔 루틴 교환 첫 번째 일차"
      className="flex flex-wrap items-center gap-2"
    >
      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
        첫 번째 일차
      </span>
      {swapSourceDayIndexes.map((dayIndex) => {
        const day = days.find((candidate) => candidate.dayIndex === dayIndex);
        if (!day) return null;
        const selected = swapSourceDayIndex === dayIndex;
        return (
          <button
            key={dayIndex}
            type="button"
            aria-pressed={selected}
            disabled={pending}
            onClick={() => selectArmSwapSource(dayIndex)}
            className={
              selected
                ? "rounded-full border border-emerald-400 bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800 transition disabled:opacity-60 dark:border-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-300"
                : "rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
            }
          >
            {dayIndex + 1}일차 · {dayName(day)}
          </button>
        );
      })}
    </div>
    {swapSourceDayIndex !== null ? (
      <div
        role="group"
        aria-label="팔 루틴 교환 두 번째 일차"
        className="flex flex-wrap items-center gap-2"
      >
        <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
          두 번째 일차
        </span>
        {swapTargetsForDay(swapSourceDayIndex).map((targetDayIndex) => {
          const targetDay = days.find(
            (candidate) => candidate.dayIndex === targetDayIndex,
          );
          if (!targetDay) return null;
          const name = `${targetDayIndex + 1}일차 · ${dayName(targetDay)}`;
          return (
            <button
              key={targetDayIndex}
              type="button"
              aria-label={name}
              disabled={pending}
              onClick={() => requestArmSwap(swapSourceDayIndex, targetDayIndex)}
              className="rounded-full border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-60 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-emerald-700 dark:hover:bg-emerald-950/30"
            >
              {name}
            </button>
          );
        })}
      </div>
    ) : null}
  </div>
) : null}
```

`days.map` 내부 일차 헤더의 기존 교환 버튼과 대상 선택 그룹은 모두 삭제한다.

- [ ] **Step 5: 포맷 및 정적 검증 실행**

Run:

```bash
pnpm exec eslint src/features/routine/components/plan-editor.tsx \
  tests/e2e/arm-routine-swap.spec.ts
```

Expected: exit 0.

- [ ] **Step 6: 대표 E2E를 다시 실행해 통과 확인**

Run:

```bash
pnpm exec playwright test tests/e2e/arm-routine-swap.spec.ts \
  --grep "운동 등록에서 팔 루틴만 교환하고 관련 없는 데이터를 보존한다"
```

Expected: PASS. 상단 버튼이 하나만 보이고, 첫 일차와 두 번째 일차 선택 후 기존 교환 결과가 보존된다.

- [ ] **Step 7: 팔 교환 E2E 전체 회귀 실행**

Run:

```bash
pnpm exec playwright test tests/e2e/arm-routine-swap.spec.ts
```

Expected: 모든 테스트 PASS. DB 자격 증명이 없는 환경에서 명시적으로 skip된 테스트는 실패로 간주하지 않는다.

- [ ] **Step 8: 관련 단위 테스트와 타입 빌드 실행**

Run:

```bash
pnpm exec vitest run tests/be/logic/arm-routine-swap.test.ts
pnpm run build
```

Expected: 두 명령 모두 exit 0.

- [ ] **Step 9: 변경 파일만 커밋**

```bash
git add src/features/routine/components/plan-editor.tsx \
  tests/e2e/arm-routine-swap.spec.ts \
  docs/superpowers/plans/2026-08-11-arm-routine-swap-entry-ux.md
git commit -m "refactor(routine): 팔 교환 진입 UX 정리"
```
