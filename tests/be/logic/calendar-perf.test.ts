import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { STREAK_CHUNK_DAYS, currentStreak, streakByChunks } from "@/features/calendar/month-stats";
import { shiftYmd } from "@/features/routine/progress";

/** 오늘부터 n일(오늘 포함) 연속으로 운동한 기록 + 조회 기록. */
function fakeHistory(today: string, days: number, skipToday = false) {
  const active = new Set<string>();
  for (let i = skipToday ? 1 : 0; i < days + (skipToday ? 1 : 0); i++) active.add(shiftYmd(today, -i));
  const calls: { from: string; to: string }[] = [];
  const fetch = async (from: string, to: string) => {
    calls.push({ from, to });
    return [...active].filter((d) => d >= from && d <= to);
  };
  return { active, calls, fetch };
}

describe("연속 운동 일수 — 60일씩 필요한 만큼만 조회", () => {
  const today = "2026-09-29";

  it("짧은 연속(대부분)은 조회 한 번", async () => {
    const h = fakeHistory(today, 5);
    expect(await streakByChunks(today, h.fetch)).toBe(5);
    expect(h.calls).toHaveLength(1);
  });

  it("🔴 긴 연속(150일)도 끝까지 센다 — 조각을 이어 붙여서", async () => {
    const h = fakeHistory(today, 150);
    expect(await streakByChunks(today, h.fetch)).toBe(150);
    expect(h.calls).toHaveLength(3);
    // 조각끼리 빈틈·겹침 없이 이어진다.
    expect(h.calls[1].to).toBe(shiftYmd(h.calls[0].from, -1));
  });

  it("🔴 한 번에 보는 범위는 60일 — 조회 한 번 1,000행 한도에 걸리지 않게", async () => {
    const h = fakeHistory(today, 300);
    await streakByChunks(today, h.fetch);
    for (const c of h.calls) {
      const days = (Date.parse(c.to) - Date.parse(c.from)) / 86_400_000 + 1;
      expect(days).toBe(STREAK_CHUNK_DAYS);
    }
  });

  it("오늘 아직 안 했어도 같은 결과(어제부터) — 조각 경계에서도", async () => {
    for (const n of [1, 58, 59, 60, 61, 119, 120, 121]) {
      const h = fakeHistory(today, n, true);
      expect(await streakByChunks(today, h.fetch), `n=${n}`).toBe(n);
      expect(await streakByChunks(today, h.fetch)).toBe(currentStreak(h.active, today));
    }
  });

  it("오늘 포함 경계값", async () => {
    for (const n of [59, 60, 61, 120]) {
      const h = fakeHistory(today, n);
      expect(await streakByChunks(today, h.fetch), `n=${n}`).toBe(n);
    }
  });

  it("기록이 없으면 0, 조회 한 번", async () => {
    const h = fakeHistory(today, 0);
    expect(await streakByChunks(today, h.fetch)).toBe(0);
    expect(h.calls).toHaveLength(1);
  });
});

describe("캘린더 조회 묶음 가드(속도 정리)", () => {
  const page = readFileSync("src/app/calendar/page.tsx", "utf8");
  const data = readFileSync("src/features/calendar/data-access.ts", "utf8");
  const commitments = readFileSync("src/features/commitments/data-access.ts", "utf8");

  it("생리 기록은 첫 묶음 안에서 — 성별을 안 뒤 따로 조회하지 않는다", () => {
    expect(page).toMatch(/getCurrentStreak\(today\),\s*getCycleLogsRange\(from, to\),\s*getPeriodStartDates\(\),\s*\]\);/);
    expect(page).not.toMatch(/await Promise\.all\(\[\s*getCycleLogsRange/);
  });

  it("최신 체중은 두 건만(120건 그래프 조회 대신)", () => {
    expect(page).toContain("getLatestWeights()");
    expect(page).not.toContain("getBodyLogs()");
  });

  it("월 집계는 프로필과 기록을 한 번에", () => {
    expect(data).toMatch(/Promise\.all\(\[\s*getUserProfile\(\),/);
    expect(data).not.toMatch(/const profile = await getUserProfile\(\);\s*const weight/);
  });

  it("다짐 마커는 다짐 목록과 기록을 동시에", () => {
    expect(commitments).toMatch(/Promise\.all\(\[\s*supabase\s*\.from\("commitments"\)/);
    expect(commitments).not.toContain("const stats = await dayStatsRange(");
  });

  it("연속 일수는 1년 한 번 조회 대신 조각 조회", () => {
    expect(page).toContain("getCurrentStreak(today)");
    expect(page).not.toContain("getActiveDates(shiftYmd(today, -365)");
  });
});
