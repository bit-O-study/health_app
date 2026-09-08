import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";
import { getFoodLogsForDate, getMealPhotosForDate } from "@/features/diet/data-access";
import { isDebugFeatureEnabled } from "@/features/admin/debug-features.server";
import { dailyTarget } from "@/features/diet/calorie-target";
import { seoulYmd } from "@/features/routine/data";
import { DietBoard } from "@/features/diet/components/diet-board";

export const dynamic = "force-dynamic";

export const metadata = { title: "식단" };

export default async function DietPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const sp = await searchParams;
  const today = seoulYmd();
  const date =
    typeof sp?.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? sp.d : today;

  // 🔴 프로필도 **같은 묶음**으로 병렬 조회한다. 예전엔 `await getUserProfile()` 을
  //    먼저 하고 나머지 셋을 병렬로 돌려서, Supabase 왕복이 순차 2회였다. 프로필은
  //    나머지 조회의 입력이 아니다(날짜만 있으면 된다) — 먼저 기다릴 이유가 없었다.
  //    서울(icn1)→싱가포르(ap-southeast-1) 왕복이 70~90ms 라 이 한 번이 그대로 TTFB 다.
  //    쿼리 자체는 0.4ms 이고, 식단 화면 지연은 사실상 전부 이 왕복 수다.
  //    (로그인·온보딩 리다이렉트는 결과를 받은 뒤 판단해도 동작이 같다.)
  const [profile, logs, mealPhotos, aiScanEnabled] = await Promise.all([
    getUserProfile(),
    getFoodLogsForDate(date),
    getMealPhotosForDate(date),
    isDebugFeatureEnabled("diet-photo-ai"),
  ]);
  if (!profile) redirect("/onboarding");
  const target = dailyTarget({
    gender: profile.gender === "female" ? "female" : "male",
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
  });

  return (
    <main className="app-page app-container">
      <DietBoard
        key={date}
        date={date}
        today={today}
        logs={logs}
        target={target}
        mealPhotos={mealPhotos}
        aiScanEnabled={aiScanEnabled}
      />
    </main>
  );
}
