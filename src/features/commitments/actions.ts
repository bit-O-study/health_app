"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { isCommitmentMetric, ymdDiff } from "@/features/commitments/commitment";
import {
  buildMissionsFromSurvey,
  sanitizeMissions,
  surveyTitle,
  MISSION_CATALOG,
  type MissionSpec,
  type SurveyAnswers,
} from "@/features/commitments/missions";
import {
  buildMissions,
  deadlineOf,
  sanitizeSurveyInput,
  surveyTitleOf,
  toSurveyGoal,
  MAX_MISSIONS,
  type KnownProfile,
  type SurveyInput,
} from "@/features/commitments/survey";
import { getUserProfile } from "@/features/profile/data-access";
import { dailyTarget } from "@/features/diet/calorie-target";

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

/* ── 새 설문(2026-09-25) ─────────────────────────────────────────────────
 *
 * 예전 설문은 "유산소 몇 분·단백질 몇 g" 처럼 **사용자가 모르는 숫자**를 물었고,
 * 목표는 온보딩에서 이미 받은 값을 또 물었다. 새 설문은 네 가지만 묻고
 * (기간·무너지는 것·시간·주 며칠) 숫자는 프로필에서 계산한다.
 */

/** 다짐의 하루 한 행 — 수동 체크와 '오늘 쉼'. */
export type CommitmentDay = { checkedIds: string[]; restPass: boolean };

export async function addSurveyCommitmentV2Action(input: {
  answers: SurveyInput;
  startDate: string;
  /** 결과 화면에서 끄거나 숫자를 고친 미션. 비면 답변으로 다시 만든다. */
  missions?: MissionSpec[];
  title?: string;
}): Promise<CommitmentActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!YMD.test(input.startDate)) {
    return { ok: false, error: "날짜 형식이 올바르지 않습니다." };
  }

  const profile = await getUserProfile();
  if (!profile) return { ok: false, error: "프로필을 먼저 완성해 주세요." };

  const me: KnownProfile = {
    gender: profile.gender === "female" ? "female" : "male",
    experience: profile.experience,
    weightKg: profile.weightKg ?? 70,
    goal: toSurveyGoal(profile.goal),
    recommendKcal: dailyTarget({
      gender: profile.gender,
      weightKg: profile.weightKg,
      heightCm: profile.heightCm,
    }).kcal,
  };

  const answers = sanitizeSurveyInput(input.answers, me);
  // 사용자가 결과 화면에서 고친 게 있으면 그걸 쓰고, 없으면 답변에서 만든다.
  const missions = sanitizeMissions(
    input.missions && input.missions.length > 0
      ? input.missions
      : buildMissions(me, answers),
  ).slice(0, MAX_MISSIONS);
  if (missions.length === 0) {
    return { ok: false, error: "미션을 하나 이상 켜 주세요." };
  }

  const deadline = deadlineOf(input.startDate, answers.weeks);
  const activeDays = ymdDiff(input.startDate, deadline) + 1;
  // 기간 지표는 기존 화면(진행 막대)이 쓰는 값 — 주 N일을 기간으로 환산한다.
  const metric = missions.some((m) => MISSION_CATALOG[m.type].kind === "workout")
    ? "workout_days"
    : "diet_days";
  const target = Math.max(1, Math.round((activeDays / 7) * answers.perWeek));

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("commitments")
    .insert({
      user_id: user.id,
      title: (input.title ?? "").trim().slice(0, 40) || surveyTitleOf(me, answers.weeks),
      tag: "survey",
      metric,
      target,
      start_date: input.startDate,
      deadline,
      mode: "survey",
      missions,
      weekly_target: answers.perWeek,
      rest_pass_per_week: 1,
      remind_at: answers.remindAt,
    })
    .select("id")
    .maybeSingle();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/commitments");
  revalidatePath("/calendar");
  revalidatePath("/home");
  return { ok: true, id: (data as { id: string } | null)?.id };
}

/**
 * 수동 미션 체크 토글 — 그날 행을 만들거나 고친다.
 * 자동 미션 id 를 넣어도 판정에는 영향이 없다(`achievementForDay` 가 무시한다).
 */
export async function toggleCommitmentCheckAction(input: {
  commitmentId: string;
  missionId: string;
  forDate: string;
  on: boolean;
}): Promise<CommitmentActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "로그인이 필요합니다." };
  if (!YMD.test(input.forDate)) {
    return { ok: false, error: "날짜 형식이 올바르지 않습니다." };
  }
  const missionId = input.missionId.trim().slice(0, 24);
  if (!missionId) return { ok: false, error: "미션을 찾을 수 없습니다." };

  const supabase = await createSupabaseServerClient();
  const { data: row, error: readErr } = await supabase
    .from("commitment_days")
    .select("checked_ids")
    .eq("user_id", user.id)
    .eq("commitment_id", input.commitmentId)
    .eq("for_date", input.forDate)
    .maybeSingle();
  if (readErr) return { ok: false, error: readErr.message };

  const current: string[] = Array.isArray(row?.checked_ids)
    ? (row!.checked_ids as string[]).filter((x) => typeof x === "string")
    : [];
  const next = input.on
    ? [...new Set([...current, missionId])]
    : current.filter((x) => x !== missionId);

  const { error } = await supabase.from("commitment_days").upsert(
    {
      user_id: user.id,
      commitment_id: input.commitmentId,
      for_date: input.forDate,
      checked_ids: next,
    },
    { onConflict: "user_id,commitment_id,for_date" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/commitments");
  revalidatePath("/home");
  revalidatePath("/calendar");
  return { ok: true };
}
