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

  it("버튼·링크의 h-8 은 누르는 영역을 44px 로 늘린다(보이는 크기는 그대로)", () => {
    // 대표 사용처 — 높이 32px 알약 버튼과 32px 정사각 아이콘 버튼
    expect(read("src/app/plan/page.tsx")).toMatch(/relative h-8 after:absolute after:-inset-y-1\.5 after:inset-x-0/);
    expect(read("src/app/calendar/page.tsx")).toMatch(/relative h-8 w-8 after:absolute after:-inset-1\.5/);
    expect(read("src/features/routine/components/plan-editor.tsx")).toMatch(/inline-flex relative h-8 after:absolute|relative h-8 after:absolute/);
  });

  it("근육별 운동선택의 추가 버튼은 이름(aria-label)이 있고 44px 로 눌린다", () => {
    const src = read("src/features/routine/components/muscle-exercise-picker.tsx");
    expect(src).toMatch(/aria-label=\{`\$\{ex\.name\} \$\{on \? "선택 해제" : "추가"\}`\}/);
    expect(src).toContain("after:-inset-2.5");
  });

  it("순위·경쟁 화면은 이모지 대신 아이콘을 쓴다", () => {
    const board = read("src/features/groups/components/group-leaderboard.tsx");
    for (const e of ["🥇", "🥈", "🥉", "👑", "✨"]) expect(board).not.toContain(e);
    expect(board).toContain("<Crown");
    const comp = read("src/features/groups/components/competition-board.tsx");
    for (const e of ["🏆", "🚀", "🛡", "🌱", "🎉", "⬇"]) expect(comp).not.toContain(e);
  });

  it("도움말 링크는 48px(min-h-12) 한 줄 행", () => {
    const src = read("src/app/help/page.tsx");
    expect(src).toContain("min-h-12");
    for (const href of ["/login", "/support"]) expect(src).toContain(`href="${href}"`);
  });
});

describe("UI 검수 3단계(박스 정리) — 운동 선택·기록", () => {
  it("근육별 운동선택: 운동 행은 테두리 박스가 아니라 구분선 행", () => {
    const src = read("src/features/routine/components/muscle-exercise-picker.tsx");
    expect(src).toContain('<section className="border-t border-line px-1 pt-4">');
    expect(src).toContain("border-t border-line py-3 transition first:border-t-0");
    expect(src).not.toContain("rounded-lg border p-3 transition");
    // 담기/해제 동작에 쓰는 testid 는 그대로
    expect(src).toContain("data-testid={`pick-${ex.id}`}");
  });

  it("운동 기록: 링크 3개가 박스 타일 없이 48px 행이다", () => {
    const src = read("src/app/routine/records/page.tsx");
    expect(src).not.toContain("app-card");
    expect(src).toContain("min-h-12");
    for (const href of ["/settings/progress", "/settings/score", "/settings/history"]) expect(src).toContain(`href="${href}"`);
  });
});

describe("UI 검수 4단계 — 러닝 화면 이모지", () => {
  it("화면에 보이는 문구에는 이모지를 쓰지 않는다(주석 제외)", () => {
    const files = [
      "src/features/running/running-mobile-gate.tsx",
      "src/features/running/running-game.tsx",
      "src/features/running/zen-run.tsx",
      "src/features/running/outdoor-run.tsx",
      "src/features/running/components/run-leaderboard.tsx",
      "src/features/running/components/run-finish-summary.tsx",
    ];
    for (const rel of files) {
      const code = read(rel)
        .split("\n")
        .filter((l) => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l))
        .join("\n");
      expect(code, rel).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
    }
    expect(read("src/features/running/running-mobile-gate.tsx")).toContain("<Smartphone");
  });
});

describe("UI 검수 3단계 — 운동 등록(/plan)", () => {
  it("본운동 섹션은 바깥 카드 없이 구분선으로 묶는다(카드 3단 → 2단)", () => {
    const src = read("src/features/routine/components/plan-editor.tsx");
    expect(src).toContain('<section className="border-t border-line px-1 pt-4">');
    expect(src).not.toContain('<section className="app-card p-3">');
  });
});

describe("UI 검수 3단계 — 루틴 설정", () => {
  it("루틴 설정 바깥 큰 카드를 걷는다(칩·요일 블록이 카드 안의 카드가 되지 않게)", () => {
    const src = read("src/features/routine/components/routine-planner.tsx");
    expect(src).toContain('<section className="px-1">');
    expect(src).not.toContain('<section className="app-card p-4">');
  });
});

describe("UI 검수 5-1 — 보조 글자색", () => {
  it("다크용 짝 없는 text-zinc-400 대신 두 테마를 통과하는 text-muted 를 쓴다(정리한 파일)", () => {
    const files = [
      "src/app/groups/[id]/member/[uid]/page.tsx",
      "src/features/billing/components/team-admin-list.tsx",
      "src/features/billing/components/team-plan-form.tsx",
      "src/features/commitments/components/prediction-card.tsx",
      "src/features/cycle/components/cycle-board.tsx",
      "src/features/groups/components/trainer-comment-form.tsx",
    ];
    for (const rel of files) {
      const lines = read(rel).split("\n").filter((l) => /(^|[ "'`])text-zinc-400/.test(l) && !/dark:text-|hover:|group-/.test(l));
      expect(lines, rel).toEqual([]);
    }
  });
});

describe("UI 검수 1-5 — 상태바(안전영역)·스크롤바", () => {
  it("body 가 상태바 높이만큼 padding-top 을 가지므로 페이지 최소 높이에서 그만큼 뺀다(짧은 화면 스크롤 방지)", () => {
    const css = read("src/styles/globals.css");
    expect(css).toMatch(/body \{\s*padding-top: env\(safe-area-inset-top\);/);
    expect(css).toMatch(/\.app-page \{[^}]*min-height: calc\(100dvh - env\(safe-area-inset-top\) - var\(--app-nav-pad, 0px\)\);/);
    expect(css).not.toMatch(/\.app-page \{[^}]*min-height: 100dvh;/);
  });

  it("고정 헤더·배너는 상태바 띠 밑에 붙는다(top: 0 이면 띠 뒤로 가려진다)", () => {
    const css = read("src/styles/globals.css");
    expect(css).toMatch(/\.app-header \{[^}]*top: env\(safe-area-inset-top\);/);
    expect(read("src/components/offline-banner.tsx")).toContain("sticky top-[env(safe-area-inset-top)]");
  });

  it("전체 높이를 쓰는 화면은 상단 안전영역을 함께 뺀다", () => {
    expect(read("src/app/login/page.tsx")).toContain("min-h-[calc(100dvh-env(safe-area-inset-top))]");
    expect(read("src/app/suspended/page.tsx")).toContain("min-h-[calc(100dvh-env(safe-area-inset-top))]");
    expect(read("src/app/groups/[id]/page.tsx")).toContain("100dvh-3.75rem-env(safe-area-inset-top)-env(safe-area-inset-bottom)");
    expect(read("src/features/community/components/community-board.tsx")).not.toContain("min-h-screen");
  });

  it("터치 기기에서는 스크롤바를 그리지 않는다", () => {
    const css = read("src/styles/globals.css");
    expect(css).toMatch(/@media \(pointer: coarse\) \{\s*html,\s*body,\s*\* \{\s*scrollbar-width: none;/);
    expect(css).toContain("*::-webkit-scrollbar");
  });
});

describe("UI 검수 — 하단 탭 여백이 최소 높이에서 빠진다", () => {
  it("탭이 보일 때 body 에 --app-nav-pad 를 설정하고 언마운트 때 지운다(짧은 화면 60px 스크롤 방지)", () => {
    const nav = read("src/components/bottom-nav.tsx");
    expect(nav).toContain('document.body.style.setProperty("--app-nav-pad", navPad)');
    expect(nav).toContain('document.body.style.removeProperty("--app-nav-pad")');
    expect(read("src/styles/globals.css")).toContain("var(--app-nav-pad, 0px)");
  });
});
