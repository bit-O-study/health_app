import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { FocusKey } from "@/features/routine/exercise-catalog";
import { EXERCISE_SUB_MUSCLES } from "@/features/routine/muscle-detail";
import {
  focusExercisesForSlot,
  focusPicksForSlot,
  focusVariantIndex,
  frequentlySkippedIds,
  recommendFocusPicks,
  recommendedExercisesForFocus,
  weakSubsFromWeek,
} from "@/features/routine/recommend";
import {
  BEGINNER_FIRST_SLOT_AVOID,
  movementPatternsFor,
} from "@/features/routine/recommend-patterns";

/**
 * 루틴 추천 고도화 1·2단계 (2026-09-25, docs/routine-recommend-review-2026-09-25.html).
 * 사용자 결정: 1+2단계 · 입문은 첫 칸에서만 고위험 운동 제외 · 같은 부위 날은 A/B · 새로 추천할 때만.
 */

const FOCUSES: FocusKey[] = ["chest", "back", "shoulder", "arm", "lower", "fullbody", "upper", "push", "pull", "core"];
const GENDERS = ["male", "female"] as const;
const LEVELS = ["beginner", "intermediate", "advanced"] as const;
const ids = (focus: FocusKey, gender: "male" | "female", ctx = {}) =>
  recommendFocusPicks(focus, gender, 4, null, ctx).map((p) => p.exercise.id);

const VERTICAL_PULL = ["pull-up", "lat-pulldown", "chin-up", "wide-grip-pull-up", "assisted-pull-up"];
const HORIZONTAL_PULL = ["barbell-row", "seated-cable-row", "t-bar-row", "one-arm-dumbbell-row", "chest-supported-row", "low-row-machine"];
const hitsSub = (id: string, prefix: string) =>
  (EXERCISE_SUB_MUSCLES[id] ?? []).some((s) => s.startsWith(prefix));

describe("R1 필수 동작 보장", () => {
  it("등 추천엔 수직 당기기와 수평 당기기가 반드시 있다(남·여·전 경력)", () => {
    for (const g of GENDERS)
      for (const experience of LEVELS) {
        const list = ids("back", g, { experience });
        expect(list.some((id) => VERTICAL_PULL.includes(id)), `${g}/${experience}: ${list}`).toBe(true);
        expect(list.some((id) => HORIZONTAL_PULL.includes(id)), `${g}/${experience}: ${list}`).toBe(true);
      }
  });

  it("남자 등에 슈러그·하이퍼익스텐션이 수직 당기기 자리를 차지하던 문제가 사라졌다", () => {
    const list = ids("back", "male");
    expect(list).not.toContain("shrug");
    expect(list).toContain("pull-up");
  });

  it("팔 추천은 이두 2 : 삼두 2 (남·여)", () => {
    for (const g of GENDERS)
      for (const experience of LEVELS) {
        const list = ids("arm", g, { experience });
        const bi = list.filter((id) => hitsSub(id, "arm-biceps") || id.includes("curl")).length;
        const tri = list.filter((id) => hitsSub(id, "arm-triceps")).length;
        expect([bi, tri], `${g}/${experience}: ${list}`).toEqual([2, 2]);
      }
  });

  it("하체는 무릎 주도 + 뒤허벅지가 같이 들어간다", () => {
    for (const g of GENDERS) {
      const list = ids("lower", g);
      expect(list.some((id) => hitsSub(id, "lower-quads")), list.join()).toBe(true);
      expect(list.some((id) => hitsSub(id, "lower-hamstrings")), list.join()).toBe(true);
    }
  });

  it("패턴이 있는 부위는 패턴마다 한 칸씩 채운다(4칸 이하 패턴이면 전부)", () => {
    for (const focus of FOCUSES)
      for (const g of GENDERS) {
        const patterns = movementPatternsFor(focus, g);
        const picks = recommendFocusPicks(focus, g, 4, null, {});
        expect(picks).toHaveLength(4);
        for (const p of patterns.slice(0, 4)) {
          expect(
            picks.some((pick) => pick.reason.startsWith(p.label)),
            `${focus}/${g} 에 '${p.label}' 칸이 없다: ${picks.map((x) => x.reason)}`,
          ).toBe(true);
        }
      }
  });

  it("같은 운동이 두 칸에 들어가지 않는다", () => {
    for (const focus of FOCUSES)
      for (const g of GENDERS)
        for (const experience of LEVELS)
          for (const variant of [0, 1, 2]) {
            const list = ids(focus, g, { experience, variant });
            expect(new Set(list).size, `${focus}/${g}/${experience}/${variant}`).toBe(list.length);
          }
  });
});

describe("R2 경력별 선택", () => {
  it("입문 첫 칸엔 고위험 바벨 운동을 두지 않는다(모든 부위·성별·A/B)", () => {
    for (const focus of FOCUSES)
      for (const g of GENDERS)
        for (const variant of [0, 1]) {
          const first = ids(focus, g, { experience: "beginner", variant })[0];
          expect(BEGINNER_FIRST_SLOT_AVOID.has(first), `${focus}/${g}/${variant}: ${first}`).toBe(false);
        }
  });

  it("입문 전신은 머신·안정적인 변형 위주(바벨 스쿼트·벤치·OHP 대신)", () => {
    const list = ids("fullbody", "male", { experience: "beginner" });
    expect(list).toEqual(["leg-press", "machine-chest-press", "seated-cable-row", "machine-shoulder-press"]);
  });

  it("중급·고급은 예전처럼 프리웨이트 킹 운동이 앞에 온다", () => {
    expect(ids("fullbody", "male", { experience: "advanced" })).toEqual(["squat", "bench-press", "barbell-row", "ohp"]);
    expect(ids("chest", "male")[0]).toBe("bench-press");
  });

  it("'입문 추천' 이유는 입문이라 운동을 바꾼 칸에만 붙는다", () => {
    const picks = recommendFocusPicks("shoulder", "male", 4, null, { experience: "beginner" });
    const side = picks.find((p) => p.exercise.id === "lateral-raise");
    expect(side?.reason).not.toContain("입문 추천");
    const press = picks.find((p) => p.exercise.id === "machine-shoulder-press");
    expect(press?.reason).toContain("입문 추천");
  });
});

describe("R3 같은 부위 날은 A/B", () => {
  it("전신 A와 B는 운동이 다르지만 필수 동작은 같다", () => {
    for (const experience of LEVELS) {
      const a = recommendFocusPicks("fullbody", "male", 4, null, { experience, variant: 0 });
      const b = recommendFocusPicks("fullbody", "male", 4, null, { experience, variant: 1 });
      expect(b.map((p) => p.exercise.id)).not.toEqual(a.map((p) => p.exercise.id));
      expect(b.map((p) => p.reason.split(" · ")[0])).toEqual(a.map((p) => p.reason.split(" · ")[0]));
    }
  });

  it("focusVariantIndex — 같은 주에서 같은 부위가 몇 번째인지(보조 슬롯은 안 센다)", () => {
    const slots = [
      { dayIndex: 0, focus: "fullbody" },
      { dayIndex: 1, focus: "fullbody" },
      { dayIndex: 1, focus: "arm", isSide: true },
      { dayIndex: 2, focus: "fullbody" },
      { dayIndex: 2, focus: "arm", isSide: true },
    ];
    expect(focusVariantIndex(slots, 0, "fullbody")).toBe(0);
    expect(focusVariantIndex(slots, 1, "fullbody")).toBe(1);
    expect(focusVariantIndex(slots, 2, "fullbody")).toBe(2);
    expect(focusVariantIndex(slots, 2, "arm")).toBe(0);
  });
});

describe("H1 이번 주 0세트 세부근육 먼저", () => {
  it("종아리가 0세트면 하체 추천에 종아리 운동이 들어오고 이유에 적힌다", () => {
    const picks = recommendFocusPicks("lower", "male", 4, null, { weakSubs: new Set(["lower-calves"]) });
    const calf = picks.find((p) => hitsSub(p.exercise.id, "lower-calves"));
    expect(calf, picks.map((p) => p.exercise.id).join()).toBeTruthy();
    expect(calf!.reason).toContain("이번 주 0세트");
  });

  it("weakSubsFromWeek — 이번 주 아무것도 안 했으면 비운다(전부 0세트는 '부족' 이 아니다)", () => {
    const untouchedSubs = [{ id: "back-lats" }, { id: "lower-calves" }];
    expect([...weakSubsFromWeek({ weekSets: 0, untouchedSubs })]).toEqual([]);
    expect([...weakSubsFromWeek({ weekSets: 12, untouchedSubs })].sort()).toEqual(["back-lats", "lower-calves"]);
    expect([...weakSubsFromWeek(null)]).toEqual([]);
  });
});

describe("H2 자주 건너뛴 운동은 뒤로", () => {
  it("풀업을 자주 건너뛰면 수직 당기기는 랫풀다운으로 — 동작은 유지", () => {
    const list = ids("back", "male", { avoid: new Set(["pull-up"]) });
    expect(list).not.toContain("pull-up");
    expect(list).toContain("lat-pulldown");
  });

  it("frequentlySkippedIds — 2번 이상 '건너뛰기' 한 운동만", () => {
    const set = frequentlySkippedIds([
      { exerciseId: "pull-up", status: "skipped" },
      { exerciseId: "pull-up", status: "skipped" },
      { exerciseId: "squat", status: "skipped" },
      { exerciseId: "squat", status: "done" },
      { exerciseId: null, status: "skipped" },
    ]);
    expect([...set]).toEqual(["pull-up"]);
  });
});

describe("H3 추천 이유", () => {
  it("모든 추천 칸에 이유가 있다", () => {
    for (const focus of FOCUSES)
      for (const g of GENDERS)
        for (const p of recommendFocusPicks(focus, g, 4, null, {})) expect(p.reason.trim(), `${focus}/${g}`).not.toBe("");
  });

  it("세부 블록(이두) 슬롯의 이유는 블록 이름", () => {
    expect(focusPicksForSlot("arm", ["biceps"]).every((p) => p.reason === "이두")).toBe(true);
  });
});

describe("호환", () => {
  it("focusExercisesForSlot 은 recommendFocusPicks 와 같은 운동을 준다", () => {
    const ctx = { experience: "beginner" as const, variant: 1 };
    expect(focusExercisesForSlot("back", [], "female", null, ctx).map((e) => e.id)).toEqual(
      ids("back", "female", ctx),
    );
  });

  it("recommendedExercisesForFocus 는 필수 동작 4칸을 앞에 두고 길이는 예전 목록 이상", () => {
    const list = recommendedExercisesForFocus("lower", "male").map((e) => e.id);
    expect(list.slice(0, 4)).toEqual(ids("lower", "male"));
    expect(list.length).toBeGreaterThanOrEqual(6);
    expect(new Set(list).size).toBe(list.length);
  });
});

describe("추천 쓰는 곳이 전부 경력·A/B·기록을 넘긴다(한 곳만 고치면 그 문으로 들어온 사용자만 옛 추천)", () => {
  const read = (rel: string) => readFileSync(resolve(process.cwd(), rel), "utf8");

  it("루틴 채우기·추천 루틴 등록은 variant 와 신호를 넘긴다", () => {
    for (const f of ["src/features/routine/actions.ts", "src/features/routine/plan-actions.ts"]) {
      const src = read(f);
      expect(src, f).toContain("variant: focusVariantIndex(slots, slot.dayIndex, slot.focus)");
      expect(src, f).toContain("getRecommendSignals()");
    }
  });

  it("편집 화면 추천(서버 액션)은 경력·신호를 읽고, 두 편집기는 이유를 보여 준다", () => {
    expect(read("src/features/routine/slot-exercise-actions.ts")).toContain("currentRecommendContext()");
    expect(read("src/features/routine/components/plan-editor.tsx")).toContain('data-testid="recommend-reason"');
    expect(read("src/features/routine/components/plan-editor.tsx")).toContain("variant: f.isSide");
    expect(read("src/features/routine/components/daily-main-editor.tsx")).toContain('data-testid="recommend-reason"');
  });
});
