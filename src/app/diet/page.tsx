import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";
import { getFoodLogsForDate, getMealPhotosForDate } from "@/features/diet/data-access";
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
  const profile = await getUserProfile();
  if (!profile) redirect("/onboarding");

  const sp = await searchParams;
  const today = seoulYmd();
  const date =
    typeof sp?.d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) ? sp.d : today;

  const logs = await getFoodLogsForDate(date);
  const mealPhotos = await getMealPhotosForDate(date);
  const target = dailyTarget({
    gender: profile.gender === "female" ? "female" : "male",
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
  });

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <DietBoard
        date={date}
        today={today}
        logs={logs}
        target={target}
        mealPhotos={mealPhotos}
      />
    </main>
  );
}
