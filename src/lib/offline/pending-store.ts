"use client";

/**
 * 대기 큐의 **저장소** — 순수 로직(`pending-writes`)과 분리해 둔다.
 *
 * ## 왜 localStorage 인가 (IndexedDB 가 아니라)
 * 담기는 건 한 세션치 세트 몇십 건, 건당 수백 바이트다. IndexedDB 는 전부 비동기라
 * **페이지가 닫히는 순간**(`pagehide`) 쓰기를 끝내지 못할 수 있다 — 하필 그 순간이
 * 우리가 제일 지키고 싶은 순간이다. localStorage 는 동기라 그 자리에서 끝난다.
 *
 * ## 🔴 읽기·쓰기를 전부 감싼다
 * 시크릿 모드·사이트 데이터 차단·용량 초과(QuotaExceeded)에서 `localStorage` 는
 * **접근만 해도 던진다.** 기록을 지키려고 넣은 코드가 오히려 운동모드를 통째로
 * 죽이면 안 된다 — 실패하면 조용히 포기하고 앱은 그대로 돈다.
 */

import {
  type PendingWrite,
  PENDING_MAX_AGE_MS,
  splitExpired,
} from "@/lib/offline/pending-writes";

const KEY = "helssu:pending-writes:v1";

/** 큐를 읽는다. 못 읽거나 깨졌으면 빈 배열. */
export function readPending(): PendingWrite[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // 🔴 모양을 검사한다. 예전 버전이 남긴 값이나 손상된 값을 그대로 서버 액션에
    //   넘기면 거기서 터진다(그리고 그 실패는 사용자에게 설명할 길이 없다).
    return parsed.filter(isPendingWrite);
  } catch {
    return [];
  }
}

/** 큐를 쓴다. 실패하면 false — 호출부는 "저장은 못 했지만 계속" 으로 다룬다. */
export function writePending(list: readonly PendingWrite[]): boolean {
  try {
    if (list.length === 0) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

/**
 * 만료된 항목을 걸러 낸 큐를 돌려주고, 걸러진 결과를 저장까지 한다.
 * 화면은 `expired` 를 받아 "못 올린 기록이 있었다" 고 알린다.
 */
export function prunePending(
  now: number = Date.now(),
  maxAgeMs: number = PENDING_MAX_AGE_MS,
): { fresh: PendingWrite[]; expired: PendingWrite[] } {
  const { fresh, expired } = splitExpired(readPending(), now, maxAgeMs);
  if (expired.length > 0) writePending(fresh);
  return { fresh, expired };
}

function isPendingWrite(v: unknown): v is PendingWrite {
  if (typeof v !== "object" || v === null) return false;
  const w = v as Record<string, unknown>;
  const common =
    typeof w.key === "string" &&
    typeof w.name === "string" &&
    typeof w.rowId === "string" &&
    typeof w.forDate === "string" &&
    typeof w.queuedAt === "number" &&
    (w.status === "done" || w.status === "skipped");
  if (!common) return false;
  if (w.kind === "main") return typeof w.snapshot === "object";
  if (w.kind === "conditioning")
    return typeof w.condKind === "string" && typeof w.itemId === "string";
  return false;
}
