/**
 * 관리자 대시보드 통계 — 순수 모듈(server-only 없음 → 단위 테스트 가능).
 *
 * 회원수/가입수/탈퇴수는 회원 목록(createdAt/withdrawnAt)에서 버킷팅으로 만들고,
 * 접속유저수는 DB 의 distinct 집계(admin_active_users RPC) 결과를 그대로 쓴다.
 * 버킷은 일(YYYY-MM-DD)/월(YYYY-MM)/연(YYYY) 세 단위.
 */

export type Granularity = "day" | "month" | "year";

export type SeriesPoint = { bucket: string; value: number };

export type MemberLite = {
  createdAt: string;
  withdrawnAt: string | null;
};

/** ISO timestamp → Asia/Seoul 기준 YYYY-MM-DD. */
export function seoulYmd(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

/** YYYY-MM-DD → 버킷 키(연/월/일). */
export function bucketOf(ymd: string, gran: Granularity): string {
  if (gran === "year") return ymd.slice(0, 4);
  if (gran === "month") return ymd.slice(0, 7);
  return ymd;
}

/** 버킷별 개수 시계열(버킷 오름차순). 빈 버킷은 만들지 않음(있는 날짜만). */
export function countSeries(ymds: string[], gran: Granularity): SeriesPoint[] {
  const m = new Map<string, number>();
  for (const ymd of ymds) {
    const b = bucketOf(ymd, gran);
    m.set(b, (m.get(b) ?? 0) + 1);
  }
  return [...m.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([bucket, value]) => ({ bucket, value }));
}

/** 가입수 시계열. */
export function signupSeries(
  members: MemberLite[],
  gran: Granularity,
): SeriesPoint[] {
  return countSeries(
    members.map((m) => seoulYmd(m.createdAt)),
    gran,
  );
}

/** 탈퇴수 시계열. */
export function withdrawalSeries(
  members: MemberLite[],
  gran: Granularity,
): SeriesPoint[] {
  return countSeries(
    members.filter((m) => m.withdrawnAt).map((m) => seoulYmd(m.withdrawnAt!)),
    gran,
  );
}

/**
 * 회원수(순누적) 시계열 — 각 버킷 끝 시점의 살아있는 회원 수.
 * 가입 +1, 탈퇴 -1 을 시간순으로 누적한다. 가입/탈퇴가 있는 모든 버킷을 포함.
 */
export function memberCountSeries(
  members: MemberLite[],
  gran: Granularity,
): SeriesPoint[] {
  const delta = new Map<string, number>();
  for (const m of members) {
    const inB = bucketOf(seoulYmd(m.createdAt), gran);
    delta.set(inB, (delta.get(inB) ?? 0) + 1);
    if (m.withdrawnAt) {
      const outB = bucketOf(seoulYmd(m.withdrawnAt), gran);
      delta.set(outB, (delta.get(outB) ?? 0) - 1);
    }
  }
  const buckets = [...delta.keys()].sort();
  let running = 0;
  return buckets.map((bucket) => {
    running += delta.get(bucket) ?? 0;
    return { bucket, value: running };
  });
}

/** 활동(접속) 시계열 — RPC 결과(bucket: YYYY-MM-DD truncated, users)를 정렬해 매핑. */
export function activeSeries(
  rows: { bucket: string; users: number }[],
): SeriesPoint[] {
  return [...rows]
    .sort((a, b) => (a.bucket < b.bucket ? -1 : a.bucket > b.bucket ? 1 : 0))
    .map((r) => ({ bucket: r.bucket, value: r.users }));
}

/** 헤드라인 카드용 합계. */
export function dashboardSummary(members: MemberLite[]): {
  totalMembers: number;
  totalSignups: number;
  totalWithdrawals: number;
} {
  const totalSignups = members.length;
  const totalWithdrawals = members.filter((m) => m.withdrawnAt).length;
  return {
    totalSignups,
    totalWithdrawals,
    totalMembers: totalSignups - totalWithdrawals,
  };
}