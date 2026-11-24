import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(process.cwd(), "src");
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${dir}/${e.name}`) : e.name.endsWith(".tsx") ? [`${dir}/${e.name}`] : [],
  );

/**
 * 연한 회색 글자(text-zinc-400/500)는 라이트에서 대비가 모자라고(zinc-400 은 흰 바탕에서 약 2.6:1) 다크 짝을 따로 맞춰야 한다.
 * 보조 글자는 대비를 맞춘 토큰 `text-muted` 한 가지만 쓴다. 항상 어두운 화면(운동 중 오버레이·러닝·영상·게임 장면)과
 * 관리자 화면은 예외.
 */
const EXEMPT =
  /(guided-workout|rest-timer|running-mobile-gate|run-countdown|zen-scene|running-game|outdoor-run|workout-session-timer|exercise-photo-demo|media-embed|teaching-reels|\/gym-|pet-|sprite-wolf|group-board|group-leaderboard|proof-|\/api\/|admin|muscle-body-view|rep-camera-sheet)/;

describe("연한 회색 글자는 text-muted 로 쓴다", () => {
  const offenders: string[] = [];
  for (const file of walk(ROOT)) {
    const norm = file.split("\\").join("/");
    if (EXEMPT.test(norm)) continue;
    readFileSync(file, "utf8")
      .split("\n")
      .forEach((line, i) => {
        if (/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(line)) return;
        if (/dark:text-/.test(line)) return;
        if (/(?<![\w:-])text-zinc-(?:400|500)(?![\w/-])/.test(line)) offenders.push(`${norm.split("/src/")[1]}:${i + 1}`);
      });
  }
  it("짝 없는 text-zinc-400/500 이 없다", () => {
    expect(offenders.slice(0, 20)).toEqual([]);
  });
});
