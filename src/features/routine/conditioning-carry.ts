/**
 * 런닝 이어하기(2026-10-28) — 워밍업·마무리(트레드밀 런닝 등)를 지난번 실제 값으로 채운다.
 * 근력의 `prefillFromLast`(pyramid.ts)와 같은 역할. 설계: https://claude.ai/artifact/Q6xK7mJ8RFjjPStSsDmpE3
 *
 * 가져올 값 찾기: ① 같은 루틴 행(source_row_id = 이 행 id)의 마지막 완료 → 없으면 ② 같은 종류·항목
 * (예: 마무리 런닝)의 마지막 완료(런닝 모드 기록 포함) → 없으면 그대로(루틴 값·기본값).
 * 🔴 화면에 채워 보여 줄 뿐 routine_conditioning 은 바꾸지 않는다(원칙 #2). 순수 모듈.
 */

export type CondRecord = {
  forDate: string;
  kind: string;
  itemId: string;
  sourceRowId: string | null;
  durationMin: number | null;
  speed: number | null;
  incline: number | null;
};

export type CondValues = { durationMin: number | null; speed: number | null; incline: number | null };

export type CarryIndex = { bySource: Map<string, CondRecord>; byItem: Map<string, CondRecord> };

/** 1분 미만·속도 0 같은 기록은 '지난번'으로 쓰지 않는다(잘못 누름·중간에 그만둠). */
export function isUsableRecord(r: CondRecord): boolean {
  if (r.durationMin !== null && r.durationMin < 1) return false;
  if (r.speed !== null && r.speed <= 0) return false;
  return r.durationMin !== null || r.speed !== null || r.incline !== null;
}

/** 최근 것부터 정렬된 완료 기록 → 행별·항목별 가장 최근 1건. 오늘 기록은 빼고 부른다. */
export function buildCarryIndex(records: CondRecord[]): CarryIndex {
  const sorted = [...records].sort((a, b) => (a.forDate < b.forDate ? 1 : a.forDate > b.forDate ? -1 : 0));
  const bySource = new Map<string, CondRecord>();
  const byItem = new Map<string, CondRecord>();
  for (const r of sorted) {
    if (!isUsableRecord(r)) continue;
    if (r.sourceRowId && !bySource.has(r.sourceRowId)) bySource.set(r.sourceRowId, r);
    const key = `${r.kind}:${r.itemId}`;
    if (!byItem.has(key)) byItem.set(key, r);
  }
  return { bySource, byItem };
}

/**
 * 한 행을 지난번 값으로. params 는 그 항목이 쓰는 값(시간·속도·경사)만 — 기록에 없는 값은 행 값 유지.
 * 반환 carriedFrom 은 가져온 기록의 날짜(화면 배지 "지난번 그대로 · 10/21"), 안 가져왔으면 null.
 */
export function carryConditioning(
  row: { id: string; kind: string; itemId: string } & CondValues,
  params: readonly string[],
  index: CarryIndex,
): CondValues & { carriedFrom: string | null } {
  const last = index.bySource.get(row.id) ?? index.byItem.get(`${row.kind}:${row.itemId}`);
  const base = { durationMin: row.durationMin, speed: row.speed, incline: row.incline };
  if (!last) return { ...base, carriedFrom: null };
  const next = {
    durationMin: params.includes("duration") && last.durationMin !== null ? last.durationMin : base.durationMin,
    speed: params.includes("speed") && last.speed !== null ? last.speed : base.speed,
    incline: params.includes("incline") && last.incline !== null ? last.incline : base.incline,
  };
  // 값이 루틴 값과 같아도 배지를 단다 — 지난번 그대로 이어졌다는 걸 알 수 있게.
  return { ...next, carriedFrom: last.forDate };
}
