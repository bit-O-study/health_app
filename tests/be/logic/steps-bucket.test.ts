import { describe, expect, it } from "vitest";

import {
  bucketStepsBySeoulDay,
  seoulYmdOf,
} from "@/features/health/steps-bucket";

// 걸음수를 '서울 날짜'로 귀속 — 기기 타임존/자정과 무관하게 캘린더(서울 for_date)와 맞춘다.
// 이 로직이 깨지면 "걸음수가 엉뚱한 날에 뜨거나 0으로 보이는" 버그가 재발한다.

describe("seoulYmdOf — 서울 기준 날짜", () => {
  it("UTC 15:00 은 서울로 다음날 00:00 → 날짜가 하루 넘어간다", () => {
    // 2026-06-29T15:00Z = 2026-06-30 00:00 KST
    expect(seoulYmdOf("2026-06-29T15:00:00Z")).toBe("2026-06-30");
  });

  it("UTC 14:59 은 아직 서울 당일(06-29) 23:59", () => {
    expect(seoulYmdOf("2026-06-29T14:59:00Z")).toBe("2026-06-29");
  });

  it("epoch millis · Date 객체도 받는다", () => {
    const ms = Date.parse("2026-01-01T00:00:00Z"); // 09:00 KST → 2026-01-01
    expect(seoulYmdOf(ms)).toBe("2026-01-01");
    expect(seoulYmdOf(new Date("2026-03-10T12:00:00Z"))).toBe("2026-03-10");
  });

  it("파싱 불가면 null", () => {
    expect(seoulYmdOf("not-a-date")).toBeNull();
  });
});

describe("bucketStepsBySeoulDay — 날짜별 합계", () => {
  it("같은 서울 날짜의 레코드는 합산", () => {
    const out = bucketStepsBySeoulDay(
      [
        { count: 100, startTime: "2026-06-29T01:00:00Z" }, // 10:00 KST 06-29
        { count: 250, startTime: "2026-06-29T05:00:00Z" }, // 14:00 KST 06-29
      ],
      "2026-06-29",
    );
    expect(out).toEqual({ "2026-06-29": 350 });
  });

  it("자정을 넘는 레코드는 각자 서울 날짜로 분리된다", () => {
    const out = bucketStepsBySeoulDay(
      [
        { count: 100, startTime: "2026-06-29T14:00:00Z" }, // 23:00 KST 06-29
        { count: 200, startTime: "2026-06-29T16:00:00Z" }, // 01:00 KST 06-30
      ],
      "2026-06-30",
    );
    expect(out).toEqual({ "2026-06-29": 100, "2026-06-30": 200 });
  });

  it("startTime 없거나 파싱 불가면 fallbackYmd(오늘)로 귀속 — 손실 방지", () => {
    const out = bucketStepsBySeoulDay(
      [
        { count: 40 }, // startTime 없음
        { count: 60, startTime: "bad" }, // 파싱 불가
      ],
      "2026-06-30",
    );
    expect(out).toEqual({ "2026-06-30": 100 });
  });

  it("count 0/음수/비수치는 건너뛴다", () => {
    const out = bucketStepsBySeoulDay(
      [
        { count: 0, startTime: "2026-06-29T01:00:00Z" },
        { count: -5, startTime: "2026-06-29T01:00:00Z" },
        { count: "abc" as unknown as number, startTime: "2026-06-29T01:00:00Z" },
        { count: 10, startTime: "2026-06-29T01:00:00Z" },
      ],
      "2026-06-29",
    );
    expect(out).toEqual({ "2026-06-29": 10 });
  });

  it("문자열 count 도 숫자로 합산(HC 가 문자열로 줄 때 대비)", () => {
    const out = bucketStepsBySeoulDay(
      [{ count: "1234", startTime: "2026-06-29T01:00:00Z" }],
      "2026-06-29",
    );
    expect(out).toEqual({ "2026-06-29": 1234 });
  });

  it("빈/누락 입력은 빈 객체", () => {
    expect(bucketStepsBySeoulDay([], "2026-06-29")).toEqual({});
    expect(bucketStepsBySeoulDay(null, "2026-06-29")).toEqual({});
    expect(bucketStepsBySeoulDay(undefined, "2026-06-29")).toEqual({});
  });
});
