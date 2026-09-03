import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { searchFoodsAction } from "@/features/diet/food-search-actions";

describe("식품 카탈로그 서버 검색", () => {
  it("클라이언트 식단 화면은 정적 카탈로그를 직접 import하지 않는다", () => {
    const board = readFileSync(
      resolve(process.cwd(), "src/features/diet/components/diet-board.tsx"),
      "utf8",
    );
    const action = readFileSync(
      resolve(process.cwd(), "src/features/diet/food-search-actions.ts"),
      "utf8",
    );
    expect(board).not.toContain('from "@/features/diet/food-catalog"');
    expect(board).toContain('from "@/features/diet/food-search-actions"');
    expect(action.trimStart().startsWith('"use server"')).toBe(true);
  });

  it("빈 검색은 둘러보기용 첫 200개까지만 반환한다", async () => {
    const rows = await searchFoodsAction("");
    expect(rows).toHaveLength(200);
  });

  it("이름·분류·문화권 검색 결과를 반환한다", async () => {
    expect((await searchFoodsAction("김치찌개")).map((row) => row.id)).toContain(
      "kimchi-stew",
    );
    expect((await searchFoodsAction("중식")).length).toBeGreaterThan(0);
  });

  it("문자열이 아닌 런타임 입력은 빈 검색으로 제한 처리한다", async () => {
    const rows = await searchFoodsAction(null as unknown as string);
    expect(rows).toHaveLength(200);
  });
});
