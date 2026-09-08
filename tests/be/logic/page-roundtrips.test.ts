import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 서버 컴포넌트의 **Supabase 왕복 횟수** 가드 — 2026-09-08.
 *
 * 이 앱의 화면 지연은 SQL 이 아니라 **왕복 수**다. 실측: 식단 조회 쿼리 자체는 0.4ms 인데
 * 서울(icn1)→싱가포르(ap-southeast-1) 왕복이 70~90ms 다. 서로 의존이 없는 조회를
 * `await` 로 하나씩 하면 그 왕복이 그대로 TTFB 에 쌓인다.
 *
 * 이건 **결과가 똑같아서** 기능 테스트로는 절대 안 잡힌다. 화면만 느려진다.
 * (식단은 `await getUserProfile()` 하나 때문에 왕복이 2회였다 → 1회로 합쳤다.)
 */
describe("페이지 서버 조회는 서로 의존이 없으면 한 묶음(Promise.all)으로 돈다", () => {
  const PAGES = [
    {
      file: "src/app/diet/page.tsx",
      // 이 넷은 서로의 입력이 아니다 — 같은 Promise.all 안에 있어야 한다.
      calls: [
        "getUserProfile()",
        "getFoodLogsForDate(date)",
        "getMealPhotosForDate(date)",
        'isDebugFeatureEnabled("diet-photo-ai")',
      ],
    },
  ];

  it.each(PAGES)("$file", ({ file, calls }) => {
    // 주석은 걷어낸다 — 왜 이렇게 묶었는지 설명하는 주석에 `await getUserProfile()`
    // 같은 문구가 들어가면 코드가 아니라 설명에 걸려 오탐이 난다.
    const text = readFileSync(file, "utf8")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    const batch = text.match(/Promise\.all\(\[[\s\S]*?\]\)/)?.[0];
    expect(batch, `${file} 에 Promise.all 묶음이 없다`).toBeTruthy();
    for (const call of calls) {
      expect(batch, `${file}: ${call} 가 같은 Promise.all 에 없다`).toContain(call);
    }
    // 묶음 앞에서 조회를 하나 더 기다리면 왕복이 다시 2회가 된다.
    const before = text.slice(0, text.indexOf(batch!));
    for (const call of calls) {
      expect(
        before.includes(`await ${call}`),
        `${file}: ${call} 를 Promise.all 앞에서 따로 await 하고 있다(왕복 1회 낭비)`,
      ).toBe(false);
    }
  });
});
