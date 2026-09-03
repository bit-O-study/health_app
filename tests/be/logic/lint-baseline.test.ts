import { describe, expect, it } from "vitest";

// 기준선 비교는 순수 로직 — eslint 를 돌리지 않고 JSON 결과 모양만 넣어 검증한다.
import {
  compareCounts,
  extractJson,
  hasImprovement,
  hasRegression,
  renderDiff,
  resultsToCounts,
  serializeBaseline,
  toRelative,
  totalErrors,
} from "../../../tools/lint/lint-baseline.mjs";

const ROOT = "C:/git/heltch/health_app";

/** ESLint JSON 결과 한 건을 만든다. */
const file = (
  filePath: string,
  msgs: Array<{ ruleId: string | null; severity: number }>,
) => ({ filePath, messages: msgs });

const err = (ruleId: string | null) => ({ ruleId, severity: 2 });
const warn = (ruleId: string | null) => ({ ruleId, severity: 1 });

describe("toRelative — OS 차이와 절대경로를 걷어낸다", () => {
  it("윈도우 역슬래시 경로를 상대경로로", () => {
    expect(
      toRelative("C:\\git\\heltch\\health_app\\src\\a.tsx", "C:\\git\\heltch\\health_app"),
    ).toBe("src/a.tsx");
  });

  it("루트에 슬래시가 붙어 있어도 같은 결과", () => {
    expect(toRelative("C:/git/x/src/a.tsx", "C:/git/x/")).toBe("src/a.tsx");
  });

  it("루트 밖 경로는 그대로 둔다", () => {
    expect(toRelative("D:/other/a.tsx", "C:/git/x")).toBe("D:/other/a.tsx");
  });
});

describe("resultsToCounts — 에러만, 파일×규칙으로 센다", () => {
  it("경고는 세지 않는다(기준선은 에러만 막는다)", () => {
    const counts = resultsToCounts(
      [file(`${ROOT}/src/a.tsx`, [err("no-x"), warn("no-y")])],
      ROOT,
    );
    expect(counts).toEqual({ "src/a.tsx::no-x": 1 });
  });

  it("같은 파일·같은 규칙은 개수로 합친다", () => {
    const counts = resultsToCounts(
      [file(`${ROOT}/src/a.tsx`, [err("no-x"), err("no-x"), err("no-z")])],
      ROOT,
    );
    expect(counts).toEqual({ "src/a.tsx::no-x": 2, "src/a.tsx::no-z": 1 });
  });

  it("규칙 id 가 없는 파서·설정 오류도 놓치지 않는다", () => {
    const counts = resultsToCounts([file(`${ROOT}/src/a.tsx`, [err(null)])], ROOT);
    expect(counts).toEqual({ "src/a.tsx::(parse/config)": 1 });
  });

  it("문제 없는 파일은 키를 만들지 않는다", () => {
    expect(resultsToCounts([file(`${ROOT}/src/ok.tsx`, [])], ROOT)).toEqual({});
  });

  it("빈 입력도 안전", () => {
    expect(resultsToCounts([], ROOT)).toEqual({});
    expect(resultsToCounts(undefined, ROOT)).toEqual({});
  });

  it("줄 번호는 키에 안 들어간다 — 코드가 밀려도 같은 키", () => {
    const a = resultsToCounts([file(`${ROOT}/src/a.tsx`, [err("no-x")])], ROOT);
    const b = resultsToCounts([file(`${ROOT}/src/a.tsx`, [err("no-x")])], ROOT);
    expect(Object.keys(a)).toEqual(Object.keys(b));
  });
});

describe("compareCounts / hasRegression — 늘어난 것만 막는다", () => {
  const baseline = { "src/a.tsx::no-x": 2, "src/b.tsx::no-y": 1 };

  it("그대로면 회귀 아님", () => {
    const d = compareCounts(baseline, { ...baseline });
    expect(hasRegression(d)).toBe(false);
    expect(hasImprovement(d)).toBe(false);
  });

  it("새 파일·새 규칙 조합은 차단", () => {
    const d = compareCounts(baseline, { ...baseline, "src/c.tsx::no-z": 1 });
    expect(hasRegression(d)).toBe(true);
    expect(d.added).toEqual([{ key: "src/c.tsx::no-z", count: 1 }]);
  });

  it("있던 조합이 늘어나도 차단", () => {
    const d = compareCounts(baseline, { ...baseline, "src/a.tsx::no-x": 3 });
    expect(hasRegression(d)).toBe(true);
    expect(d.increased).toEqual([{ key: "src/a.tsx::no-x", from: 2, to: 3 }]);
  });

  it("줄어들면 회귀가 아니라 개선", () => {
    const d = compareCounts(baseline, { ...baseline, "src/a.tsx::no-x": 1 });
    expect(hasRegression(d)).toBe(false);
    expect(hasImprovement(d)).toBe(true);
    expect(d.decreased).toEqual([{ key: "src/a.tsx::no-x", from: 2, to: 1 }]);
  });

  it("사라지면 removed 로 잡힌다", () => {
    const d = compareCounts(baseline, { "src/a.tsx::no-x": 2 });
    expect(hasRegression(d)).toBe(false);
    expect(d.removed).toEqual([{ key: "src/b.tsx::no-y", from: 1 }]);
  });

  it("한 파일이 고쳐지고 다른 파일이 나빠지면 여전히 차단", () => {
    const d = compareCounts(baseline, {
      "src/a.tsx::no-x": 1,
      "src/b.tsx::no-y": 1,
      "src/new.tsx::no-z": 1,
    });
    expect(hasRegression(d)).toBe(true);
    expect(hasImprovement(d)).toBe(true);
  });

  it("합계를 함께 보고한다", () => {
    const d = compareCounts(baseline, { "src/a.tsx::no-x": 5 });
    expect(d.baselineTotal).toBe(3);
    expect(d.currentTotal).toBe(5);
  });

  it("기준선이 비어 있으면 현재 에러가 전부 신규", () => {
    const d = compareCounts({}, { "src/a.tsx::no-x": 1 });
    expect(hasRegression(d)).toBe(true);
    expect(d.added).toHaveLength(1);
  });

  it("둘 다 비어 있으면 통과", () => {
    expect(hasRegression(compareCounts({}, {}))).toBe(false);
  });

  it("undefined 를 넣어도 죽지 않는다", () => {
    expect(hasRegression(compareCounts(undefined, undefined))).toBe(false);
  });
});

describe("totalErrors", () => {
  it("개수를 모두 더한다", () => {
    expect(totalErrors({ a: 2, b: 3 })).toBe(5);
    expect(totalErrors({})).toBe(0);
    expect(totalErrors(undefined)).toBe(0);
  });
});

describe("renderDiff — CI 로그에 그대로 찍는다", () => {
  it("신규 에러를 짚어준다", () => {
    const out = renderDiff(compareCounts({}, { "src/a.tsx::no-x": 2 }));
    expect(out).toContain("새로 생긴 에러");
    expect(out).toContain("src/a.tsx::no-x (2건)");
  });

  it("개선이 있으면 기준선 갱신 방법을 알려준다", () => {
    const out = renderDiff(compareCounts({ "src/a.tsx::no-x": 2 }, {}));
    expect(out).toContain("--update");
  });

  it("변화가 없으면 그렇게 말한다", () => {
    const out = renderDiff(compareCounts({ a: 1 }, { a: 1 }));
    expect(out).toContain("기준선과 동일");
  });

  it("합계를 첫 줄에 적는다", () => {
    const out = renderDiff(compareCounts({ a: 1 }, { a: 3 }));
    expect(out.split("\n")[0]).toBe("린트 에러: 기준선 1건 → 현재 3건");
  });
});

describe("serializeBaseline — 키를 정렬해 저장", () => {
  it("동시 작업 중에도 diff 가 흔들리지 않게 정렬한다", () => {
    const out = serializeBaseline({ "z::r": 1, "a::r": 2 });
    expect(Object.keys(JSON.parse(out))).toEqual(["a::r", "z::r"]);
  });

  it("줄바꿈으로 끝난다", () => {
    expect(serializeBaseline({ a: 1 }).endsWith("\n")).toBe(true);
  });

  it("빈 입력도 유효한 JSON", () => {
    expect(JSON.parse(serializeBaseline({}))).toEqual({});
    expect(JSON.parse(serializeBaseline(undefined))).toEqual({});
  });
});

describe("extractJson — pnpm 이 앞에 붙이는 잡음을 걷어낸다", () => {
  it("앞에 붙은 줄을 무시하고 배열만 뽑는다", () => {
    const raw = 'Already up to date\nDone in 600ms\n[{"filePath":"a"}]';
    expect(extractJson(raw)).toEqual([{ filePath: "a" }]);
  });

  it("순수 JSON 도 그대로 읽는다", () => {
    expect(extractJson("[]")).toEqual([]);
  });

  it("JSON 이 없으면 null", () => {
    expect(extractJson("no json here")).toBeNull();
    expect(extractJson("")).toBeNull();
    expect(extractJson(undefined)).toBeNull();
  });

  it("깨진 JSON 은 null (예외로 죽지 않는다)", () => {
    expect(extractJson("[{broken")).toBeNull();
  });

  it("배열이 아니면 null", () => {
    expect(extractJson('prefix {"a":1}')).toBeNull();
  });
});
