import { describe, expect, it } from "vitest";

import {
  pickNewBodyLogs,
  toBodyEntries,
  type BodyEntry,
} from "@/features/health/body-import";

const T = (iso: string) => ({ time: iso });

describe("toBodyEntries — 레코드를 앱 기록 모양으로", () => {
  it("체중은 { inKilograms } 로 온다", () => {
    const out = toBodyEntries({
      weight: [{ ...T("2026-09-01T08:00:00Z"), weight: { inKilograms: 72.34 } }],
    });
    expect(out).toHaveLength(1);
    expect(out[0].weightKg).toBe(72.3); // 저장 정밀도(0.1)에 맞춰 반올림
  });

  it("숫자로 와도 읽는다(플러그인 버전에 따라 모양이 다르다)", () => {
    const out = toBodyEntries({
      weight: [{ ...T("2026-09-01T08:00:00Z"), weight: 70 }],
    });
    expect(out[0].weightKg).toBe(70);
  });

  it("🔴 같은 측정의 세 값이 몇 초 차이로 와도 한 줄로 합친다", () => {
    const out = toBodyEntries({
      weight: [{ ...T("2026-09-01T08:00:01Z"), weight: { inKilograms: 72 } }],
      bodyFat: [{ ...T("2026-09-01T08:00:04Z"), percentage: 18.2 }],
      leanMass: [{ ...T("2026-09-01T08:00:09Z"), mass: { inKilograms: 58.9 } }],
    });
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({
      weightKg: 72,
      bodyFatPct: 18.2,
      muscleMassKg: 58.9,
    });
  });

  it("분이 다르면 다른 측정 — 아침·저녁 두 번 잰 것을 뭉치지 않는다", () => {
    const out = toBodyEntries({
      weight: [
        { ...T("2026-09-01T08:00:00Z"), weight: 72 },
        { ...T("2026-09-01T21:30:00Z"), weight: 73 },
      ],
    });
    expect(out.map((e) => e.weightKg)).toEqual([72, 73]);
  });

  it("오래된 것부터 정렬한다", () => {
    const out = toBodyEntries({
      weight: [
        { ...T("2026-09-03T08:00:00Z"), weight: 73 },
        { ...T("2026-09-01T08:00:00Z"), weight: 72 },
      ],
    });
    expect(out.map((e) => e.weightKg)).toEqual([72, 73]);
  });

  it("startTime 만 있는 레코드도 읽는다", () => {
    const out = toBodyEntries({
      weight: [{ startTime: "2026-09-01T08:00:00Z", weight: 72 }],
    });
    expect(out).toHaveLength(1);
  });

  it("시각이 없거나 깨진 레코드는 버린다 — 언제 잰지 모르면 그래프에 못 찍는다", () => {
    const out = toBodyEntries({
      weight: [
        { weight: 72 },
        { ...T("아무말"), weight: 72 },
        { ...T("2026-09-01T08:00:00Z"), weight: 72 },
      ],
    });
    expect(out).toHaveLength(1);
  });

  it("🔴 저장 범위를 벗어난 값은 자르지 않고 버린다 — 없는 측정을 만들지 않는다", () => {
    const out = toBodyEntries({
      weight: [
        { ...T("2026-09-01T08:00:00Z"), weight: 400 }, // 250 초과
        { ...T("2026-09-02T08:00:00Z"), weight: 5 }, // 30 미만
      ],
    });
    expect(out).toHaveLength(0);
  });

  it("값이 하나도 없는 줄은 만들지 않는다 — 빈 점이 그래프에 찍힌다", () => {
    const out = toBodyEntries({
      weight: [{ ...T("2026-09-01T08:00:00Z"), weight: null }],
    });
    expect(out).toHaveLength(0);
  });

  it("체지방만 있어도 저장한다(체중계가 값을 나눠 올리는 경우)", () => {
    const out = toBodyEntries({
      bodyFat: [{ ...T("2026-09-01T08:00:00Z"), percentage: 20 }],
    });
    expect(out).toHaveLength(1);
    expect(out[0].weightKg).toBeNull();
    expect(out[0].bodyFatPct).toBe(20);
  });

  it("입력이 비면 빈 목록", () => {
    expect(toBodyEntries({})).toEqual([]);
  });
});

describe("pickNewBodyLogs — 이미 있는 건 다시 안 넣는다", () => {
  const entry = (measuredAt: string, weightKg: number | null): BodyEntry => ({
    measuredAt,
    weightKg,
    bodyFatPct: null,
    muscleMassKg: null,
  });

  it("겹치는 게 없으면 전부 새 기록", () => {
    const out = pickNewBodyLogs([], [entry("2026-09-01T08:00:00Z", 72)]);
    expect(out).toHaveLength(1);
  });

  it("🔴 같은 날(서울) 같은 체중이면 이미 있는 것으로 본다", () => {
    const out = pickNewBodyLogs(
      [{ createdAt: "2026-09-01T00:30:00Z", weightKg: 72 }],
      [entry("2026-09-01T08:00:00Z", 72)],
    );
    expect(out).toHaveLength(0);
  });

  it("같은 날이라도 체중이 다르면 새 측정 — 아침·저녁 둘 다 남는다", () => {
    const out = pickNewBodyLogs(
      [{ createdAt: "2026-09-01T00:30:00Z", weightKg: 72 }],
      [entry("2026-09-01T12:00:00Z", 73)],
    );
    expect(out).toHaveLength(1);
  });

  it("0.1kg 미만 차이는 같은 값으로 — 저장하면 어차피 뭉개진다", () => {
    const out = pickNewBodyLogs(
      [{ createdAt: "2026-09-01T00:30:00Z", weightKg: 72.02 }],
      [entry("2026-09-01T08:00:00Z", 72.04)],
    );
    expect(out).toHaveLength(0);
  });

  it("날짜가 다르면 같은 체중이어도 새 기록", () => {
    const out = pickNewBodyLogs(
      [{ createdAt: "2026-09-01T00:30:00Z", weightKg: 72 }],
      [entry("2026-09-02T08:00:00Z", 72)],
    );
    expect(out).toHaveLength(1);
  });

  it("🔴 서울 날짜로 본다 — UTC 로 보면 아침 기록이 전날로 밀린다", () => {
    // 2026-09-01T23:00Z = 서울 9/2 08:00.
    const out = pickNewBodyLogs(
      [{ createdAt: "2026-09-02T02:00:00Z", weightKg: 72 }], // 서울 9/2 11:00
      [entry("2026-09-01T23:00:00Z", 72)],
    );
    expect(out).toHaveLength(0);
  });

  it("한 번에 들어온 목록 안의 중복도 없앤다", () => {
    const out = pickNewBodyLogs(
      [],
      [entry("2026-09-01T08:00:00Z", 72), entry("2026-09-01T09:00:00Z", 72)],
    );
    expect(out).toHaveLength(1);
  });

  it("측정 시각이 깨진 후보는 넣지 않는다", () => {
    const out = pickNewBodyLogs([], [entry("아무말", 72)]);
    expect(out).toHaveLength(0);
  });

  it("체중 없는 기록끼리는 같은 날이면 하나로 본다", () => {
    const out = pickNewBodyLogs(
      [{ createdAt: "2026-09-01T00:30:00Z", weightKg: null }],
      [entry("2026-09-01T08:00:00Z", null)],
    );
    expect(out).toHaveLength(0);
  });
});
