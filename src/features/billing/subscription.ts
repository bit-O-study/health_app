/**
 * 구독 권한 판정 — 로드맵 7.1(결제 상태 확인과 복원). 순수 모듈.
 *
 * 🔴 이 파일의 한 가지 원칙: **권한은 "결제했다"가 아니라 "언제까지 유효한가"에서 나온다.**
 * 결제 이벤트를 세면 환불·해지·결제실패를 전부 따로 처리해야 하고, 하나라도 놓치면
 * 돈을 안 낸 사람이 계속 쓰거나 낸 사람이 갑자기 막힌다. 만료 시각 하나만 보면
 * 그 모든 경우가 저절로 맞는다.
 *
 * 구글 플레이의 상태 이름은 여기서 우리 말로 바꾼다(`mapPlayState`) — 구글이 이름을
 * 바꾸거나 상태를 늘려도 고칠 곳이 한 군데다.
 */

/** 우리가 다루는 구독 상태. 구글의 상태를 이쪽으로 좁혀서 쓴다. */
export type SubscriptionState =
  /** 정상 결제 중. */
  | "active"
  /** 결제가 실패했지만 구글이 재시도 중(유예) — **접근은 유지한다**. */
  | "grace"
  /** 해지했다. 이미 낸 기간이 남아 있으면 그때까지는 쓴다. */
  | "canceled"
  /** 결제 보류(계정 정지) — 접근을 끊는다. */
  | "on_hold"
  /** 사용자가 잠시 멈춤 — 접근을 끊는다. */
  | "paused"
  /** 만료. */
  | "expired";

export type SubscriptionRecord = {
  productId: string;
  state: SubscriptionState;
  /** 이 시각까지 유효(ISO). 모르면 null. */
  expiresAt: string | null;
  autoRenewing: boolean;
};

/**
 * 구글 플레이(`subscriptionsv2`)의 상태 문자열 → 우리 상태.
 * 모르는 값은 **만료로 본다** — 모르는 상태에 권한을 주면 안 된다.
 */
export function mapPlayState(raw: unknown): SubscriptionState {
  switch (typeof raw === "string" ? raw.toUpperCase() : "") {
    case "SUBSCRIPTION_STATE_ACTIVE":
      return "active";
    case "SUBSCRIPTION_STATE_IN_GRACE_PERIOD":
      return "grace";
    case "SUBSCRIPTION_STATE_CANCELED":
      return "canceled";
    case "SUBSCRIPTION_STATE_ON_HOLD":
      return "on_hold";
    case "SUBSCRIPTION_STATE_PAUSED":
      return "paused";
    case "SUBSCRIPTION_STATE_EXPIRED":
      return "expired";
    // PENDING(결제 대기)·UNSPECIFIED 를 포함해 나머지는 전부 권한 없음.
    default:
      return "expired";
  }
}

/** 그 상태 자체가 접근을 허용하는가(만료 시각은 따로 본다). */
function stateAllows(state: SubscriptionState): boolean {
  // 해지(canceled)도 허용 목록에 있다 — 이미 낸 기간이 남아 있으면 써야 한다.
  // 만료 시각이 지났으면 아래 `isEntitled` 가 어차피 막는다.
  return state === "active" || state === "grace" || state === "canceled";
}

/**
 * 지금 프리미엄인가.
 *
 * 🔴 **만료 시각이 항상 이긴다.** 기록이 'active' 라도 만료가 지났으면 권한이 없다 —
 * 갱신 소식을 못 받아 낡은 채로 남아 있을 수 있고(우리가 구글 알림을 놓쳤을 때),
 * 그때 '활성' 이라는 글자만 믿으면 돈 안 낸 사람이 계속 쓰게 된다.
 *
 * 만료 시각을 모르면(null) **권한 없음** — 모르면 주지 않는다.
 */
export function isEntitled(
  rec: SubscriptionRecord | null,
  now: Date = new Date(),
): boolean {
  if (!rec || !stateAllows(rec.state)) return false;
  if (!rec.expiresAt) return false;
  const t = Date.parse(rec.expiresAt);
  if (!Number.isFinite(t)) return false;
  return t > now.getTime();
}

/** 화면에 보여줄 상태 한 줄. 사용자가 지금 뭘 해야 하는지 알 수 있어야 한다. */
export function statusLabel(
  rec: SubscriptionRecord | null,
  now: Date = new Date(),
): string {
  if (!rec) return "무료 이용 중";
  if (isEntitled(rec, now)) {
    switch (rec.state) {
      case "grace":
        // 여기서 안내를 안 하면 사용자는 어느 날 갑자기 막힌다.
        return "결제가 확인되지 않았어요. 결제 수단을 확인해 주세요(이용은 유지됩니다).";
      case "canceled":
        return `해지 예정 — ${formatUntil(rec.expiresAt)}까지 이용할 수 있어요.`;
      default:
        return `프리미엄 이용 중 — ${formatUntil(rec.expiresAt)}까지`;
    }
  }
  switch (rec.state) {
    case "on_hold":
      return "결제가 보류됐어요. 구글 플레이에서 결제 수단을 갱신해 주세요.";
    case "paused":
      return "구독을 잠시 멈춘 상태예요.";
    default:
      return "무료 이용 중";
  }
}

/** 'YYYY-MM-DD' 를 사람이 읽는 날짜로(서울 기준). 못 읽으면 빈 문자열. */
export function formatUntil(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  const [y, m, day] = ymd.split("-");
  return `${y}년 ${Number(m)}월 ${Number(day)}일`;
}

/**
 * 구글 응답에서 만료 시각을 고른다.
 *
 * `subscriptionsv2` 는 상품 한 건마다 `lineItems[].expiryTime` 을 준다. 여러 개면
 * **가장 늦은 것**을 쓴다 — 업그레이드 직후엔 옛 상품과 새 상품이 잠시 함께 있는데,
 * 이른 쪽을 고르면 방금 결제한 사용자가 만료로 보인다.
 */
export function pickExpiry(lineItems: unknown): string | null {
  if (!Array.isArray(lineItems)) return null;
  let best = 0;
  for (const li of lineItems) {
    const t = (li as { expiryTime?: unknown } | null)?.expiryTime;
    if (typeof t !== "string") continue;
    const ms = Date.parse(t);
    if (Number.isFinite(ms) && ms > best) best = ms;
  }
  return best > 0 ? new Date(best).toISOString() : null;
}

/** 구글 응답에서 상품 id — 여러 개면 첫 번째(표시용이라 하나면 충분하다). */
export function pickProductId(lineItems: unknown): string {
  if (!Array.isArray(lineItems)) return "";
  for (const li of lineItems) {
    const p = (li as { productId?: unknown } | null)?.productId;
    if (typeof p === "string" && p) return p;
  }
  return "";
}

/**
 * 자동 갱신 여부 — `lineItems[].autoRenewingPlan.autoRenewEnabled`.
 * 하나라도 켜져 있으면 갱신되는 것으로 본다.
 */
export function pickAutoRenewing(lineItems: unknown): boolean {
  if (!Array.isArray(lineItems)) return false;
  return lineItems.some(
    (li) =>
      (li as { autoRenewingPlan?: { autoRenewEnabled?: unknown } } | null)
        ?.autoRenewingPlan?.autoRenewEnabled === true,
  );
}
