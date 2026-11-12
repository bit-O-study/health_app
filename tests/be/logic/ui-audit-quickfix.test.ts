import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * UI 검수 보고서(2026-11-11) 1단계 — 작은 수정 묶음 가드.
 * 눈으로만 지키면 다음 기능 추가 때 슬그머니 되돌아오므로 소스로 막는다.
 */
const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8");

describe("UI 검수 1단계", () => {
  it("3D 마네킹: 카메라가 몸 전체를 담고, 없는 anatomy.glb 를 매 방문 요청하지 않는다", () => {
    const src = read("src/features/routine/components/muscle-mannequin-3d.tsx");
    const m = src.match(/MANNEQUIN_CAMERA_POSITION: \[number, number, number\] = \[0, ([\d.]+), ([\d.]+)\]/);
    expect(m, "카메라 상수").not.toBeNull();
    // fov 42 에서 보이는 세로 높이 ≥ 몸 전체(약 -1.2 ~ +1.6, 여백 포함 3.2)
    const visibleHeight = 2 * Number(m![2]) * Math.tan((42 / 2) * (Math.PI / 180));
    expect(visibleHeight).toBeGreaterThanOrEqual(3.2);
    expect(src).not.toContain("[0, 0.25, 3.6]");
    expect(src).toMatch(/ANATOMY_MODEL_URL: string \| null = null/);
    // 설명 문구는 머리 위가 아니라 아래에 둔다
    expect(src).not.toContain("absolute left-3 top-3");
  });

  it("다가오는 7일: 스냅 스크롤이 왼쪽 안쪽 여백(16px)을 지킨다", () => {
    expect(read("src/features/routine/components/upcoming-seven-days.tsx")).toContain("snap-x scroll-px-4");
  });

  it("활동 격자: 왼쪽 끝이 반쪽 칸으로 보이지 않게 흐려 준다", () => {
    expect(read("src/features/home/components/contribution-graph.tsx")).toContain("[mask-image:linear-gradient(to_right,transparent,#000_20px)]");
  });

  it("로그인/회원가입 전환 탭은 높이 44px(h-11)", () => {
    const src = read("src/features/auth/components/auth-form.tsx");
    expect(src).toContain('"h-11 rounded-lg text-sm font-semibold transition"');
  });

  it("공개 3화면(개인정보·도움말·계정삭제)에는 카드 박스가 없다", () => {
    for (const rel of ["src/app/privacy/page.tsx", "src/app/help/page.tsx", "src/app/account-deletion/page.tsx"]) {
      expect(read(rel), rel).not.toContain("app-card");
    }
  });

  it("개인정보처리방침 문구는 그대로다(핵심 문장 보존)", () => {
    const src = read("src/app/privacy/page.tsx");
    for (const s of ["1. 수집하는 개인정보 항목", "5. 보유 및 이용 기간, 파기", "8. 고지의 의무", "국외 이전"]) {
      expect(src).toContain(s);
    }
  });

  it("도움말 링크는 48px(min-h-12) 한 줄 행", () => {
    const src = read("src/app/help/page.tsx");
    expect(src).toContain("min-h-12");
    for (const href of ["/login", "/support"]) expect(src).toContain(`href="${href}"`);
  });
});
