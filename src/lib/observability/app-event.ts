/**
 * 실사용 오류 관측 — **순수 로직**(React/next/DB 의존 없음, 단위 테스트 공용).
 *
 * 프로덕션에서 무슨 일이 나는지 볼 방법이 로그밖에 없었다(로드맵 1.3).
 * 여기서 정하는 것은 세 가지다.
 *  1) **무엇을 남기는가** — 정해진 종류만(`APP_EVENT_KINDS`). 자유 문자열 금지.
 *  2) **개인정보를 어떻게 빼는가** — `sanitizeMessage`/`normalizeRoute` 가
 *     이메일·토큰·uuid·긴 숫자·쿼리스트링을 지운다. 원문을 그대로 저장하지 않는다.
 *  3) **얼마나 남기는가** — 보존 30일, 기기당 대기열 상한, 같은 오류 반복은 합산.
 *
 * 수집은 **기능보다 항상 뒤**다. 여기 함수는 던지지 않고, 이상한 입력은 버린다.
 */

/** 남기는 사건의 종류 — 이 목록에 없는 값은 서버에서 버린다. */
export const APP_EVENT_KINDS = [
  /** WebView(렌더러)가 죽어 새로 뜬 부팅. 팅김의 직접 신호. */
  "webview_recovery",
  /** 로그인·회원가입·소셜 로그인 실패. */
  "auth_failure",
  /** 푸시 구독/토큰 등록 실패 — 알림이 조용히 안 가는 원인. */
  "push_register_failure",
  /** Health Connect 권한·플러그인 실패. */
  "health_permission_failure",
  /** 운동·식단 등 저장 실패(서버 액션이 ok:false 를 돌려준 경우 포함). */
  "save_failure",
  /** 화면 로딩이 임계치를 넘었다. value = 밀리초. */
  "slow_route",
  /** JS 힙 사용량 경고. value = MB. */
  "memory_warning",
] as const;

export type AppEventKind = (typeof APP_EVENT_KINDS)[number];

export function isAppEventKind(v: unknown): v is AppEventKind {
  return (
    typeof v === "string" && (APP_EVENT_KINDS as readonly string[]).includes(v)
  );
}

/** 관리자 화면 표시용 한글 라벨. */
export const APP_EVENT_LABEL: Record<AppEventKind, string> = {
  webview_recovery: "WebView 종료 후 복구",
  auth_failure: "로그인·가입 실패",
  push_register_failure: "푸시 등록 실패",
  health_permission_failure: "건강 연동 실패",
  save_failure: "저장 실패",
  slow_route: "느린 화면",
  memory_warning: "메모리 경고",
};

/** 종류별 심각도 — 오류율 계산에서 error 만 분자로 센다. */
export const APP_EVENT_SEVERITY: Record<AppEventKind, "error" | "warn"> = {
  webview_recovery: "error",
  auth_failure: "error",
  push_register_failure: "error",
  health_permission_failure: "error",
  save_failure: "error",
  slow_route: "warn",
  memory_warning: "warn",
};

/** 보존 기간 — 이보다 오래된 행은 하루 한 번 도는 크론이 지운다. */
export const APP_EVENT_RETENTION_DAYS = 30;

/** 한 기기가 서버로 보내지 못하고 들고 있을 수 있는 최대 개수. */
export const MAX_QUEUED_EVENTS = 30;
/** 대기열에서 이만큼 오래된 사건은 보내지 않고 버린다(뒤늦게 와도 쓸모가 없다). */
export const QUEUE_TTL_MS = 24 * 60 * 60 * 1000;
/** 같은 사건이 이 간격 안에 또 나면 행을 늘리지 않고 count 만 올린다. */
export const DEDUPE_WINDOW_MS = 60 * 1000;
/** 한 번의 요청으로 받는 최대 개수(서버). */
export const MAX_EVENTS_PER_REQUEST = 30;

/** 문자열 필드 상한 — 길이로 DB 를 채우지 못하게. */
const LIMITS = { message: 200, route: 120, appVersion: 40, device: 60 } as const;

/** 클라이언트가 만들어 보내는 형태(정규화 전). */
export type RawAppEvent = {
  kind: string;
  route?: string | null;
  message?: string | null;
  appVersion?: string | null;
  platform?: string | null;
  device?: string | null;
  value?: number | null;
  occurredAt?: number | null;
  count?: number | null;
};

/** 정규화·검증을 통과한 형태(그대로 DB 로 간다). */
export type AppEvent = {
  kind: AppEventKind;
  severity: "error" | "warn";
  route: string;
  message: string;
  appVersion: string;
  platform: "android" | "web";
  device: string;
  value: number | null;
  occurredAt: number;
  count: number;
};

function clamp(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/**
 * 사람이 식별될 수 있는 조각을 지운다.
 *
 * 오류 메시지에는 이메일("...for user a@b.com"), 토큰, uuid, 전화번호가 섞여 들어온다.
 * 지우는 게 아니라 **자리표시자로 바꿔** 무슨 종류였는지는 남긴다(같은 오류끼리 묶이게).
 * 순서가 중요하다 — uuid 를 먼저 지워야 그 안의 숫자열이 따로 걸리지 않는다.
 */
export function sanitizeMessage(input: unknown): string {
  if (typeof input !== "string") return "";
  return clamp(
    input
      .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "<email>")
      .replace(
        /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
        "<id>",
      )
      // 주소는 쿼리스트링을 떼고 경로만(토큰 치환보다 먼저 — 쿼리 안의 값이 남지 않게).
      .replace(/(https?:\/\/[^\s?]+)\?\S*/g, "$1")
      // JWT·API 키처럼 긴 무의미 문자열(점으로 이어진 것 포함).
      .replace(/\b[A-Za-z0-9_-]{24,}(?:\.[A-Za-z0-9_-]{8,}){0,2}\b/g, "<token>")
      .replace(/\b\d{6,}\b/g, "<num>")
      .replace(/\s+/g, " ")
      .trim(),
    LIMITS.message,
  );
}

/**
 * 경로를 **묶을 수 있는 형태**로 — 쿼리·해시를 떼고, 가변 조각을 자리표시자로.
 *
 * `/groups/<uuid>` 와 `/calendar/2026-09-01` 을 그대로 두면 화면 하나가 수천 개로
 * 흩어져 "어느 화면이 문제인가"를 못 본다. 반대로 `/exercises/bench-press` 같은
 * 슬러그는 그 자체가 정보라 남긴다.
 */
export function normalizeRoute(input: unknown): string {
  if (typeof input !== "string") return "";
  const path = input.split("#")[0].split("?")[0].trim();
  if (path === "") return "";
  if (!path.startsWith("/")) return "";
  const parts = path.split("/").map((seg) => {
    if (
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)
    ) {
      return ":id";
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(seg)) return ":date";
    if (/^\d+$/.test(seg)) return ":n";
    // 초대 토큰처럼 긴 무의미 문자열.
    if (/^[A-Za-z0-9_-]{24,}$/.test(seg)) return ":token";
    return seg;
  });
  const joined = parts.join("/");
  return clamp(joined === "" ? "/" : joined, LIMITS.route);
}

function normalizePlatform(v: unknown): "android" | "web" {
  return v === "android" ? "android" : "web";
}

/** 기기 표기 — 모델명·OS 버전 정도만. 개인 식별자는 애초에 안 받는다. */
function normalizeDevice(v: unknown): string {
  if (typeof v !== "string") return "";
  return clamp(sanitizeMessage(v), LIMITS.device);
}

function normalizeVersion(v: unknown): string {
  if (typeof v !== "string") return "";
  return clamp(v.replace(/[^\w.+-]/g, "").trim(), LIMITS.appVersion);
}

function normalizeValue(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  // 음수·비정상 큰 값은 버린다(밀리초/MB 둘 다 양수).
  const rounded = Math.round(v);
  return rounded >= 0 && rounded <= 2_147_483_647 ? rounded : null;
}

function normalizeCount(v: unknown): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return 1;
  return Math.min(Math.max(1, Math.round(v)), 1000);
}

/**
 * 원본 → 저장 가능한 사건. 종류가 목록에 없으면 `null`(버린다).
 * @param now 시각을 안 보냈거나 미래/과거로 어긋난 경우의 기준.
 */
export function normalizeAppEvent(
  raw: RawAppEvent | null | undefined,
  now: number,
): AppEvent | null {
  if (!raw || typeof raw !== "object") return null;
  if (!isAppEventKind(raw.kind)) return null;
  const occurred =
    typeof raw.occurredAt === "number" &&
    Number.isFinite(raw.occurredAt) &&
    // 기기 시계가 틀어져 있을 수 있다 — 보존기간 밖이나 미래면 지금으로 본다.
    raw.occurredAt <= now + 60_000 &&
    now - raw.occurredAt <= APP_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000
      ? raw.occurredAt
      : now;
  return {
    kind: raw.kind,
    severity: APP_EVENT_SEVERITY[raw.kind],
    route: normalizeRoute(raw.route),
    message: sanitizeMessage(raw.message),
    appVersion: normalizeVersion(raw.appVersion),
    platform: normalizePlatform(raw.platform),
    device: normalizeDevice(raw.device),
    value: normalizeValue(raw.value),
    occurredAt: occurred,
    count: normalizeCount(raw.count),
  };
}

/** 같은 사건인지 — 종류·화면·메시지가 같으면 같은 것으로 본다. */
function sameEvent(a: AppEvent, b: AppEvent): boolean {
  return a.kind === b.kind && a.route === b.route && a.message === b.message;
}

/**
 * 대기열에 넣는다 — 만료 제거 → 최근 같은 사건이면 합산 → 상한 유지.
 *
 * 상한을 넘으면 **오래된 것부터** 버린다. 팅김이 연속으로 나는 순간에도 최근 상황이
 * 남아야 원인을 본다(옛날 것을 지키면 정작 사고 직전이 사라진다).
 */
export function enqueueAppEvent(
  queue: readonly AppEvent[],
  event: AppEvent,
  now: number,
): AppEvent[] {
  const alive = queue.filter((e) => now - e.occurredAt < QUEUE_TTL_MS);
  const idx = alive.findIndex(
    (e) =>
      sameEvent(e, event) && event.occurredAt - e.occurredAt < DEDUPE_WINDOW_MS,
  );
  if (idx >= 0) {
    const merged = alive.slice();
    merged[idx] = {
      ...alive[idx],
      count: normalizeCount(alive[idx].count + event.count),
      // 대표 값은 더 나쁜 쪽(느린 화면·메모리 경고는 최대값이 의미 있다).
      value:
        alive[idx].value === null || event.value === null
          ? (alive[idx].value ?? event.value)
          : Math.max(alive[idx].value, event.value),
    };
    return merged;
  }
  const next = [...alive, event];
  return next.length <= MAX_QUEUED_EVENTS
    ? next
    : next.slice(next.length - MAX_QUEUED_EVENTS);
}

/**
 * 서버가 받은 묶음을 **저장할 것 / 버릴 것 / 되돌려 보낼 것** 으로 가른다(순수).
 *
 * 서버 액션은 이 결정을 그대로 따르기만 한다 — 상한 계산과 `accepted` 의 의미가
 * 진짜 DB 없이 검증되도록 여기로 뺐다.
 *
 * `accepted` = **기기가 대기열을 비워도 되는가**. 저장했거나, 상한·형식 때문에
 * 일부러 버린 경우엔 true. "지금은 못 받는다"(로그인 전·저장 실패)일 때만 false 라서
 * 그 경우에만 기기가 들고 있다가 다시 보낸다.
 *
 * @param usedInHour 이 사용자가 최근 1시간에 이미 남긴 행 수.
 */
export function planAppEventInsert(
  events: readonly RawAppEvent[] | null | undefined,
  now: number,
  usedInHour: number,
  hourlyLimit: number,
): { events: AppEvent[]; accepted: boolean } {
  if (!Array.isArray(events) || events.length === 0) {
    return { events: [], accepted: true };
  }
  const normalized = events
    .slice(0, MAX_EVENTS_PER_REQUEST)
    .map((raw) => normalizeAppEvent(raw, now))
    .filter((e): e is AppEvent => e !== null);
  // 전부 모르는 종류였다 — 다시 보내봐야 똑같으니 버리라고 알려준다.
  if (normalized.length === 0) return { events: [], accepted: true };

  const remaining = Math.max(0, hourlyLimit - Math.max(0, usedInHour));
  // 상한을 넘겼으면 이번 것들은 버린다(들고 있어도 다음에 또 막힌다).
  if (remaining === 0) return { events: [], accepted: true };
  return { events: normalized.slice(0, remaining), accepted: true };
}

/* ─── 기기·환경 판별(순수) ───────────────────────────────────────────── */

/**
 * User-Agent → **기기 표기**(모델·OS 정도). 개인 식별자가 아니다.
 *
 * "어떤 기기에서 팅기는가" 를 보려면 모델명이 필요하다. 안드로이드 UA 에는
 * `(Linux; Android 14; SM-S911N)` 처럼 들어 있으니 그 부분만 뽑는다.
 * 못 알아보면 빈 문자열 — 억지로 UA 전체를 저장하지 않는다(길고, 정보가 섞인다).
 */
export function deviceLabelFrom(userAgent: unknown): string {
  if (typeof userAgent !== "string") return "";
  const android = userAgent.match(/Android\s+([\d.]+)(?:;\s*([^;)]+?))?\s*(?:Build\/[^);]*)?[;)]/);
  if (android) {
    const version = android[1];
    const model = (android[2] ?? "").trim();
    // 'wv'(WebView 표식)나 'K'(최신 크롬의 익명화 모델명)는 모델이 아니다.
    const useful = model !== "" && model !== "wv" && model !== "K";
    return useful ? `Android ${version} · ${model}` : `Android ${version}`;
  }
  if (/iPhone|iPad|iPod/.test(userAgent)) {
    const ios = userAgent.match(/OS (\d+[_\d]*) like Mac/);
    return ios ? `iOS ${ios[1].replace(/_/g, ".")}` : "iOS";
  }
  if (/Windows NT/.test(userAgent)) return "Windows";
  if (/Mac OS X/.test(userAgent)) return "macOS";
  if (/Linux/.test(userAgent)) return "Linux";
  return "";
}

/** 이 시간을 넘겨 뜨면 '느린 화면'으로 남긴다(WebView 체감 기준). */
export const SLOW_ROUTE_MS = 4000;

/** 화면 로딩이 느렸는지 — 값이 없거나 비정상이면 false. */
export function isSlowLoad(durationMs: unknown): boolean {
  return (
    typeof durationMs === "number" &&
    Number.isFinite(durationMs) &&
    durationMs > SLOW_ROUTE_MS &&
    // 탭을 오래 열어둔 뒤 복귀하면 말도 안 되게 큰 값이 나온다 — 그건 로딩이 아니다.
    durationMs < 10 * 60 * 1000
  );
}

/** 힙이 한계의 이 비율을 넘으면 경고로 본다(넘으면 곧 렌더러가 죽는다). */
export const MEMORY_WARN_RATIO = 0.85;

/**
 * JS 힙 사용량이 위험한지 — 위험하면 사용량(MB), 아니면 null.
 * `performance.memory` 는 크로미움에만 있고 값이 0/누락일 수 있어 방어한다.
 */
export function memoryWarningMb(used: unknown, limit: unknown): number | null {
  if (typeof used !== "number" || typeof limit !== "number") return null;
  if (!Number.isFinite(used) || !Number.isFinite(limit)) return null;
  if (used <= 0 || limit <= 0) return null;
  if (used / limit < MEMORY_WARN_RATIO) return null;
  return Math.round(used / (1024 * 1024));
}

/* ─── 관리자 화면 집계 ────────────────────────────────────────────────── */

/** DB 에서 읽어오는 행(선택 컬럼만). */
export type AppEventRow = {
  kind: string;
  severity: string;
  route: string | null;
  message: string | null;
  app_version: string | null;
  platform: string | null;
  device: string | null;
  value: number | null;
  count: number;
  occurred_at: string;
};

export type AppEventGroup = {
  key: string;
  label: string;
  /** count 합계(같은 사건 반복을 합산한 값). */
  total: number;
  errors: number;
  warnings: number;
  /** 가장 최근 발생 시각(ISO). 없으면 null. */
  lastAt: string | null;
  /** 대표 메시지 — 무슨 오류인지 한 줄로 보이게. */
  sample: string;
};

function addTo(
  map: Map<string, AppEventGroup>,
  key: string,
  label: string,
  row: AppEventRow,
): void {
  const cur = map.get(key) ?? {
    key,
    label,
    total: 0,
    errors: 0,
    warnings: 0,
    lastAt: null as string | null,
    sample: "",
  };
  const n = Number.isFinite(row.count) ? Math.max(1, row.count) : 1;
  cur.total += n;
  if (row.severity === "error") cur.errors += n;
  else cur.warnings += n;
  if (cur.lastAt === null || row.occurred_at > cur.lastAt) {
    cur.lastAt = row.occurred_at;
  }
  if (cur.sample === "" && row.message) cur.sample = row.message;
  map.set(key, cur);
}

function sorted(map: Map<string, AppEventGroup>): AppEventGroup[] {
  return [...map.values()].sort(
    (a, b) => b.total - a.total || a.label.localeCompare(b.label),
  );
}

/** 미기입 값의 표시 — 빈 문자열을 화면에 그대로 두지 않는다. */
const UNKNOWN = "(미상)";

export type AppEventSummary = {
  byKind: AppEventGroup[];
  byRoute: AppEventGroup[];
  byVersion: AppEventGroup[];
  byDevice: AppEventGroup[];
  total: number;
  errors: number;
};

/** 종류·화면·버전·기기별 집계. 행이 없으면 전부 빈 목록. */
export function summarizeAppEvents(
  rows: readonly AppEventRow[],
): AppEventSummary {
  const byKind = new Map<string, AppEventGroup>();
  const byRoute = new Map<string, AppEventGroup>();
  const byVersion = new Map<string, AppEventGroup>();
  const byDevice = new Map<string, AppEventGroup>();
  let total = 0;
  let errors = 0;

  for (const row of rows) {
    const n = Number.isFinite(row.count) ? Math.max(1, row.count) : 1;
    total += n;
    if (row.severity === "error") errors += n;
    const kindLabel = isAppEventKind(row.kind)
      ? APP_EVENT_LABEL[row.kind]
      : row.kind;
    addTo(byKind, row.kind, kindLabel, row);
    addTo(byRoute, row.route || UNKNOWN, row.route || UNKNOWN, row);
    // 버전은 플랫폼과 같이 봐야 의미가 있다(웹 배포본 ≠ APK 빌드).
    const platform = row.platform || UNKNOWN;
    const version = row.app_version || UNKNOWN;
    addTo(byVersion, `${platform}:${version}`, `${platform} · ${version}`, row);
    addTo(byDevice, row.device || UNKNOWN, row.device || UNKNOWN, row);
  }

  return {
    byKind: sorted(byKind),
    byRoute: sorted(byRoute),
    byVersion: sorted(byVersion),
    byDevice: sorted(byDevice),
    total,
    errors,
  };
}
