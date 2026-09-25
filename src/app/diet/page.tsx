import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";
import {
  getFoodLogsForDate,
  getMealPhotosForDate,
  getWaterForDate,
} from "@/features/diet/data-access";
import { isDebugFeatureEnabled } from "@/features/admin/debug-features.server";
import { dailyTarget } from "@/features/diet/calorie-target";
import { seoulYmd } from "@/features/routine/data";
import { DietBoard } from "@/features/diet/components/diet-board";
import { WaterCard } from "@/features/diet/components/water-card";
import { dailyWaterTargetMl } from "@/features/diet/water";

export const dynamic = "force-dynamic";

export const metadata = { title: "식단" };

export default async function DietPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string; view?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const today = seoulYmd();
  const date =
    typeof sp?.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? sp.d : today;

  const view = ["search", "photos", "nutrition"].includes(sp.view ?? "") ? sp.view : undefined;

  // 🔴 프로필도 **같은 묶음**으로 병렬 조회한다. 예전엔 `await getUserProfile()` 을
  //    먼저 하고 나머지 셋을 병렬로 돌려서, Supabase 왕복이 순차 2회였다. 프로필은
  //    나머지 조회의 입력이 아니다(날짜만 있으면 된다) — 먼저 기다릴 이유가 없었다.
  //    함수 리전을 DB 와 같은 sin1 로 옮긴 뒤라 왕복 1회는 ~5ms 다(예전 서울 icn1
  //    시절엔 70~90ms 였다). 큰 값은 아니지만 순차 왕복은 화면마다 쌓이고, 무엇보다
  //    **먼저 기다릴 이유가 없는 걸 기다리는** 모양이라 바로잡는다.
  //    (로그인·온보딩 리다이렉트는 결과를 받은 뒤 판단해도 동작이 같다.)
  const [profile, logs, mealPhotos, waterMl, aiScanEnabled] = await Promise.all([
    getUserProfile(),
    getFoodLogsForDate(date),
    getMealPhotosForDate(date),
    getWaterForDate(date),
    isDebugFeatureEnabled("diet-photo-ai"),
  ]);
  if (!profile) redirect("/onboarding");
  const target = dailyTarget({
    gender: profile.gender === "female" ? "female" : "male",
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
  });

  return (
    <div className="app-page">
      {/* 머리글(제목 + 날짜 이동)과 본문은 DietBoard 가 그린다 — 날짜 이동이 보드 상태(저장 중)를 봐서. */}
      <DietBoard
        key={date}
        date={date}
        view={view}
        today={today}
        logs={logs}
        target={target}
        mealPhotos={mealPhotos}
        aiScanEnabled={aiScanEnabled}
        footer={
          // 수분은 `DietBoard` 상태 밖에서 만든다 — 그쪽 낙관적 상태(수정 중인 음식 줄)와 섞이면
          // 예전처럼 편집이 깨진다. 칼로리·끼니가 주인공이라 맨 아래 한 장(2026-09-15 촘촘하게).
          <WaterCard
            key={date}
            date={date}
            initialMl={waterMl}
            targetMl={dailyWaterTargetMl(profile.weightKg)}
          />
        }
      />
    </div>
  );
}
