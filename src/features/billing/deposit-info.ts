/**
 * 입금 계좌 안내 — 순수 로직(파싱·검증·표시). 값은 `app_settings['billing.deposit']`.
 *
 * 🔴 **계좌번호를 코드에 박지 않는다.** 계좌는 바뀌고(은행 변경·법인 전환), 그때마다
 * 배포해야 하면 결국 안 바꾼다 — 그러면 사용자가 **없는 계좌로 입금한다.**
 * 관리자 설정에 두면 화면에서 고친다.
 *
 * 🔴 **비어 있으면 화면에 아무것도 안 띄운다.** 반쯤 채워진 계좌 안내는 없는 것보다
 * 나쁘다(입금하다 말게 된다). 안 채웠으면 "확인 후 연락드릴게요"로 남는다.
 */

/** app_settings 저장 키. */
export const DEPOSIT_INFO_KEY = "billing.deposit";

export type DepositInfo = {
  /** 은행명. */
  bank: string;
  /** 계좌번호(표기 그대로 저장 — 은행마다 형식이 다르다). */
  account: string;
  /** 예금주. */
  holder: string;
  /** 안내 문구(입금자명 규칙 등). 없어도 된다. */
  note: string;
};

export const EMPTY_DEPOSIT: DepositInfo = {
  bank: "",
  account: "",
  holder: "",
  note: "",
};

const str = (v: unknown, max: number): string =>
  typeof v === "string" ? v.trim().slice(0, max) : "";

/** 저장된 값 → 안내. 모양이 깨졌으면 빈 값(화면이 죽지 않게). */
export function parseDepositInfo(value: unknown): DepositInfo {
  if (!value || typeof value !== "object" || Array.isArray(value)) return EMPTY_DEPOSIT;
  const v = value as Record<string, unknown>;
  return {
    bank: str(v.bank, 30),
    account: str(v.account, 40),
    holder: str(v.holder, 40),
    note: str(v.note, 200),
  };
}

/**
 * 화면에 띄울 만한가 — **은행·계좌·예금주가 다 있어야** 한다.
 *
 * 셋 중 하나라도 비면 안 띄운다. 예금주 없는 계좌번호는 입금할 때 확인할 방법이 없고,
 * 은행 없는 계좌번호는 아예 못 넣는다.
 */
export function isDepositReady(info: DepositInfo): boolean {
  return (
    info.bank.length > 0 && info.account.length > 0 && info.holder.length > 0
  );
}

/** "국민은행 123-45-678900 (홍길동)" — 한 줄 표기. 준비 안 됐으면 빈 문자열. */
export function depositLine(info: DepositInfo): string {
  if (!isDepositReady(info)) return "";
  return `${info.bank} ${info.account} (${info.holder})`;
}
