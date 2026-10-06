"use server";

import { revalidatePath } from "next/cache";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { isCommitmentMetric } from "@/features/commitments/commitment";

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

/** 다짐의 하루 한 행 — 수동 체크와 '오늘 쉼'. */
export type CommitmentDay = { checkedIds: string[]; restPass: boolean };



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
