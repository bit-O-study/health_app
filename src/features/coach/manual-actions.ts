"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { prepareCoachQuestion, type CoachKind } from "./manual-model";

export async function requestManualCoach(kind: CoachKind, question: string, requestId: string, preferences?: unknown) {
  const prepared = prepareCoachQuestion(kind, question, preferences);
  if (prepared.error !== null) return { ok: false as const, error: prepared.error };
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(requestId)) return { ok: false as const, error: "요청을 새로 시도해 주세요." };
  if (!(await getCurrentUser())) return { ok: false as const, error: "로그인이 필요해요." };
  const db = await createSupabaseServerClient();
  const { data, error } = await db.rpc("manual_coach_request", { p_kind: kind, p_question: prepared.question, p_request: requestId });
  if (error) return { ok: false as const, error: error.code === "42501" ? "코칭 구독 상태를 확인해 주세요." : error.code === "P0001" ? "오늘 상담 요청 한도에 도달했어요. 답변을 기다려 주세요." : "요청을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  revalidatePath("/coach/manual");
  return { ok: true as const, existing: data !== requestId };
}
