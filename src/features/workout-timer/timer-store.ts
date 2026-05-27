"use client";

/**
 * 운동 세션 타이머 영속 저장소. 시작/일시정지 시각만 보관하고 UI 가 매초 elapsed 를 계산.
 * 새로고침해도 진행 중인 타이머가 유지된다.
 *
 * forDate 는 세션이 시작된 날짜(서울 기준 YYYY-MM-DD). 자정 롤오버 감지·
 * 누적 시간 DB 반영에 사용된다.
 */

const TIMER_KEY = "heltch.workout.timer";

export type TimerState = {
  /** 현재 구간의 시작 시각 (ms epoch). 일시정지 상태에선 의미 없음. */
  startedAt: number;
  /** 일시정지된 시각 (ms epoch). null 이면 실행 중. */
  pausedAt: number | null;
  /** 이전 구간들에서 누적된 ms */
  accumulated: number;
  /** 세션이 속한 날짜 YYYY-MM-DD (서울). 자정 넘으면 변경됨. */
  forDate: string;
};

export function readTimer(): TimerState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(TIMER_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<TimerState>;
    if (
      typeof v?.startedAt === "number" &&
      typeof v?.accumulated === "number" &&
      (v.pausedAt === null || typeof v.pausedAt === "number") &&
      typeof v?.forDate === "string"
    ) {
      return v as TimerState;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeTimer(s: TimerState | null) {
  if (typeof window === "undefined") return;
  try {
    if (s === null) localStorage.removeItem(TIMER_KEY);
    else localStorage.setItem(TIMER_KEY, JSON.stringify(s));
  } catch {
    /* noop */
  }
}

/** 현재 누적 경과 ms */
export function elapsedMs(s: TimerState | null): number {
  if (!s) return 0;
  if (s.pausedAt !== null) return s.accumulated;
  return s.accumulated + (Date.now() - s.startedAt);
}

/** 사람이 읽는 mm:ss 또는 hh:mm:ss */
export function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60) % 60;
  const h = Math.floor(totalSec / 3600);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** 서울 기준 오늘 YYYY-MM-DD */
export function seoulTodayYmd(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}
