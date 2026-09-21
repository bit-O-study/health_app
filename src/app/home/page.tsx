import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Settings } from "lucide-react";

import { PromoBanner } from "@/features/cross-promo/promo-banner";
import { NotificationBell } from "@/features/notifications/notification-center";
import { PermissionNudge } from "@/features/notifications/components/permission-nudge";
import { getCurrentUser } from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";
import { getHomeDashboard } from "@/features/home/home-data";
import { isDebugFeatureEnabled } from "@/features/admin/debug-features.server";
import { AppGrid } from "@/features/launcher/components/app-grid";
import { AppWidget } from "@/features/launcher/components/app-widget";
import { computeStreakDays } from "@/features/launcher/streak";
import { getWeeklyReport } from "@/features/routine/weekly-report-data";
import { getMyWeeklyTraining } from "@/features/routine/weekly-training-data";
import { seoulYmd, ymdDisplay } from "@/features/routine/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "홈 · 헬쑤",
  description: "앱을 골라 들어가고, 오늘 알아야 할 것만 한눈에.",
};

/**
 * 홈 = 앱 런처 (2026-09-20).
 *
 * 예전 홈은 다짐·식단·체형목표·이번주·운동기록 카드를 **세로로 전부** 쌓았다.
 * 지금은 위에 앱 아이콘 판을 두고, 그 아래엔 앱별 **요약 한 줄(위젯) 3개**만 둔다
 * (운동·식단·캘린더 고정 — 사용자 결정). 자세한 내용은 각 앱 안으로 옮겨 갔고,
 * 위젯을 누르면 그 앱으로 바로 가므로 매일 쓰는 기능은 홈에서 1탭을 유지한다.
 *
 * 하단바도 여기선 런처 자신의 4칸(검색·기록·알림·나)을 쓰고, 앱에 들어가면
 * 그 앱 메뉴로 바뀐다. 가운데 홈 칸만은 어디서나 그대로다.
 */
export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // ⚡ 프로필과 대시보드·주간 집계를 **동시에** 시작한다(원거리 리전 왕복 줄이기).
  const [profile, dashboard, weekly, training, showCoach] = await Promise.all([
    getUserProfile(),
    getHomeDashboard(),
    getWeeklyReport(),
    getMyWeeklyTraining(),
    // 헬쑤쌤 앱 타일은 디버그 기능이 켜진 사용자에게만 — 예전엔 하단바가 읽던 값이다.
    isDebugFeatureEnabled("helssu-coach"),
  ]);
  if (!profile) redirect("/onboarding");

  const { workoutCount, dietExerciseNeed, macroRemaining, hasFoodLog, contributions } =
    dashboard;

  const todayYmd = seoulYmd();
  const [, mm, dd] = todayYmd.split("-");
  const { weekday } = ymdDisplay(todayYmd);

  // ── 위젯 세 줄 ────────────────────────────────────────────────
  const workoutDays = weekly?.current.workoutDays ?? 0;
  const weekSets = training?.weekSets ?? 0;
  const weekMinutes = weekly?.current.workoutMinutes ?? 0;

  const { eatenKcal, targetKcal } = dietExerciseNeed;
  const dietPct = targetKcal > 0 ? (eatenKcal / targetKcal) * 100 : 0;
  const streak = computeStreakDays(contributions);

  return (
    <div className="app-page overflow-x-clip">
      <main className="app-container space-y-4">
        {/* 아이폰 큰 제목 — 날짜 한 줄 + 제목, 오른쪽에 알림·설정 */}
        <header className="flex items-end justify-between gap-3 pb-1">
          <div>
            <p className="app-eyebrow">
              {Number(mm)}월 {Number(dd)}일 {weekday}요일
            </p>
            <h1 className="app-title">홈</h1>
          </div>
          <div className="flex items-center gap-1 pb-0.5">
            <NotificationBell />
            <Link
              aria-label="설정"
              href="/settings"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200/60 text-zinc-700 transition active:scale-95 dark:bg-white/[0.1] dark:text-zinc-200"
            >
              <Settings aria-hidden="true" size={18} />
            </Link>
          </div>
        </header>

        {/* 광고 배너는 맨 위 사진 배너 그대로(사용자 요청으로 원상복구, 2026-09-15). */}
        <PromoBanner />
        <PermissionNudge />

        {/* 앱 아이콘 판 — 여기서 각 앱으로 들어간다. */}
        <AppGrid enabledFlags={showCoach ? ["helssu-coach"] : []} />

        {/* 앱별 요약 한 줄씩. 자세한 건 앱 안에 있다. */}
        <section aria-label="오늘 요약" className="space-y-2.5">
          <AppWidget
            appId="workout"
            meta={`이번 주 ${workoutDays}일`}
            headline={
              weekSets > 0
                ? `이번 주 ${weekSets}세트 · ${weekMinutes}분`
                : "오늘 운동을 시작해 볼까요"
            }
            detail={
              workoutDays > 0
                ? `누적 ${workoutCount}일 운동했어요`
                : "오늘 할 운동을 확인하세요"
            }
          />

          <AppWidget
            appId="diet"
            meta={targetKcal > 0 ? `${eatenKcal} / ${targetKcal} kcal` : undefined}
            headline={
              hasFoodLog
                ? `오늘 ${eatenKcal}kcal 먹었어요`
                : "오늘 식단을 아직 안 적었어요"
            }
            progressPct={targetKcal > 0 ? dietPct : undefined}
            detail={
              macroRemaining.protein > 0
                ? `단백질 ${macroRemaining.protein}g 더 채우면 좋아요`
                : "오늘 단백질 목표를 채웠어요"
            }
          />

          <AppWidget
            appId="calendar"
            meta={streak > 0 ? `연속 ${streak}일` : undefined}
            headline={
              streak > 0 ? `${streak}일째 이어가는 중` : "오늘부터 다시 시작해요"
            }
            detail={`지금까지 ${workoutCount}일 운동했어요`}
          />
        </section>
      </main>
    </div>
  );
}
