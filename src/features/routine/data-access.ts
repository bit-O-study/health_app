import "server-only";

import { cache } from "react";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import {
  CUSTOM_VARIANT_ID,
  isDayBlockId,
  isValidRoutine,
  normalizeCustomWeek,
  type DayBlockId,
} from "@/features/routine/data";

export type UserRoutine = {
  splits: number;
  variantId: string;
  /** 멀티 부위 일자 지원 — 각 요일이 1개 이상의 블록 */
  customWeek: DayBlockId[][] | null;
  startDate: string;
  /** 오늘 휴식 전환된 날짜(YYYY-MM-DD) 또는 null */
  restDate: string | null;
  /**"오늘만 변경"이 적용된 날짜(YYYY-MM-DD) 또는 null */
  overrideDate: string | null;
  /** 그날 덮어쓸 부위 블록 또는 null */
  overrideBlock: DayBlockId | null;
  /** 일차별(day_index) 마이그레이션 완료 여부 — true 면 백필 호출 자체를 스킵 */
  dayIndexMigrated: boolean;
  updatedAt: string;
};

type UserRoutineRow = {
  splits: number;
  variant_id: string;
  custom_week: unknown;
  start_date: string;
  rest_date: string | null;
  override_date: string | null;
  override_block: unknown;
  day_index_migrated?: boolean | null;
  updated_at: string;
};

/**
 * 현재 로그인 사용자의 저장된 루틴을 반환합니다.
 * 미로그인·미설정이거나 카탈로그에 없는 조합이면 null.
 *
 * React.cache 로 한 요청 내 단 1회만 쿼리.
 */
export const getUserRoutine = cache(async (): Promise<UserRoutine | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("user_routines")
    .select(
      "splits, variant_id, custom_week, start_date, rest_date, override_date, override_block, day_index_migrated, updated_at",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as UserRoutineRow;

  const isCustom = row.variant_id === CUSTOM_VARIANT_ID;
  // 신규 [][] 포맷이든 구 [] 포맷이든 자동 정규화
  const customWeek = isCustom ? normalizeCustomWeek(row.custom_week) : null;

  if (isCustom ? !customWeek : !isValidRoutine(row.splits, row.variant_id)) {
    return null;
  }

  const overrideBlock = isDayBlockId(row.override_block)
    ? row.override_block
    : null;

  return {
    splits: row.splits,
    variantId: row.variant_id,
    customWeek,
    startDate: row.start_date,
    restDate: row.rest_date ?? null,
    overrideDate: overrideBlock ? (row.override_date ?? null) : null,
    overrideBlock,
    dayIndexMigrated: row.day_index_migrated === true,
    updatedAt: row.updated_at,
  };
});
