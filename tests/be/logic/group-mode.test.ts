import { describe, expect, it } from "vitest";

import {
  DEFAULT_GROUP_MODE,
  GROUP_INVITE_DESCRIPTION,
  GROUP_MODES,
  GROUP_MODE_KEY,
  GROUP_MODE_LABEL,
  groupDetailRedirect,
  groupTabHref,
  isGroupMode,
  parseGroupMode,
} from "@/features/groups/group-mode";

describe("group mode registry", () => {
  it("has exactly gym + proof, unique", () => {
    expect([...GROUP_MODES].sort()).toEqual(["gym", "proof"]);
  });
  it("default mode is gym (기존 헬스장 보존)", () => {
    expect(DEFAULT_GROUP_MODE).toBe("gym");
  });
  it("stores under group.mode", () => {
    expect(GROUP_MODE_KEY).toBe("group.mode");
  });
  it("every mode has a label", () => {
    for (const m of GROUP_MODES) {
      expect(GROUP_MODE_LABEL[m].trim().length).toBeGreaterThan(0);
    }
  });
});

describe("isGroupMode", () => {
  it("passes only gym/proof", () => {
    expect(isGroupMode("gym")).toBe(true);
    expect(isGroupMode("proof")).toBe(true);
    expect(isGroupMode("nope")).toBe(false);
    expect(isGroupMode(null)).toBe(false);
    expect(isGroupMode(undefined)).toBe(false);
  });
});

describe("groupTabHref — 그룹 진입은 모드를 아는 정식 경로로", () => {
  it("/groups?g=<id>", () => {
    expect(groupTabHref("abc-123")).toBe("/groups?g=abc-123");
  });
  it("id 를 인코딩한다", () => {
    expect(groupTabHref("a b&c")).toBe("/groups?g=a%20b%26c");
  });
});

describe("groupDetailRedirect — /groups/[id] 는 헬스장 전용", () => {
  // 회귀: 카톡 초대 링크로 가입하면 /groups/[id] 로 이동했는데, 이 화면이 모드를
  // 안 봐서 인증 모드인데도 '캐릭터 키우기'(공유펫 헬스장)가 떴다.
  it("인증 모드면 그룹탭으로 보낸다", () => {
    expect(groupDetailRedirect("proof", "g1")).toBe("/groups?g=g1");
  });
  it("헬스장 모드면 그대로 렌더(null)", () => {
    expect(groupDetailRedirect("gym", "g1")).toBeNull();
  });
  it("기본 모드에서는 리다이렉트하지 않는다", () => {
    expect(groupDetailRedirect(DEFAULT_GROUP_MODE, "g1")).toBeNull();
  });
});

describe("GROUP_INVITE_DESCRIPTION — 초대 카드 문구가 화면과 맞아야 한다", () => {
  it("모드마다 문구가 있다", () => {
    for (const m of GROUP_MODES) {
      expect(GROUP_INVITE_DESCRIPTION[m].trim().length).toBeGreaterThan(0);
    }
  });
  it("인증 모드 초대에는 '랭킹' 을 말하지 않는다", () => {
    expect(GROUP_INVITE_DESCRIPTION.proof).not.toContain("랭킹");
    expect(GROUP_INVITE_DESCRIPTION.proof).toContain("인증");
  });
  it("헬스장 모드 초대는 랭킹대전", () => {
    expect(GROUP_INVITE_DESCRIPTION.gym).toContain("랭킹");
  });
});

describe("parseGroupMode — 기본 gym, 오직 'proof' 만 전환", () => {
  it("'proof' → proof", () => {
    expect(parseGroupMode("proof")).toBe("proof");
  });
  it("미설정/null/그 외 → gym", () => {
    expect(parseGroupMode(undefined)).toBe("gym");
    expect(parseGroupMode(null)).toBe("gym");
    expect(parseGroupMode("gym")).toBe("gym");
    expect(parseGroupMode("something")).toBe("gym");
    expect(parseGroupMode(false)).toBe("gym");
  });
});