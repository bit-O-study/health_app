import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  TEAM_PLANS,
  TEAM_PLAN_META,
  TEAM_STATUSES,
  TEAM_STATUS_LABEL,
  addMonthsYmd,
  daysLeft,
  formatBizNumber,
  isTeamActive,
  isTeamPlan,
  isTeamStatus,
} from "@/features/billing/team-plans";

const TODAY = "2026-09-09";
const sub = (over: Partial<{ status: string; periodEnd: string | null }> = {}) =>
  ({ status: "active", periodEnd: "2026-10-09", ...over }) as Parameters<
    typeof isTeamActive
  >[0];

describe("팀 요금제 표", () => {
  it("요금제마다 메타가 다 있다", () => {
    for (const p of TEAM_PLANS) {
      expect(TEAM_PLAN_META[p].label).toBeTruthy();
      expect(TEAM_PLAN_META[p].monthlyKrw).toBeGreaterThan(0);
    }
  });

  it("헬스장이 트레이너보다 비싸다 — 인원이 다르다", () => {
    expect(TEAM_PLAN_META.gym.monthlyKrw).toBeGreaterThan(
      TEAM_PLAN_META.trainer.monthlyKrw,
    );
  });

  it("상태마다 라벨이 있다", () => {
    for (const s of TEAM_STATUSES) expect(TEAM_STATUS_LABEL[s]).toBeTruthy();
  });

  it("모르는 값은 걸러낸다", () => {
    expect(isTeamPlan("trainer")).toBe(true);
    expect(isTeamPlan("free")).toBe(false);
    expect(isTeamStatus("active")).toBe(true);
    expect(isTeamStatus("premium")).toBe(false);
  });
});

describe("이용 중 판정", () => {
  it("활성이고 기간이 남았으면 이용 중", () => {
    expect(isTeamActive(sub(), TODAY)).toBe(true);
    expect(isTeamActive(sub({ periodEnd: TODAY }), TODAY)).toBe(true); // 만료일 당일 포함
  });

  it("🔴 status 가 active 여도 기간이 지났으면 아니다", () => {
    // 만료 처리를 깜빡한 행 하나가 그 팀 전원을 계속 프리미엄으로 만들면 안 된다.
    expect(isTeamActive(sub({ periodEnd: "2026-09-08" }), TODAY)).toBe(false);
  });

  it("🔴 기간이 있어도 status 가 아니면 아니다", () => {
    expect(isTeamActive(sub({ status: "requested" }), TODAY)).toBe(false);
    expect(isTeamActive(sub({ status: "canceled" }), TODAY)).toBe(false);
  });

  it("기간이 비었거나 구독이 없으면 아니다", () => {
    expect(isTeamActive(sub({ periodEnd: null }), TODAY)).toBe(false);
    expect(isTeamActive(null, TODAY)).toBe(false);
  });

  it("남은 일수는 이용 중일 때만 나온다", () => {
    expect(daysLeft(sub({ periodEnd: "2026-09-19" }), TODAY)).toBe(10);
    expect(daysLeft(sub({ status: "expired" }), TODAY)).toBeNull();
  });
});

describe("기간 계산", () => {
  it("한 달 뒤", () => {
    expect(addMonthsYmd("2026-09-09", 1)).toBe("2026-10-09");
    expect(addMonthsYmd("2026-12-15", 1)).toBe("2027-01-15");
  });

  it("🔴 말일은 그 달의 마지막 날로 접는다", () => {
    // 접지 않으면 1/31 + 1개월이 3월 3일이 되어 이용기간이 며칠 늘어난다.
    expect(addMonthsYmd("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsYmd("2028-01-31", 1)).toBe("2028-02-29"); // 윤년
    expect(addMonthsYmd("2026-03-31", 1)).toBe("2026-04-30");
  });

  it("깨진 값이면 그대로 돌려준다 — 화면이 죽지 않게", () => {
    expect(addMonthsYmd("nope", 1)).toBe("nope");
  });
});

describe("사업자등록번호 표기", () => {
  it("10자리면 000-00-00000", () => {
    expect(formatBizNumber("1234567890")).toBe("123-45-67890");
    expect(formatBizNumber("123-45-67890")).toBe("123-45-67890");
  });
  it("10자리가 아니면 원문 그대로 — 지어내지 않는다", () => {
    expect(formatBizNumber("12345")).toBe("12345");
    expect(formatBizNumber(null)).toBe("");
  });
});

/**
 * 🔴 승인은 사람만 한다. 자동 승인이 붙으면 신청만으로 프리미엄이 새어 나간다.
 * 승인 액션이 관리자 확인 없이 굴러가지 않는지 소스로 못 박는다.
 */
describe("승인 경로", () => {
  const src = readFileSync("src/features/billing/team-actions.ts", "utf8");

  it("승인·해지는 isAdminUser 를 먼저 본다", () => {
    for (const fn of ["approveTeamPlanAction", "cancelTeamPlanAction"]) {
      const body = src.slice(src.indexOf(`export async function ${fn}`));
      expect(body.slice(0, 600), `${fn} 에 관리자 확인이 없다`).toContain("isAdminUser()");
    }
  });

  it("🔴 신청 액션은 status 를 인자로 받지 않는다", () => {
    // 화면이 보내는 값으로 상태를 정하면 신청 화면을 흉내 내는 것만으로 active 가 된다.
    const body = src.slice(
      src.indexOf("export async function requestTeamPlanAction"),
      src.indexOf("export async function cancelTeamRequestAction"),
    );
    expect(body).toContain('status: "requested"');
    expect(body).not.toMatch(/status:\s*input\.|status:\s*status/);
  });

  it("DB 도 신청을 'requested' 로만 받는다", () => {
    const schema = readFileSync("supabase/schema.sql", "utf8");
    const policy = schema.slice(schema.indexOf('create policy "owner requests team sub"'));
    expect(policy.slice(0, 400)).toContain("status = 'requested'");
  });
});
