import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft, Dumbbell, Flame, Wind, Zap } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";
import {
  EQUIPMENT_LABELS,
  getCatalogExercise,
  type EquipmentId,
} from "@/features/routine/exercise-catalog";
import {
  estimateConditioningKcal,
  estimateStrengthKcal,
} from "@/features/routine/calories";
import {
  getConditioningItem,
  PARAM_UNIT,
} from "@/features/routine/conditioning-catalog";
import { DAY_BLOCKS, isDayBlockId, type DayBlockId } from "@/features/routine/data";

export const dynamic = "force-dynamic";

function blockLabel(focus: string): string {
  return isDayBlockId(focus) ? DAY_BLOCKS[focus as DayBlockId].label : focus;
}

type ExRow = {
  exercise_id: string | null;
  equipment: string | null;
  sets: number | null;
  reps: number | null;
  weight_kg: number | string | null;
  focus: string | null;
  routine_exercises:
    | {
        focus: string;
        sets: number;
        reps: number;
        weight_kg: number | string | null;
        exercise_id: string;
        equipment: string;
      }[]
    | null;
};
type CondRow = {
  kind: string;
  item_id: string;
  duration_min: number | null;
  speed: number | string | null;
  incline: number | string | null;
};

function isValidYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function monthOf(ymd: string): string {
  return ymd.slice(0, 7);
}
function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default async function HistoryDetailPage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;
  if (!isValidYmd(date)) notFound();

  const profile = await getUserProfile();
  if (!profile) redirect("/onboarding");
  const weightKg = profile.weightKg ?? 65;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [exRes, condRes] = await Promise.all([
    supabase
      .from("exercise_completions")
      .select(
        "exercise_id, equipment, sets, reps, weight_kg, focus, routine_exercises(focus, sets, reps, weight_kg, exercise_id, equipment)",
      )
      .eq("user_id", user.id)
      .eq("for_date", date)
      .eq("status", "done"),
    supabase
      .from("conditioning_completions")
      .select("kind, item_id, duration_min, speed, incline")
      .eq("user_id", user.id)
      .eq("for_date", date)
      .eq("status", "done"),
  ]);

  const mainItems = ((exRes.data ?? []) as ExRow[])
    .map((r) => {
      // 스냅샷 우선, 없으면 routine_exercises 조인 fallback
      const joined = r.routine_exercises?.[0];
      const focus = r.focus ?? joined?.focus ?? null;
      const exerciseId = r.exercise_id ?? joined?.exercise_id ?? null;
      const equipment = r.equipment ?? joined?.equipment ?? null;
      const sets = r.sets ?? joined?.sets ?? null;
      const reps = r.reps ?? joined?.reps ?? null;
      const weight = num(r.weight_kg) ?? num(joined?.weight_kg ?? null);
      if (!focus || !exerciseId || !equipment || sets === null || reps === null) {
        return null;
      }
      const catalog = getCatalogExercise(exerciseId);
      const name = catalog?.name ?? exerciseId;
      const equipmentLabel =
        EQUIPMENT_LABELS[equipment as EquipmentId] ?? equipment;
      const kcal = Math.round(estimateStrengthKcal(weightKg, exerciseId, sets));
      return { focus, name, equipmentLabel, sets, reps, weightKg: weight, kcal };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const warmupItems: { name: string; detail: string; kcal: number }[] = [];
  const cooldownItems: typeof warmupItems = [];
  for (const r of (condRes.data ?? []) as CondRow[]) {
    const item = getConditioningItem(r.item_id);
    const name = item?.name ?? r.item_id;
    // 스냅샷 우선, 없으면 카탈로그 기본값
    const dur = r.duration_min ?? item?.defaultMin ?? null;
    const spd = num(r.speed) ?? item?.defaultSpeed ?? null;
    const inc = num(r.incline) ?? item?.defaultIncline ?? null;
    const parts: string[] = [];
    if (dur !== null) parts.push(`${dur}${PARAM_UNIT.duration}`);
    if (spd !== null) parts.push(`${spd}${PARAM_UNIT.speed}`);
    if (inc !== null) parts.push(`${inc}${PARAM_UNIT.incline}`);
    const detail = parts.join(" · ") || "—";
    const kcal = Math.round(estimateConditioningKcal(weightKg, r.item_id, dur, spd));
    const entry = { name, detail, kcal };
    if (r.kind === "cooldown") cooldownItems.push(entry);
    else warmupItems.push(entry);
  }

  const totalKcal =
    mainItems.reduce((s, i) => s + i.kcal, 0) +
    warmupItems.reduce((s, i) => s + i.kcal, 0) +
    cooldownItems.reduce((s, i) => s + i.kcal, 0);

  const focusCount = new Map<string, number>();
  for (const i of mainItems)
    focusCount.set(i.focus, (focusCount.get(i.focus) ?? 0) + 1);
  let dominantFocus: string | null = null;
  let max = 0;
  for (const [f, n] of focusCount) {
    if (n > max) {
      max = n;
      dominantFocus = f;
    }
  }
  const focusLabel = dominantFocus ? blockLabel(dominantFocus) : null;

  const [y, m, d] = date.split("-").map(Number);
  const weekdayNames = ["일", "월", "화", "수", "목", "금", "토"];
  const wd = weekdayNames[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  const dateLabel = `${y}년 ${m}월 ${d}일 (${wd})`;

  const totalDone =
    mainItems.length + warmupItems.length + cooldownItems.length;

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10 sm:px-8">
      <Link
        className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800"
        href={`/settings/history?month=${monthOf(date)}`}
      >
        <ChevronLeft aria-hidden="true" size={16} />
        {`${y}년 ${m}월 캘린더로`}
      </Link>

      <div className="mt-6 mb-6 space-y-1">
        <h1 className="text-2xl font-bold text-zinc-950">{dateLabel}</h1>
        <p className="text-sm leading-6 text-zinc-600">
          이 날 완료 처리한 운동만 표시합니다. 완료 취소하면 이 페이지에서도
          제거됩니다.
        </p>
      </div>

      <section className="mb-5 flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
          <Zap aria-hidden="true" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
            이 날 총 소모 칼로리
          </p>
          <p className="text-2xl font-bold text-zinc-950">
            {totalKcal}
            <span className="ml-1 text-sm font-medium text-zinc-500">kcal</span>
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            완료 {totalDone}건
            {focusLabel ? ` · 대표 부위 ${focusLabel}` : ""}
            {profile.weightKg === null ? " · 체중 미입력(65kg 가정)" : ""}
          </p>
        </div>
      </section>

      <Section title="본운동" icon={<Dumbbell size={15} />} tone="emerald">
        {mainItems.length === 0 ? (
          <Empty text="완료된 본운동이 없습니다." />
        ) : (
          <ul className="space-y-2">
            {mainItems.map((it, i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Dumbbell aria-hidden="true" size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-zinc-950">
                    {it.name}
                    <span className="ml-2 text-xs font-medium text-zinc-500">
                      {it.equipmentLabel}
                    </span>
                    <span className="ml-2 text-[10px] font-bold text-emerald-700">
                      {blockLabel(it.focus)}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-600">
                    {it.sets}세트 × {it.reps}회
                    {it.weightKg !== null ? ` · ${it.weightKg}kg` : " · 맨몸"}
                    <span className="ml-2 text-orange-700">
                      · 약 {it.kcal}kcal
                    </span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="워밍업" icon={<Flame size={15} />} tone="amber">
        {warmupItems.length === 0 ? (
          <Empty text="완료된 워밍업이 없습니다." />
        ) : (
          <CondList items={warmupItems} bg="bg-amber-100 text-amber-700" />
        )}
      </Section>

      <Section title="마무리" icon={<Wind size={15} />} tone="sky">
        {cooldownItems.length === 0 ? (
          <Empty text="완료된 마무리가 없습니다." />
        ) : (
          <CondList items={cooldownItems} bg="bg-sky-100 text-sky-700" />
        )}
      </Section>
    </main>
  );
}

function Section({
  title,
  icon,
  tone,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  tone: "emerald" | "amber" | "sky";
  children: React.ReactNode;
}) {
  const badge =
    tone === "emerald"
      ? "bg-emerald-100 text-emerald-700"
      : tone === "amber"
        ? "bg-amber-100 text-amber-700"
        : "bg-sky-100 text-sky-700";
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-md ${badge}`}>
          {icon}
        </span>
        <h2 className="text-sm font-bold text-zinc-950">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-dashed border-zinc-300 bg-white p-3 text-xs text-zinc-500">
      {text}
    </p>
  );
}

function CondList({
  items,
  bg,
}: {
  items: { name: string; detail: string; kcal: number }[];
  bg: string;
}) {
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li
          key={i}
          className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3"
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${bg}`}
          >
            <Dumbbell aria-hidden="true" size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-zinc-950">{it.name}</p>
            <p className="mt-0.5 text-xs text-zinc-600">
              {it.detail}
              <span className="ml-2 text-orange-700">· 약 {it.kcal}kcal</span>
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
