/** 그룹 운동 랭킹대전 — 순수 로직(주간 범위·정렬). 테스트 가능. */

export type MemberStat = {
  userId: string;
  name: string;
  /** 이번 주 운동 소비 kcal(근력+컨디셔닝). */
  kcal: number;
  /** 이번 주 완료 운동 수(근력 종목 + 컨디셔닝). */
  workouts: number;
  /** 이번 주 운동한 날 수. */
  days: number;
  isMe: boolean;
};

export type RankedMember = MemberStat & { rank: number };

const pad = (n: number) => String(n).padStart(2, "0");
const toYmd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

export function addDaysYmd(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d) + n * 86_400_000);
  return toYmd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** todayYmd가 속한 주의 월요일~일요일 범위. */
export function weekRange(todayYmd: string): { from: string; to: string } {
  const [y, m, d] = todayYmd.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=일 … 6=토
  const toMonday = dow === 0 ? -6 : 1 - dow;
  const from = addDaysYmd(todayYmd, toMonday);
  return { from, to: addDaysYmd(from, 6) };
}

/**
 * kcal 내림차순 → 동점이면 운동 수 → 이름 순. 동점은 같은 등수(1,2,2,4).
 */
export function rankMembers(members: MemberStat[]): RankedMember[] {
  const sorted = [...members].sort(
    (a, b) =>
      b.kcal - a.kcal ||
      b.workouts - a.workouts ||
      a.name.localeCompare(b.name, "ko"),
  );
  const out: RankedMember[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const prev = out[i - 1];
    const same =
      prev &&
      prev.kcal === sorted[i].kcal &&
      prev.workouts === sorted[i].workouts;
    out.push({ ...sorted[i], rank: same ? prev.rank : i + 1 });
  }
  return out;
}
