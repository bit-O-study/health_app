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
  /** Health Connect 중복 방지에 쓰는 운동 세션 고유 ID. 구버전 저장본에는 없을 수 있다. */
  sessionId?: string;
  /** 현재 구간의 시작 시각 (ms epoch). 일시정지 상태에선 의미 없음. */
  startedAt: number;
  /** 일시정지된 시각 (ms epoch). null 이면 실행 중. */
  pausedAt: number | null;
  /** 이전 구간들에서 누적된 ms */
  accumulated: number;
  /** 세션이 속한 날짜 YYYY-MM-DD (서울). 자정 넘으면 변경됨. */
  forDate: string;
  /**
   * 같은 날 이미 끝낸 세션에서 이어받은 초. 화면·그날 누적엔 포함되지만 이번
   * 세션 자체의 길이(Health Connect 기록)에서는 뺀다. 없으면 0.
   */
  baseSec?: number;
  /** 마지막 복원/실행 시각. 구버전 저장본과의 호환을 위해 유지한다. */
  lastSeenAt?: number;
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

/** 복귀 시 실행 상태와 시작 시각을 보존한다. 공백은 명시적으로 정지하기 전까지 운동시간이다. */
export function reconcileResume(
  s: TimerState | null,
  now: number,
): TimerState | null {
  if (!s || s.pausedAt !== null) return s;
  return { ...s, lastSeenAt: now };
}

// ── 누적 저장 마크 ───────────────────────────────────────────────────────────
// 운동 1개 완료마다 그날 누적 시간을 갱신한다(addWorkoutDurationAction 은 가산식).
// 매번 '경과 전체'를 더하면 이중 계산되므로, 직전에 저장한 초(savedSec)를 기억해
// 이번에 늘어난 만큼(delta)만 더한다. 세션이 끝나거나(정지·완주) 새로 시작하면 리셋.
const SAVED_KEY = "heltch.workout.saved";
type SavedMark = { forDate: string; savedSec: number };

function readSaved(): SavedMark | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SAVED_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<SavedMark>;
    if (typeof v?.forDate === "string" && typeof v?.savedSec === "number") {
      return v as SavedMark;
    }
    return null;
  } catch {
    return null;
  }
}

function writeSaved(m: SavedMark | null) {
  if (typeof window === "undefined") return;
  try {
    if (m === null) localStorage.removeItem(SAVED_KEY);
    else localStorage.setItem(SAVED_KEY, JSON.stringify(m));
  } catch {
    /* noop */
  }
}

/**
 * 아직 DB 에 안 올린 경과 초(delta)와 forDate 를 돌려주고, 저장 마크를 현재까지로
 * 끌어올린다(= delta 를 '가져간다'). 더 올릴 게 없으면 null.
 * 운동 완료·정지·완주·자정롤오버에서 호출해 그날 누적 시간을 정확히 1회만 더한다.
 */
export function takeUnsavedDelta(
  s: TimerState | null,
): { forDate: string; deltaSec: number } | null {
  if (!s) return null;
  const cur = Math.floor(elapsedMs(s) / 1000);
  const saved = readSaved();
  const base = saved && saved.forDate === s.forDate ? saved.savedSec : 0;
  const delta = cur - base;
  if (delta <= 0) {
    // forDate 가 바뀌었으면 마크만 맞춰 둔다(중복 가산 방지).
    if (!saved || saved.forDate !== s.forDate) {
      writeSaved({ forDate: s.forDate, savedSec: cur });
    }
    return null;
  }
  writeSaved({ forDate: s.forDate, savedSec: cur });
  return { forDate: s.forDate, deltaSec: delta };
}

/** 세션 시작·종료·리셋 시 저장 마크 제거(다음 세션은 0 부터). */
export function clearSavedMark() {
  writeSaved(null);
}

// ── 오늘 끝낸 세션 기록 ─────────────────────────────────────────────────────
// 전체 완료로 세션이 끝난 뒤 완료를 취소하고 다시 시작하면, 예전엔 타이머가
// 00:00 부터 새로 흘렀다(DB 누적은 맞지만 화면에선 "운동시간 초기화"로 보임).
// 끝낼 때 그날 누적 초를 남겨 두고, 같은 날 다시 시작하면 거기서 이어 간다.
const FINISHED_KEY = "heltch.workout.finished";
export type FinishedMark = { forDate: string; totalSec: number };

export function readFinished(): FinishedMark | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FINISHED_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<FinishedMark>;
    if (typeof v?.forDate === "string" && typeof v?.totalSec === "number") {
      return v as FinishedMark;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeFinished(m: FinishedMark | null) {
  if (typeof window === "undefined") return;
  try {
    if (m === null) localStorage.removeItem(FINISHED_KEY);
    else localStorage.setItem(FINISHED_KEY, JSON.stringify(m));
  } catch {
    /* noop */
  }
}

/**
 * 새 세션의 시작 상태. 같은 날 끝낸 세션이 있으면 그 누적 초에서 이어 가고,
 * 저장 마크도 그 초로 맞춰 **이미 DB 에 올린 시간을 다시 더하지 않게** 한다.
 * 날짜가 다르면 0 부터. 순수 함수 — now·today 주입으로 테스트 가능.
 */
export function startSessionState(
  finished: FinishedMark | null,
  today: string,
  now: number,
  sessionId: string,
): { state: TimerState; savedMark: { forDate: string; savedSec: number } | null } {
  const baseSec =
    finished && finished.forDate === today ? Math.max(0, finished.totalSec) : 0;
  return {
    state: {
      sessionId,
      startedAt: now,
      pausedAt: null,
      accumulated: baseSec * 1000,
      forDate: today,
      lastSeenAt: now,
      baseSec,
    },
    savedMark: baseSec > 0 ? { forDate: today, savedSec: baseSec } : null,
  };
}

/** 저장 마크를 직접 맞춘다(같은 날 이어 시작할 때 이미 올린 초). */
export function setSavedMark(m: { forDate: string; savedSec: number }) {
  writeSaved(m);
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
