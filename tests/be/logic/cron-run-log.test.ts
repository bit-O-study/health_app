import { describe, expect, it } from "vitest";

import {
  buildCronRun,
  CRON_NAMES,
  failureReason,
  formatDuration,
  formatSuccessRate,
  REASON_MAX,
  summarizeCronRuns,
  type CronRunRow,
} from "@/lib/cron/run-log";

const row = (over: Partial<CronRunRow> = {}): CronRunRow => ({
  name: "daily-reminders",
  started_at: "2026-08-31T11:00:00.000Z",
  finished_at: "2026-08-31T11:00:02.000Z",
  duration_ms: 2000,
  status: "ok",
  scanned: 0,
  targeted: 0,
  sent: 0,
  deduped: 0,
  failed: 0,
  reason: null,
  ...over,
});

describe("failureReason", () => {
  it("Error 는 메시지를, 문자열은 그대로 쓴다", () => {
    expect(failureReason(new Error("supabase timeout"))).toBe("supabase timeout");
    expect(failureReason("boom")).toBe("boom");
  });

  it("여러 줄·공백은 한 줄로 접는다", () => {
    expect(failureReason("a\n  b\tc")).toBe("a b c");
  });

  it("메시지가 없거나 값이 비면 unknown error", () => {
    expect(failureReason(new Error(""))).toBe("Error");
    expect(failureReason(null)).toBe("unknown error");
    expect(failureReason("   ")).toBe("unknown error");
  });

  it("객체는 JSON 으로, 순환 참조여도 죽지 않는다", () => {
    expect(failureReason({ code: 503 })).toBe('{"code":503}');
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(failureReason(cyclic).length).toBeGreaterThan(0);
  });

  it("긴 사유는 잘라서 로그가 본문을 물고 늘어지지 않게 한다", () => {
    const out = failureReason("x".repeat(REASON_MAX * 2));
    expect(out.length).toBe(REASON_MAX);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("buildCronRun", () => {
  it("소요시간을 계산하고 카운터 기본값을 0 으로 채운다", () => {
    const r = buildCronRun({
      name: "daily-reminders",
      status: "ok",
      startedAt: 1_000,
      finishedAt: 3_500,
      counts: { scanned: 10, sent: 4 },
    });
    expect(r.duration_ms).toBe(2500);
    expect(r.scanned).toBe(10);
    expect(r.sent).toBe(4);
    expect(r.targeted).toBe(0);
    expect(r.deduped).toBe(0);
    expect(r.failed).toBe(0);
    expect(r.reason).toBeNull();
  });

  it("시작·종료가 뒤집혀도 음수 소요시간을 남기지 않는다", () => {
    const r = buildCronRun({
      name: "x",
      status: "ok",
      startedAt: 5_000,
      finishedAt: 1_000,
    });
    expect(r.duration_ms).toBe(0);
  });

  it("음수·소수·NaN 카운터는 0 이상 정수로 눕힌다(int 컬럼 보호)", () => {
    const r = buildCronRun({
      name: "x",
      status: "ok",
      startedAt: 0,
      finishedAt: 0,
      counts: { scanned: -3, sent: 2.7, deduped: Number.NaN },
    });
    expect(r.scanned).toBe(0);
    expect(r.sent).toBe(2);
    expect(r.deduped).toBe(0);
  });

  it("실패 사유도 같은 규칙으로 다듬어 넣는다", () => {
    const r = buildCronRun({
      name: "x",
      status: "error",
      startedAt: 0,
      finishedAt: 1,
      reason: "  두\n줄  ",
    });
    expect(r.reason).toBe("두 줄");
  });

  it("Date·ISO 문자열도 받는다", () => {
    const r = buildCronRun({
      name: "x",
      status: "ok",
      startedAt: new Date("2026-08-31T11:00:00.000Z"),
      finishedAt: "2026-08-31T11:00:01.000Z",
    });
    expect(r.duration_ms).toBe(1000);
    expect(r.started_at).toBe("2026-08-31T11:00:00.000Z");
  });
});

describe("summarizeCronRuns", () => {
  it("한 번도 안 돈 크론도 목록에 남긴다 — 그게 이 화면의 목적", () => {
    const out = summarizeCronRuns([]);
    expect(out.map((s) => s.name)).toEqual([...CRON_NAMES]);
    expect(out[0].runs).toBe(0);
    expect(out[0].successRate).toBeNull();
    expect(out[0].lastRunAt).toBeNull();
  });

  it("성공률 분모에서 skipped 를 뺀다(설정 미비는 크론 실패가 아니다)", () => {
    const out = summarizeCronRuns([
      row({ status: "ok" }),
      row({ status: "error", reason: "boom" }),
      row({ status: "skipped" }),
    ]);
    const s = out.find((x) => x.name === "daily-reminders")!;
    expect(s.runs).toBe(3);
    expect(s.ok).toBe(1);
    expect(s.errors).toBe(1);
    expect(s.skipped).toBe(1);
    expect(s.successRate).toBe(0.5);
  });

  it("skipped 만 있으면 성공률은 0% 가 아니라 판정 불가(null)", () => {
    const out = summarizeCronRuns([row({ status: "skipped" })]);
    expect(out[0].successRate).toBeNull();
    expect(formatSuccessRate(out[0].successRate)).toBe("-");
  });

  it("소요시간 평균·최대와 발송 합계를 낸다", () => {
    const out = summarizeCronRuns([
      row({ duration_ms: 1000, sent: 3, deduped: 1, failed: 1 }),
      row({ duration_ms: 3000, sent: 5, deduped: 2, failed: 0 }),
    ]);
    const s = out[0];
    expect(s.avgMs).toBe(2000);
    expect(s.maxMs).toBe(3000);
    expect(s.sent).toBe(8);
    expect(s.deduped).toBe(3);
    expect(s.failed).toBe(1);
  });

  it("마지막 실행과 가장 최근 실패를 시각 기준으로 고른다(입력 순서 무관)", () => {
    const out = summarizeCronRuns([
      row({ started_at: "2026-08-29T11:00:00.000Z", status: "error", reason: "옛 실패" }),
      row({ started_at: "2026-08-31T11:00:00.000Z", status: "ok" }),
      row({ started_at: "2026-08-30T11:00:00.000Z", status: "error", reason: "최근 실패" }),
    ]);
    const s = out[0];
    expect(s.lastRunAt).toBe("2026-08-31T11:00:00.000Z");
    expect(s.lastStatus).toBe("ok");
    expect(s.lastFailure?.reason).toBe("최근 실패");
  });

  it("알려지지 않은 이름(옛 크론)도 버리지 않고 뒤에 붙인다", () => {
    const out = summarizeCronRuns([row({ name: "legacy-cron" })]);
    expect(out.map((s) => s.name)).toContain("legacy-cron");
    expect(out.at(-1)?.name).toBe("legacy-cron");
  });
});

describe("formatDuration", () => {
  it("1초 미만은 ms, 1분 미만은 초, 그 위는 분초", () => {
    expect(formatDuration(0)).toBe("0ms");
    expect(formatDuration(850)).toBe("850ms");
    expect(formatDuration(2500)).toBe("2.5초");
    expect(formatDuration(95_000)).toBe("1분 35초");
  });
  it("이상한 값은 -", () => {
    expect(formatDuration(Number.NaN)).toBe("-");
    expect(formatDuration(-5)).toBe("-");
  });
});

describe("formatSuccessRate", () => {
  it("퍼센트로 반올림한다", () => {
    expect(formatSuccessRate(1)).toBe("100%");
    expect(formatSuccessRate(0.666)).toBe("67%");
    expect(formatSuccessRate(null)).toBe("-");
  });
});
