import "server-only";

import { cache } from "react";

import { seoulYmd } from "@/features/routine/data";
import { getRecentExerciseCompletions } from "@/features/routine/exercise-completions";
import { getUserProfile } from "@/features/profile/data-access";
import {
  buildWeeklyTrainingView,
  type WeeklyTrainingView,
} from "@/features/routine/weekly-training-view";

/**
 * 내 이번 주 훈련 분석 — 홈·운동탭의 한 줄 요약이 쓴다.
 *
 * 🔴 조회 창을 **15일**로 맞춘 이유: 주간 리포트(`weekly-report-data`)가 이미
 * `getRecentExerciseCompletions(15)` 를 부른다. 같은 인자면 `React.cache` 가 한
 * 요청 안에서 왕복을 **한 번으로 합쳐** 준다 — 숫자를 다르게 쓰면 홈에서 같은 표를
 * 두 번 읽게 된다.
 *
 * 그래서 여기서는 **정체 판정을 하지 않는다**(경력을 안 넘긴다). 정체는 최근 4주를
 * 봐야 하는데 그러자고 홈의 조회 창을 넓히면 모든 방문에 값을 치르게 된다.
 * 점수 화면은 이미 90일을 읽으므로 거기서 판정한다.
 */
export const getMyWeeklyTraining = cache(
  async function getMyWeeklyTraining(): Promise<WeeklyTrainingView | null> {
    const [profile, completions] = await Promise.all([
      getUserProfile(),
      getRecentExerciseCompletions(15),
    ]);
    if (!profile) return null;

    return buildWeeklyTrainingView(
      completions
        .filter((c) => c.status === "done")
        .map((c) => ({
          forDate: c.forDate,
          exerciseId: c.exerciseId,
          focus: c.focus,
          equipment: c.equipment,
          sets: c.sets,
          reps: c.reps,
          weightKg: c.weightKg,
          setDetails: c.setDetails,
        })),
      seoulYmd(),
    );
  },
);
