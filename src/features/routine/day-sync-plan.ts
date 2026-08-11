/**
 * 일차별 day_index 동기화 '계획'(순수 함수 — server-only 아님 → 단위 테스트 가능).
 *
 * 루틴이 바뀌면 routine_exercises 의 day_index 가 새 루틴 일차와 어긋날 수 있다.
 * 이 모듈은 한 부위(focus)의 행들을 현재 루틴 일차에 맞추기 위한 '연산 목록'만
 * 계산한다(DB 접근 없음). 실제 적용(UPDATE/DELETE/INSERT)은 호출부가 한다.
 */

/** day_index NULL 을 내부 그룹 키로 표현 */
export const NULL_DAY_KEY = -1;

export type DaySyncOp =
  | { type: "move"; from: number; to: number } // from 일차의 행을 to 일차로(UUID 보존)
  | { type: "delete"; from: number } // from 일차의 행 삭제
  | { type: "copy"; from: number; to: number }; // from 일차의 행을 to 일차로 복제

export type RoutineSlotShape = {
  dayIndex: number;
  focus: string;
  blockIds: string[];
  isSide: boolean;
};

export type RoutineSlotRemapOp = {
  focus: string;
  from: number;
  /** null이면 새 루틴의 같은 focus에 대응 슬롯이 없어 기존 묶음을 제거한다. */
  to: number | null;
};

export type RoutineExerciseSyncRow = {
  id: string;
  dayIndex: number | null;
  focus: string;
  position: number;
  exerciseId: string;
  equipment: string;
  sets: number;
  reps: number;
  weightKg: number | null;
  setDetails: unknown;
  memo: unknown;
};

export type RoutineExerciseSyncInsertRow = Omit<
  RoutineExerciseSyncRow,
  "id" | "dayIndex"
> & { dayIndex: number };

export type RoutineExerciseDaySyncMutation = {
  updates: { id: string; dayIndex: number }[];
  deleteIds: string[];
  insertRows: RoutineExerciseSyncInsertRow[];
};

/** 주/보조와 세부 블록을 합친 슬롯 정체성. */
export function routineSlotRole(slot: RoutineSlotShape): string {
  return `${slot.isSide ? "side" : "main"}:${slot.blockIds.join("+")}`;
}

/**
 * 루틴 변경 전후의 같은 의미 슬롯을 짝지어 기존 운동 묶음의 이동 계획을 만든다.
 * 이두와 삼두는 저장 focus가 모두 arm이라 day_index만 맞추면 서로 뒤바뀔 수 있다.
 */
export function planRoutineSlotRemap(
  previous: RoutineSlotShape[],
  next: RoutineSlotShape[],
): RoutineSlotRemapOp[] {
  const nextByFocus = new Map<string, RoutineSlotShape[]>();
  const availableByRole = new Map<string, RoutineSlotShape[]>();
  for (const slot of next) {
    const focusSlots = nextByFocus.get(slot.focus) ?? [];
    focusSlots.push(slot);
    nextByFocus.set(slot.focus, focusSlots);

    const key = `${slot.focus}:${routineSlotRole(slot)}`;
    const sameRole = availableByRole.get(key) ?? [];
    sameRole.push(slot);
    availableByRole.set(key, sameRole);
  }

  const ops: RoutineSlotRemapOp[] = [];
  for (const slot of previous) {
    // 새 루틴이 이 focus를 전혀 안 쓰면 기존 정책대로 숨겨 둔다.
    if (!nextByFocus.has(slot.focus)) continue;
    const key = `${slot.focus}:${routineSlotRole(slot)}`;
    const matches = availableByRole.get(key) ?? [];
    const target = matches.shift();
    if (target) {
      if (target.dayIndex !== slot.dayIndex) {
        ops.push({
          focus: slot.focus,
          from: slot.dayIndex,
          to: target.dayIndex,
        });
      }
    } else {
      ops.push({ focus: slot.focus, from: slot.dayIndex, to: null });
    }
  }
  return ops;
}

/**
 * 한 부위의 일차 동기화 연산을 만든다.
 *
 * @param presentDays 이 부위 행이 존재하는 day_index 목록(중복 없음, NULL 은 NULL_DAY_KEY)
 * @param target      이 부위를 쓰는 일차(오름차순, NULL 없음)
 * @param slotRole    target 일차의 호환 역할. 주/보조뿐 아니라 이두/삼두 같은
 *                    세부 블록 정체성까지 포함할 수 있다.
 *
 * 규칙:
 *  1) target 이 아닌 일차(드리프트/legacy NULL)의 행은 비어 있는 target 으로 **이동**
 *     (UUID 보존 → 완료기록·편집 유지). 짝지을 빈 target 이 없으면 **삭제**(중복).
 *  2) 그래도 비어 있는 target 은 **같은 역할(주/보조)** 의 채워진 target 에서만 **복사**.
 *     본↔보조 교차 복사는 금지한다 — 1일차 보조에 2일차 본운동이 복제되어 본/보조가
 *     뒤바뀌어 보이던 버그 방지. (PPL×2 처럼 같은 역할로 반복되는 일차는 그대로 복사.)
 */
export function planFocusDaySync(
  presentDays: number[],
  target: number[],
  slotRole: (day: number) => string | boolean,
): DaySyncOp[] {
  const ops: DaySyncOp[] = [];
  if (target.length === 0) return ops;

  const targetSet = new Set(target);
  const present = new Set(presentDays);
  const orphans = presentDays.filter((d) => !targetSet.has(d));
  const emptyTargets = target.filter((d) => !present.has(d));
  // 이미 행이 있는 target + 이번에 이동으로 채워질 target 을 추적(복사 소스 후보).
  const filled = new Set(presentDays.filter((d) => targetSet.has(d)));

  // 1) 드리프트 행 → 빈 target 으로 이동
  let oi = 0;
  let ti = 0;
  for (; oi < orphans.length && ti < emptyTargets.length; oi++, ti++) {
    ops.push({ type: "move", from: orphans[oi], to: emptyTargets[ti] });
    filled.add(emptyTargets[ti]);
  }
  // 2) 남은 드리프트 행 → 삭제
  for (; oi < orphans.length; oi++) {
    ops.push({ type: "delete", from: orphans[oi] });
  }
  // 3) 아직 빈 target → 같은 역할의 채워진 target 에서만 복사
  const stillEmpty = emptyTargets.slice(ti);
  for (const t of stillEmpty) {
    const canon = target.find(
      (d) => d !== t && filled.has(d) && slotRole(d) === slotRole(t),
    );
    if (canon !== undefined) ops.push({ type: "copy", from: canon, to: t });
    // 같은 역할의 채워진 일차가 없으면 비워 둔다(사용자가 직접 등록).
  }
  return ops;
}

export function planRoutineExerciseDaySync({
  rows,
  nextSlots,
  previousSlots = [],
  initialUpdates = [],
}: {
  rows: RoutineExerciseSyncRow[];
  nextSlots: RoutineSlotShape[];
  previousSlots?: RoutineSlotShape[];
  initialUpdates?: { id: string; dayIndex: number }[];
}): RoutineExerciseDaySyncMutation {
  const original = rows.map((row) => ({ ...row }));
  const working = new Map(original.map((row) => [row.id, { ...row }]));

  for (const update of initialUpdates) {
    const row = working.get(update.id);
    if (row) row.dayIndex = update.dayIndex;
  }

  if (previousSlots.length > 0) {
    const snapshot = [...working.values()].map((row) => ({ ...row }));
    for (const op of planRoutineSlotRemap(previousSlots, nextSlots)) {
      const matching = snapshot.filter(
        (row) => row.focus === op.focus && row.dayIndex === op.from,
      );
      for (const row of matching) {
        if (op.to === null) working.delete(row.id);
        else {
          const current = working.get(row.id);
          if (current) current.dayIndex = op.to;
        }
      }
    }
  }

  const targetDays = new Map<string, number[]>();
  const roleByFocusDay = new Map<string, string>();
  for (const slot of nextSlots) {
    const days = targetDays.get(slot.focus) ?? [];
    if (!days.includes(slot.dayIndex)) days.push(slot.dayIndex);
    targetDays.set(slot.focus, days);
    roleByFocusDay.set(
      `${slot.focus}:${slot.dayIndex}`,
      routineSlotRole(slot),
    );
  }
  for (const days of targetDays.values()) days.sort((a, b) => a - b);

  const insertRows: RoutineExerciseSyncInsertRow[] = [];
  const focuses = new Set([...working.values()].map((row) => row.focus));
  for (const focus of focuses) {
    const target = targetDays.get(focus) ?? [];
    const focusRows = () =>
      [...working.values()].filter((row) => row.focus === focus);

    if (target.length === 0) {
      for (const row of focusRows()) {
        if (row.dayIndex === null) row.dayIndex = 0;
      }
      continue;
    }

    const byDay = new Map<number, RoutineExerciseSyncRow[]>();
    for (const row of focusRows()) {
      const day = row.dayIndex ?? NULL_DAY_KEY;
      const grouped = byDay.get(day) ?? [];
      grouped.push(row);
      byDay.set(day, grouped);
    }
    const slotRole = (day: number) =>
      roleByFocusDay.get(`${focus}:${day}`) ?? "unknown";

    for (const op of planFocusDaySync([...byDay.keys()], target, slotRole)) {
      const source = byDay.get(op.from) ?? [];
      if (op.type === "move") {
        for (const row of source) row.dayIndex = op.to;
        byDay.set(op.to, source);
        byDay.delete(op.from);
      } else if (op.type === "delete") {
        for (const row of source) working.delete(row.id);
        byDay.delete(op.from);
      } else {
        insertRows.push(
          ...source.map((row) => ({
            dayIndex: op.to,
            focus: row.focus,
            position: row.position,
            exerciseId: row.exerciseId,
            equipment: row.equipment,
            sets: row.sets,
            reps: row.reps,
            weightKg: row.weightKg,
            setDetails: row.setDetails,
            memo: row.memo,
          })),
        );
      }
    }
  }

  return {
    updates: original.flatMap((row) => {
      const current = working.get(row.id);
      return current && current.dayIndex !== row.dayIndex && current.dayIndex !== null
        ? [{ id: row.id, dayIndex: current.dayIndex }]
        : [];
    }),
    deleteIds: original
      .filter((row) => !working.has(row.id))
      .map((row) => row.id),
    insertRows,
  };
}
