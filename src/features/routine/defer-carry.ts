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
