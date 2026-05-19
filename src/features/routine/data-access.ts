import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  CUSTOM_VARIANT_ID,
  isValidCustomWeek,
  isValidRoutine,
  type DayBlockId,
} from "@/features/routine/data";

export type UserRoutine = {
  splits: number;
  variantId: string;
  customWeek: DayBlockId[] | null;
  startDate: string;
  updatedAt: string;
};

type UserRoutineRow = {
  splits: number;
  variant_id: string;
  custom_week: unknown;
  start_date: string;
  updated_at: string;
};

/**
 * 현재 로그인 사용자의 저장된 루틴을 반환합니다.
 * 미로그인·미설정이거나 카탈로그에 없는 조합이면 null.
 */
export async function getUserRoutine(): Promise<UserRoutine | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data, error } = await supabase
    .from("user_routines")
    .select("splits, variant_id, custom_week, start_date, updated_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as UserRoutineRow;

  const isCustom = row.variant_id === CUSTOM_VARIANT_ID;
  const customWeek = isCustom && isValidCustomWeek(row.custom_week)
    ? row.custom_week
    : null;

  if (isCustom ? !customWeek : !isValidRoutine(row.splits, row.variant_id)) {
    return null;
  }

  return {
    splits: row.splits,
    variantId: row.variant_id,
    customWeek,
    startDate: row.start_date,
    updatedAt: row.updated_at,
  };
}