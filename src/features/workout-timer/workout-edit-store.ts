"use client";

/**
 * 운동모드(고정 끔)에서 그때그때 설정한 무게/횟수/세트(본운동)·시간/속도/경사(컨디셔닝)를
 * 그날 동안 기억한다. 운동모드를 나갔다 다시 들어와도 직전 값이 유지되고, **날짜가 바뀌면
 * 초기화**돼 다시 편집기(등록)의 초기 데이터부터 시작한다.
 *
 * localStorage 에 날짜와 함께 저장 — 읽을 때 오늘과 다르면 빈 값으로 본다.
 */

import { seoulTodayYmd } from "@/features/workout-timer/timer-store";

export type MainEdit = { w: number | null; reps: number; sets: number };
export type CondEdit = {
  duration: number | null;
  speed: number | null;
  incline: number | null;
};
type Store = {
  date: string;
  main: Record<string, MainEdit>;
  cond: Record<string, CondEdit>;
};

const KEY = "heltch.workout.edits";

function read(): Store {
  const today = seoulTodayYmd();
  if (typeof window === "undefined") return { date: today, main: {}, cond: {} };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<Store>;
      // 날짜가 오늘과 같을 때만 유효 — 하루 지나면 초기화(빈 값).
      if (v && v.date === today) {
        return { date: today, main: v.main ?? {}, cond: v.cond ?? {} };
      }
    }
  } catch {
    /* noop */
  }
  return { date: today, main: {}, cond: {} };
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
