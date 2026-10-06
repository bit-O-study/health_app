"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { seoulYmd } from "@/features/routine/data";
import { FIT_APPLIED_COOKIE } from "@/features/routine/fit-view";

import { getCurrentUser } from "@/lib/supabase/server";
import { getFitAccess } from "@/features/routine/fit-access";
import { applyItemsTodayOnly, type ApplyMode, type ApplyTodayResult } from "@/features/routine/today-apply";

/**
 * 맞춤 운동 추천 적용 — **오늘만 운동 변경으로만**(사용자 결정, 라이트). 바꾸기·더하기.
 * 무료 맛보기는 1개만 담을 수 있다(서버에서 자른다 — 화면을 고쳐도 소용없게).
 */
export async function applyFitPicksAction(items: unknown, mode: ApplyMode = "add"): Promise<ApplyTodayResult> {
  if (!(await getCurrentUser())) return { ok: false, error: "로그인이 필요해요." };
  const access = await getFitAccess();
  if (!access.visible) return { ok: false, error: "맞춤 운동은 아직 사용할 수 없어요." };
  const r = await applyItemsTodayOnly(items, mode === "replace" ? "replace" : "add", access.full ? 10 : 1);
  if (r.ok) {
    // 오늘 추천을 담았다는 표시 — 다시 들어와도 '또 담으세요' 대신 '오늘 운동 하러 가기'를 보여 준다.
    if (r.added > 0) {
      (await cookies()).set(FIT_APPLIED_COOKIE, seoulYmd(), { path: "/", maxAge: 60 * 60 * 36, sameSite: "lax" });
    }
    revalidatePath("/fit");
    revalidatePath("/routine");
  }
  return r;
}
