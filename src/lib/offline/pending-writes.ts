/**
 * 오프라인 동안 못 올린 운동 기록의 **대기 큐** — 순수 로직.
 *
 * ## 왜 필요한가
 * 헬스장은 지하가 많다. 신호가 끊긴 채 세트를 치면 서버 액션이 실패하고, 지금까지는
 * 그 실패가 **운동모드 화면의 메모리(`failedSavesRef`)에만** 남았다 — 앱을 닫거나
 * 화면을 벗어나면 그 기록은 그냥 없어진다. 사용자는 분명히 완료를 눌렀는데
 * 다음 날 기록이 비어 있다.
 *
 * 그래서 실패한 쓰기를 **기기에 적어 두고**(`pending-store`), 연결이 돌아오면
 * 자동으로 다시 보낸다. 여기 있는 함수는 전부 순수 — 저장소·네트워크를 모른다.
 *
 * ## 🔴 `forDate` 를 큐가 직접 들고 다니는 이유
 * 서버 액션은 원래 날짜를 **서버에서** `seoulYmd()` 로 정한다. 그런데 큐는 나중에
 * 보낸다 — 23:55 에 친 세트가 00:05 에 올라가면 **날짜가 하루 밀린다.** 그러면
 * 주간 분석(주당 세트·부위 밸런스·빈도)이 전부 어긋난다. 누른 순간의 서울 날짜를
 * 항목에 박아 두고 그대로 보낸다.
 *
 * ## 🔴 오래된 항목은 올리지 않고 버린다
 * 이틀 넘게 못 올린 기록을 뒤늦게 밀어 넣으면, 사용자가 잊어버린 옛날 기록이
 * 갑자기 살아나 통계를 흔든다. 게다가 서버도 오래된 `for_date` 는 받지 않는다
 * (클라이언트가 아무 날짜나 쓰게 둘 수 없으므로 어제까지만 허용).
 * 버릴 땐 **조용히 버리지 않고** 몇 건을 못 올렸는지 화면에 알린다.
 */

import type { CompletionSnapshot } from "@/features/routine/exercise-completion-actions";
import type { CondSnapshot } from "@/features/routine/conditioning-completion-actions";

/** 큐에 담기는 한 건. 그대로 서버 액션 인자로 풀어 쓸 수 있어야 한다. */
export type PendingWrite =
  | {
      kind: "main";
      /** 같은 행을 다시 누르면 덮어쓰기 위한 안정 키. */
      key: string;
      /** 화면에 "무엇이 대기 중인지" 보여줄 이름. */
      name: string;
      rowId: string;
      status: "done" | "skipped";
      snapshot: CompletionSnapshot;
      /** 누른 순간의 서울 날짜(YYYY-MM-DD). */
      forDate: string;
      /** 큐에 넣은 시각(epoch ms). 만료 판정용. */
      queuedAt: number;
    }
  | {
      kind: "conditioning";
      key: string;
      name: string;
      /** 'warmup' | 'cooldown' 등 컨디셔닝 종류. */
      condKind: string;
      rowId: string;
      itemId: string;
      status: "done" | "skipped";
      snapshot: CondSnapshot;
      forDate: string;
      queuedAt: number;
    };

/**
 * 큐에 남겨 두는 최대 시간. 이틀.
 *
 * 하루가 아니라 이틀인 이유: 밤 운동이 자정을 넘기면 어제 날짜의 기록이 오늘 올라간다.
 * 서버가 **어제까지** 허용하므로 큐도 같은 폭을 가져야 "큐엔 있는데 서버가 거절"
 * 하는 어긋남이 안 생긴다.
 */
export const PENDING_MAX_AGE_MS = 48 * 60 * 60 * 1000;

/** 큐 최대 길이. 한 번의 운동이 수십 세트를 넘지 않는다 — 넘으면 오래된 것부터 버린다. */
export const PENDING_MAX_ITEMS = 200;

/**
 * 항목별 안정 키. 운동모드의 `failureKey` 와 **같은 규칙**이어야 한다 —
 * 실패 배너와 대기 큐가 같은 항목을 다른 키로 부르면 한쪽만 지워진다.
 */
export function pendingKey(
  w:
    | { kind: "main"; rowId: string }
    | {
        kind: "conditioning";
        condKind: string;
        rowId: string;
        itemId: string;
      },
): string {
  return w.kind === "main"
    ? `main:${w.rowId}`
    : `${w.condKind}:${w.rowId}:${w.itemId}`;
}

/**
 * 큐에 한 건 넣는다. **같은 키가 이미 있으면 덮어쓴다.**
 *
 * 🔴 쌓지 않고 덮어쓰는 이유: 이 쓰기들은 "이 행을 done 으로"(upsert) 라서 마지막
 * 것만 올리면 결과가 같다. 같은 행의 '완료 → 취소 → 완료' 를 다 올리면 왕복만
 * 늘고 중간 상태가 잠깐 보일 뿐이다. 순서(가장 최근이 뒤)는 유지한다.
 */
export function upsertPending(
  list: readonly PendingWrite[],
  entry: PendingWrite,
): PendingWrite[] {
  const next = list.filter((w) => w.key !== entry.key);
  next.push(entry);
  // 넘치면 **오래된 쪽**을 버린다 — 방금 친 세트가 옛 기록 때문에 밀려나면 안 된다.
  return next.length > PENDING_MAX_ITEMS
    ? next.slice(next.length - PENDING_MAX_ITEMS)
    : next;
}

/** 올리기에 성공한 키들을 큐에서 뺀다. */
export function removePending(
  list: readonly PendingWrite[],
  keys: readonly string[],
): PendingWrite[] {
  if (keys.length === 0) return [...list];
  const drop = new Set(keys);
  return list.filter((w) => !drop.has(w.key));
}

/**
 * 만료 기준으로 큐를 가른다.
 *
 * @returns `fresh` = 지금 올릴 것, `expired` = 너무 오래돼 버릴 것.
 */
export function splitExpired(
  list: readonly PendingWrite[],
  now: number,
  maxAgeMs: number = PENDING_MAX_AGE_MS,
): { fresh: PendingWrite[]; expired: PendingWrite[] } {
  const fresh: PendingWrite[] = [];
  const expired: PendingWrite[] = [];
  for (const w of list) {
    // 🔴 미래 시각(기기 시계가 틀어졌거나 시간대가 바뀐 경우)은 만료로 보지 않는다.
    //   버리는 쪽이 손해가 크다 — 사용자가 실제로 친 세트다.
    if (now - w.queuedAt > maxAgeMs) expired.push(w);
    else fresh.push(w);
  }
  return { fresh, expired };
}

/**
 * 배너 문구. 개수만 쓰지 않고 **무엇이** 대기 중인지 한 줄로 보여준다 —
 * "3건 대기 중" 만으로는 내가 친 그 세트가 들어 있는지 알 수 없다.
 */
export function pendingLabel(list: readonly PendingWrite[]): string {
  if (list.length === 0) return "";
  const names = Array.from(new Set(list.map((w) => w.name)));
  // 🔴 이름을 자르지 않는다. 운동 이름은 짧고, 무엇을 남길지에 정답이 없다.
  return names.join(", ");
}
