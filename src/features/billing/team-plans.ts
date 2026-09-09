/**
 * 팀 구독(B2B) 요금제 — 순수 모듈. 표와 계산만 여기 두고, 저장은 서버가 한다.
 *
 * 🔴 **구글 플레이 결제를 쓰지 않는다.** Play 인앱결제는 개인용이고, 사업자에게는
 * 세금계산서·계좌이체가 필요하다(비용 처리를 해야 하니까). 그래서 여기는 신청 → 입금 →
 * 관리자 승인이다. 자동화할 자리가 아니라 **일부러 사람이 승인한다** — 입금을 코드가
 * 확인할 방법이 없고, 잘못 열어 주면 프리미엄이 공짜로 새어 나간다.
 */

export const TEAM_PLANS = ["trainer", "gym"] as const;
export type TeamPlan = (typeof TEAM_PLANS)[number];

export function isTeamPlan(v: unknown): v is TeamPlan {
  return typeof v === "string" && (TEAM_PLANS as readonly string[]).includes(v);
}

export type TeamPlanMeta = {
  id: TeamPlan;
  label: string;
  /** 월 이용료(원, 부가세 별도). 실제 청구액은 승인할 때 관리자가 정한다 — 여기 값은 **안내가**다. */
  monthlyKrw: number;
  /** 안내에 쓰는 인원 기준. 초과했다고 코드가 막지 않는다(협의 사항이다). */
  seatsHint: string;
  desc: string;
};

export const TEAM_PLAN_META: Record<TeamPlan, TeamPlanMeta> = {
  trainer: {
    id: "trainer",
    label: "트레이너",
    monthlyKrw: 39_000,
    seatsHint: "회원 15명까지",
    desc: "담당 회원 전원이 프리미엄. 회원 관리·루틴 배정·코멘트.",
  },
  gym: {
    id: "gym",
    label: "헬스장",
    monthlyKrw: 149_000,
    seatsHint: "인원 제한 없음",
    desc: "트레이너 여러 명·회원 전원 프리미엄.",
  },
};

export const TEAM_STATUSES = ["requested", "active", "expired", "canceled"] as const;
export type TeamStatus = (typeof TEAM_STATUSES)[number];

export function isTeamStatus(v: unknown): v is TeamStatus {
  return typeof v === "string" && (TEAM_STATUSES as readonly string[]).includes(v);
}

export const TEAM_STATUS_LABEL: Record<TeamStatus, string> = {
  requested: "신청 접수됨",
  active: "이용 중",
  expired: "기간 만료",
  canceled: "해지됨",
};

export type TeamSubscription = {
  groupId: string;
  plan: TeamPlan;
  status: TeamStatus;
  seats: number;
  priceKrw: number;
  /** YYYY-MM-DD 또는 null. */
  periodStart: string | null;
  periodEnd: string | null;
  bizName: string | null;
  bizNumber: string | null;
  bizEmail: string | null;
  requestedAt: string;
  approvedAt: string | null;
  memo: string | null;
};

/**
 * 지금 이용 중인가 — **status 와 기간을 같이** 본다.
 *
 * 🔴 status 만 보면 안 된다. 만료 처리를 깜빡한 행이 하나라도 있으면 그 팀 전원이
 * 계속 프리미엄이다. 기간을 같이 보면 아무도 안 건드려도 저절로 끊긴다.
 * (DB 의 `has_team_premium()` 도 같은 규칙이다 — 여기는 화면 표시용이다.)
 */
export function isTeamActive(
  sub: Pick<TeamSubscription, "status" | "periodEnd"> | null,
  todayYmd: string,
): boolean {
  if (!sub || sub.status !== "active" || !sub.periodEnd) return false;
  return sub.periodEnd >= todayYmd;
}

/** 남은 일수(만료일 포함). 이용 중이 아니면 null. */
export function daysLeft(
  sub: Pick<TeamSubscription, "status" | "periodEnd"> | null,
  todayYmd: string,
): number | null {
  if (!isTeamActive(sub, todayYmd)) return null;
  const a = Date.parse(`${todayYmd}T00:00:00Z`);
  const b = Date.parse(`${sub!.periodEnd}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

/**
 * `from` 에서 `months` 개월 뒤 (만료일). 승인·연장 화면의 기본값.
 *
 * 🔴 말일 처리 — 1월 31일 + 1개월은 2월 31일이 없으니 **2월 말일**로 접는다.
 * 접지 않으면 자바스크립트가 3월 3일로 넘겨 버려 이용기간이 며칠 늘어난다.
 */
export function addMonthsYmd(from: string, months: number): string {
  const [y, m, d] = from.split("-").map(Number);
  if (!y || !m || !d) return from;
  const targetMonth0 = m - 1 + months;
  const ty = y + Math.floor(targetMonth0 / 12);
  const tm0 = ((targetMonth0 % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(ty, tm0 + 1, 0)).getUTCDate();
  const td = Math.min(d, lastDay);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${ty}-${pad(tm0 + 1)}-${pad(td)}`;
}

/** 사업자등록번호 표기 정리 — 숫자만 남겨 10자리면 `000-00-00000`. 아니면 원문. */
export function formatBizNumber(raw: string | null): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 10) return raw.trim();
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}
