import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
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

  it("다크 바탕은 초록기 없는 중립색이고, 카드가 바탕보다 밝다", () => {
    const dark = css.slice(css.indexOf(".dark {"), css.indexOf("@theme inline"));
    const hex = (name: string) => {
      const m = dark.match(new RegExp(`--${name}: #([0-9a-f]{6});`));
      expect(m, name).not.toBeNull();
      return [0, 2, 4].map((i) => parseInt(m![1].slice(i, i + 2), 16));
    };
    const bg = hex("background");
    const card = hex("surface-strong");
    // R·G·B 차이가 작다 = 색이 끼지 않은 회색 계열.
    expect(Math.max(...bg) - Math.min(...bg)).toBeLessThanOrEqual(4);
    expect(Math.max(...card) - Math.min(...card)).toBeLessThanOrEqual(6);
    expect(card.reduce((a, b) => a + b)).toBeGreaterThan(bg.reduce((a, b) => a + b) + 30);
  });

  it("하단 탭은 토큰 기반 반투명 블러(app-glass) — 옛 초록 hex·알약 배경 없음", () => {
    const nav = read("src/components/bottom-nav.tsx");
    expect(nav).toContain("app-glass");
    expect(nav).not.toContain("#101713");
    expect(nav).not.toContain("bg-brand-soft");
    expect(css).toMatch(/\.app-glass \{[^}]*backdrop-filter/);
  });

  it("아이폰 느낌 공통 클래스(누름 반응·그룹 목록·등장 효과)가 있다", () => {
    expect(css).toMatch(/\.app-press:active \{[^}]*transform: scale\(0\.98\)/);
    expect(css).toContain(".app-list {");
    expect(css).toContain("@keyframes app-fade-in");
  });

  it(".app-card 는 모서리 20px · 테두리만(그림자 없음)", () => {
    const card = css.slice(css.indexOf(".app-card {"));
    const body = card.slice(0, card.indexOf("}"));
    expect(body).toContain("border-radius: 1.25rem;");
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

  // 2026-09-20 런처 전환 — 홈은 카드를 세로로 쌓지 않는다. 큰 제목 → 광고 배너 →
  // 앱 아이콘 판 → 앱별 요약 위젯 3개. 자세한 내용은 각 앱 안으로 옮겨 갔다.
  it("큰 제목 → 광고 배너 → 앱 격자 → 위젯 순서 — 활동 링 카드 없음", () => {
    expect(home).not.toContain("ActivityRings");
    const order = ["<h1", "<PromoBanner", "<AppGrid", "<AppWidget"].map((tag) =>
      home.indexOf(tag),
    );
    expect(order.every((i) => i >= 0), order.join(",")).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("홈 위젯은 운동·식단·캘린더 3개 고정", () => {
    const ids = [...home.matchAll(/appId="([a-z]+)"/g)].map((m) => m[1]);
    expect(ids).toEqual(["workout", "diet", "calendar"]);
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

  it("광고 배너는 원래 사진 배너 그대로(사용자 요청 원상복구)", () => {
    const promo = read("src/features/cross-promo/promo-banner.tsx");
    expect(promo).toContain("min-h-[154px]");
    expect(promo).toContain('aria-label="광고 배너 선택"');
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

  // 2026-09-20 런처 전환 — 이번 주 카드는 홈에서 빠지고 요약만 운동 위젯으로 내려왔다.
  // 카드 자체는 운동 앱(기록)이 한 장만 갖는다. 두 곳에 동시에 있으면 안 된다는 약속은 그대로.
  it("이번 주 카드를 홈과 운동탭이 동시에 갖지 않는다", () => {
    const home = read("src/app/home/page.tsx");
    const routine = read("src/app/routine/page.tsx");
    const onHome = home.includes("<WeeklyOverviewCard");
    const onRoutine = routine.includes("<WeeklyOverviewCard");
    expect(onHome && onRoutine, "이번 주 카드가 두 곳에 중복").toBe(false);
    // 홈에서 뺐다면 정보가 사라지면 안 된다 — 홈엔 운동 위젯 한 줄,
    // 카드 자체는 운동 앱의 '기록' 칸(/settings/progress)이 한 장 갖는다.
    if (!onHome) {
      expect(home).toContain('appId="workout"');
      expect(read("src/app/settings/progress/page.tsx")).toContain("<WeeklyOverviewCard");
    }
  });

  it("부위 막대는 무지개가 아니라 브랜드 진하기 + 안 한 부위만 주의색", () => {
    const card = read("src/features/routine/components/weekly-overview-card.tsx");
    expect(card).not.toMatch(/\b(rose|sky|violet|amber|teal|emerald)-\d{3}\b/);
    expect(card).toContain('none: "border border-warn"');
  });
});

/** src 아래 모든 .ts/.tsx — [상대경로, 내용]. */
function sourceFiles(): [string, string][] {
  const out: [string, string][] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/\.(tsx|ts)$/.test(name)) {
        out.push([relative(ROOT, p).replace(/\\/g, "/"), readFileSync(p, "utf8")]);
      }
    }
  };
  walk(resolve(ROOT, "src"));
  return out;
}

describe("글자·굵기·카드 규칙 (앱 전체)", () => {
  const files = sourceFiles();
  // 광고 배너는 사용자 요청으로 원래 모양 그대로 둔다(2026-09-15) — 글자·굵기 규칙 예외.
  const ORIGINAL_PROMO = "src/features/cross-promo/promo-banner.tsx";
  const offenders = (re: RegExp, allow: string[] = []) =>
    files.flatMap(([rel, src]) =>
      allow.includes(rel) || rel === ORIGINAL_PROMO
        ? []
        : src
            .split("\n")
            .map((line, i) => (re.test(line) ? `${rel}:${i + 1}` : null))
            .filter((x): x is string => x !== null),
    );

  it("임의 글자 크기를 쓰지 않는다 — 12·14·16·20·28(text-xs~) 눈금만", () => {
    expect(offenders(/(?<![\w-])text-\[(7|8|9|10|12|13|15)px\]/)).toEqual([]);
  });

  it("11px 은 하단 탭 라벨 하나만 예외", () => {
    expect(offenders(/(?<![\w-])text-\[11px\]/, ["src/components/bottom-nav.tsx"])).toEqual([]);
  });

  it("굵기는 400·500·600·700 까지 — black·extrabold 없음", () => {
    expect(offenders(/(?<![\w-])font-(black|extrabold)(?![\w-])/)).toEqual([]);
  });

  it("그림자 달린 손카드(rounded + zinc 테두리 + 흰 바탕 + shadow-sm) 대신 .app-card", () => {
    const handCard = (line: string) =>
      /(?<![\w-])rounded-(xl|2xl)(?![\w-])/.test(line) &&
      /(?<![\w-])border-zinc-(100|200)(?![\w-])/.test(line) &&
      /(?<![\w:-])bg-white(?![\w/-])/.test(line) &&
      /(?<![\w:-])shadow-sm(?![\w-])/.test(line);
    const found = files.flatMap(([rel, src]) =>
      src
        .split("\n")
        .map((line, i) => (handCard(line) ? `${rel}:${i + 1}` : null))
        .filter((x): x is string => x !== null),
    );
    expect(found).toEqual([]);
  });
});

describe("공통 머리글·폭 (4단계)", () => {
  it("식단·캘린더·설정·그룹(빈 화면)이 PageHeader 를 쓴다", () => {
    for (const f of [
      // 식단은 날짜 이동이 보드 상태를 봐서 머리글을 DietBoard 가 그린다(2026-09-16).
      "src/features/diet/components/diet-board.tsx",
      "src/app/calendar/page.tsx",
      "src/app/settings/page.tsx",
      "src/app/groups/page.tsx",
    ]) {
      expect(read(f), f).toContain("<PageHeader");
    }
  });

  it("탭 화면 폭은 48rem(max-w-3xl) 하나 — 2xl·5xl 이 섞이지 않는다", () => {
    for (const f of [
      "src/app/routine/page.tsx",
      "src/app/plan/today/page.tsx",
      "src/app/groups/page.tsx",
      "src/app/settings/page.tsx",
      "src/features/community/components/community-board.tsx",
    ]) {
      expect(read(f), f).not.toMatch(/(?<![\w-])max-w-(2xl|4xl|5xl)(?![\w-])/);
    }
    expect(read("src/components/page-header.tsx")).toContain("max-w-3xl");
  });

  it("홈·운동탭·공통 머리글은 같은 큰 제목(.app-title, 30px) — 로고 막대 없음", () => {
    for (const f of ["src/app/home/page.tsx", "src/app/routine/page.tsx", "src/components/page-header.tsx"]) {
      const src = read(f);
      expect(src, f).toMatch(/<h1 className="[^"]*app-title/);
      expect(src, f).not.toContain("<Logo");
    }
    expect(read("src/styles/globals.css")).toMatch(/\.app-title \{[^}]*font-size: 1\.875rem/);
  });

  it("촘촘한 공통 조각(Section·List·Row·Tile)이 있다", () => {
    const ui = read("src/components/ui/compact.tsx");
    for (const name of ["export function Section", "export function List", "export function Row", "export function Tile"]) {
      expect(ui, name).toContain(name);
    }
    expect(read("src/styles/globals.css")).toMatch(/\.app-row \{[^}]*min-height: 3rem/);
  });

  it("운동탭: 진행 링과 운동 시작이 한 카드, 목록은 그룹 목록, 7일은 평소 가로 스크롤", () => {
    const ex = read("src/features/routine/components/today-exercises.tsx");
    expect(ex).toContain("function ProgressRing");
    expect(ex.indexOf("<ProgressRing")).toBeLessThan(ex.indexOf("<WorkoutSessionTimer"));
    for (const f of [
      "src/features/routine/components/today-plan-list.tsx",
      "src/features/routine/components/today-conditioning-list.tsx",
    ]) {
      // 목록에는 테스트가 잡을 이름(data-testid)도 붙는다 — 클래스만 찾지 않는다(2026-09-19).
      expect(read(f), f).toMatch(/<ul data-testid=[^>]*className="divide-y divide-\[var\(--line\)\]/);
    }
    expect(read("src/features/routine/components/upcoming-seven-days.tsx")).toContain("overflow-x-auto");
  });

  it("링크 글자에 경로(/plan)가 그대로 보이지 않는다", () => {
    expect(read("src/app/plan/today/page.tsx")).not.toMatch(/>\s*\/plan\s*</);
  });
});

describe("커뮤니티·설정 소음 제거 (5단계)", () => {
  it("커뮤니티에 그라데이션 버튼·제목과 자홍색이 없다(영상 자막 가림막만 예외)", () => {
    const board = read("src/features/community/components/community-board.tsx");
    expect(board).not.toContain("gradient");
    expect(board).not.toContain("fuchsia");
    const reels = read("src/features/community/components/teaching-reels.tsx");
    expect(reels).not.toContain("fuchsia");
    expect(reels.match(/gradient/g)?.length ?? 0).toBe(1);
    expect(reels).toContain("bg-gradient-to-t from-black/70");
  });

  it("화면 밝기는 설명 문구 없는 세그먼트 한 줄(권장·어두운 배경 같은 글 없음)", () => {
    const picker = read("src/features/theme/theme-picker.tsx");
    expect(picker).toContain('role="radiogroup"');
    for (const noisy of ["권장", "어두운 배경", "밝은 배경", "OS 설정", "현재 적용"]) {
      expect(picker, noisy).not.toContain(noisy);
    }
  });

  it("설정은 아이폰식 그룹 목록 — 행에 설명 문구가 없다", () => {
    const settings = read("src/app/settings/page.tsx");
    expect(settings).toContain('className="app-list"');
    expect(settings).not.toContain("desc:");
  });

  it("설정은 공통 행(SettingsRow) 하나로 — 행마다 다른 색 칩이 없다", () => {
    const settings = read("src/app/settings/page.tsx");
    expect(settings).toContain("function SettingsRow");
    expect(settings).not.toMatch(/\b(emerald|rose|amber|indigo)-\d{2,3}\b/);
    for (const title of ["마이페이지", "개인설정", "건강 연동", "구독", "알림 설정", "내 데이터 내보내기"]) {
      expect(settings, title).toContain(`title: "${title}"`);
    }
  });
});

describe("다른 탭도 같은 규칙 (2026-09-15 '다른 탭들도 똑같이')", () => {
  const RAINBOW = /(?<![\w:-])(bg|text|border|ring)-(emerald|amber|sky|rose|violet|indigo|orange|fuchsia|teal|cyan|pink)-\d{2,3}/;

  it("부위 배지는 한 모양(회색 알약 + 브랜드 점) — 부위마다 다른 색이 없다", () => {
    const data = read("src/features/routine/data.ts");
    const block = data.slice(data.indexOf("export const TONE_STYLES"), data.indexOf("};", data.indexOf("export const TONE_STYLES")));
    expect(block).not.toMatch(RAINBOW);
    expect(data).toContain('dot: "bg-brand"');
  });

  it("운동 목록 행·7일 그리드·전부 완료 버튼에 무지개 색 클래스가 없다", () => {
    for (const f of [
      "src/features/routine/components/today-plan-list.tsx",
      "src/features/routine/components/today-conditioning-list.tsx",
      "src/features/routine/components/upcoming-seven-days.tsx",
      "src/features/routine/components/mark-all-done-button.tsx",
      "src/features/routine/components/today-exercises.tsx",
    ]) {
      // 행 본문(스와이프 영역~목록 끝)만 본다 — 편집 폼·경고 문구의 red 는 위험색이라 허용.
      const src = read(f);
      const lines = src.split("\n").filter((l) => RAINBOW.test(l) && !/red-|amber-(6|7)00 dark:text-amber-(3|4)00"?\s*$/.test(l));
      const rowLines = lines.filter((l) =>
        /완료|오늘 휴식|kcal|StickyNote|GripVertical|ExerciseIcon|ConditioningIcon|오늘 전부 완료|다가오는 7일|오늘<|passedRight|isDragging|iconBg/.test(l),
      );
      expect(rowLines, f).toEqual([]);
    }
  });

  it("운동탭 섹션 제목에 색 아이콘 칩이 없고, 빈 안내는 짧다", () => {
    const ex = read("src/features/routine/components/today-exercises.tsx");
    expect(ex).not.toContain("ListChecks");
    expect(ex).not.toContain("headerBadge");
    expect(ex).not.toContain("또는 “추천으로 채우기”를 사용하세요");
    expect(ex).toContain("등록된 본운동이 없습니다");
  });

  it("식단: 머리글과 겹치는 '식단' 제목·끼니 이모지·빈 안내 문장·탄단지 3색이 없다", () => {
    const diet = read("src/features/diet/components/diet-board.tsx");
    expect(diet).not.toContain("아직 기록이 없어요 · ‘추가’로 식단을 올려보세요");
    expect(diet).not.toContain('color="#10b981"');
    expect(diet).not.toContain('color="#f59e0b"');
    expect(diet).not.toMatch(/<h1[^>]*>\s*<Utensils/);
    const water = read("src/features/diet/components/water-card.tsx");
    expect(water).not.toMatch(RAINBOW);
  });

  it("캘린더: 토요일 파랑·요약 카드 색 라벨이 없다", () => {
    const cal = read("src/app/calendar/page.tsx");
    expect(cal).not.toContain("text-sky-600");
    expect(cal).not.toContain('amber: "text-amber-600');
    expect(cal).toContain("이번 달 요약");
  });

  it("그룹·커뮤니티: 설명 문장·이모지 응원 문구가 없다", () => {
    expect(read("src/app/groups/page.tsx")).not.toContain("친구와 오늘 운동 인증을 서로 남겨보세요");
    expect(read("src/features/groups/components/groups-client.tsx")).not.toContain(
      "아직 그룹이 없어요. 그룹을 만들거나 초대 링크로 참여하세요.",
    );
    expect(read("src/features/community/components/community-board.tsx")).not.toContain(
      "오늘 운동 인증 첫 타자가 되어보세요",
    );
  });
});

describe("남은 화면 색 정리 (2026-09-15 '이대로 계속 진행')", () => {
  // 테마 색이 의미인 곳(러닝 게임·펫·그룹 헬스장·관리자)과 원상복구한 광고 배너는 예외.
  const EXEMPT = [
    /^src\/features\/(running|pet|admin)\//,
    /^src\/app\/(admin|running|jog)\//,
    /gym-room\.tsx$|group-board\.tsx$|group-leaderboard\.tsx$|group-switcher\.tsx$/,
    /promo-banner\.tsx$|bottom-nav\.tsx$/,
    // 그룹 멤버 아바타 팔레트 — 사람마다 다른 색을 주는 데이터라 브랜드색으로 합치면 안 된다.
    /^src\/features\/groups\/avatar\.ts$/,
  ];

  it("옛 초록(emerald-*) 클래스를 쓰지 않는다 — 브랜드 토큰(text-brand·bg-brand·bg-brand-soft)만", () => {
    const found = sourceFiles()
      .filter(([rel]) => !EXEMPT.some((re) => re.test(rel)))
      .flatMap(([rel, src]) =>
        src
          .split("\n")
          .map((line, i) =>
            /(?<![\w-])(?:[a-z-]+:)*(bg|text|border(?:-[tblrxy])?|ring|stroke|fill|accent|from|via|to|shadow|divide|outline)-emerald-\d{2,3}/.test(line)
              ? `${rel}:${i + 1}`
              : null,
          )
          .filter((x): x is string => x !== null),
      );
    expect(found).toEqual([]);
  });

  it("브랜드 바탕 버튼의 흰 글씨는 다크에서 어두운 글씨로 바뀐다(민트 바탕 대비)", () => {
    const bad = sourceFiles()
      .filter(([rel]) => !EXEMPT.some((re) => re.test(rel)))
      .flatMap(([rel, src]) =>
        src
          .split("\n")
          .map((line, i) =>
            /(?<![\w:/-])bg-brand(?![\w/-])/.test(line) &&
            /(?<![\w:-])text-white(?![\w/-])/.test(line) &&
            !/dark:text-/.test(line)
              ? `${rel}:${i + 1}`
              : null,
          )
          .filter((x): x is string => x !== null),
      );
    expect(bad).toEqual([]);
  });
});

describe("나머지 탭 촘촘하게 (2026-09-16 '전체적 변경')", () => {
  const between = (src: string, open: string, close: string) =>
    src.slice(src.indexOf(open), src.indexOf(close));

  it("공통 머리글: 뒤로가 없으면 빈 윗줄을 그리지 않고, 버튼은 큰 제목 줄 오른쪽", () => {
    const header = read("src/components/page-header.tsx");
    expect(header).not.toContain('"flex h-10 items-center');
    expect(header).toMatch(/\{back \|\| backHref \? \(/);
    // 하위 화면은 `‹ 설정` 처럼 돌아갈 화면 이름을 보여 줄 수 있다(8단계).
    expect(header).toContain("back?: boolean | string");
    expect(header.indexOf("app-title")).toBeLessThan(header.indexOf("{children}"));
  });

  it("캘린더: 달 이동이 머리글 안, 요약은 카드 4장 대신 한 장(세 칸 + 체중 한 줄)", () => {
    const cal = read("src/app/calendar/page.tsx");
    const header = between(cal, "<PageHeader", "</PageHeader>");
    // 2026-09-20 주 보기 추가 — 같은 버튼이 주 보기에선 '이전 주/다음 주' 가 된다(여전히 머리글 안).
    expect(header).toMatch(/aria-label=\{isWeek \? "이전 주" : "이전 달"\}|aria-label="이전 달"/);
    expect(header).toMatch(/aria-label=\{isWeek \? "다음 주" : "다음 달"\}|aria-label="다음 달"/);
    for (const gone of ["function SummaryCard", "function NetCard", "function WeightCard"]) {
      expect(cal, gone).not.toContain(gone);
    }
    expect(cal).toContain('<div className="grid grid-cols-3 divide-x');
    expect(cal).toContain("<WeightRow");
  });

  it("식단: 날짜 이동이 머리글 안(보드가 머리글을 그린다), 수분은 끼니 아래", () => {
    const board = read("src/features/diet/components/diet-board.tsx");
    const header = between(board, "<PageHeader", "</PageHeader>");
    expect(header).toContain('aria-label="이전 날"');
    expect(header).toContain('aria-label="다음 날"');
    const page = read("src/app/diet/page.tsx");
    expect(page).toContain("footer={");
    expect(page.indexOf("<DietBoard")).toBeLessThan(page.indexOf("<WaterCard"));
  });

  it("그룹: 만들기·참여는 입력칸과 버튼이 한 줄(전체 폭 큰 버튼 없음), 관리 화면도 큰 제목", () => {
    const groups = read("src/features/groups/components/groups-client.tsx");
    expect(groups).not.toContain("h-11 w-full");
    expect(groups.match(/app-card flex items-center gap-2 p-2/g)?.length).toBe(2);
    expect(read("src/app/groups/manage/page.tsx")).toContain("<PageHeader");
  });

  it("커뮤니티: 제목이 다른 탭과 같은 큰 제목(.app-title)", () => {
    expect(read("src/features/community/components/community-board.tsx")).toMatch(
      /<h1 className="[^"]*app-title/,
    );
  });
});

describe("하위 화면도 같은 머리글 (2026-09-16 8단계 '싹다 바꿔줘')", () => {
  const SUB_PAGES = [
    "settings/me", "settings/personal", "settings/health", "settings/subscription",
    "settings/notifications", "settings/export", "settings/gym", "settings/body-composition",
    "settings/profile", "settings/score", "settings/progress", "settings/history",
    "settings/history/[date]", "settings/routine", "change-password", "account-deletion",
    "exercises", "exercises/[slug]", "conditioning/[id]", "plan", "plan/today", "plan/muscle",
    "equipment", "commitments", "coach", "calendar/[date]", "groups/manage",
    "groups/[id]/member/[uid]", "groups/[id]/trainer", "groups/[id]/trainer/assign/[memberId]",
    "groups/[id]/trainer/billing", "groups/[id]/trainer/comment/[memberId]",
    "find-id", "find-password", "privacy", "pet",
  ].map((p) => `src/app/${p}/page.tsx`);
  // 머리글을 상태 있는 보드가 그리는 화면(날짜·달 이동이 보드 상태를 본다).
  const BOARD_HEADERS = [
    "src/features/community/components/post-detail.tsx",
    "src/features/cycle/components/cycle-board.tsx",
  ];

  it("하위 화면은 모두 공통 머리글(PageHeader) + .app-page 바탕", () => {
    for (const f of [...SUB_PAGES, ...BOARD_HEADERS]) expect(read(f), f).toContain("<PageHeader");
    for (const f of SUB_PAGES) expect(read(f), f).toContain("app-page");
  });

  it("옛 틀(넓은 폭·위아래 40px 여백·회색 바탕 main·글자 뒤로 줄)이 남지 않는다", () => {
    for (const f of SUB_PAGES) {
      const src = read(f);
      expect(src, f).not.toMatch(/(?<![\w-])max-w-(2xl|4xl|5xl)(?![\w-])/);
      expect(src, f).not.toMatch(/(?<![\w-])py-10(?![\w-])/);
      expect(src, f).not.toContain("min-h-screen bg-zinc-50");
      expect(src, f).not.toContain("<BackLink");
    }
  });

  it("공통 머리글은 돌아갈 화면 이름(‹ 설정)과 고정 경로(backHref)를 받는다", () => {
    expect(read("src/app/settings/me/page.tsx")).toContain('back="설정"');
    expect(read("src/app/groups/manage/page.tsx")).toContain('backHref="/groups"');
  });
});

describe("남은 화면까지 전부 (2026-09-18 8단계 마무리)", () => {
  /** src/app 아래 모든 page.tsx (관리자 화면은 사이드바 대시보드 — 따로 본다). */
  const APP_PAGES = (function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(resolve(ROOT, dir))) {
      const rel = join(dir, name);
      if (statSync(resolve(ROOT, rel)).isDirectory()) walk(rel, out);
      else if (name === "page.tsx") out.push(rel.split("\\").join("/"));
    }
    return out;
  })("src/app").filter((f) => !f.startsWith("src/app/admin/"));

  it("사용자 화면에는 옛 뒤로 줄(BackLink)·옛 넓은 폭 틀이 한 군데도 남지 않았다", () => {
    expect(APP_PAGES.length).toBeGreaterThan(30);
    for (const f of APP_PAGES) {
      const src = read(f);
      expect(src, f).not.toContain("<BackLink");
      // 옛 틀 = `mx-auto w-full max-w-… px-6 py-10`(공통 머리글 이전의 넓은 여백).
      expect(src, f).not.toMatch(/mx-auto w-full max-w-[\w-]+ px-6 py-10/);
    }
  });

  it("늑대 키우기도 공통 머리글 — 설명 문장 없이 그룹으로 돌아간다", () => {
    const pet = read("src/app/pet/page.tsx");
    expect(pet).toContain('<PageHeader title="늑대 키우기" back="그룹" backHref="/groups" />');
    expect(pet).not.toContain("운동할수록 Lv이 오르고");
    // 방·아이템 칸도 다른 화면과 같은 카드 토큰(따로 만든 흰 카드가 아니다).
    const studio = read("src/features/pet/components/pet-studio.tsx");
    expect(studio).not.toContain("shadow-sm");
    expect(studio).not.toContain("bg-white dark:bg-zinc-900");
    expect(studio).toContain("app-card");
  });

  it("관리자 화면은 사이드바 대시보드 한 틀 — 화면마다 다른 뒤로 줄이 없다", () => {
    const ADMIN = [
      "billing", "crons", "events", "exercise-media", "members", "reports", "settings", "test",
    ].map((p) => `src/app/admin/${p}/page.tsx`);
    for (const f of ADMIN) {
      const src = read(f);
      expect(src, f).toMatch(/<main className="mx-auto w-full max-w-\w+ px-6 py-10 sm:px-8">/);
      expect(src, f).toMatch(/<h1 className="mb-1 text-2xl font-bold/);
      expect(src, f).not.toContain("ChevronLeft");
      expect(src, f).not.toContain("<BackLink");
    }
  });
});

describe("하단 탭", () => {
  it("라벨이 11px 고정 — 좁은 폰에서도 9·10px 로 줄지 않는다", () => {
    const nav = read("src/components/bottom-nav.tsx");
    expect(nav).toContain("text-[11px]");
    expect(nav).not.toMatch(/text-\[(9|10)px\]/);
  });
});

describe("확인 모달과 서버액션 경쟁 (2026-09-21)", () => {
  // 모달이 작업보다 먼저 닫히면 useBackClose 의 history.back() 이 아직 날아가는 중인
  // 서버액션 POST 를 끊는다(ERR_ABORTED). 팔 교환이 조용히 안 먹던 원인.
  const editor = read("src/features/routine/components/plan-editor.tsx");

  it("확인 모달은 작업을 기다린 뒤에 닫는다", () => {
    expect(editor).toMatch(/onConfirm=\{async \(\) => \{/);
    for (const call of [
      "await doSwapArmRoutine(",
      "await doRecommendAll()",
      "await doRecommendFocus(",
      "await doRecommendFocuses(",
      "await doClearAll()",
    ]) {
      expect(editor, `${call} 를 기다리지 않는다`).toContain(call);
    }
  });

  it("화면을 통째로 바꾸는 성공 경로에선 모달을 닫지 않는다", () => {
    // reload/push 뒤에 닫으면 이번엔 그 back() 이 새로고침·이동을 취소한다.
    // 그래서 성공 경로는 resolve 하지 않고 화면 전환에 맡긴다.
    const reloadBlocks = editor.split("window.location.reload();");
    expect(reloadBlocks.length).toBeGreaterThan(1);
    for (const before of reloadBlocks.slice(0, -1)) {
      const tail = before.slice(-400);
      expect(tail, "새로고침 직전에 resolve 하면 안 된다").not.toMatch(/resolve\(\);\s*$/);
    }
  });
});
