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
import { getUserProfile } from "@/features/profile/data-access";
import { getUserRoutine } from "@/features/routine/data-access";
import {
  resolveRoutine,
  TONE_STYLES,
  WEEKDAYS,
  weekdayIndex,
  type DayBlockId,
} from "@/features/routine/data";

export const dynamic = "force-dynamic";

/** 서버 시간대와 무관하게 한국 기준 오늘 요일 인덱스(0=월) */
function seoulToday() {
  const now = new Date();
  const seoul = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }),
  );
  return { date: seoul, index: weekdayIndex(seoul) };
}

function HeaderBar({
  isLoggedIn,
}: {
  isLoggedIn: boolean;
}) {
  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200/70 bg-zinc-50/80 backdrop-blur">
      <nav className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6 sm:px-10">
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
  if (user) {
    const profile = await getUserProfile();
    if (!profile) {
      redirect("/onboarding");
    }
  }

  const routine = user ? await getUserRoutine() : null;

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <HeaderBar isLoggedIn={Boolean(user)} />

      <main className="mx-auto w-full max-w-5xl px-6 py-12 sm:px-10">
        {!user ? (
          <LoggedOutHero />
        ) : !routine ? (
          <NoRoutinePrompt />
        ) : (
          <TodayWorkout routine={routine} />
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

function TodayWorkout({
  routine,
}: {
  routine: {
    splits: number;
    variantId: string;
    customWeek: DayBlockId[] | null;
  };
}) {
  const { preset, variant } = resolveRoutine(
    routine.splits,
    routine.variantId,
    routine.customWeek,
  );
  const { date, index } = seoulToday();
  const today = variant.week[index];
  const todayStyle = TONE_STYLES[today.tone];
  const isRest = today.tone === "rest";

  const dateLabel = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "Asia/Seoul",
  }).format(date);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Today
          </p>
          <h1 className="mt-1 text-3xl font-bold sm:text-4xl">오늘의 운동</h1>
          <p className="mt-2 text-sm text-zinc-600">
            {dateLabel} · {preset.label} · {variant.name}
          </p>
        </div>
        <Link
          className="inline-flex h-10 items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50"
          href="/settings/routine"
        >
          루틴 변경
          <ArrowRight aria-hidden="true" size={15} />
        </Link>
      </div>

      {/* 오늘 카드 */}
      <section
        className={cnCard(todayStyle.card)}
      >
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
            <span
              className={`h-1.5 w-1.5 rounded-full ${todayStyle.dot}`}
            />
            {today.focus}
          </span>
        </div>

        {isRest ? (
          <p className="mt-5 text-base leading-7 text-zinc-600">
            오늘은 휴식일입니다. 가벼운 스트레칭이나 걷기로 회복에 집중하세요.
          </p>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                자극 부위
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {today.muscles.map((m) => (
                  <span
                    key={m}
                    className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-medium text-zinc-700"
                  >
                    {m}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                추천 운동
              </p>
              <ul className="mt-2 space-y-1">
                {today.examples.map((ex) => (
                  <li
                    key={ex}
                    className="flex items-center gap-2 text-sm text-zinc-800"
                  >
                    <span className="text-zinc-400">·</span>
                    {ex}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>

      {/* 이번 주 한눈에 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          이번 주 루틴
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {WEEKDAYS.map((weekday, i) => {
            const day = variant.week[i];
            const style = TONE_STYLES[day.tone];
            const isToday = i === index;
            return (
              <div
                key={weekday}
                className={`rounded-lg border p-3 ${style.card} ${
                  isToday ? "ring-2 ring-emerald-500 ring-offset-1" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-zinc-900">
                    {weekday}
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
                  <span
                    className={`h-1 w-1 rounded-full ${style.dot}`}
                  />
                  {day.focus}
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