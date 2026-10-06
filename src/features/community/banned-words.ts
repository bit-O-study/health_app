/**
 * 금칙어 걸러내기 — 순수 로직(커뮤니티 4-3, 2026-09-30).
 *
 * 올리기 전에 서버가 이걸로 먼저 걸러 **이유를 알려 준다**(사용자 "추천대로": 막고 안내).
 * 목록은 DB 표 `community_banned_words` 하나 — 관리자가 늘린다. 앱을 거치지 않은 직접 쓰기는
 * DB 트리거(community_text_guard)가 같은 목록·같은 정규화로 막는다.
 * 🔴 정규화 규칙을 바꾸면 SQL 의 community_normalize_text 도 같이 바꾼다(둘이 다르면 앱과 DB 판정이 갈린다).
 */

export type BannedCategory = "abuse" | "sexual" | "contact" | "gambling";
export type BannedWord = { word: string; category: BannedCategory | "allow" };

/** 소문자, 한글·자모·영문·숫자만 — 띄어쓰기·기호 끼워 넣기("ㅅ.ㅂ", "시 발")를 무시한다. */
export function normalizeForFilter(text: string): string {
  return (text ?? "").toLowerCase().replace(/[^가-힣ㄱ-ㅎa-z0-9]/g, "");
}

// 단어 목록으로 못 잡는 연락처 모양 — 휴대폰 번호, 텔레그램 링크. (앱에서만 — DB 는 단어 목록만)
const CONTACT_PATTERNS = [/01[016789][\s.-]?\d{3,4}[\s.-]?\d{4}/, /t\.me\//i];

export function findBanned(text: string, words: readonly BannedWord[]): BannedCategory | null {
  if (!text) return null;
  if (CONTACT_PATTERNS.some((re) => re.test(text))) return "contact";
  let norm = normalizeForFilter(text);
  if (!norm) return null;
  for (const w of words) if (w.category === "allow") norm = norm.split(w.word).join("");
  for (const w of words) {
    if (w.category !== "allow" && norm.includes(w.word)) return w.category;
  }
  return null;
}

export const BANNED_MESSAGE: Record<BannedCategory, string> = {
  contact: "연락처나 채팅방 링크는 올릴 수 없어요. 그 부분을 지우고 다시 올려 주세요.",
  sexual: "성적인 표현은 올릴 수 없어요. 그 부분을 고쳐 주세요.",
  gambling: "도박·광고 문구는 올릴 수 없어요. 그 부분을 지우고 다시 올려 주세요.",
  abuse: "욕설이나 비하 표현은 올릴 수 없어요. 그 부분을 고쳐 주세요.",
};

/** 여러 칸(제목·본문·태그)을 한 번에 — 걸리면 첫 이유. */
export function checkTexts(
  texts: readonly (string | null | undefined)[],
  words: readonly BannedWord[],
): { ok: true } | { ok: false; error: string } {
  for (const t of texts) {
    const cat = findBanned(t ?? "", words);
    if (cat) return { ok: false, error: BANNED_MESSAGE[cat] };
  }
  return { ok: true };
}
