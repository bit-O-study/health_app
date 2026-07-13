/**
 * '오늘만 변경' 로컬 이월 순수 로직 — 의존성 없는 계산(테스트 공용).
 *
 * "운동 전체 바꾸기 / 직접 담기" 를 누르면 오늘 원래 루틴 운동을 내일로 이월한다.
 * start_date 를 건드리지 않고 '내일 daily 오버라이드' 로만 옮겨, 전체 루틴이
 * 하루씩 밀리는(드리프트) 문제 없이 오늘 하루만 비운다.
 */

export type CondItem = {
  itemId: string;
  durationMin: number | null;
  speed: number | null;
  incline: number | null;
  sets: number | null;
  reps: number | null;
};

/**
 * 오늘 전 부위(tone)별 워밍업/마무리를 합집합으로 합친다(itemId 중복 제거, 등장 순서 유지).
 * 여러 부위가 같은 워밍업(예: 트레드밀)을 쓰면 한 번만 이월되게.
 */
export function conditioningUnion(
  perTone: { warmup: CondItem[]; cooldown: CondItem[] }[],
): { warmup: CondItem[]; cooldown: CondItem[] } {
  const pick = (kind: "warmup" | "cooldown"): CondItem[] => {
    const seen = new Set<string>();
    const out: CondItem[] = [];
    for (const t of perTone) {
      for (const it of t[kind]) {
        if (seen.has(it.itemId)) continue;
        seen.add(it.itemId);
        out.push(it);
      }
    }
    return out;
  };
  return { warmup: pick("warmup"), cooldown: pick("cooldown") };
}

/**
 * 오늘 실제로 보여줄 부위(focus) 목록 = 루틴 부위 ∪ daily_plan(오늘만 변경) 부위.
 * 합집합·등장 순서 유지·중복 제거. "rest" 는 제외.
 *
 * ⚠ 예전엔 daily_plan 부위가 있으면 루틴 부위를 통째로 '대체'했는데, '부위 추가' 시
 * 원래 부위를 daily_plan 으로 다 옮기지 못하면(부위에 운동이 없거나 일차 불일치 등)
 * 그 부위가 사라졌다. '부위 전체 바꾸기(replace)'는 오늘을 defer 해 routineFocuses 가
 * 이미 [] 이므로, 합집합이라도 replace 의미(선택 부위만 표시)는 그대로 유지된다.
 */
/**
 * '오늘만 변경(전체 바꾸기/직접 담기)'로 루틴을 하루 밀 때, start_date 를 +1 할지 여부.
 * 오늘 이미 밀렸으면(last_deferred_date === today) 다시 밀지 않는다 — 같은 날 재호출 시
 * 이중 밀기(원래 운동이 모레로 더 밀려 하루가 빔)를 막는다.
 */
export function shouldAdvanceStartDate(
  lastDeferredDate: string | null,
  today: string,
): boolean {
  return lastDeferredDate !== today;
}

export function todayFocuses<T extends string>(
  routineFocuses: readonly T[],
  dailyFocuses: readonly T[],
): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const f of [...routineFocuses, ...dailyFocuses]) {
    if (f === "rest" || seen.has(f)) continue;
    seen.add(f);
    out.push(f);
  }
  return out;
}
