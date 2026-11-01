import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

// 회귀 방지(2026-11-01): 달력의 날짜 칸 링크가 미리 불러오기(prefetch)를 켜 둔 채라
// 달력을 열 때마다 날짜 화면 수십 개를 서버에 렌더시켰다(요청 74개·완료 13초).
describe("달력 날짜 칸은 미리 불러오지 않는다", () => {
  const page = readFileSync("src/app/calendar/page.tsx", "utf8");

  it("/calendar/${date} 로 가는 링크마다 prefetch={false}", () => {
    const links = [...page.matchAll(/<Link\b[\s\S]*?>/g)].map((m) => m[0]).filter((tag) => tag.includes("href={`/calendar/${date}`}"));
    expect(links.length).toBe(2); // 월간 격자 + 목록
    for (const tag of links) expect(tag).toContain("prefetch={false}");
  });
});
