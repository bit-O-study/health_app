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
import { TodayAdjustMenu } from "@/features/routine/components/today-adjust-menu";

export const dynamic = "force-dynamic";

function HeaderBar({
  isLoggedIn,
}: {
  isLoggedIn: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/70 bg-zinc-50/80 backdrop-blur">
      <nav className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-10">
        <Link className="flex items-center gap-2" href="/">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Dumbbell aria-hidden="true" size={20} />
          </span>
          <span className="text-base font-bold tracking-tight">HELTCH</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            className="hidden h-9 items-center rounded-md px-3 text-sm font-semibold text-zinc-600 transition hover:text-zinc-950 sm:inline-flex"
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
                className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-300 bg-white text-zinc-600 transition hover:text-zinc-950"
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

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
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

      <footer className="border-t border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-6 py-8 text-sm text-zinc-500 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <span className="font-semibold text-zinc-700">
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
      <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
        <Sparkles aria-hidden="true" size={14} />
        Personalized workout
      </span>
      <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
        오늘 뭐 해야 하지?
        <br />
        루틴이 매일 알려줍니다.
      </h1>
      <p className="max-w-xl text-base leading-7 text-zinc-600 sm:text-lg">
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
          className="inline-flex h-12 items-center justify-center rounded-md border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-800 transition hover:border-zinc-400 hover:bg-zinc-100"
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
    <section className="flex flex-col items-center gap-5 rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
        <CalendarDays aria-hidden="true" size={28} />
      </span>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-zinc-950">
          아직 설정한 루틴이 없습니다
        </h1>
        <p className="max-w-md text-sm leading-6 text-zinc-600">
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

  // "오늘만 변경" 으로 저장된 daily_plan 행들의 부위 — 있으면 그것이 오늘의
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

  const tone = isRest ? "rest" : todayTones[0] ?? planToday.tone;
  const focusLabel = isRest
    ? "휴식"
    : hasDailyOverride
      ? dailyFocuses.map((f) => DAY_BLOCKS[f].label).join(" + ")
      : planToday.focus;
  const todayStyle = TONE_STYLES[tone];

  const [, mm, dd] = todayYmd.split("-");
  const { weekday } = ymdDisplay(todayYmd);
  const dateLabel = `${Number(mm)}월 ${Number(dd)}일 (${weekday})`;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 sm:text-sm">
            Today
          </p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl lg:text-4xl">
            오늘의 운동
          </h1>
          <p className="mt-1.5 text-xs text-zinc-600 sm:mt-2 sm:text-sm">
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
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50 sm:flex-initial sm:px-4"
            href="/plan"
          >
            기본 편집
          </Link>
          <Link
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-zinc-300 bg-white px-3 text-sm font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50 sm:flex-initial sm:px-4"
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
              <Moon aria-hidden="true" className="text-zinc-400" size={20} />
            ) : (
              <Dumbbell
                aria-hidden="true"
                className="text-zinc-600"
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
          <p className="mt-5 text-base leading-7 text-zinc-600">
            {restedToday
              ? "오늘은 휴식으로 전환했습니다. 루틴이 하루씩 미뤄져 내일 이어집니다."
              : "오늘은 휴식일입니다. 가벼운 스트레칭이나 걷기로 회복에 집중하세요."}
          </p>
        ) : (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              자극 부위
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(hasDailyOverride
                ? Array.from(
                    new Set(
                      dailyFocuses.flatMap(
                        (f) => DAY_BLOCKS[f].day.muscles,
                      ),
                    ),
                  )
                : planToday.muscles
              ).map((muscle) => (
                <span
                  key={muscle}
                  className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-medium text-zinc-700"
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
          tones={todayTones as import("@/features/routine/exercise-catalog").FocusKey[]}
          weightKg={profile?.weightKg ?? null}
        />
      ) : null}

      {/* 다가오는 7일 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          다가오는 7일
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {Array.from({ length: 7 }, (_, i) => {
            const ymd = addDaysYmd(todayYmd, i);
            const isToday = i === 0;
            const dayPlan =
              isToday && overriddenToday
                ? DAY_BLOCKS[routine.overrideBlock!].day
                : variant.week[routineDayOffset(routine.startDate, ymd)];
            const cellRest =
              (isToday && restedToday) || dayPlan.tone === "rest";
            const style = TONE_STYLES[cellRest ? "rest" : dayPlan.tone];
            const { weekday: wd, label } = ymdDisplay(ymd);
            return (
              <div
                key={ymd}
                className={`rounded-lg border p-3 ${style.card} ${
                  isToday ? "ring-2 ring-emerald-500 ring-offset-1" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-zinc-900">
                    {wd}{" "}
                    <span className="text-xs font-normal text-zinc-500">
                      {label}
                    </span>
                  </span>
                  {isToday ? (
                    <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      오늘
                    </span>
                  ) : null}
                </div>
                <span
                  className={`mt-2 inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.badge}`}
                >
                  <span className={`h-1 w-1 rounded-full ${style.dot}`} />
                  {cellRest ? "휴식" : dayPlan.focus}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

/** 오늘 카드용 공통 래퍼 클래스 */
function cnCard(cardTone: string) {
  return `rounded-2xl border p-6 shadow-sm sm:p-8 ${cardTone}`;
}