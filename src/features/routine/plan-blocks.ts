/**
 * 선택한 블록(부위/세부근육) → 특정 부위에 해당하는 세부근육만 추리기 — 순수 모듈.
 *
 * "오늘만 운동 바꾸기"에서 고른 값(예: chest-upper, chest-lower, shoulder)은
 * 부위(tone)와 세부근육이 섞여 있다. 운동 목록을 좁힐 땐 **그 부위의 세부근육만**
 * 넘겨야 한다(부위 자체 id 는 '전체'라 필터가 아니다).
 */
import { DAY_BLOCKS, type DayBlockId } from "@/features/routine/data";

/** blocks 중 focus 부위에 속하는 **세부근육** id 만. 부위 전체(id === focus)는 제외. */
export function subBlocksForFocus(
  blocks: readonly string[] | undefined | null,
  focus: string,
): string[] {
  if (!blocks || blocks.length === 0) return [];
  return blocks.filter((b) => {
    if (b === focus) return false; // 부위 '전체' 는 필터가 아님
    const def = DAY_BLOCKS[b as DayBlockId];
    if (!def) return false;
    return def.day.tone === focus;
  });
}

/**
 * "오늘만 부위 추가"로 오늘 더한 블록 목록 — 날짜가 오늘일 때만 유효하다.
 * (내일이 되면 자동으로 빈 목록 → 다음 주기 루틴엔 영향 없음. 원칙 #2)
 */
export function todayAddedBlocks(
  todayYmd: string,
  addedDate: string | null | undefined,
  addedBlocks: string | null | undefined,
): DayBlockId[] {
  if (!addedDate || addedDate !== todayYmd || !addedBlocks) return [];
  return addedBlocks
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is DayBlockId => !!DAY_BLOCKS[s as DayBlockId] && s !== "rest");
}

/** 블록 목록 → 대분류(부위) 목록. 중복 제거, 휴식 제외. */
export function baseTonesOfBlocks(blocks: readonly string[]): string[] {
  const out: string[] = [];
  for (const b of blocks) {
    const def = DAY_BLOCKS[b as DayBlockId];
    if (!def) continue;
    const tone = def.day.tone;
    if (tone === "rest" || out.includes(tone)) continue;
    out.push(tone);
  }
  return out;
}
