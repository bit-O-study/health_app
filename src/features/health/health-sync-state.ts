/**
 * 항목별 '마지막 동기화' 기록 — 로드맵 6.1.
 *
 * 🔴 **기기마다 따로다.** Health Connect 는 그 폰에 있는 데이터고, 같은 계정으로 다른
 * 폰을 쓰면 거기서 따로 붙여야 한다. 서버에 한 줄로 두면 "다른 폰에서 5분 전에 했다"가
 * 이 폰의 상태인 것처럼 보인다. 그래서 **기기 로컬(localStorage)** 에 남긴다.
 *
 * 저장 형식이 깨져 있어도(옛 버전·손댄 값) 화면이 죽으면 안 되므로, 읽기는 전부
 * 방어적으로 — 못 읽는 값은 **없는 것으로 친다**(틀린 시각을 보여주느니 안 보여준다).
 */

import { isHealthFeatureId, type HealthFeatureId } from "@/features/health/health-features";

export const HEALTH_SYNC_KEY = "heltch.health.lastSync";

/** 항목 id → 마지막 동기화 시각(epoch ms). */
export type HealthSyncMap = Partial<Record<HealthFeatureId, number>>;

/** 미래 시각은 안 믿는다 — 기기 시계가 앞서 있으면 "3시간 뒤에 동기화됨"이 뜬다. */
const FUTURE_SLACK_MS = 5 * 60 * 1000;

/** 저장된 문자열 → 맵. 깨진 값·모르는 id·말도 안 되는 시각은 버린다. */
export function parseSyncMap(raw: string | null, now: number): HealthSyncMap {
  if (!raw) return {};
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return {};
  const out: HealthSyncMap = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    if (!isHealthFeatureId(k)) continue;
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n) || n <= 0) continue;
    if (n > now + FUTURE_SLACK_MS) continue;
    out[k] = Math.floor(n);
  }
  return out;
}

export function serializeSyncMap(map: HealthSyncMap): string {
  return JSON.stringify(map);
}

/** 브라우저 저장소에서 읽기. 사생활 모드·저장 차단이면 조용히 빈 맵. */
export function loadSyncMap(now = Date.now()): HealthSyncMap {
  if (typeof window === "undefined") return {};
  try {
    return parseSyncMap(window.localStorage.getItem(HEALTH_SYNC_KEY), now);
  } catch {
    return {};
  }
}

/** 한 항목의 동기화 시각을 남긴다. 저장이 막혀 있어도 던지지 않는다. */
export function markSynced(
  id: HealthFeatureId,
  at = Date.now(),
): HealthSyncMap {
  const next = { ...loadSyncMap(at), [id]: at };
  if (typeof window === "undefined") return next;
  try {
    window.localStorage.setItem(HEALTH_SYNC_KEY, serializeSyncMap(next));
  } catch {
    /* 저장 못 해도 동기화 자체는 됐다 — 표시만 못 할 뿐 */
  }
  return next;
}

/**
 * 사람이 읽는 상대 시각. 초 단위까지 보여줄 이유가 없다 — "언제쯤 붙었나"만 알면 된다.
 * 하루가 넘어가면 상대 표기가 오히려 헷갈리므로 날짜로 바꾼다("3일 전"보다 "9월 2일").
 */
export function formatLastSync(at: number | undefined, now = Date.now()): string {
  if (!at || at <= 0) return "아직 없음";
  const diff = now - at;
  if (diff < 0) return "방금 전"; // 시계가 조금 앞선 기기
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "방금 전";
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const d = new Date(at);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}
