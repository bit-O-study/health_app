import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  DEPOSIT_INFO_KEY,
  EMPTY_DEPOSIT,
  depositLine,
  isDepositReady,
  parseDepositInfo,
} from "@/features/billing/deposit-info";

const FULL = {
  bank: "국민은행",
  account: "123456-78-901234",
  holder: "홍길동",
  note: "입금자명을 상호로",
};

describe("입금 계좌 안내 파싱", () => {
  it("네 값을 그대로 읽는다", () => {
    expect(parseDepositInfo(FULL)).toEqual(FULL);
  });

  it("앞뒤 공백을 턴다", () => {
    expect(parseDepositInfo({ ...FULL, bank: "  국민은행  " }).bank).toBe("국민은행");
  });

  it("🔴 모양이 깨졌으면 빈 값 — 화면이 죽지 않게", () => {
    for (const bad of [null, undefined, "국민은행", 42, ["a"], true]) {
      expect(parseDepositInfo(bad)).toEqual(EMPTY_DEPOSIT);
    }
  });

  it("문자열이 아닌 필드는 버린다", () => {
    expect(parseDepositInfo({ bank: 1, account: null, holder: {}, note: [] })).toEqual(
      EMPTY_DEPOSIT,
    );
  });

  it("너무 긴 값은 자른다", () => {
    expect(parseDepositInfo({ ...FULL, note: "가".repeat(500) }).note.length).toBe(200);
  });
});

describe("띄울 준비가 됐나", () => {
  it("은행·계좌·예금주가 다 있어야 한다", () => {
    expect(isDepositReady(FULL)).toBe(true);
  });

  it("🔴 하나라도 비면 안 띄운다 — 반쯤 채운 안내는 없는 것보다 나쁘다", () => {
    // 예금주 없는 계좌번호는 입금할 때 확인할 방법이 없고,
    // 은행 없는 계좌번호는 아예 못 넣는다.
    for (const k of ["bank", "account", "holder"] as const) {
      expect(isDepositReady({ ...FULL, [k]: "" }), `${k} 가 비었는데 띄운다`).toBe(false);
    }
  });

  it("안내 문구는 없어도 된다", () => {
    expect(isDepositReady({ ...FULL, note: "" })).toBe(true);
  });

  it("한 줄 표기 — 준비 안 됐으면 빈 문자열", () => {
    expect(depositLine(FULL)).toBe("국민은행 123456-78-901234 (홍길동)");
    expect(depositLine({ ...FULL, holder: "" })).toBe("");
  });
});

describe("저장 자리", () => {
  it("🔴 계좌를 코드에 박지 않는다 — app_settings 키로만 다룬다", () => {
    // 계좌는 바뀌는데(은행 변경·법인 전환) 배포해야 고칠 수 있으면 결국 안 고친다.
    // 그러면 사용자가 없는 계좌로 입금한다.
    expect(DEPOSIT_INFO_KEY).toBe("billing.deposit");
    // 기본값이 비어 있어야 한다 — 계좌를 코드에 심어 두면 그게 곧 '박아 둔 계좌'다.
    expect(EMPTY_DEPOSIT).toEqual({ bank: "", account: "", holder: "", note: "" });
    // 아무것도 설정 안 된 상태에서는 화면에 안 뜬다.
    expect(isDepositReady(parseDepositInfo(null))).toBe(false);
  });

  it("관리자 저장 액션이 관리자 확인을 먼저 한다", () => {
    const src = readFileSync("src/features/admin/admin-actions.ts", "utf8");
    const body = src.slice(src.indexOf("export async function setDepositInfoAction"));
    expect(body.slice(0, 400)).toContain("isAdminUser()");
    // 들어온 값을 그대로 저장하지 않고 파싱을 거친다(길이·타입 방어).
    expect(body.slice(0, 800)).toContain("parseDepositInfo(");
  });

  it("🔴 트레이너는 app_settings 를 직접 안 읽는다 — 전용 함수로만", () => {
    // app_settings 는 관리자 전용 RLS 다. 표를 통째로 열면 디버그 계정 목록 같은
    // 다른 설정까지 새어 나간다.
    const store = readFileSync("src/features/billing/team-store.ts", "utf8");
    expect(store).toContain('rpc("billing_deposit_info")');
    expect(store).not.toContain('from("app_settings")');
    const schema = readFileSync("supabase/schema.sql", "utf8");
    const fn = schema.slice(
      schema.indexOf("create or replace function public.billing_deposit_info()"),
    );
    expect(fn.slice(0, 400)).toContain("security definer");
    expect(fn.slice(0, 800)).toContain("grant execute on function public.billing_deposit_info() to authenticated");
  });
});
