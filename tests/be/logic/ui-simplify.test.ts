import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 화면 간결화 가드 (2026-09-14 검수보고서 → 사용자 "제안대로 진행").
 *
 * 규칙: 색 = 브랜드 1 + 의미색 2(주의·위험) · 카드 = 16px 테두리만 · 한글 폰트 실제 로드 ·
 * 홈 = 목표 → 오늘 → 이번 주 → 잔디 → 광고(맨 아래) · 날씨 배경(위치 권한) 제거.
 * 눈으로만 지키는 규칙은 다음 기능 추가 때 슬그머니 되돌아온다 — 소스로 막는다.
 */

const ROOT = process.cwd();
const read = (rel: string) => readFileSync(resolve(ROOT, rel), "utf8");

describe("디자인 토큰", () => {
  const css = read("src/styles/globals.css");

  it("브랜드·주의·위험색이 Tailwind 클래스로 연결돼 있다", () => {
    for (const token of ["brand", "brand-soft", "warn", "danger", "muted", "line"]) {
      expect(css, `--color-${token}`).toContain(`--color-${token}: var(--${token});`);
    }
  });

  it("라이트/다크 모두 주의·위험색 값을 갖는다", () => {
    const light = css.slice(css.indexOf(":root {"), css.indexOf(".dark {"));
    const dark = css.slice(css.indexOf(".dark {"), css.indexOf("@theme inline"));
    for (const block of [light, dark]) {
      expect(block).toMatch(/--warn: #[0-9a-f]{6};/);
      expect(block).toMatch(/--danger: #[0-9a-f]{6};/);
    }
  });

  it(".app-card 는 모서리 16px · 테두리만(그림자 없음)", () => {
    const card = css.slice(css.indexOf(".app-card {"));
    const body = card.slice(0, card.indexOf("}"));
    expect(body).toContain("border-radius: 1rem;");
    expect(body).toContain("border: 1px solid var(--line);");
    expect(body).not.toContain("box-shadow");
  });

  it(".app-page 바탕에 장식 그라데이션이 없다", () => {
    const page = css.slice(css.indexOf(".app-page {"));
    expect(page.slice(0, page.indexOf("}"))).not.toContain("gradient");
  });

  it("초록은 하나 — 옛 #059669 가 앱 어디에도 남지 않는다", () => {
    const files = [
      "src/app/layout.tsx",
      "src/styles/globals.css",
      "src/app/global-error.tsx",
      "src/app/settings/score/page.tsx",
      "src/features/profile/body-chart-data.ts",
      "src/features/routine/components/exercise-search-select.tsx",
      "public/offline.html",
      "native-shell/index.html",
    ];
    for (const f of files) expect(read(f), f).not.toContain("#059669");
    expect(read("src/app/layout.tsx")).toContain('themeColor: "#087f5b"');
    expect(css).toMatch(/body::before \{[^}]*background: #087f5b;/);
  });
});

describe("한글 폰트", () => {
  it("layout 이 Pretendard 를 실제로 불러온다(이름만 적어 두지 않는다)", () => {
    const layout = read("src/app/layout.tsx");
    const cssImport = "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
    expect(layout).toContain(`import "${cssImport}";`);
    expect(existsSync(resolve(ROOT, "node_modules", cssImport))).toBe(true);
  });

  it("본문 폰트 목록의 맨 앞이 Pretendard 다", () => {
    const css = read("src/styles/globals.css");
    expect(css).toMatch(/--font-sans: "Pretendard Variable"/);
    expect(css).toMatch(/body \{[^}]*font-family: "Pretendard Variable"/);
  });
});

describe("홈 구성", () => {
  const home = read("src/app/home/page.tsx");

  it("목표 → 오늘 → 이번 주 → 잔디 → 광고 순서", () => {
    const order = [
      "<TodayGoalCard",
      "<TodayCard",
      "<WeeklyOverviewCard",
      "<ContributionGraph",
      "<PromoBanner",
    ].map((tag) => home.indexOf(tag));
    expect(order.every((i) => i >= 0), order.join(",")).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("날씨 배경과 위치 권한 요청이 사라졌다", () => {
    expect(home).not.toContain("WeatherBackground");
    expect(existsSync(resolve(ROOT, "src/features/home/components/weather-background.tsx"))).toBe(false);
    expect(existsSync(resolve(ROOT, "src/features/home/weather-cache.ts"))).toBe(false);
    for (const f of ["src/app/home/page.tsx", "src/features/home/components/today-card.tsx"]) {
      expect(read(f), f).not.toContain("geolocation");
    }
  });

  it("권한 넛지는 한 번에 한 줄만(pickNudge)", () => {
    expect(read("src/features/notifications/components/permission-nudge.tsx")).toContain(
      "pickNudge(",
    );
  });

  it("광고는 사진 배너가 아니라 카드 모양 한 줄", () => {
    const promo = read("src/features/cross-promo/promo-banner.tsx");
    expect(promo).toContain("app-card");
    expect(promo).not.toMatch(/min-h-\[1\d\dpx\]/);
  });
});

describe("이번 주 카드는 한 장 — 홈과 운동탭이 같은 컴포넌트", () => {
  it("옛 카드 두 장(요약·훈련)이 남아 있지 않다", () => {
    for (const f of [
      "src/features/routine/components/weekly-report-card.tsx",
      "src/features/routine/components/weekly-training-summary.tsx",
      "src/features/home/components/diet-exercise-card.tsx",
    ]) {
      expect(existsSync(resolve(ROOT, f)), f).toBe(false);
    }
  });

  it("홈·운동탭 모두 WeeklyOverviewCard 를 쓴다", () => {
    for (const f of ["src/app/home/page.tsx", "src/app/routine/page.tsx"]) {
      const src = read(f);
      expect(src, f).toContain("<WeeklyOverviewCard");
      expect(src.match(/<WeeklyOverviewCard/g)?.length, f).toBe(1);
    }
  });

  it("부위 막대는 무지개가 아니라 브랜드 진하기 + 안 한 부위만 주의색", () => {
    const card = read("src/features/routine/components/weekly-overview-card.tsx");
    expect(card).not.toMatch(/\b(rose|sky|violet|amber|teal|emerald)-\d{3}\b/);
    expect(card).toContain('none: "border border-warn"');
  });
});

describe("하단 탭", () => {
  it("라벨이 11px 고정 — 좁은 폰에서도 9·10px 로 줄지 않는다", () => {
    const nav = read("src/components/bottom-nav.tsx");
    expect(nav).toContain("text-[11px]");
    expect(nav).not.toMatch(/text-\[(9|10)px\]/);
  });
});
