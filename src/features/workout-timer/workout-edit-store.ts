"use client";

/**
 * 운동모드(고정 끔)에서 그때그때 설정한 무게/횟수/세트(본운동)·시간/속도/경사(컨디셔닝)를
 * 그날 동안 기억한다. 운동모드를 나갔다 다시 들어와도 직전 값이 유지되고, **날짜가 바뀌면
 * 초기화**돼 다시 편집기(등록)의 초기 데이터부터 시작한다.
 *
 * localStorage 에 날짜와 함께 저장 — 읽을 때 오늘과 다르면 빈 값으로 본다.
 */

import { seoulTodayYmd } from "@/features/workout-timer/timer-store";
import { pickSetsDone } from "@/features/workout-timer/sets-done";

export type MainEdit = { w: number | null; reps: number; sets: number };
export type CondEdit = {
  duration: number | null;
  speed: number | null;
  incline: number | null;
  sets: number | null;
  reps: number | null;
};
type Store = {
  date: string;
  main: Record<string, MainEdit>;
  cond: Record<string, CondEdit>;
  /** 본운동 행별 완료한 세트 수(0-base). 운동모드를 나갔다 와도 유지, 날짜 바뀌면 초기화. */
  setsDone: Record<string, number>;
  /** 같은 값을 (부위:운동) 키로도 저장 — 부위 추가·루틴 편집으로 행 id 가 새로 생겨도
   *  진행이 안 사라지게(행 id 저장분이 우선). */
  setsDoneByKey?: Record<string, number>;
  /** 운동모드에서 마지막으로 보고 있던 항목(rowId). '운동법 보기' 등으로 route 를 나갔다
   * 와서 오버레이가 재마운트돼도 그 운동에서 이어보게 복원. 날짜 바뀌면 초기화. */
  activeRow?: string;
};

const KEY = "heltch.workout.edits";

function read(): Store {
  const today = seoulTodayYmd();
  if (typeof window === "undefined")
    return { date: today, main: {}, cond: {}, setsDone: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<Store>;
      // 날짜가 오늘과 같을 때만 유효 — 하루 지나면 초기화(빈 값).
      if (v && v.date === today) {
        return {
          date: today,
          main: v.main ?? {},
          cond: v.cond ?? {},
          setsDone: v.setsDone ?? {},
          setsDoneByKey: v.setsDoneByKey ?? {},
          activeRow: v.activeRow,
        };
      }
    }
  } catch {
    /* noop */
  }
  return { date: today, main: {}, cond: {}, setsDone: {} };
}

function write(s: Store) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* noop */
  }
}

export function getMainEdit(rowId: string): MainEdit | null {
  return read().main[rowId] ?? null;
}

export function setMainEdit(rowId: string, e: MainEdit) {
  const s = read();
  s.main[rowId] = e;
  write(s);
}

export function getCondEdit(rowId: string): CondEdit | null {
  return read().cond[rowId] ?? null;
}

export function setCondEdit(rowId: string, e: CondEdit) {
  const s = read();
  s.cond[rowId] = e;
  write(s);
}

/**
 * 본운동 행별 완료 세트 수(없으면 0).
 * key = (부위:운동) 복합 키 — 부위 추가·루틴 편집으로 행 id 가 바뀌어도 이어지게 폴백.
 */
export function getSetsDone(rowId: string, key?: string | null): number {
  const s = read();
  return pickSetsDone(s.setsDone, s.setsDoneByKey, rowId, key);
}

export function setSetsDone(rowId: string, n: number, key?: string | null) {
  const s = read();
  const v = Math.max(0, Math.floor(n));
  s.setsDone[rowId] = v;
  if (key) {
    s.setsDoneByKey = { ...(s.setsDoneByKey ?? {}), [key]: v };
  }
  write(s);
}

/** 운동모드에서 마지막으로 보던 항목(rowId). 없거나 날짜가 지났으면 null. */
export function getActiveRow(): string | null {
  return read().activeRow ?? null;
}

export function setActiveRow(rowId: string) {
  const s = read();
  s.activeRow = rowId;
  write(s);
}

/** 운동모드를 정상 종료(닫기/전부 완료)할 때 호출 — 다음에 새로 열면 처음부터 시작. */
export function clearActiveRow() {
  const s = read();
  delete s.activeRow;
  write(s);
}
