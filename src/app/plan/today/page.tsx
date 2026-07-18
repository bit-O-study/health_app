import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getUserProfile } from "@/features/profile/data-access";
import { getCurrentGym } from "@/features/gym/gym-data-access";
import { getUserRoutine } from "@/features/routine/data-access";
import {
  DAY_BLOCKS,
  firstDayIndexForFocus,
  isDayBlockId,
  resolveRoutine,
  routineDayOffset,
  routineDaySlots,
  seoulYmd,
  ymdDisplay,
  type FocusTone,
} from "@/features/routine/data";
import { getCurrentUser } from "@/lib/supabase/server";
import { ALL_FOCUSES } from "@/features/routine/exercise-catalog";
import { getConditioningForFocus } from "@/features/routine/conditioning";
import { getDailyConditioning } from "@/features/routine/daily-conditioning";
import { getDailyPlanForDate } from "@/features/routine/daily-plan";
import { getPlanForDay, getPlanForFocus } from "@/features/routine/plan";
import { ensureDayIndexBackfilled } from "@/features/routine/day-index-migration";
import { ConditioningEditor } from "@/features/routine/components/conditioning-editor";
import { DailyMainEditor } from "@/features/routine/components/daily-main-editor";

export const dynamic = "force-dynamic";

export default async function TodayConditioningPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string; direct?: string; add?: string }>;
}) {
  const [user, profile, routine, gym] = await Promise.all([
    getCurrentUser(),
    getUserProfile(),
    getUserRoutine(),
    getCurrentGym(),
  ]);
  if (!profile) redirect("/onboarding");
  if (!routine) redirect("/settings/routine");
  if (user && routine && !routine.dayIndexMigrated)
    await ensureDayIndexBackfilled(user.id);
  const gymEquipment = gym?.equipmentIds ?? null;

  const { focus: focusParam, direct: directParam, add: addParam } = await searchParams;
  // 직접 담기(direct) — 부위 제한 없이 전체 운동에서 담는다. 부위 자동배정은 저장 시
  // 운동별 focusForExercise 로 이뤄진다(빈 본운동/워밍업/마무리 섹션에서 추가).
  const direct = directParam === "1";
  // 부위 추가(add) — 오늘 현재 운동(핀된 daily_plan)에 선택 부위를 더해 함께 편집한다.
  const addMode = addParam === "1";

  // 선택 부위 (?focus=chest,back) — 없으면 오늘의 실제 부위 1개
  let focuses: FocusTone[] = [];
  if (focusParam) {
    focuses = focusParam
      .split(",")
      .map((s) => s.trim())
      .filter(
        (s): s is Exclude<FocusTone, "rest"> =>
          s !== "rest" &&
          isDayBlockId(s) &&
          ALL_FOCUSES.includes(s as Exclude<FocusTone, "rest">),
      );
  }
  // 오늘 원래 루틴 부위 — 폴백/직접담기 추천에 쓴다.
  const origTodayFocuses: Exclude<FocusTone, "rest">[] = (() => {
    const { variant } = resolveRoutine(
      routine.splits,
      routine.variantId,
      routine.customWeek,
    );
    const offset = routineDayOffset(routine.startDate, seoulYmd());
    const overriddenToday =
      routine.overrideDate === seoulYmd() && routine.overrideBlock !== null;
    if (overriddenToday) {
      const tone = DAY_BLOCKS[routine.overrideBlock!].day.tone;
      return tone !== "rest" ? [tone] : [];
    }
    const dayPlan = variant.week[offset];
    return (dayPlan.tones ?? [dayPlan.tone]).filter(
      (t): t is Exclude<FocusTone, "rest"> => t !== "rest",
    );
  })();
  // 직접 담기면 부위 폴백을 하지 않는다(빈 상태로 시작 → 전체 운동 추가).
  if (focuses.length === 0 && !direct) {
    focuses = origTodayFocuses;
  }
  // 직접 담기 '추천으로 채우기'는 오늘 루틴(지금 바꾸려는 대상)을 그대로 넣으면
  // 헷갈리므로, 예측 가능한 '균형 운동(가슴·등·하체)'으로 채운다.
  const directRecFocuses: Exclude<FocusTone, "rest">[] = ["chest", "back", "lower"];

  const todayYmd = seoulYmd();
  const { weekday } = ymdDisplay(todayYmd);
  const [, mm, dd] = todayYmd.split("-");
  const dateLabel = `${Number(mm)}월 ${Number(dd)}일 (${weekday})`;

  const dailyAll = await getDailyPlanForDate(todayYmd);
  const validFocuses = focuses.filter(
    (f): f is Exclude<FocusTone, "rest"> => f !== "rest",
  );

  // 오늘 일차 기준으로 기본값을 읽는다(일차별 독립). 그 일차에 부위가 없으면
  // 첫 등장 일차, 그래도 없으면 부위 전체(union)로 폴백.
  const offsetForToday = routineDayOffset(routine.startDate, todayYmd);
  const slots = routineDaySlots(
    routine.splits,
    routine.variantId,
    routine.customWeek,
  );
  const readDayFor = (focus: string): number => {
    const onToday = slots.some(
      (s) => s.dayIndex === offsetForToday && s.focus === focus,
    );
    return onToday
      ? offsetForToday
      : (firstDayIndexForFocus(slots, focus) ?? offsetForToday);
  };

  // 편집할 부위 — 직접 담기(direct)면 이미 담아 저장한 부위(daily_plan)를 불러온다
  // (그래야 재편집 때 담은 게 보이고, allowAllExercises 로 다른 부위도 계속 추가 가능).
  const dailyFocuses = [...new Set(dailyAll.map((r) => r.focus))].filter(
    (f): f is Exclude<FocusTone, "rest"> => f !== "rest" && isDayBlockId(f),
  ) as Exclude<FocusTone, "rest">[];
  const editFocuses: Exclude<FocusTone, "rest">[] = direct
    ? dailyFocuses
    : addMode
      ? // 부위 추가 — 현재 오늘 운동(핀된 daily_plan 부위) + 새로 선택한 부위(합집합).
        ([...new Set([...dailyFocuses, ...validFocuses])] as Exclude<
          FocusTone,
          "rest"
        >[])
      : validFocuses;
  // 부위별 본운동 섹션 — 오늘 오버라이드가 있으면 그걸, 없으면 **빈값**으로 시작한다.
  const mainSections = editFocuses.map((focus) => ({
    focus,
    label: DAY_BLOCKS[focus].label,
    initialMain: dailyAll.filter((r) => r.focus === focus),
  }));

  // 워밍업/마무리는 하루 1세트. 초기엔 오늘 오버라이드만(없으면 빈값 → '추천으로 채우기').
  // 추천은 편집기 안에서 오늘 전 부위(validFocuses) 합집합으로 채운다.
  const primaryFocus = validFocuses[0];
  const daily = await getDailyConditioning(todayYmd);
  const warmupInitial = daily.warmup;
  const cooldownInitial = daily.cooldown;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 pb-10 pt-10 sm:px-8">
      {/* 상단 인셋은 body(globals.css)가 이미 적용 — 여기선 헤더 여백(pt-10)만. */}
      <Link
        className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        href="/routine"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        메인으로
      </Link>

      <div className="mt-6 mb-6 space-y-1">
        <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100">
          오늘만 운동 바꾸기
        </h1>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          {dateLabel} ·{" "}
          <strong>
            {direct
              ? "전체 운동에서 직접 담기"
              : mainSections.length > 0
                ? mainSections.map((s) => s.label).join(",")
                : "선택 없음"}
          </strong>
          . 저장한 내용은 <strong>오늘만</strong> 반영되고 내일부터는 기본
          루틴으로 돌아갑니다. 이미 완료 처리한 운동은 그대로 남습니다.
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          본운동 / 워밍업 / 마무리를 항목 비우고 저장하면 그 부위의 오늘
          오버라이드가 제거됩니다.
        </p>
      </div>

      {!direct && mainSections.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 p-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
          편집할 부위가 없습니다. 메인 화면 “오늘만 운동 바꾸기” 팝업에서 부위를
          선택해 주세요.
        </p>
      ) : (
        <div className="space-y-6">
          {/* 본운동 — 오늘 선택 부위를 한 편집기에(부위는 태그로 구분, 추천/추가 버튼 1개) */}
          <DailyMainEditor
            sections={mainSections.map((s) => ({
              focus: s.focus,
              label: s.label,
              initial: s.initialMain,
            }))}
            gender={profile.gender}
            experience={profile.experience}
            bodyType={profile.bodyType}
            weightKg={profile.weightKg}
            dateYmd={todayYmd}
            gymEquipment={gymEquipment}
            lockWeightReps={profile.lockWeightReps}
            allowAllExercises={direct}
            recommendFocuses={direct ? directRecFocuses : undefined}
            hideRecommend={direct}
            // 부위 추가(add) 모드에서는 '추가 요청한 부위'만 새로 담을 수 있게 제한한다.
            // (오늘 이미 있던 부위는 편집기에 그대로 보이되, 새 운동 추가/부위 전환은 요청 부위만.)
            addableFocuses={addMode ? validFocuses : undefined}
          />

          {/* 워밍업/마무리는 하루 1세트. 추천은 오늘 전 부위 합집합으로 채움.
              직접 담기(direct)면 부위 기준 없이도 빈 섹션을 띄워 직접 추가하게 한다. */}
          {primaryFocus || direct ? (
            <>
              <ConditioningEditor
                focus={primaryFocus ?? "core"}
                recommendFocuses={direct ? directRecFocuses : validFocuses}
                hideRecommend={direct}
                kind="warmup"
                initial={warmupInitial}
                dailyDate={todayYmd}
                lockWeightReps={profile.lockWeightReps}
              />
              <ConditioningEditor
                focus={primaryFocus ?? "core"}
                recommendFocuses={direct ? directRecFocuses : validFocuses}
                hideRecommend={direct}
                kind="cooldown"
                initial={cooldownInitial}
                dailyDate={todayYmd}
                lockWeightReps={profile.lockWeightReps}
              />
            </>
          ) : null}
        </div>
      )}

      <div className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
        기본 루틴을 수정하려면{" "}
        <Link
          href="/plan"
          className="font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-300"
        >
          /plan
        </Link>
        {" "}
        에서 부위별 설정을 바꾸세요.
      </div>
    </main>
  );
}
