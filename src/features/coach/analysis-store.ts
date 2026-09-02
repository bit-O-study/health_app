import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import type { CoachAnalysis, CoachPoint } from "@/features/coach/parse";
import {
  ANALYSIS_KEEP_PER_KIND,
  toStoredAnalysis,
  type AnalysisKind,
  type StoredAnalysis,
} from "@/features/coach/analysis-history";

/**
 * AI 분석 결과 보관 — 로드맵 7.1.
 *
 * 🔴 **왜 저장하나** — 분석은 한 번에 한도를 한 칸 먹는다. 저장하지 않으면 사용자가
 * 화면을 나갔다 오는 것만으로 다시 부르게 되고, 그건 **읽으려고 돈을 내는** 구조다.
 * 재조회가 공짜여야 사용자가 마음 놓고 다시 본다.
 *
 * 실패해도 던지지 않는다 — 보관에 실패했다고 **방금 받은 분석을 못 보여주면** 안 된다.
 */

/** 저장 — 성공하면 그 종류의 오래된 것부터 정리한다(무한히 쌓지 않는다). */
export async function saveAnalysis(
  kind: AnalysisKind,
  analysis: CoachAnalysis,
  subject?: string,
): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("ai_analyses").insert({
      user_id: user.id,
      kind,
      summary: analysis.summary,
      points: analysis.points,
      subject: subject?.slice(0, 80) ?? null,
    });
    if (error) return;
    await pruneOld(kind);
  } catch {
    /* 보관 실패가 분석 표시를 막으면 안 된다 */
  }
}

/**
 * 종류별로 최근 것만 남긴다.
 *
 * 크론에 맡기지 않는 이유: 이 정리는 **한 사용자, 몇 행**짜리라 저장하는 자리에서
 * 곧바로 하는 게 싸고 확실하다. 크론에 넣으면 크론이 하루 안 돌 때 조용히 쌓인다.
 */
async function pruneOld(kind: AnalysisKind): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) return;
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("ai_analyses")
      .select("id")
      .eq("user_id", user.id)
      .eq("kind", kind)
      .order("created_at", { ascending: false })
      .range(ANALYSIS_KEEP_PER_KIND, ANALYSIS_KEEP_PER_KIND + 200);
    const stale = ((data ?? []) as { id: string }[]).map((r) => r.id);
    if (stale.length === 0) return;
    await supabase.from("ai_analyses").delete().in("id", stale);
  } catch {
    /* 정리 실패는 기능이 아니다 — 다음 저장 때 다시 시도된다 */
  }
}

/** 종류별 **가장 최근** 분석. 없으면 null. */
export async function getLatestAnalysis(
  kind: AnalysisKind,
): Promise<StoredAnalysis | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("ai_analyses")
      .select("summary, points, subject, created_at")
      .eq("user_id", user.id)
      .eq("kind", kind)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    const row = data as {
      summary: unknown;
      points: unknown;
      subject: unknown;
      created_at: unknown;
    };
    return toStoredAnalysis({
      summary: row.summary,
      points: row.points as CoachPoint[] | null,
      subject: row.subject,
      createdAt: row.created_at,
    });
  } catch {
    return null;
  }
}
