import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Dumbbell,
  LogIn,
  Moon,
  Settings,
  Sparkles,
} from "lucide-react";

import { Logo } from "@/features/brand/logo";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  getUserProfile,
  type UserProfile,
} from "@/features/profile/data-access";
import { BodyLogButton } from "@/features/profile/components/body-log-button";
import { getUserRoutine } from "@/features/routine/data-access";
import { getDailyPlanForDate } from "@/features/routine/daily-plan";
import {
  addDaysYmd,
  DAY_BLOCKS,
  resolveRoutine,
  routineDayOffset,
  seoulYmd,
  TONE_STYLES,
  ymdDisplay,
  type DayBlockId,
  type FocusTone,
} from "@/features/routine/data";
import { isDayBlockId } from "@/features/routine/data";
import { TodayExercises } from "@/features/routine/components/today-exercises";
import { ensureDayIndexBackfilled } from "@/features/routine/day-index-migration";
import { TodayAdjustMenu } from "@/features/routine/components/today-adjust-menu";
import { UpcomingSevenDaysGrid } from "@/features/routine/components/upcoming-seven-days";
import { absoluteUrl, siteConfig } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: siteConfig.title,
  description: siteConfig.description,
  alternates: {
    canonical: absoluteUrl("/"),
  },
  openGraph: {
    title: siteConfig.title,
    description: siteConfig.description,
    url: absoluteUrl("/"),
  },
};

function HeaderBar({ isLoggedIn }: { isLoggedIn: boolean }) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/70 bg-zinc-50/80 backdrop-blur">
      <nav className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-10">
        <Link className="flex items-center" href="/routine">
          <Logo size={36} />
        </Link>

        <div className="flex items-center gap-2">
          <Link
            className="hidden h-9 items-center rounded-md px-3 text-sm font-semibold text-zinc-600 dark:text-zinc-400 transition hover:text-zinc-950 dark:hover:text-zinc-100 sm:inline-flex"
            href="/exercises"
          >
            운동 리스트
          </Link>
          {isLoggedIn ? (
            <>
              <Link
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 text-sm font-semibold text-white transition hover:bg-emerald-500"
                href="/settings/routine"
              >
                <Sparkles aria-hidden="true" size={15} />
                추천 루틴
              </Link>
              <Link
                aria-label="설정"
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition hover:text-zinc-950 dark:hover:text-zinc-100"
                href="/settings"
              >
                <Settings aria-hidden="true" size={17} />
              </Link>
            </>
          ) : (
            <Link
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-zinc-900 px-3.5 text-sm font-semibold text-white transition hover:bg-zinc-700"
              href="/login"
            >
              <LogIn aria-hidden="true" size={15} />
              로그인
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

export default async function Home() {
  const user = await getCurrentUser();

  // 로그인했는데 온보딩 전이면 성별·경력 → 추천 루틴 단계로.
  const profile = user ? await getUserProfile() : null;
  if (user && !profile) {
    redirect("/onboarding");
  }

  const routine = user ? await getUserRoutine() : null;

  // 일차별 독립 마이그레이션 (멱등·지연 — day_index 없는 기존 행만 백필)
  if (user && routine) {
    await ensureDayIndexBackfilled(user.id);
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 text-zinc-950 dark:text-zinc-100">
      <HeaderBar isLoggedIn={Boolean(user)} />

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-10 sm:py-12">
        {!user ? (
          <LoggedOutHero />
        ) : !routine ? (
          <NoRoutinePrompt />
        ) : (
          <TodayWorkout routine={routine} profile={profile} />
        )}
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-6 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <span className="font-semibold text-zinc-700 dark:text-zinc-300">
            HELTCH · Health Platform MVP
          </span>
          <span>오늘의 운동 · 루틴 설정 · 익명 피드백</span>
        </div>
      </footer>
    </div>
  );
}

function LoggedOutHero() {
  return (
    <section className="flex flex-col items-start gap-6 py-10">
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
        <Sparkles aria-hidden="true" size={14} />
        Personalized workout
      </span>
      <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
        오늘 뭐 해야 하지?
        <br />
        루틴이 매일 알려줍니다.
      </h1>
      <p className="max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-400 sm:text-lg">
        로그인하고 분할 루틴을 한 번만 설정하면, 메인 화면이 매일 그날 날짜에
        맞는 운동을 자동으로 안내합니다.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-500"
          href="/login"
        >
          로그인하고 시작하기
          <ArrowRight aria-hidden="true" size={17} />
        </Link>
        <Link
          className="inline-flex h-12 items-center justify-center rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-5 text-sm font-semibold text-zinc-800 dark:text-zinc-200 transition hover:border-zinc-400 dark:hover:border-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-700"
          href="/exercises"
        >
          운동 리스트 둘러보기
        </Link>
      </div>
    </section>
  );
}

function NoRoutinePrompt() {
  return (
    <section className="flex flex-col items-center gap-5 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
        <CalendarDays aria-hidden="true" size={28} />
      </span>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100">
          아직 설정한 루틴이 없습니다
        </h1>
        <p className="max-w-md text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          몇 분할로 운동할지 한 번만 골라 두면, 매일 이 화면에서 오늘 해야 할
          운동을 바로 확인할 수 있습니다.
        </p>
      </div>
      <Link
        className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-emerald-600 px-6 text-sm font-semibold text-white transition hover:bg-emerald-500"
        href="/settings/routine"
      >
        <Sparkles aria-hidden="true" size={17} />
        추천 루틴에서 시작하기
      </Link>
    </section>
  );
}

async function TodayWorkout({
  routine,
  profile,
}: {
  routine: {
    splits: number;
    variantId: string;
    customWeek: DayBlockId[][] | null;
    startDate: string;
    restDate: string | null;
    overrideDate: string | null;
    overrideBlock: DayBlockId | null;
  };
  profile: UserProfile | null;
}) {
  const { preset, variant } = resolveRoutine(
    routine.splits,
    routine.variantId,
    routine.customWeek,
  );

  const todayYmd = seoulYmd();
  const offset = routineDayOffset(routine.startDate, todayYmd);
  const overriddenToday =
    routine.overrideDate === todayYmd && routine.overrideBlock !== null;
  const planToday = overriddenToday
    ? DAY_BLOCKS[routine.overrideBlock!].day
    : variant.week[offset];
  const restedToday = routine.restDate === todayYmd;
  const isRest = restedToday || planToday.tone === "rest";

  //"오늘만 변경" 으로 저장된 daily_plan 행들의 부위 — 있으면 그것이 오늘의
  // 실제 부위. (routine.overrideBlock 보다 우선, 다중 부위도 지원)
  const dailyPlan = isRest ? [] : await getDailyPlanForDate(todayYmd);
  const dailyFocuses = Array.from(
    new Set(dailyPlan.map((r) => r.focus).filter((f) => isDayBlockId(f))),
  ) as DayBlockId[];
  const hasDailyOverride = dailyFocuses.length > 0;

  // 기본 부위 (route 기준) — daily override 가 없을 때 fallback
  const routineTones = isRest
    ? []
    : ((planToday.tones ?? [planToday.tone]).filter(
        (t) => t !== "rest",
      ) as Exclude<FocusTone, "rest">[]);

  // 실제 오늘 부위 — daily_plan 부위가 routine 을 덮어쓴다
  const todayTones: Exclude<FocusTone, "rest">[] = hasDailyOverride
    ? (dailyFocuses.filter((f) => f !== "rest") as Exclude<FocusTone, "rest">[])
    : routineTones;

  const tone = isRest ? "rest" : (todayTones[0] ?? planToday.tone);
  const focusLabel = isRest
    ? "휴식"
    : hasDailyOverride
      ? dailyFocuses.map((f) => DAY_BLOCKS[f].label).join(" +")
      : planToday.focus;
  const todayStyle = TONE_STYLES[tone];

  const [, mm, dd] = todayYmd.split("-");
  const { weekday } = ymdDisplay(todayYmd);
  const dateLabel = `${Number(mm)}월 ${Number(dd)}일 (${weekday})`;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 sm:text-sm">
            Today
          </p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl lg:text-4xl">
            오늘의 운동
          </h1>
          <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400 sm:mt-2 sm:text-sm">
            {dateLabel} · {preset.label} · {variant.name}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <BodyLogButton
            current={{
              weightKg: profile?.weightKg ?? null,
              heightCm: profile?.heightCm ?? null,
              bodyFatPct: profile?.bodyFatPct ?? null,
              muscleMassKg: profile?.muscleMassKg ?? null,
            }}
          />
          <Link
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 sm:flex-initial sm:px-4"
            href="/plan"
          >
            기본 편집
          </Link>
          <Link
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 sm:flex-initial sm:px-4"
            href="/settings/routine"
          >
            루틴 변경
            <ArrowRight aria-hidden="true" size={15} />
          </Link>
        </div>
      </div>

      {/* 오늘 카드 */}
      <section className={cnCard(todayStyle.card)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isRest ? (
              <Moon
                aria-hidden="true"
                className="text-zinc-400 dark:text-zinc-500"
                size={20}
              />
            ) : (
              <Dumbbell
                aria-hidden="true"
                className="text-zinc-600 dark:text-zinc-400"
                size={20}
              />
            )}
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${todayStyle.badge}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${todayStyle.dot}`} />
              {focusLabel}
            </span>
          </div>

          <TodayAdjustMenu isRestToday={restedToday} />
        </div>

        {isRest ? (
          <p className="mt-5 text-base leading-7 text-zinc-600 dark:text-zinc-400">
            {restedToday
              ? "오늘은 휴식으로 전환했습니다. 루틴이 하루씩 미뤄져 내일 이어집니다."
              : "오늘은 휴식일입니다. 가벼운 스트레칭이나 걷기로 회복에 집중하세요."}
          </p>
        ) : (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              자극 부위
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(hasDailyOverride
                ? Array.from(
                    new Set(
                      dailyFocuses.flatMap((f) => DAY_BLOCKS[f].day.muscles),
                    ),
                  )
                : planToday.muscles
              ).map((muscle) => (
                <span
                  key={muscle}
                  className="rounded-full bg-white/80 dark:bg-zinc-800/80 px-2.5 py-1 text-xs font-semibold text-zinc-800 dark:text-zinc-100 ring-1 ring-black/5 dark:ring-white/15"
                >
                  {muscle}
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 오늘 할 운동 — 운동별 기구 선택 → 기구별 운동법 */}
      {!isRest && todayTones.length > 0 ? (
        <TodayExercises
          tones={
            todayTones as import("@/features/routine/exercise-catalog").FocusKey[]
          }
          dayIndex={offset}
          weightKg={profile?.weightKg ?? null}
        />
      ) : null}

      {/* 다가오는 7일 — 드래그앤드랍으로 순서 변경, 변경 즉시 루틴에 저장 */}
      <UpcomingSevenDaysGrid
        initialBlocks={Array.from({ length: 7 }, (_, i) => {
          const ymd = addDaysYmd(todayYmd, i);
          const isToday = i === 0;
          if (isToday) {
            if (restedToday) return ["rest"] as DayBlockId[];
            if (hasDailyOverride) return dailyFocuses as DayBlockId[];
            if (overriddenToday) return [routine.overrideBlock!];
          }
          const dp = variant.week[routineDayOffset(routine.startDate, ymd)];
          const tones = (dp.tones ?? [dp.tone]) as DayBlockId[];
          return tones;
        })}
        cells={Array.from({ length: 7 }, (_, i) => {
          const ymd = addDaysYmd(todayYmd, i);
          const { weekday: wd, label } = ymdDisplay(ymd);
          return { ymd, weekday: wd, label, isToday: i === 0 };
        })}
      />
    </div>
  );
}

/** 오늘 카드용 공통 래퍼 클래스 */
function cnCard(cardTone: string) {
  return `rounded-2xl border p-6 shadow-sm sm:p-8 ${cardTone}`;
}
