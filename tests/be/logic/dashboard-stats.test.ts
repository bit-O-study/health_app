import { describe, expect, it } from "vitest";

import {
  activeSeries,
  bucketOf,
  dashboardSummary,
  memberCountSeries,
  seoulYmd,
  signupSeries,
  withdrawalSeries,
  type MemberLite,
} from "@/features/admin/dashboard-stats";

// 정오(UTC 03:00 = Seoul 12:00) 타임스탬프로 날짜 경계 모호함을 피한다.
const T = (ymd: string) => `${ymd}T03:00:00Z`;

const MEMBERS: MemberLite[] = [
  { createdAt: T("2024-01-10"), withdrawnAt: null },
  { createdAt: T("2024-01-20"), withdrawnAt: T("2024-02-05") },
  { createdAt: T("2024-02-15"), withdrawnAt: null },
  { createdAt: T("2025-01-05"), withdrawnAt: null },
];

describe("seoulYmd / bucketOf", () => {
  it("ISO → Asia/Seoul YYYY-MM-DD", () => {
    expect(seoulYmd("2024-03-15T03:00:00Z")).toBe("2024-03-15");
    // UTC 23:00 은 Seoul 익일 08:00
    expect(seoulYmd("2024-03-15T23:00:00Z")).toBe("2024-03-16");
  });
  it("버킷 단위 절단", () => {
    expect(bucketOf("2024-03-15", "day")).toBe("2024-03-15");
    expect(bucketOf("2024-03-15", "month")).toBe("2024-03");
    expect(bucketOf("2024-03-15", "year")).toBe("2024");
  });
});

describe("signup/withdrawal 시계열", () => {
  it("가입수 월별", () => {
    expect(signupSeries(MEMBERS, "month")).toEqual([
      { bucket: "2024-01", value: 2 },
      { bucket: "2024-02", value: 1 },
      { bucket: "2025-01", value: 1 },
    ]);
  });
  it("가입수 연별", () => {
    expect(signupSeries(MEMBERS, "year")).toEqual([
      { bucket: "2024", value: 3 },
      { bucket: "2025", value: 1 },
    ]);
  });
  it("탈퇴수 월별 — 탈퇴한 회원만", () => {
    expect(withdrawalSeries(MEMBERS, "month")).toEqual([
      { bucket: "2024-02", value: 1 },
    ]);
  });
});

describe("회원수(순누적) 시계열", () => {
  it("가입 +1 / 탈퇴 -1 누적", () => {
    // 2024-01: +2 → 2, 2024-02: +1(C) -1(B) → 2, 2025-01: +1 → 3
    expect(memberCountSeries(MEMBERS, "month")).toEqual([
      { bucket: "2024-01", value: 2 },
      { bucket: "2024-02", value: 2 },
      { bucket: "2025-01", value: 3 },
    ]);
  });
});

describe("dashboardSummary / activeSeries", () => {
  it("합계: 가입 4, 탈퇴 1, 회원 3", () => {
    expect(dashboardSummary(MEMBERS)).toEqual({
      totalSignups: 4,
      totalWithdrawals: 1,
      totalMembers: 3,
    });
  });
  it("활동 시계열은 버킷 오름차순", () => {
    const rows = [
      { bucket: "2024-02", users: 5 },
      { bucket: "2024-01", users: 3 },
    ];
    expect(activeSeries(rows)).toEqual([
      { bucket: "2024-01", value: 3 },
      { bucket: "2024-02", value: 5 },
    ]);
  });
});