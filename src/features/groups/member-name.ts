/**
 * 그룹 멤버 표시 이름 결정 — 닉네임 → 프로필 이름 → 그룹 닉네임(가입 스냅샷) → "회원".
 *
 * display_name 은 가입 시점 스냅샷이라 옛날에 기본값 "회원" 으로 저장됐을 수 있어,
 * 기본값 "회원" 은 무시한다(프로필 이름/닉네임이 있으면 그걸 쓴다).
 */
export const DEFAULT_MEMBER_NAME = "회원";

export function resolveMemberName(
  nickname: string | null | undefined,
  profileName: string | null | undefined,
  displayName: string | null | undefined,
): string {
  const nick = nickname?.trim();
  if (nick) return nick;
  const p = profileName?.trim();
  if (p) return p;
  const d = displayName?.trim();
  if (d && d !== DEFAULT_MEMBER_NAME) return d;
  return DEFAULT_MEMBER_NAME;
}
