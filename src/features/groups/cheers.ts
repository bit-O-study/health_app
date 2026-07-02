/** 그룹 응원 문구 — 순수 로직(검증·집계). 테스트 가능. 최대 10자. */

export const CHEER_MAX = 10;

/** 공백 정리 + 앞뒤 트림 + 10자 컷. */
export function normalizeCheer(msg: string): string {
  return msg.replace(/\s+/g, " ").trim().slice(0, CHEER_MAX);
}

export function isValidCheer(msg: string): boolean {
  const m = normalizeCheer(msg);
  return m.length >= 1 && m.length <= CHEER_MAX;
}

export type CheerRow = { toUser: string; fromUser: string; message: string };
export type CheerItem = { fromUser: string; message: string; mine: boolean };

/** 응원 문구를 대상자별로 묶는다. 내 응원(mine)을 맨 앞으로 정렬(수정 편의). */
export function cheersByTarget(
  rows: CheerRow[],
  meId: string,
): Map<string, CheerItem[]> {
  const out = new Map<string, CheerItem[]>();
  for (const r of rows) {
    const list = out.get(r.toUser) ?? [];
    list.push({
      fromUser: r.fromUser,
      message: r.message,
      mine: r.fromUser === meId,
    });
    out.set(r.toUser, list);
  }
  for (const [, list] of out) list.sort((a, b) => Number(b.mine) - Number(a.mine));
  return out;
}
