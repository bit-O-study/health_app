import { describe, expect, it } from "vitest";

import {
  DEFAULT_GROUP_MODE,
  GROUP_MODES,
  GROUP_MODE_KEY,
  GROUP_MODE_LABEL,
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