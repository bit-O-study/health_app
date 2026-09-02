import { describe, expect, it } from "vitest";

import {
  HEALTH_FEATURES,
  getHealthFeature,
  isFeatureGranted,
  isHealthFeatureId,
  permissionsFor,
  readyFeatures,
} from "@/features/health/health-features";

describe("항목표", () => {
  it("id 가 겹치지 않는다 — 겹치면 마지막 동기화가 서로 덮어쓴다", () => {
    const ids = HEALTH_FEATURES.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("모든 항목에 '왜 필요한지'가 있다 — 이유 없이 동의를 구하지 않는다", () => {
    for (const f of HEALTH_FEATURES) {
      expect(f.why.length).toBeGreaterThan(0);
      expect(f.label.length).toBeGreaterThan(0);
    }
  });

  it("모든 항목이 권한을 하나 이상 요구한다(빈 항목은 화면만 차지한다)", () => {
    for (const f of HEALTH_FEATURES) {
      expect(f.read.length + f.write.length).toBeGreaterThan(0);
    }
  });

  it("동작하는 항목만 readyFeatures 에 들어간다", () => {
    for (const f of readyFeatures()) expect(f.status).toBe("ready");
    expect(readyFeatures().map((f) => f.id)).toContain("steps");
  });

  it("isHealthFeatureId 는 표에 있는 것만 통과시킨다", () => {
    expect(isHealthFeatureId("steps")).toBe(true);
    expect(isHealthFeatureId("body")).toBe(true);
    expect(isHealthFeatureId("nope")).toBe(false);
    expect(isHealthFeatureId(3)).toBe(false);
    expect(isHealthFeatureId(null)).toBe(false);
  });
});

describe("permissionsFor — 켠 항목의 권한만", () => {
  it("고른 항목의 권한만 준다", () => {
    expect(permissionsFor(["steps"])).toEqual({ read: ["Steps"], write: [] });
  });

  it("체성분은 체지방·근육량까지 함께 — 체중만 받으면 그래프 두 줄이 빈다", () => {
    const p = permissionsFor(["body"]);
    expect(p.read).toEqual(["Weight", "BodyFat", "LeanBodyMass"]);
  });

  it("여러 항목을 합쳐도 같은 권한은 한 번만 — 중복은 요청이 통째로 거절된다", () => {
    const p = permissionsFor(["steps", "body", "steps"]);
    expect(p.read.filter((r) => r === "Steps")).toHaveLength(1);
    expect(new Set(p.read).size).toBe(p.read.length);
  });

  it("🔴 준비 중인 항목은 조용히 빠진다 — 안 쓰는 권한을 미리 받지 않는다", () => {
    const planned = HEALTH_FEATURES.filter((f) => f.status === "planned");
    expect(planned.length).toBeGreaterThan(0); // 표가 비면 이 테스트가 무의미해진다
    const p = permissionsFor(planned.map((f) => f.id));
    expect(p).toEqual({ read: [], write: [] });
  });

  it("모르는 id 는 무시한다", () => {
    expect(permissionsFor(["nope" as never])).toEqual({ read: [], write: [] });
  });

  it("빈 목록이면 아무 권한도 요청하지 않는다", () => {
    expect(permissionsFor([])).toEqual({ read: [], write: [] });
  });
});

describe("isFeatureGranted — 하나라도 빠지면 '연결됨'이 아니다", () => {
  const body = getHealthFeature("body")!;
  const steps = getHealthFeature("steps")!;

  it("기기가 주는 접두사 붙은 문자열도 알아본다", () => {
    expect(
      isFeatureGranted(steps, ["android.permission.health.READ_STEPS"]),
    ).toBe(true);
  });

  it("🔴 체중만 허용하고 체지방을 뺐으면 연결됨이 아니다", () => {
    expect(
      isFeatureGranted(body, [
        "android.permission.health.READ_WEIGHT",
        "android.permission.health.READ_LEAN_BODY_MASS",
      ]),
    ).toBe(false);
  });

  it("셋 다 허용되면 연결됨", () => {
    expect(
      isFeatureGranted(body, [
        "android.permission.health.READ_WEIGHT",
        "android.permission.health.READ_BODY_FAT",
        "android.permission.health.READ_LEAN_BODY_MASS",
      ]),
    ).toBe(true);
  });

  it("허용 목록이 비면 연결됨이 아니다", () => {
    expect(isFeatureGranted(steps, [])).toBe(false);
  });

  it("다른 항목 권한만 있으면 연결됨이 아니다", () => {
    expect(
      isFeatureGranted(body, ["android.permission.health.READ_STEPS"]),
    ).toBe(false);
  });
});
