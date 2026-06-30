"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { readTodaySteps } from "@/features/health/steps-native";
import { saveStepsAction } from "@/features/health/steps-actions";

/**
 * 네이티브 앱에서 마운트되면 오늘 걸음수를 읽어 서버에 동기화하고 화면을 새로고침한다.
 * 웹에선 readTodaySteps 가 null → 아무 동작 안 함(렌더도 null).
 */
export function StepsSync() {
  const router = useRouter();
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const steps = await readTodaySteps();
      if (cancelled || steps == null) return;
      const res = await saveStepsAction(steps);
      if (!cancelled && res.ok) router.refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);
  return null;
}
