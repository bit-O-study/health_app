/** 그룹 응원 리액션 — 순수 로직(집계). 테스트 가능. */

/** 사용 가능한 응원 이모지(표시 순서 고정). */
export const REACTION_EMOJIS = ["👍", "🔥", "💪", "👏"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export function isReactionEmoji(v: string): v is ReactionEmoji {
  return (REACTION_EMOJIS as readonly string[]).includes(v);
}

export type ReactionCount = { emoji: string; count: number; mine: boolean };

export type ReactionRow = { toUser: string; fromUser: string; emoji: string };

/**
 * 리액션 행들을 대상자별 이모지 집계로. 각 대상자에 대해 '실제로 달린' 이모지만,
 * REACTION_EMOJIS 순서로 반환한다(count, 내가 눌렀는지 mine).
 */
export function aggregateReactions(
  rows: ReactionRow[],
  meId: string,
): Map<string, ReactionCount[]> {
  const byUser = new Map<string, Map<string, { count: number; mine: boolean }>>();
  for (const r of rows) {
    if (!isReactionEmoji(r.emoji)) continue;
    let m = byUser.get(r.toUser);
    if (!m) {
      m = new Map();
      byUser.set(r.toUser, m);
    }
    const cur = m.get(r.emoji) ?? { count: 0, mine: false };
    cur.count += 1;
    if (r.fromUser === meId) cur.mine = true;
    m.set(r.emoji, cur);
  }
  const out = new Map<string, ReactionCount[]>();
  for (const [uid, m] of byUser) {
    out.set(
      uid,
      REACTION_EMOJIS.filter((e) => m.has(e)).map((e) => ({
        emoji: e,
        count: m.get(e)!.count,
        mine: m.get(e)!.mine,
      })),
    );
  }
  return out;
}
