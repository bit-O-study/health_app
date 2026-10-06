import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkTexts, type BannedWord } from "./banned-words";

/**
 * 금칙어 목록 — DB 표를 5분 동안 기억해 둔다(글·댓글마다 읽지 않게). 커뮤니티 4-3.
 * 못 읽으면 빈 목록으로 넘어간다 — 그래도 DB 트리거가 막는다(안내 문구만 덜 친절해진다).
 */
const TTL_MS = 5 * 60 * 1000;
let cache: { at: number; words: BannedWord[] } | null = null;

async function bannedWords(): Promise<BannedWord[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.words;
  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("community_banned_words").select("word, category");
    if (error) return cache?.words ?? [];
    cache = { at: Date.now(), words: (data ?? []) as BannedWord[] };
    return cache.words;
  } catch {
    return cache?.words ?? [];
  }
}

/** 올리기 전 검사 — 글·댓글·질문·영상 설명·루틴 소개 모든 쓰기 액션이 부른다. */
export async function checkCommunityText(
  ...texts: (string | null | undefined)[]
): Promise<{ ok: true } | { ok: false; error: string }> {
  return checkTexts(texts, await bannedWords());
}

/** DB 트리거가 막은 오류 문구를 그대로 보여 줄지(앱 검사를 지나친 경우 — 목록이 막 바뀐 때 등). */
export function isBannedTextError(message: string | undefined): boolean {
  return !!message && /올릴 수 없어요/.test(message);
}
