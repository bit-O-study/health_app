/** 주간 MVP 푸시 문구 — 순수 로직. 테스트 가능. */

export type PushMessage = { title: string; body: string };

/**
 * 지난주 랭킹 결과 푸시 문구.
 * - 내가 1위면 축하 메시지, 아니면 1위 이름 + 내 순위.
 * - 혼자(1명) 그룹이면 응원 문구.
 */
export function buildWeeklyMvpMessage(
  groupName: string,
  winnerName: string,
  myRank: number,
  memberCount: number,
): PushMessage {
  const title = `🏆 지난주 '${groupName}' 랭킹 결과`;
  if (memberCount <= 1) {
    return { title, body: "혼자서도 꾸준히! 이번 주도 화이팅 💪" };
  }
  if (myRank === 1) {
    return { title, body: `축하해요! 지난주 그룹 1위 달성 🏆 이번 주도 지켜봐요.` };
  }
  return {
    title,
    body: `1위는 ${winnerName}님! 내 순위는 ${memberCount}명 중 ${myRank}위예요. 이번 주 역전 노려봐요 🔥`,
  };
}
