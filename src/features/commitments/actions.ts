"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { isCommitmentMetric, ymdDiff } from "@/features/commitments/commitment";
import {
  buildMissionsFromSurvey,
  surveyTitle,
  MISSION_CATALOG,
  type SurveyAnswers,
} from "@/features/commitments/missions";

export type CommitmentActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

const YMD = /^\d{4}-\d{2}-\d{2}$/;

/** 다짐 추가 — 태그/직접입력 공용. 시작일·데드라인·지표·목표 검증. */
export async function addCommitmentAction(input: {
  title: string;
  tag?: string;
  metric: string;
  target: number;
  startDate: string;
  deadline: string;
}): Promise<CommitmentActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  const title = input.title.trim().slice(0, 40);
  if (!title) return { ok: false, error: "다짐 내용을 입력하세요." };
  if (!isCommitmentMetric(input.metric)) {
    return { ok: false, error: "목표 종류가 올바르지 않습니다." };
  }
  const target = Math.floor(Number(input.target));
  if (!Number.isFinite(target) || target <= 0) {
    return { ok: false, error: "목표 값을 1 이상으로 입력하세요." };
  }
  if (!YMD.test(input.startDate) || !YMD.test(input.deadline)) {
    return { ok: false, error: "날짜 형식이 올바르지 않습니다." };
  }
  if (input.deadline < input.startDate) {
    return { ok: false, error: "데드라인이 시작일보다 빠를 수 없습니다." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("commitments")
    .insert({
      user_id: user.id,
      title,
      tag: (input.tag ?? "custom").slice(0, 30),
      metric: input.metric,
      target,
      start_date: input.startDate,
      deadline: input.deadline,
    })
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/commitments");
  revalidatePath("/calendar");
  return { ok: true, id: (data as { id: string } | null)?.id };
}

/**
 * 설문 기반 다짐 추가 — 설문 답변으로 하루 미션을 생성해 저장한다(mode=survey).
 * 대표 지표(metric/target)는 리스트 진행률 표시용으로 함께 채운다(운동 미션 있으면
 * '운동한 날', 아니면 '식단 기록한 날' × 활성일수의 70%).
 */
export async function addSurveyCommitmentAction(input: {
  answers: SurveyAnswers;
  startDate: string;
  deadline: string;
  title?: string;
}): Promise<CommitmentActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };

  if (!YMD.test(input.startDate) || !YMD.test(input.deadline)) {
    return { ok: false, error: "날짜 형식이 올바르지 않습니다." };
  }
  if (input.deadline < input.startDate) {
    return { ok: false, error: "데드라인이 시작일보다 빠를 수 없습니다." };
  }

  const missions = buildMissionsFromSurvey(input.answers);
  if (missions.length === 0) {
    return { ok: false, error: "미션이 될 항목을 하나 이상 선택하세요." };
  }

  const activeDays = ymdDiff(input.startDate, input.deadline) + 1;
  const hasWorkout = missions.some((m) => MISSION_CATALOG[m.type].kind === "workout");
  const metric = hasWorkout ? "workout_days" : "diet_days";
  const target = Math.max(1, Math.round(activeDays * 0.7));

  const title =
    (input.title ?? "").trim().slice(0, 40) || surveyTitle(input.answers);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("commitments")
    .insert({
      user_id: user.id,
      title,
      tag: "survey",
      metric,
      target,
      start_date: input.startDate,
      deadline: input.deadline,
      mode: "survey",
      missions,
    })
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/commitments");
  revalidatePath("/calendar");
  return { ok: true, id: (data as { id: string } | null)?.id };
}

/** 다짐 삭제(본인만 — RLS 강제). */
export async function deleteCommitmentAction(
  id: string,
): Promise<CommitmentActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("commitments").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/commitments");
  revalidatePath("/calendar");
  return { ok: true };
}
