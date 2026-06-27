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
  /**
   * 앱이 '실제로 떠 있던' 마지막 시각 (ms epoch). 실행 중 매 틱마다 갱신.
   * 앱을 닫거나 백그라운드로 둔 동안은 갱신이 멈춘다. 재접속 시 이 값과 now 의
   * 간격이 크면 그 시간만큼은 운동을 안 한 것으로 보고 경과에서 제외한다.
   * (구버전 저장본엔 없을 수 있어 optional — 없으면 startedAt 으로 본다.)
   */
  lastSeenAt?: number;
};

/** 백그라운드/종료로 간주하는 공백 임계(ms). 이보다 길게 안 보였으면 그 구간 제외.
 * 운동 중 휴식/전화/폰 잠금(앱 백그라운드)으로 몇 분 비는 건 실제 운동시간으로 인정해
 * 타이머가 실제 시계와 맞게 흐르도록 10분으로 둔다. (헬스장에서 운동 끝나고 앱을 켠 채
 * 둔 장시간 공백은 여전히 제외 — 캘린더 과다 가산 방지.) */
export const AWAY_GAP_MS = 600_000; // 10분

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

/**
 * 재접속/포커스 복귀 시 '안 보던 동안'의 시간을 경과에서 제외한 새 상태를 돌려준다.
 * 실행 중이고 (now - lastSeenAt) 이 임계를 넘으면, 그 공백만큼 startedAt 을 미뤄
 * 경과시간을 lastSeenAt 시점에 '얼린' 뒤 now 부터 다시 흐르게 한다. 그래서 앱을
 * 닫아둔 9시간 같은 시간이 운동시간으로 잡히지 않는다(캘린더 과다 가산도 방지).
 * 순수 함수 — now·gap 주입으로 테스트 가능.
 */
export function reconcileResume(
  s: TimerState | null,
  now: number,
  gapMs: number = AWAY_GAP_MS,
): TimerState | null {
  if (!s) return s;
  if (s.pausedAt !== null) return s; // 정지 상태는 시간이 안 흐르니 그대로
  const seen = s.lastSeenAt ?? s.startedAt;
  const gap = now - seen;
  if (gap <= gapMs) return { ...s, lastSeenAt: now };
  // 공백만큼 startedAt 을 뒤로 밀어 그 시간을 빼고, 지금부터 다시 카운트.
  return { ...s, startedAt: s.startedAt + gap, lastSeenAt: now };
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
