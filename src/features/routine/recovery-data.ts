import "server-only";

import { cache } from "react";

import { DEFAULT_WEIGHT_KG } from "@/features/routine/default-weight";
import { getLatestBodyComposition } from "@/features/body-composition/data-access";
import { loadRecentRecords, type TimedRecord } from "@/features/lite/recent-records";
import { getUserProfile } from "@/features/profile/data-access";
import { getTodayCheckin } from "@/features/routine/checkin-data";
import { makeStimulusOf } from "@/features/routine/fit-data";
import { recoveryByPart, recoveryInputs, type RecoveryRow } from "@/features/routine/fit-insights";
import { prescribe } from "@/features/routine/prescription";
import { estimate1RM } from "@/features/routine/progress";
import { buildRecoveryProfile } from "@/features/routine/recovery-load";

/**
 * 부위별 회복 — 맞춤 운동 · 운동 끝 리포트 · 홈 한 줄이 **같은 계산**을 쓴다(2026-10-14).
 *
 * 내 몸 기준: 최근 120일 기록(종목별 예상 최대 · 부위별 평소 소화량) + 체중·성별·경력 + 최근 골격근량.
 * 기록이 없는 종목은 처방 무게(체중·성별·경력·체형)에서 예상 최대를 어림한다.
 * 요청 단위 cache — 한 화면에서 여러 번 불러도 한 번만 계산한다. 로그인 안 했으면 null.
 */
export const loadRecovery = cache(async (): Promise<{ rows: RecoveryRow[]; now: Date; today: string; records: TimedRecord[] } | null> => {
  const [recent, profile, comp, checkin] = await Promise.all([
    loadRecentRecords(),
    getUserProfile().catch(() => null),
    getLatestBodyComposition().catch(() => null),
    getTodayCheckin().catch(() => null),
  ]);
  if (!recent) return null;
  const now = new Date();
  const stimulusOf = makeStimulusOf();
  const gender = profile?.gender === "female" ? "female" : "male";
  const experience = profile?.experience ?? "intermediate";
  const weightKg = comp?.weightKg ?? profile?.weightKg ?? DEFAULT_WEIGHT_KG;
  const mine = buildRecoveryProfile(
    recent.records,
    stimulusOf,
    now,
    { experience, gender, weightKg, skeletalMuscleKg: comp?.skeletalMuscleKg ?? null },
    (id) => {
      const p = prescribe(id, { gender, experience, bodyType: profile?.bodyType ?? "average", weightKg });
      const rm = estimate1RM(p.weightKg, p.reps);
      return rm > 0 ? rm : null;
    },
  );
  return {
    rows: recoveryByPart(recoveryInputs(recent.records, now), stimulusOf, now, checkin, mine),
    now,
    today: recent.today,
    records: recent.records,
  };
});
