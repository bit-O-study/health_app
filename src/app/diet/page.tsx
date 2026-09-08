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
  //    함수 리전을 DB 와 같은 sin1 로 옮긴 뒤라 왕복 1회는 ~5ms 다(예전 서울 icn1
  //    시절엔 70~90ms 였다). 큰 값은 아니지만 순차 왕복은 화면마다 쌓이고, 무엇보다
  //    **먼저 기다릴 이유가 없는 걸 기다리는** 모양이라 바로잡는다.
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
