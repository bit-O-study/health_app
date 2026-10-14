"use client";

import { useEffect, useState } from "react";
import { HeartPulse } from "lucide-react";

import { readRunHeartRate, type HeartRateSummary } from "@/features/health/heart-rate";

/**
 * 운동 끝 리포트 · 심박 요약(2026-10-14) — 워치를 차고 운동했으면 평균·최고 심박.
 *
 * 심박 요약은 러닝에서만 썼다. 근력 운동도 Health Connect 에서 오늘 운동한 시간대(첫 완료 15분 전 ~
 * 마지막 완료)의 심박을 읽어 보여 준다. 앱이 아니거나 권한·기록이 없으면 아무것도 그리지 않는다.
 */
export function WorkoutHeartRate({ start, end }: { start: string; end: string }) {
  const [summary, setSummary] = useState<HeartRateSummary | null>(null);
  useEffect(() => {
    let alive = true;
    void readRunHeartRate(start, end)
      .then((r) => {
        if (alive && r.ok && r.summary && r.summary.sampleCount >= 3) setSummary(r.summary);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [start, end]);
  if (!summary) return null;
  return (
    <p className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-300" data-testid="session-report-heart">
      <HeartPulse aria-hidden="true" size={13} className="text-danger" />
      평균 심박 {summary.averageBpm} · 최고 {summary.maxBpm}
    </p>
  );
}
