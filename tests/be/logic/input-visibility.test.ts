import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = resolve(process.cwd(), "src");
const walk = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${dir}/${e.name}`) : e.name.endsWith(".tsx") ? [`${dir}/${e.name}`] : [],
  );

/**
 * 라이트 바탕(--background #f4f5f4)과 bg-zinc-100(#f4f4f5)은 사실상 같은 색이라, 그 색 입력칸은 칸이 안 보였다
 * (로그인·비밀번호 찾기에서 발견, 2026-11-24). 입력칸은 흰 면 + 얇은 테두리(surface-strong + ring line)로 쓴다.
 */
describe("입력칸이 바탕과 구분된다", () => {
  it("bg-zinc-100 입력칸이 없다", () => {
    const offenders: string[] = [];
    for (const file of walk(ROOT)) {
      if (/admin/.test(file)) continue;
      for (const m of readFileSync(file, "utf8").matchAll(/["`]([^"`\n]*)["`]/g)) {
        const cls = m[1];
        if (/outline-none/.test(cls) && /rounded-\[10px\]/.test(cls) && /(?<![:\w-])bg-zinc-100(?![\w/-])/.test(cls)) {
          offenders.push(file.split("src")[1]);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("로그인 공용 입력칸은 흰 면 + 테두리", () => {
    const ui = readFileSync(resolve(ROOT, "features/auth/components/recover-ui.tsx"), "utf8");
    expect(ui).toContain("bg-[var(--surface-strong)] px-3 ring-1 ring-inset ring-[var(--line)]");
  });
});
