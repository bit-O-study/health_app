import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { getUserProfile } from "@/features/profile/data-access";
import { getUserRoutine } from "@/features/routine/data-access";
import {
  DAY_BLOCKS,
  resolveRoutine,
  routineDayOffset,
  seoulYmd,
  ymdDisplay,
  type FocusTone,
} from "@/features/routine/data";
import { getConditioningForFocus } from "@/features/routine/conditioning";
import { getDailyConditioning } from "@/features/routine/daily-conditioning";
import { ConditioningEditor } from "@/features/routine/components/conditioning-editor";

export const dynamic = "force-dynamic";

export default async function TodayConditioningPage() {
  const [profile, routine] = await Promise.all([
    getUserProfile(),
    getUserRoutine(),
  ]);

  if (!profile) redirect("/onboarding");
  if (!routine) redirect("/settings/routine");

  const { variant } = resolveRoutine(
    routine.splits,
    routine.variantId,
    routine.customWeek,
  );
  const todayYmd = seoulYmd();
  const offset = routineDayOffset(routine.startDate, todayYmd);
  const overriddenToday =
    routine.overrideDate === todayYmd && routine.overrideBlock !== null;
  const todayTone: FocusTone = overriddenToday
    ? routine.overrideBlock!
    : variant.week[offset].tone;
  const restedToday = routine.restDate === todayYmd;
  const focusLabel =
    restedToday || todayTone === "rest"
      ? "휴식"
      : DAY_BLOCKS[todayTone].label;

  const [defaults, daily] = await Promise.all([
    getConditioningForFocus(todayTone),
    getDailyConditioning(todayYmd),
  ]);

  // 오늘 오버라이드가 있으면 그걸로, 없으면 기본값으로 폼을 채운다.
  const warmupInitial =
    daily.warmup.length > 0 ? daily.warmup : defaults.warmup;
  const cooldownInitial =
    daily.cooldown.length > 0 ? daily.cooldown : defaults.cooldown;

  const { weekday } = ymdDisplay(todayYmd);
  const [, mm, dd] = todayYmd.split("-");
  const dateLabel = `${Number(mm)}월 ${Number(dd)}일 (${weekday})`;

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
          오늘만 워밍업·마무리 변경
        </h1>
        <p className="text-sm leading-6 text-zinc-600">
          {dateLabel} · 오늘 부위: <strong>{focusLabel}</strong> · 저장한
          내용은 <strong>오늘만</strong> 반영되고 내일부터는 부위별 기본값으로
          돌아갑니다.
        </p>
        <p className="text-xs text-zinc-500">
          모든 항목을 비우고 저장하면 오늘 오버라이드가 제거돼 기본값으로
          돌아갑니다.
        </p>
      </div>

      <div className="space-y-3">
        <ConditioningEditor
          focus={todayTone}
          kind="warmup"
          initial={warmupInitial}
          dailyDate={todayYmd}
        />
        <ConditioningEditor
          focus={todayTone}
          kind="cooldown"
          initial={cooldownInitial}
          dailyDate={todayYmd}
        />
      </div>

      <div className="mt-6 text-sm text-zinc-500">
        기본값을 바꾸려면{" "}
        <Link href="/plan" className="font-semibold text-emerald-700 hover:text-emerald-600">
          /plan
        </Link>{" "}
        에서 부위별 설정을 수정하세요.
      </div>
    </main>
  );
}
