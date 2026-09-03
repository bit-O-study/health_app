/**
 * 알림 중복 발송 방지 — 순수 로직(DB 의존 없음 → 그대로 단위테스트).
 *
 * 크론은 재실행된다. Vercel 이 같은 스케줄을 두 번 호출하거나(재시도),
 * 배포 검증으로 URL 을 직접 한 번 더 치거나, 스케줄을 촘촘하게 바꾸면
 * **같은 사람에게 같은 알림이 다시 간다.** 사용자 입장에선 그냥 스팸이다.
 *
 * 그래서 "무엇을/언제 것을 보냈는지" 를 `(user_id, dedup_key)` 로 기록해 두고,
 * 다음 실행에서 그 키가 이미 있으면 건너뛴다. 키에 **기간**(오늘 날짜·주 시작일)을
 * 넣기 때문에 다음 날/다음 주에는 정상적으로 다시 나간다.
 *
 * 기기가 없어 실제로 못 보낸 사람은 기록하지 않는다 — 나중에 기기를 등록하면
 * 그날 안에 받을 수 있어야 하기 때문.
 */

import type { ReminderKind } from "@/features/notifications/daily-reminder";

/** 발송 대상 한 건 — 누구에게(userId), 무슨 알림(key). */
export type SendTarget = { userId: string; key: string };

/** DB 에 남는 발송 기록 행. */
export type SentRow = { user_id: string; dedup_key: string };

/** 메모리 판정용 합성 키 — `user_id` 와 `dedup_key` 를 한 문자열로. */
export function pairKey(userId: string, key: string): string {
  return `${userId} ${key}`;
}

/**
 * 하루 리마인더 키 — 종류별·날짜별.
 * 휴식일이었다가 운동일로 바뀌면 종류가 달라 각각 한 번씩 나갈 수 있다(의도).
 */
export function dailyReminderKey(kind: ReminderKind, ymd: string): string {
  return `daily-reminders:${kind}:${ymd}`;
}

/** 주간 그룹 MVP 키 — 그룹별·주(월요일 날짜)별. */
export function weeklyMvpKey(groupId: string, weekFromYmd: string): string {
  return `weekly-group-mvp:${groupId}:${weekFromYmd}`;
}

/**
 * 이미 보낸 대상을 걷어낸다. 같은 실행 안에 같은 (user,key) 가 두 번 들어와도
 * 한 번만 남긴다(그룹 여러 개에 같은 사람이 있는 경우 등).
 *
 * @returns fresh 보낼 것 / deduped 걸러낸 개수
 */
export function splitAlreadySent<T extends SendTarget>(
  targets: readonly T[],
  sent: ReadonlySet<string>,
): { fresh: T[]; deduped: number } {
  const seen = new Set<string>();
  const fresh: T[] = [];
  let deduped = 0;
  for (const t of targets) {
    const k = pairKey(t.userId, t.key);
    if (sent.has(k) || seen.has(k)) {
      deduped += 1;
      continue;
    }
    seen.add(k);
    fresh.push(t);
  }
  return { fresh, deduped };
}

/** 조회해 온 발송 기록 행들을 판정용 Set 으로. */
export function sentKeySet(rows: readonly SentRow[]): Set<string> {
  return new Set(rows.map((r) => pairKey(r.user_id, r.dedup_key)));
}

/** 발송 기록 보존 기간(일) — 지나면 지운다. 키에 날짜가 들어가 재사용되지 않는다. */
export const SEND_LOG_RETENTION_DAYS = 30;

/** 보존 기간이 지난 기준 시각(ISO) — 이보다 오래된 기록은 삭제 대상. */
export function retentionCutoff(
  now: Date | number = Date.now(),
  days: number = SEND_LOG_RETENTION_DAYS,
): string {
  const ms = now instanceof Date ? now.getTime() : now;
  const span = Math.max(0, days) * 24 * 60 * 60 * 1000;
  return new Date(ms - span).toISOString();
}
