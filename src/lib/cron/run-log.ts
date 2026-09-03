/**
 * 크론 실행 기록 — 순수 로직(DB·네트워크 의존 없음 → 그대로 단위테스트).
 *
 * 크론은 "돌았는지 안 돌았는지" 를 아무도 모르는 게 가장 큰 위험이다.
 * (실제로 `workout-inactivity` 는 코드가 있는데 vercel.json 에 등록이 안 돼
 *  한 번도 안 돌고 있었고, 아무 신호도 없었다.)
 * 그래서 매 실행마다 이름·소요시간·상태·발송 수·실패 사유를 한 행으로 남기고,
 * 관리자 화면에서 크론별 성공률로 요약해 본다.
 */

/** 등록된 크론 이름 — `vercel.json` 의 `/api/cron/<name>` 과 1:1. */
export const CRON_NAMES = [
  "daily-reminders",
  "weekly-group-mvp",
  "workout-inactivity",
] as const;
export type CronName = (typeof CRON_NAMES)[number];

/**
 * - `ok`      정상 실행(보낼 대상이 0명이어도 ok — 실행 자체는 성공)
 * - `skipped` 사전 조건 미충족(푸시/관리자 키 미설정) — 실패로 세지 않는다
 * - `error`   실행 중 예외
 */
export type CronStatus = "ok" | "skipped" | "error";

/** 실행 결과 수치. 크론마다 의미 있는 것만 채운다(나머지는 0). */
export type CronCounts = {
  /** 훑어본 행 수(사용자·그룹 등). */
  scanned?: number;
  /** 발송 대상으로 판정된 수. */
  targeted?: number;
  /** 실제로 보낸 수(기기가 있어 발송된 대상). */
  sent?: number;
  /** 이미 보낸 적 있어 건너뛴 수(재실행 중복 방지). */
  deduped?: number;
  /** 발송 중 실패한 수(부분 실패 — 전체를 중단시키지 않는다). */
  failed?: number;
};

/** `cron_runs` 한 행(snake_case — DB 컬럼 그대로). */
export type CronRunRow = {
  name: string;
  started_at: string;
  finished_at: string;
  duration_ms: number;
  status: CronStatus;
  scanned: number;
  targeted: number;
  sent: number;
  deduped: number;
  failed: number;
  reason: string | null;
};

/** 실패 사유 보존 길이 — 로그가 본문 전체를 물고 늘어지지 않게 자른다. */
export const REASON_MAX = 500;

/** 어떤 값이든 사람이 읽을 수 있는 한 줄 사유로. 길면 자른다. */
export function failureReason(err: unknown): string {
  const raw =
    err instanceof Error
      ? err.message || err.name
      : typeof err === "string"
        ? err
        : err === null || err === undefined
          ? ""
          : safeJson(err);
  const line = raw.replace(/\s+/g, " ").trim();
  if (!line) return "unknown error";
  return line.length > REASON_MAX ? `${line.slice(0, REASON_MAX - 1)}…` : line;
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v) ?? "";
  } catch {
    return String(v);
  }
}

/** 음수·소수·NaN 을 0 이상 정수로. (카운터가 DB int 컬럼을 깨지 않게.) */
function count(v: number | undefined): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return 0;
  return Math.max(0, Math.floor(v));
}

/** 실행 한 건을 `cron_runs` 행으로. 시작·종료가 뒤집혀 들어와도 duration 은 0 이상. */
export function buildCronRun(input: {
  name: string;
  status: CronStatus;
  startedAt: Date | number | string;
  finishedAt: Date | number | string;
  counts?: CronCounts;
  reason?: string | null;
}): CronRunRow {
  const started = toMs(input.startedAt);
  const finished = toMs(input.finishedAt);
  const c = input.counts ?? {};
  const reason = input.reason ? failureReason(input.reason) : null;
  return {
    name: input.name,
    started_at: new Date(started).toISOString(),
    finished_at: new Date(finished).toISOString(),
    duration_ms: Math.max(0, finished - started),
    status: input.status,
    scanned: count(c.scanned),
    targeted: count(c.targeted),
    sent: count(c.sent),
    deduped: count(c.deduped),
    failed: count(c.failed),
    reason,
  };
}

function toMs(v: Date | number | string): number {
  const n = v instanceof Date ? v.getTime() : typeof v === "number" ? v : Date.parse(v);
  return Number.isFinite(n) ? n : 0;
}

/** 크론 하나의 최근 실행 요약. */
export type CronRunSummary = {
  name: string;
  runs: number;
  ok: number;
  errors: number;
  skipped: number;
  /**
   * 성공률 = ok / (ok + error). `skipped` 는 분모에서 뺀다(설정 미비는 크론 잘못이 아니다).
   * 판정할 실행이 하나도 없으면 null — "0%" 로 잘못 읽히지 않게.
   */
  successRate: number | null;
  avgMs: number;
  maxMs: number;
  sent: number;
  deduped: number;
  failed: number;
  lastRunAt: string | null;
  lastStatus: CronStatus | null;
  /** 가장 최근 실패(있으면) — 사유를 그대로 보여준다. */
  lastFailure: { at: string; reason: string } | null;
};

/**
 * 실행 행들을 크론별로 접는다. 알려진 크론은 실행 기록이 없어도 빈 요약으로 넣는다
 * (= "한 번도 안 돌았다" 를 화면에서 보이게 하는 게 이 기능의 목적).
 */
export function summarizeCronRuns(
  rows: readonly CronRunRow[],
  names: readonly string[] = CRON_NAMES,
): CronRunSummary[] {
  const byName = new Map<string, CronRunRow[]>();
  for (const name of names) byName.set(name, []);
  for (const r of rows) {
    const arr = byName.get(r.name);
    if (arr) arr.push(r);
    else byName.set(r.name, [r]);
  }

  return [...byName.entries()].map(([name, list]) => {
    const ok = list.filter((r) => r.status === "ok").length;
    const errors = list.filter((r) => r.status === "error").length;
    const skipped = list.filter((r) => r.status === "skipped").length;
    const judged = ok + errors;
    const durations = list.map((r) => r.duration_ms);
    const sorted = [...list].sort(
      (a, b) => Date.parse(b.started_at) - Date.parse(a.started_at),
    );
    const last = sorted[0] ?? null;
    const failure = sorted.find((r) => r.status === "error") ?? null;

    return {
      name,
      runs: list.length,
      ok,
      errors,
      skipped,
      successRate: judged === 0 ? null : ok / judged,
      avgMs: durations.length
        ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
        : 0,
      maxMs: durations.length ? Math.max(...durations) : 0,
      sent: sum(list, (r) => r.sent),
      deduped: sum(list, (r) => r.deduped),
      failed: sum(list, (r) => r.failed),
      lastRunAt: last?.started_at ?? null,
      lastStatus: last?.status ?? null,
      lastFailure: failure
        ? { at: failure.started_at, reason: failure.reason ?? "unknown error" }
        : null,
    };
  });
}

function sum<T>(rows: readonly T[], of: (row: T) => number): number {
  return rows.reduce((a, r) => a + of(r), 0);
}

/** 소요시간 표기 — 1초 미만은 ms, 1분 미만은 초, 그 위는 분초. */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "-";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)}초`;
  const m = Math.floor(s / 60);
  return `${m}분 ${Math.round(s - m * 60)}초`;
}

/** 성공률 표기 — 판정할 실행이 없으면 "-". */
export function formatSuccessRate(rate: number | null): string {
  if (rate === null) return "-";
  return `${Math.round(rate * 100)}%`;
}
