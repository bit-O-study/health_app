/**
 * 대량 처리용 순수 유틸 — 크론/알림처럼 "사용자 수만큼" 반복하는 경로에서 쓴다.
 * DOM·네트워크 의존이 없어 그대로 단위테스트한다.
 */

/** 배열을 size 개씩 자른다. size<=0 이면 통째로 하나의 덩어리. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size <= 0) return items.length > 0 ? [[...items]] : [];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

/**
 * 최대 `limit` 개씩만 동시에 실행하며 전부 처리한다(결과 순서는 입력 순서 유지).
 *
 * 직렬 `for ... await` 는 사용자 수에 비례해 시간이 늘고(크론 타임아웃),
 * `Promise.all` 전량 동시는 외부 푸시 서버·Supabase rate limit 을 때린다.
 * 그 사이를 잡는 게 이 함수다.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const max = Math.max(1, Math.floor(limit));
  const out = new Array<R>(items.length);
  let next = 0;

  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      out[i] = await fn(items[i], i);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(max, items.length) }, () => worker()),
  );
  return out;
}

/**
 * PostgREST 는 한 응답의 최대 행 수가 서버 설정(max-rows, 기본 1000)으로 잘린다.
 * "오늘 식단을 남긴 사용자 전체" 처럼 **빠짐없이** 필요한 조회는 잘리면 그대로 오판이
 * 되므로(→ 이미 기록한 사람에게 잔소리 푸시), 끝까지 페이지로 모아 온다.
 *
 * @param page (from,to) 구간을 읽어오는 함수. `.range(from, to)` 를 그대로 넘기면 된다.
 * @param size 한 페이지 크기(기본 1000 — Supabase 기본 상한과 동일)
 * @param maxPages 폭주 방지 상한(기본 50페이지 = 5만행)
 */
export async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null }>,
  size = 1000,
  maxPages = 50,
): Promise<T[]> {
  const out: T[] = [];
  for (let p = 0; p < maxPages; p++) {
    const from = p * size;
    const { data } = await page(from, from + size - 1);
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < size) break; // 마지막 페이지
  }
  return out;
}
