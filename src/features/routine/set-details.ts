/**
 * 한 운동 안에서 세트마다 다른 무게·횟수를 표현한다 (드롭세트·피라미드 등).
 * routine_exercises / daily_plan / exercise_completions 의 set_details jsonb 컬럼에 저장.
 *
 * null 또는 빈 배열이면 "균일 세트" — 행의 sets × reps @ weight_kg 로 동작한다(하위호환).
 * 값이 있으면 배열 길이 = 세트 수, 각 원소가 그 세트의 무게·횟수.
 *
 * 서버(읽기·쓰기·히스토리)와 클라이언트(에디터·오늘 목록) 양쪽에서 쓰므로
 * server-only 의존성 없이 순수 함수만 둔다.
 */
export type SetDetail = { weightKg: number | null; reps: number };

/** jsonb(unknown) → SetDetail[]. 비어 있거나 형식이 틀리면 null(= 균일 모드). */
export function parseSetDetails(v: unknown): SetDetail[] | null {
  if (!Array.isArray(v) || v.length === 0) return null;
  const out: SetDetail[] = [];
  for (const raw of v) {
    if (typeof raw !== "object" || raw === null) return null;
    const r = raw as Record<string, unknown>;
    const reps = Number(r.reps);
    if (!Number.isInteger(reps) || reps < 1 || reps > 100) return null;
    let weightKg: number | null = null;
    if (r.weightKg !== null && r.weightKg !== undefined && r.weightKg !== "") {
      const w = Number(r.weightKg);
      if (!Number.isFinite(w) || w < 0 || w > 1000) return null;
      weightKg = w;
    }
    out.push({ weightKg, reps });
  }
  return out;
}

/** 저장 전 검증 — 1~20세트, 각 세트 reps 1~100, weight 는 null 또는 0~1000. */
export function isValidSetDetails(d: SetDetail[]): boolean {
  if (!Array.isArray(d) || d.length < 1 || d.length > 20) return false;
  return d.every(
    (s) =>
      Number.isInteger(s.reps) &&
      s.reps >= 1 &&
      s.reps <= 100 &&
      (s.weightKg === null ||
        (Number.isFinite(s.weightKg) &&
          s.weightKg >= 0 &&
          s.weightKg <= 1000)),
  );
}

/** 표시용 요약: "15kg×12 · 20kg×10 · 35kg×6" (맨몸 세트는 "맨몸×12"). */
export function summarizeSetDetails(d: SetDetail[]): string {
  return d
    .map((s) => `${s.weightKg !== null ? `${s.weightKg}kg` : "맨몸"}×${s.reps}회`)
    .join(" · ");
}

/**
 * set_details(세트별 무게·횟수)가 있으면 그 길이를 sets, 첫 세트를 대표
 * reps/weight_kg 로 환산해 DB 행 컬럼과 함께 저장할 값으로 만든다.
 * 칼로리 추정·구버전 표시는 sets/reps/weight_kg 를 그대로 쓰므로 동기화가 필요.
 */
export function toRowFields(it: {
  sets: number;
  reps: number;
  weightKg: number | null;
  setDetails?: SetDetail[] | null;
}): {
  sets: number;
  reps: number;
  weight_kg: number | null;
  set_details: SetDetail[] | null;
} {
  const sd = it.setDetails && it.setDetails.length > 0 ? it.setDetails : null;
  if (sd) {
    return {
      sets: sd.length,
      reps: sd[0].reps,
      weight_kg: sd[0].weightKg,
      set_details: sd,
    };
  }
  return {
    sets: it.sets,
    reps: it.reps,
    weight_kg: it.weightKg,
    set_details: null,
  };
}