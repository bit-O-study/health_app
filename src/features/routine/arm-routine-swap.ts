import {
  DAY_BLOCKS,
  isDayBlockId,
  type DayBlockId,
  type FocusKey,
} from "@/features/routine/data";

export type ArmSwapFailureReason =
  | "invalid-week"
  | "invalid-day"
  | "same-day"
  | "missing-arm"
  | "day-limit";

export type ArmSwapPreview =
  | { ok: true; nextWeek: DayBlockId[][] }
  | { ok: false; reason: ArmSwapFailureReason };

export function isArmBlockId(blockId: DayBlockId): boolean {
  return DAY_BLOCKS[blockId].day.tone === "arm";
}

function replaceArmBlocks(
  day: readonly DayBlockId[],
  incoming: readonly DayBlockId[],
): DayBlockId[] {
  const firstArm = day.findIndex(isArmBlockId);
  const next = day.filter((blockId) => !isArmBlockId(blockId));
  next.splice(firstArm, 0, ...incoming);
  return next;
}

export function normalizeArmSwapWeek(rawWeek: unknown): DayBlockId[][] | null {
  if (!Array.isArray(rawWeek) || rawWeek.length !== 7) return null;

  const week: DayBlockId[][] = [];
  for (const rawDay of rawWeek) {
    const day = Array.isArray(rawDay) ? rawDay : [rawDay];
    if (
      day.length < 1 ||
      day.length > 3 ||
      !day.every((blockId) => isDayBlockId(blockId))
    ) {
      return null;
    }
    week.push([...day]);
  }
  return week;
}

export function previewArmRoutineSwap(
  rawWeek: unknown,
  sourceDayIndex: number,
  targetDayIndex: number,
): ArmSwapPreview {
  const week = normalizeArmSwapWeek(rawWeek);
  if (!week) return { ok: false, reason: "invalid-week" };
  if (
    !Number.isInteger(sourceDayIndex) ||
    !Number.isInteger(targetDayIndex) ||
    sourceDayIndex < 0 ||
    sourceDayIndex > 6 ||
    targetDayIndex < 0 ||
    targetDayIndex > 6
  ) {
    return { ok: false, reason: "invalid-day" };
  }
  if (sourceDayIndex === targetDayIndex) {
    return { ok: false, reason: "same-day" };
  }

  const sourceArm = week[sourceDayIndex].filter(isArmBlockId);
  const targetArm = week[targetDayIndex].filter(isArmBlockId);
  if (sourceArm.length === 0 || targetArm.length === 0) {
    return { ok: false, reason: "missing-arm" };
  }

  const nextWeek = week.map((day) => [...day]);
  nextWeek[sourceDayIndex] = replaceArmBlocks(
    week[sourceDayIndex],
    targetArm,
  );
  nextWeek[targetDayIndex] = replaceArmBlocks(
    week[targetDayIndex],
    sourceArm,
  );
  if (
    nextWeek[sourceDayIndex].length > 3 ||
    nextWeek[targetDayIndex].length > 3
  ) {
    return { ok: false, reason: "day-limit" };
  }
  return { ok: true, nextWeek };
}

export function eligibleArmSwapTargets(
  week: unknown,
  sourceDayIndex: number,
): number[] {
  return Array.from({ length: 7 }, (_, dayIndex) => dayIndex).filter(
    (targetDayIndex) =>
      previewArmRoutineSwap(week, sourceDayIndex, targetDayIndex).ok,
  );
}

export function planFocusDisplayName(
  focus: FocusKey,
  label: string,
): string {
  if (focus === "arm") return "팔";
  return label.split(" · ").pop() ?? label;
}

export function armSwapRpcErrorMessage(message: string): string {
  if (message.includes("STALE_ROUTINE")) {
    return "루틴이 다른 곳에서 변경되었습니다. 새로고침 후 다시 시도해주세요.";
  }
  if (message.includes("AUTH_REQUIRED")) return "로그인이 필요합니다.";
  if (message.includes("ARM_SLOT_NOT_FOUND")) {
    return "교환할 팔 루틴을 찾을 수 없습니다.";
  }
  if (message.includes("DAY_BLOCK_LIMIT")) {
    return "하루에는 최대 3개 부위까지만 설정할 수 있습니다.";
  }
  return "팔 루틴 교환에 실패했습니다.";
}
