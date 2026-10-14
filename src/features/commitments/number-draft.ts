/**
 * 숫자 칸에 **치고 있는 글자**와 저장되는 값을 따로 다룬다(2026-10-14).
 *
 * 예전엔 칸을 비우는 순간 0(또는 기본값)을 값으로 되돌려 써서, 지운 자리에 0·8000 이
 * 곧바로 다시 찍혔다 — "0 이 안 지워진다". 글자는 사용자가 친 그대로 두고, 값만 따로 읽는다.
 */

/** 친 글자 → 값. 빈 칸·숫자가 아닌 것·0 이하는 '값 없음'. */
export function parseDraft(text: string, integer = true): number | undefined {
  const t = text.trim();
  if (t === "") return undefined;
  const raw = Number(t);
  if (!Number.isFinite(raw)) return undefined;
  const n = integer ? Math.floor(raw) : raw;
  return n > 0 ? n : undefined;
}

/**
 * 밖에서 값이 바뀌었을 때(목표로 채우기 · 토글) 칸의 글자를 그 값으로 바꿔야 하는가.
 * 지금 글자가 이미 그 값을 뜻하면 그대로 둔다 — "5." 을 치는 중에 "5" 로 되돌리지 않게.
 * `empty` 는 빈 칸일 때 밖으로 내보내는 값(없으면 undefined).
 */
export function draftNeedsSync(
  text: string,
  value: number | undefined,
  integer = true,
  empty?: number,
): boolean {
  return (parseDraft(text, integer) ?? empty) !== value;
}

export function draftText(value: number | undefined): string {
  return value === undefined ? "" : String(value);
}
