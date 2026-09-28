/** 오늘 부위 합집합과 컨디셔닝 중복 제거. 영구 루틴 일정은 변경하지 않는다. */

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
