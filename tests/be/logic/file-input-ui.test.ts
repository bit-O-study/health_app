import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(process.cwd(), "src");
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${dir}/${e.name}`) : e.name.endsWith(".tsx") ? [`${dir}/${e.name}`] : [],
  );

/**
 * 브라우저 기본 파일칸은 영어("Choose File / No file chosen")로 나온다(운동 상세·고객센터에서 발견, 2026-11-24).
 * 파일 입력은 숨기고(hidden·sr-only) 한국어 버튼·파일 이름을 따로 그린다.
 */
describe("파일 입력칸은 기본 모양을 그대로 보이지 않는다", () => {
  it("모든 type=file 입력이 hidden 또는 sr-only", () => {
    const offenders: string[] = [];
    for (const file of walk(ROOT)) {
      if (/admin/.test(file)) continue;
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/<input\b[^>]*?type="file"[^>]*?\/>/gs)) {
        if (!/\b(hidden|sr-only)\b/.test(m[0])) offenders.push(file.split("src")[1]);
      }
    }
    expect(offenders).toEqual([]);
  });
});
