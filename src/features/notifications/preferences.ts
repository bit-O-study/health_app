/**
 * 사용자별 알림 설정 — 로드맵 3.1. **순수 로직**(DB/React 의존 없음, 테스트 공용).
 *
 * 지금까지는 알림이 **전부 아니면 전무**였다. 브라우저 권한을 주면 리마인더도,
 * 운동 종료 확인도, 그룹 알림도 다 온다. 밤 11시에 "운동을 종료하시겠습니까?" 가
 * 뜨면 사람은 알림 자체를 꺼 버리고, 그러면 정작 필요한 것도 못 받는다.
 *
 * 정한 것 셋.
 *  1) **종류별 동의.** 끄고 싶은 것만 끈다.
 *  2) **야간 방해 금지.** 기본 22시~7시. 그 시간엔 안 보낸다.
 *  3) **설정이 없으면 전부 켜짐 + 야간 금지 켜짐.** 기존 사용자에게 행을 만들지
 *     않아도 지금과 같이 동작한다(단, 밤에는 조용해진다 — 그게 이 항목의 목적).
 *
 * ⚠ 시간 판정은 **서울 기준**이다. 이 앱의 날짜·크론이 전부 서울 기준이고,
 *   사용자가 사는 곳도 한국이다. UTC 시각으로 재면 밤 10시가 낮 1시로 잡힌다.
 */

/** 알림 종류 — 새 알림을 만들면 여기에 먼저 등록한다. */
export const NOTIFICATION_KINDS = [
  /** 오늘 운동을 아직 안 했을 때(하루 리마인더). */
  "workout-reminder",
  /** 휴식일에 식단을 안 적었을 때(하루 리마인더). */
  "diet-reminder",
  /** 운동 중 오래 멈췄을 때 종료 확인. */
  "workout-inactivity",
  /** 그룹 주간 MVP·그룹 반응. */
  "group-activity",
  /** 내가 올린 루틴을 누가 담았을 때. */
  "routine-saved",
  /** 세트 사이 휴식 타이머(기기 로컬 알림). */
  "rest-timer",
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export function isNotificationKind(v: unknown): v is NotificationKind {
  return (
    typeof v === "string" &&
    (NOTIFICATION_KINDS as readonly string[]).includes(v)
  );
}

/** 설정 화면에 그대로 쓰는 라벨·설명. */
export const NOTIFICATION_LABEL: Record<
  NotificationKind,
  { title: string; desc: string }
> = {
  "workout-reminder": {
    title: "운동 리마인더",
    desc: "운동일 저녁까지 운동 기록이 없으면 알려드려요.",
  },
  "diet-reminder": {
    title: "식단 리마인더",
    desc: "휴식일 저녁까지 식단 기록이 없으면 알려드려요.",
  },
  "workout-inactivity": {
    title: "운동 종료 확인",
    desc: "운동 중 오래 멈춰 있으면 종료할지 물어봐요.",
  },
  "group-activity": {
    title: "그룹 소식",
    desc: "주간 MVP 발표와 그룹원 반응을 알려드려요.",
  },
  "routine-saved": {
    title: "내 루틴 담김",
    desc: "커뮤니티에 올린 내 루틴을 누가 담으면 알려드려요.",
  },
  "rest-timer": {
    title: "휴식 타이머",
    desc: "세트 사이 휴식이 끝나면 기기에서 알려줘요.",
  },
};

/**
 * 푸시 페이로드의 `type` → 알림 종류.
 *
 * 발송부는 페이로드 타입으로 말하고 설정은 종류로 말한다. 이 표가 둘을 잇는다 —
 * 여기 빠진 타입은 **설정에서 끌 수 없는 알림**이 되므로 새 발송을 만들면 반드시 넣는다.
 */
export const PUSH_TYPE_TO_KIND: Record<string, NotificationKind> = {
  "reminder-workout": "workout-reminder",
  "reminder-diet": "diet-reminder",
  "workout-end": "workout-inactivity",
  "weekly-mvp": "group-activity",
  "group-reaction": "group-activity",
  "routine-saved": "routine-saved",
};

export function kindForPushType(type: string): NotificationKind | null {
  return PUSH_TYPE_TO_KIND[type] ?? null;
}

export type NotificationPreferences = {
  /** 종류별 동의. */
  kinds: Record<NotificationKind, boolean>;
  /** 야간 방해 금지 사용 여부. */
  quietHours: boolean;
  /** 방해 금지 시작 시(0~23, 서울). */
  quietStartHour: number;
  /** 방해 금지 끝 시(0~23, 서울). 이 시각부터 다시 보낸다. */
  quietEndHour: number;
};

/**
 * 기본값 — 전부 켜짐, 야간(22~07) 금지.
 *
 * 종류를 전부 켜 두는 건 **기존 동작을 그대로 두기 위해서**다(행이 없는 사용자도
 * 지금처럼 받는다). 야간 금지만 기본으로 켠다 — 밤에 오는 알림이 알림 전체를
 * 꺼 버리게 만드는 원인이라, 그걸 막는 게 이 기능의 목적이다.
 */
export const DEFAULT_PREFERENCES: NotificationPreferences = {
  kinds: {
    "workout-reminder": true,
    "diet-reminder": true,
    "workout-inactivity": true,
    "group-activity": true,
    "routine-saved": true,
    "rest-timer": true,
  },
  quietHours: true,
  quietStartHour: 22,
  quietEndHour: 7,
};

/** DB row(스네이크) → 설정. 행이 없거나 값이 깨졌으면 기본값으로 메운다. */
export type PreferenceRow = {
  workout_reminder?: unknown;
  diet_reminder?: unknown;
  workout_inactivity?: unknown;
  group_activity?: unknown;
  routine_saved?: unknown;
  rest_timer?: unknown;
  quiet_hours?: unknown;
  quiet_start_hour?: unknown;
  quiet_end_hour?: unknown;
};

const ROW_KEY: Record<NotificationKind, keyof PreferenceRow> = {
  "workout-reminder": "workout_reminder",
  "diet-reminder": "diet_reminder",
  "workout-inactivity": "workout_inactivity",
  "group-activity": "group_activity",
  "routine-saved": "routine_saved",
  "rest-timer": "rest_timer",
};

function boolOr(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function hourOr(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isInteger(n) && n >= 0 && n <= 23 ? n : fallback;
}

export function parsePreferences(
  row: PreferenceRow | null | undefined,
): NotificationPreferences {
  if (!row || typeof row !== "object") return DEFAULT_PREFERENCES;
  const kinds = {} as Record<NotificationKind, boolean>;
  for (const kind of NOTIFICATION_KINDS) {
    kinds[kind] = boolOr(row[ROW_KEY[kind]], DEFAULT_PREFERENCES.kinds[kind]);
  }
  return {
    kinds,
    quietHours: boolOr(row.quiet_hours, DEFAULT_PREFERENCES.quietHours),
    quietStartHour: hourOr(
      row.quiet_start_hour,
      DEFAULT_PREFERENCES.quietStartHour,
    ),
    quietEndHour: hourOr(row.quiet_end_hour, DEFAULT_PREFERENCES.quietEndHour),
  };
}

/** 설정 → DB row(스네이크). 저장할 때 쓴다. */
export function toPreferenceRow(
  prefs: NotificationPreferences,
): Required<PreferenceRow> {
  return {
    workout_reminder: prefs.kinds["workout-reminder"],
    diet_reminder: prefs.kinds["diet-reminder"],
    workout_inactivity: prefs.kinds["workout-inactivity"],
    group_activity: prefs.kinds["group-activity"],
    routine_saved: prefs.kinds["routine-saved"],
    rest_timer: prefs.kinds["rest-timer"],
    quiet_hours: prefs.quietHours,
    quiet_start_hour: prefs.quietStartHour,
    quiet_end_hour: prefs.quietEndHour,
  };
}

/**
 * 지금이 방해 금지 시간인가.
 *
 * 시작이 끝보다 크면 **자정을 넘긴다**(22시~7시 = 22,23,0,...,6). 이 경우를 놓치면
 * 새벽 알림이 그대로 나간다. 시작과 끝이 같으면 금지 구간이 없는 것으로 본다
 * (하루 종일 금지는 '알림 전부 끄기' 이지 방해 금지가 아니다).
 */
export function isQuietHour(
  hourSeoul: number,
  prefs: NotificationPreferences,
): boolean {
  if (!prefs.quietHours) return false;
  const { quietStartHour: start, quietEndHour: end } = prefs;
  if (start === end) return false;
  return start < end
    ? hourSeoul >= start && hourSeoul < end
    : hourSeoul >= start || hourSeoul < end;
}

export type SendDecision =
  | { allowed: true }
  | { allowed: false; reason: "kind-off" | "quiet-hours" };

/**
 * 이 종류의 알림을 지금 보내도 되나.
 *
 * @param hourSeoul 서울 기준 현재 시(0~23).
 */
export function decideSend(
  prefs: NotificationPreferences,
  kind: NotificationKind,
  hourSeoul: number,
): SendDecision {
  if (!prefs.kinds[kind]) return { allowed: false, reason: "kind-off" };
  if (isQuietHour(hourSeoul, prefs)) {
    return { allowed: false, reason: "quiet-hours" };
  }
  return { allowed: true };
}

/** 서울 기준 현재 시(0~23). */
export function seoulHour(now: Date = new Date()): number {
  const s = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    hour12: false,
  }).format(now);
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 && n <= 23 ? n : 0;
}

/**
 * 여러 사용자 중 이 알림을 받을 사람만 남긴다.
 *
 * 크론은 수백 명을 한 번에 다루므로 사용자마다 설정을 조회하면 왕복이 그만큼 늘어난다.
 * 설정 맵을 한 번에 읽어 넘기고(=`loadPreferences`), 걸러내기는 여기서 한다.
 * **맵에 없는 사용자는 기본값**(=받는다)으로 본다.
 */
export function filterByPreference<T>(
  targets: readonly T[],
  userIdOf: (t: T) => string,
  prefsByUser: ReadonlyMap<string, NotificationPreferences>,
  kind: NotificationKind,
  hourSeoul: number,
): { allowed: T[]; blocked: number } {
  const allowed: T[] = [];
  let blocked = 0;
  for (const t of targets) {
    const prefs = prefsByUser.get(userIdOf(t)) ?? DEFAULT_PREFERENCES;
    if (decideSend(prefs, kind, hourSeoul).allowed) allowed.push(t);
    else blocked += 1;
  }
  return { allowed, blocked };
}
