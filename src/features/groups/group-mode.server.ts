import "server-only";

import { cache } from "react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  DEFAULT_GROUP_MODE,
  isGroupMode,
  type GroupMode,
} from "@/features/groups/group-mode";

/**
 * 현재 그룹탭 전역 모드 — DB 함수 group_mode()(SECURITY DEFINER)로 읽는다.
 * app_settings 가 관리자 전용 RLS 라도 일반 사용자가 현재 모드를 알 수 있다.
 * 오류/미설정이면 기본('gym'). 요청 내 중복 호출(네비 + 페이지) 캐시.
 */
export const getGroupMode = cache(async (): Promise<GroupMode> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("group_mode");
  if (error || !isGroupMode(data)) return DEFAULT_GROUP_MODE;
  return data;
});