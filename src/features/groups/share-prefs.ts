/**
 * 회원이 트레이너에게 **무엇을 보여줄지** 정하는 스위치 — 순수 로직(테스트 가능).
 *
 * 🔴 **기본은 전부 켜짐**(= 지금까지의 동작). 행이 없는 회원은 다 제공하는 것으로 본다.
 *    반대로 기본을 꺼짐으로 두면 이미 쓰고 있는 트레이너 화면이 어느 날 통째로 비어
 *    버그로 읽힌다. 끄는 것은 **회원이 직접 한 선택**일 때만이다.
 *
 * 🔴 **그룹 랭킹은 이 스위치의 대상이 아니다.** 랭킹은 그룹원끼리 서로 보는 기능이고,
 *    거기서 빠지고 싶으면 그룹을 나가면 된다(= 트레이너 제거). 랭킹까지 여기서 막으면
 *    남들 화면에서 이 사람만 사라져 설명할 수 없는 상태가 된다.
 */

export const SHARE_KINDS = ["workout", "diet", "body", "prescription"] as const;

export type ShareKind = (typeof SHARE_KINDS)[number];

export type SharePrefs = Record<ShareKind, boolean>;

/** 아무것도 안 정한 회원의 상태 — 전부 제공. */
export const DEFAULT_SHARE_PREFS: SharePrefs = {
  workout: true,
  diet: true,
  body: true,
  prescription: true,
};

/** 설정 화면에 그대로 쓰는 문구. */
export const SHARE_LABEL: Record<ShareKind, string> = {
  workout: "운동 기록",
  diet: "식단 기록",
  body: "체중·체성분",
  prescription: "운동 처방 허용",
};

export const SHARE_HINT: Record<ShareKind, string> = {
  workout: "완료한 운동·세트·운동 시간을 트레이너가 봐요.",
  diet: "먹은 음식과 식단 사진을 트레이너가 봐요.",
  body: "체중과 체성분 변화를 트레이너가 봐요.",
  prescription: "트레이너가 내 루틴의 운동을 바꾸거나 뺄 수 있어요.",
};

/** 트레이너 화면에 '비공개' 로 표시할 항목들(처방 허용은 열람이 아니라 제외). */
export function hiddenKindsOf(prefs: SharePrefs): ShareKind[] {
  return (["workout", "diet", "body"] as const).filter((k) => !prefs[k]);
}

/** 끈 항목이 하나라도 있나(설정 목록의 한 줄 요약용). */
export function anyHidden(prefs: SharePrefs): boolean {
  return SHARE_KINDS.some((k) => !prefs[k]);
}

/** 화면에 띄울 한 줄 — "운동 기록·식단 기록 제공 중단" / "전부 제공 중". */
export function shareSummary(prefs: SharePrefs): string {
  const off = SHARE_KINDS.filter((k) => !prefs[k]).map((k) => SHARE_LABEL[k]);
  return off.length === 0 ? "전부 제공 중" : `${off.join("·")} 제공 중단`;
}

export function isShareKind(v: unknown): v is ShareKind {
  return typeof v === "string" && (SHARE_KINDS as readonly string[]).includes(v);
}

/**
 * DB 행 → 설정값. 행이 없거나(null) 컬럼이 비면 켜진 것으로 본다.
 * (`false` 만 끈 것이다 — `undefined` 를 끈 것으로 읽으면 새 컬럼이 늘 때마다
 *  기존 회원의 제공이 멋대로 꺼진다.)
 */
export function parseSharePrefs(row: unknown): SharePrefs {
  const r = (row ?? {}) as Record<string, unknown>;
  const on = (v: unknown) => v !== false;
  return {
    workout: on(r.share_workout),
    diet: on(r.share_diet),
    body: on(r.share_body),
    prescription: on(r.allow_prescription),
  };
}

/** 설정값 → DB 컬럼 이름. */
export const SHARE_COLUMN: Record<ShareKind, string> = {
  workout: "share_workout",
  diet: "share_diet",
  body: "share_body",
  prescription: "allow_prescription",
};
