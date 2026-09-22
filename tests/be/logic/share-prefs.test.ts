import { describe, expect, it } from "vitest";

import {
  DEFAULT_SHARE_PREFS,
  SHARE_COLUMN,
  SHARE_KINDS,
  anyHidden,
  hiddenKindsOf,
  isShareKind,
  parseSharePrefs,
  shareSummary,
} from "@/features/groups/share-prefs";
import {
  attentionOf,
  trainerSummary,
  type TrainerMember,
} from "@/features/groups/trainer-board";

const TODAY = "2026-09-20";

function member(over: Partial<TrainerMember> = {}): TrainerMember {
  return {
    userId: "u1",
    name: "회원",
    workoutDays: 3,
    dietDays: 3,
    targetDays: 3,
    lastWorkout: TODAY,
    weightFirst: 70,
    weightLast: 70,
    untouchedRegions: [],
    ...over,
  };
}

describe("제공 설정 파싱", () => {
  it("🔴 행이 없으면 전부 제공(기본값)", () => {
    // 기본을 꺼짐으로 두면 쓰고 있던 트레이너 화면이 어느 날 통째로 빈다.
    expect(parseSharePrefs(null)).toEqual(DEFAULT_SHARE_PREFS);
    expect(parseSharePrefs(undefined)).toEqual(DEFAULT_SHARE_PREFS);
    expect(parseSharePrefs({})).toEqual(DEFAULT_SHARE_PREFS);
  });

  it("🔴 false 만 '끔' 이다 — 컬럼이 비어 있으면 켜진 것으로 본다", () => {
    // 새 컬럼이 늘 때마다 기존 회원의 제공이 멋대로 꺼지면 안 된다.
    expect(parseSharePrefs({ share_diet: null }).diet).toBe(true);
    expect(parseSharePrefs({ share_diet: false }).diet).toBe(false);
  });

  it("컬럼 이름이 모든 항목에 하나씩 있다", () => {
    for (const k of SHARE_KINDS) expect(SHARE_COLUMN[k]).toBeTruthy();
    expect(new Set(Object.values(SHARE_COLUMN)).size).toBe(SHARE_KINDS.length);
  });

  it("알 수 없는 항목은 거른다(액션에 아무 문자열이나 들어올 수 있다)", () => {
    expect(isShareKind("diet")).toBe(true);
    expect(isShareKind("weight")).toBe(false);
    expect(isShareKind(null)).toBe(false);
  });
});

describe("가릴 항목", () => {
  it("🔴 '처방 허용' 은 열람 항목이 아니라 비공개 목록에 안 들어간다", () => {
    // 처방을 막은 것과 정보를 안 보여주는 것은 다른 이야기다.
    const prefs = { ...DEFAULT_SHARE_PREFS, prescription: false };
    expect(hiddenKindsOf(prefs)).toEqual([]);
    expect(anyHidden(prefs)).toBe(true);
  });

  it("끈 열람 항목만 순서대로 돌려준다", () => {
    expect(
      hiddenKindsOf({ workout: false, diet: true, body: false, prescription: true }),
    ).toEqual(["workout", "body"]);
  });

  it("한 줄 요약", () => {
    expect(shareSummary(DEFAULT_SHARE_PREFS)).toBe("전부 제공 중");
    expect(shareSummary({ ...DEFAULT_SHARE_PREFS, diet: false })).toBe(
      "식단 기록 제공 중단",
    );
  });
});

describe("비공개 회원의 트레이너 판정", () => {
  it("🔴 식단을 껐으면 '식단 기록 없음' 으로 몰지 않는다", () => {
    const m = member({ dietDays: 0, hidden: ["diet"] });
    const labels = attentionOf(m, TODAY).map((a) => a.label);
    expect(labels).not.toContain("이번 주 식단 기록 없음");
    expect(labels).toContain("식단 비공개");
  });

  it("🔴 운동을 껐으면 결석·달성률·부위 판정을 하지 않는다", () => {
    // 가려서 0 이 된 값으로 '아직 운동 기록이 없어요' 를 띄우면 트레이너가 헛걸음한다.
    const m = member({
      workoutDays: 0,
      targetDays: 0,
      lastWorkout: null,
      untouchedRegions: [],
      hidden: ["workout"],
    });
    const flags = attentionOf(m, TODAY);
    expect(flags.map((a) => a.kind)).toEqual(["private"]);
    expect(flags[0].label).toBe("운동 비공개");
  });

  it("체중을 껐으면 체중 변화 알림이 없다", () => {
    const m = member({ weightFirst: null, weightLast: null, hidden: ["body"] });
    expect(attentionOf(m, TODAY).some((a) => a.kind === "weight")).toBe(false);
  });

  it("여러 항목을 끄면 한 줄로 묶는다", () => {
    const m = member({ hidden: ["workout", "diet", "body"] });
    expect(attentionOf(m, TODAY)[0].label).toBe("운동·식단·체중 비공개");
  });

  it("🔴 비공개는 정렬을 흔들지 않는다(가중치 0)", () => {
    const m = member({ hidden: ["workout", "diet", "body"] });
    expect(attentionOf(m, TODAY).reduce((s, a) => s + a.weight, 0)).toBe(0);
  });

  it("🔴 비공개 회원은 '챙길 회원' 수에 안 들어간다", () => {
    // 할 일이 없는데 숫자가 올라가면 화면 맨 위가 거짓말을 한다.
    const hiddenOnly = member({
      userId: "h",
      workoutDays: 0,
      targetDays: 0,
      lastWorkout: null,
      dietDays: 0,
      weightFirst: null,
      weightLast: null,
      hidden: ["workout", "diet", "body"],
    });
    const needsHelp = member({ userId: "n", lastWorkout: "2026-09-01" });
    const s = trainerSummary([hiddenOnly, needsHelp], TODAY);
    expect(s.total).toBe(2);
    expect(s.needsAttention).toBe(1);
  });

  it("제공 중인 회원의 판정은 그대로다", () => {
    const m = member({ dietDays: 0 });
    expect(attentionOf(m, TODAY).map((a) => a.label)).toContain(
      "이번 주 식단 기록 없음",
    );
  });
});
