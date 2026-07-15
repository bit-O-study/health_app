/**
 * 그룹 러닝 순위(오늘 누적 달린 거리) 순수 로직 — server-only 없음(단위 테스트 가능).
 *
 * 표시 규칙(요청):
 *  - 최대 상위 4위까지 보여주고, 5번째 줄은 '내 순위'(내가 몇 등·몇 m).
 *  - 내가 4등 이내면 상위 5위까지 그대로 보여주고 내 줄을 강조.
 */

export type RunRankMember = {
  userId: string;
  name: string;
  meters: number;
};

export type RunRankRow = {
  userId: string;
  name: string;
  meters: number;
  /** 실제 순위(1부터). 동점은 입력 순서 유지. */
  rank: number;
  isMe: boolean;
};

/**
 * 멤버들을 거리 내림차순으로 정렬해 순위를 매기고, 화면에 그릴 최대 5줄을 고른다.
 *  - 내 순위 ≤ 4 → 상위 5줄(내 줄 강조).
 *  - 내 순위 ≥ 5 → 상위 4줄 + 내 줄(총 5줄).
 * 멤버가 5명 이하면 전부 보여준다.
 */
export function pickRunLeaderboard(
  members: RunRankMember[],
  myUserId: string,
): RunRankRow[] {
  // 거리 desc, 동점이면 이름(가나다)로 안정 정렬.
  const sorted = [...members].sort(
    (a, b) => b.meters - a.meters || a.name.localeCompare(b.name, "ko"),
  );
  const ranked: RunRankRow[] = sorted.map((m, i) => ({
    userId: m.userId,
    name: m.name,
    meters: m.meters,
    rank: i + 1,
    isMe: m.userId === myUserId,
  }));

  if (ranked.length <= 5) return ranked;

  const myIdx = ranked.findIndex((r) => r.isMe);
  const myRank = myIdx >= 0 ? myIdx + 1 : Infinity;

  if (myRank <= 4) {
    // 상위 5줄.
    return ranked.slice(0, 5);
  }
  // 상위 4줄 + 내 줄.
  const top4 = ranked.slice(0, 4);
  if (myIdx >= 0) top4.push(ranked[myIdx]);
  return top4;
}

/** m 를 보기 좋은 문자열로(1000m 이상은 km). */
export function formatMeters(m: number): string {
  const v = Math.max(0, Math.round(m));
  if (v >= 1000) return `${(v / 1000).toFixed(2)}km`;
  return `${v}m`;
}
