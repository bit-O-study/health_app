/**
 * 소셜(구글/카카오) 로그인 사용자의 이름 추출 — 순수 함수(서버·테스트 공용).
 *
 * 이메일 가입은 가입폼에서 이름을 받아 `user_metadata.name` 에 넣지만, 소셜 가입은
 * 폼을 거치지 않아 그 키가 없다. 대신 공급자가 채워주는 키가 제각각이라(구글은
 * `full_name`/`name`, 카카오는 동의항목에 따라 `name`/`preferred_username`/
 * `user_name` 혹은 `kakao_account.profile.nickname`) 전부 훑어서 첫 값을 쓴다.
 * → 이게 없으면 프로필 name 이 비어 커뮤니티·관리자 화면에 "회원"으로만 보인다.
 */

/** 사람 이름으로 쓸 수 있는 문자열이면 다듬어서, 아니면 null. */
function clean(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  // 이메일 형태(공급자가 이름 대신 이메일을 넣는 경우)는 이름으로 쓰지 않는다.
  if (t.includes("@")) return null;
  return t.slice(0, 40);
}

type Meta = Record<string, unknown> | null | undefined;

/** 중첩 객체에서 키 하나 꺼내기(kakao_account.profile.nickname 등). */
function nested(meta: Meta, path: string[]): unknown {
  let cur: unknown = meta;
  for (const key of path) {
    if (!cur || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

const NAME_KEYS = [
  "name",
  "full_name",
  "user_name",
  "nickname",
  "preferred_username",
] as const;

const NESTED_NAME_PATHS: string[][] = [
  ["kakao_account", "profile", "nickname"],
  ["kakao_account", "name"],
  ["properties", "nickname"],
];

/** user_metadata 에서 표시할 이름을 찾는다. 없으면 null. */
export function socialNameFromMetadata(meta: Meta): string | null {
  for (const k of NAME_KEYS) {
    const v = clean(meta?.[k]);
    if (v) return v;
  }
  for (const p of NESTED_NAME_PATHS) {
    const v = clean(nested(meta, p));
    if (v) return v;
  }
  // 구글이 성/이름만 주는 경우 — 한국식으로 성+이름 순서로 붙인다.
  const family = clean(meta?.["family_name"]);
  const given = clean(meta?.["given_name"]);
  if (family || given) return `${family ?? ""}${given ?? ""}`.trim() || null;
  return null;
}

/** 저장된 이름이 비어 있어서 메타데이터로 채워야 하는지. */
export function shouldFillProfileName(
  currentName: string | null | undefined,
): boolean {
  return !(currentName ?? "").trim();
}

/** 닉네임 최대 길이(마이페이지 닉네임 입력과 동일). */
const NICKNAME_MAX = 20;

/**
 * 초기 닉네임 — 가입폼에서 따로 받은 닉네임이 있으면 그것, 없으면 이름과 같은 값.
 * (소셜 가입자는 닉네임을 따로 안 받으므로 공급자 이름을 닉네임에도 그대로 넣는다.)
 */
export function socialNicknameFromMetadata(meta: Meta): string | null {
  const explicit = clean(meta?.["nickname"]);
  const v = explicit ?? socialNameFromMetadata(meta);
  return v ? v.slice(0, NICKNAME_MAX) : null;
}

export type ProfileNamePatch = { name?: string; nickname?: string };

/**
 * 메타데이터로 채울 프로필 이름/닉네임 — **비어 있는 칸만** 채운다.
 * 사용자가 직접 정한 이름·닉네임은 절대 덮어쓰지 않는다.
 */
export function socialProfilePatch(
  meta: Meta,
  current: { name?: string | null; nickname?: string | null },
): ProfileNamePatch {
  const patch: ProfileNamePatch = {};
  const name = socialNameFromMetadata(meta);
  if (name && shouldFillProfileName(current.name)) patch.name = name;
  const nick = socialNicknameFromMetadata(meta);
  if (nick && shouldFillProfileName(current.nickname)) patch.nickname = nick;
  return patch;
}