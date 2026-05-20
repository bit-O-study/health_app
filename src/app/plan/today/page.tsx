import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getUserProfile } from "@/features/profile/data-access";
import { getUserRoutine } from "@/features/routine/data-access";
import {
  DAY_BLOCKS,
  isDayBlockId,
  resolveRoutine,
  routineDayOffset,
  seoulYmd,
  ymdDisplay,
  type FocusTone,
} from "@/features/routine/data";
import { ALL_FOCUSES } from "@/features/routine/exercise-catalog";
import { getConditioningForFocus } from "@/features/routine/conditioning";
import { getDailyConditioning } from "@/features/routine/daily-conditioning";
import { getDailyPlanForDate } from "@/features/routine/daily-plan";
import { getPlanForFocus } from "@/features/routine/plan";
import { ConditioningEditor } from "@/features/routine/components/conditioning-editor";
import { DailyMainEditor } from "@/features/routine/components/daily-main-editor";

export const dynamic = "force-dynamic";

export default async function TodayConditioningPage({
  searchParams,
}: {
  searchParams: Promise<{ focus?: string }>;
}) {
  const [profile, routine] = await Promise.all([
    getUserProfile(),
    getUserRoutine(),
  ]);
  if (!profile) redirect("/onboarding");
  if (!routine) redirect("/settings/routine");

  const { focus: focusParam } = await searchParams;

  // 선택 부위 (?focus=chest,back) — 없으면 오늘의 실제 부위 1개
  let focuses: FocusTone[] = [];
  if (focusParam) {
    focuses = focusParam
      .split(",")
      .map((s) => s.trim())
      .filter(
        (s): s is Exclude<FocusTone, "rest"> =>
          s !== "rest" && isDayBlockId(s) && ALL_FOCUSES.includes(s as Exclude<FocusTone, "rest">),
      );
  }
  if (focuses.length === 0) {
    const { variant } = resolveRoutine(
      routine.splits,
      routine.variantId,
      routine.customWeek,
    );
    const todayYmd = seoulYmd();
    const offset = routineDayOffset(routine.startDate, todayYmd);
    const overriddenToday =
      routine.overrideDate === todayYmd && routine.overrideBlock !== null;
    const tone: FocusTone = overriddenToday
      ? routine.overrideBlock!
      : variant.week[offset].tone;
    if (tone !== "rest") focuses = [tone];
  }

  const todayYmd = seoulYmd();
  const { weekday } = ymdDisplay(todayYmd);
  const [, mm, dd] = todayYmd.split("-");
  const dateLabel = `${Number(mm)}월 ${Number(dd)}일 (${weekday})`;

  const dailyAll = await getDailyPlanForDate(todayYmd);
  const validFocuses = focuses.filter(
    (f): f is Exclude<FocusTone, "rest"> => f !== "rest",
  );

  // 부위별 본운동 섹션
  const mainSections = await Promise.all(
    validFocuses.map(async (focus) => {
      const dailyMain = dailyAll.filter((r) => r.focus === focus);
      const initialMain =
        dailyMain.length > 0
          ? dailyMain
          : (await getPlanForFocus(focus)).map((p) => ({
              id: p.id,
              focus: p.focus,
              position: p.position,
              exerciseId: p.exerciseId,
              equipment: p.equipment,
              sets: p.sets,
              reps: p.reps,
              weightKg: p.weightKg,
            }));
      return {
        focus,
        label: DAY_BLOCKS[focus].label,
        initialMain,
      };
    }),
  );

  // 워밍업/마무리는 하루 1세트(첫 선택 부위 기준 기본값) — 중복 노출 방지
  const primaryFocus = validFocuses[0];
  const daily = await getDailyConditioning(todayYmd);
  const condDefaults = primaryFocus
    ? await getConditioningForFocus(primaryFocus)
    : { warmup: [], cooldown: [] };
  const warmupInitial =
    daily.warmup.length > 0 ? daily.warmup : condDefaults.warmup;
  const cooldownInitial =
    daily.cooldown.length > 0 ? daily.cooldown : condDefaults.cooldown;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10 sm:px-8">
      <Link
        className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800"
        href="/"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        메인으로
      </Link>

      <div className="mt-6 mb-6 space-y-1">
        <h1 className="text-2xl font-bold text-zinc-950">
          오늘만 운동 바꾸기
        </h1>
        <p className="text-sm leading-6 text-zinc-600">
          {dateLabel} · 선택 부위 ·{" "}
          <strong>
            {mainSections.length > 0
              ? mainSections.map((s) => s.label).join(", ")
              : "선택 없음"}
          </strong>
          . 저장한 내용은 <strong>오늘만</strong> 반영되고 내일부터는 기본
          루틴으로 돌아갑니다. 이미 완료 처리한 운동은 그대로 남습니다.
        </p>
        <p className="text-xs text-zinc-500">
          본운동 / 워밍업 / 마무리를 항목 비우고 저장하면 그 부위의 오늘
          오버라이드가 제거됩니다.
        </p>
      </div>

      {mainSections.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500">
          편집할 부위가 없습니다. 메인 화면 “오늘만 운동 바꾸기” 팝업에서
          부위를 선택해 주세요.
        </p>
      ) : (
        <div className="space-y-6">
          {/* 부위별 본운동 */}
          {mainSections.map((s) => (
            <DailyMainEditor
              key={s.focus}
              focus={s.focus}
              label={s.label}
              gender={profile.gender}
              experience={profile.experience}
              bodyType={profile.bodyType}
              weightKg={profile.weightKg}
              dateYmd={todayYmd}
              initial={s.initialMain}
            />
          ))}

          {/* 워밍업/마무리는 하루 1세트 */}
          {primaryFocus ? (
            <>
              <ConditioningEditor
                focus={primaryFocus}
                kind="warmup"
                initial={warmupInitial}
                dailyDate={todayYmd}
              />
              <ConditioningEditor
                focus={primaryFocus}
                kind="cooldown"
                initial={cooldownInitial}
                dailyDate={todayYmd}
              />
            </>
          ) : null}
        </div>
      )}

      <div className="mt-6 text-sm text-zinc-500">
        기본 루틴을 수정하려면{" "}
        <Link href="/plan" className="font-semibold text-emerald-700 hover:text-emerald-600">
          /plan
        </Link>{" "}
        에서 부위별 설정을 바꾸세요.
      </div>
    </main>
  );
}
