import { notFound, redirect } from "next/navigation";
import { Dumbbell, Timer, Zap } from "lucide-react";

import { PageHeader } from "@/components/page-header";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";
import { getWorkoutDurationFor } from "@/features/workout-timer/workout-sessions";
import { RunHistoryList } from "@/features/running/components/run-history-list";
import { getRunSessionsRange } from "@/features/running/run-history-data";

function shortDuration(sec: number): string {
  if (sec < 60) return `${sec}초`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem === 0 ? `${h}시간` : `${h}시간 ${rem}분`;
}
import {
  EQUIPMENT_LABELS,
  getCatalogExercise,
  type EquipmentId,
} from "@/features/routine/exercise-catalog";
import {
  estimateConditioningKcal,
  strengthKcalForCompletion,
} from "@/features/routine/calories";
import {
  getConditioningItem,
  PARAM_UNIT,
} from "@/features/routine/conditioning-catalog";
import {
  parseSetDetails,
  summarizeSetDetails,
} from "@/features/routine/set-details";
import {
  DAY_BLOCKS,
  isDayBlockId,
  type DayBlockId,
} from "@/features/routine/data";

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
  set_details?: unknown;
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

  // 사용자·프로필 병렬 조회(캐시된 getCurrentUser 재사용 — 중복 auth 라운드트립 제거).
  const [user, profile] = await Promise.all([
    getCurrentUser(),
    getUserProfile(),
  ]);
  if (!user) redirect("/login");
  if (!profile) redirect("/onboarding");
  const weightKg = profile.weightKg ?? 65;

  const supabase = await createSupabaseServerClient();

  const [exRes, condRes, workoutDurationSec, runSessions] = await Promise.all([
    supabase
      .from("exercise_completions")
      // 넓은 스냅샷 테이블 — 매퍼가 쓰는 컬럼만 선택(과다 fetch 방지).
      .select("focus, exercise_id, equipment, sets, reps, weight_kg, set_details")
      .eq("user_id", user.id)
      .eq("for_date", date)
      .eq("status", "done"),
    supabase
      .from("conditioning_completions")
      .select("kind, item_id, duration_min, speed, incline")
      .eq("user_id", user.id)
      .eq("for_date", date)
      .eq("status", "done"),
    getWorkoutDurationFor(date),
    getRunSessionsRange(date, date),
  ]);

  const mainItems = ((exRes.data ?? []) as ExRow[])
    .map((r) => {
      const focus = r.focus;
      const exerciseId = r.exercise_id;
      const equipment = r.equipment;
      const sets = r.sets;
      const reps = r.reps;
      if (
        !focus ||
        !exerciseId ||
        !equipment ||
        sets === null ||
        reps === null
      ) {
        return null;
      }
      const weight = num(r.weight_kg);
      const catalog = getCatalogExercise(exerciseId);
      const name = catalog?.name ?? exerciseId;
      const equipmentLabel =
        EQUIPMENT_LABELS[equipment as EquipmentId] ?? equipment;
      const kcal = Math.round(strengthKcalForCompletion(weightKg, exerciseId, sets));
      return {
        focus,
        name,
        equipmentLabel,
        sets,
        reps,
        weightKg: weight,
        setDetails: parseSetDetails(r.set_details),
        kcal,
      };
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
    const detail = parts.join(" ·") || "—";
    const kcal = Math.round(
      estimateConditioningKcal(weightKg, r.item_id, dur, spd, inc),
    );
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

  // 공통 머리글 + 요약 한 장 + 섹션 라벨·그룹 목록(2026-09-16 8단계) — 설명 문단·색 칩은 뺐다.
  return (
    <div className="app-page">
      <PageHeader title={dateLabel} back />
      <main className="app-container space-y-4">
        {/* 요약 — 칼로리·운동 시간을 한 장에 두 칸으로 */}
        <section className="app-list">
          <div className="grid grid-cols-2 divide-x divide-[var(--line)] py-2.5 text-center">
            <div className="min-w-0 px-2">
              <p className="flex items-center justify-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                <Zap aria-hidden="true" size={12} />
                총 소모 칼로리
              </p>
              <p className="mt-0.5 text-xl font-bold tabular-nums text-zinc-950 dark:text-zinc-50">
                {totalKcal}
                <span className="ml-0.5 text-xs font-medium text-zinc-400">kcal</span>
              </p>
            </div>
            <div className="min-w-0 px-2">
              <p className="flex items-center justify-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                <Timer aria-hidden="true" size={12} />
                총 운동 시간
              </p>
              <p className="mt-0.5 truncate text-xl font-bold tabular-nums text-zinc-950 dark:text-zinc-50">
                {workoutDurationSec > 0 ? shortDuration(workoutDurationSec) : "—"}
              </p>
            </div>
          </div>
          <div>
            <p className="px-3 py-2 text-center text-xs text-zinc-500 dark:text-zinc-400">
              완료 {totalDone}건{focusLabel ? ` · 대표 부위 ${focusLabel}` : ""}
              {profile.weightKg === null ? " · 체중 미입력(65kg 가정)" : ""}
            </p>
          </div>
        </section>

        <Section title="본운동">
          {mainItems.length === 0 ? (
            <Empty text="완료된 본운동이 없습니다." />
          ) : (
            <ul className="app-list">
              {mainItems.map((it, i) => (
                <li key={i} className="flex min-h-12 items-center gap-3 px-3 py-2">
                  <Dumbbell aria-hidden="true" size={16} className="shrink-0 text-zinc-400" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-zinc-950 dark:text-zinc-100">
                      {it.name}
                      <span className="ml-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                        {it.equipmentLabel} · {blockLabel(it.focus)}
                      </span>
                    </p>
                    <p className="truncate text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                      {it.setDetails && it.setDetails.length > 0
                        ? `${it.setDetails.length}세트 · ${summarizeSetDetails(it.setDetails)}`
                        : `${it.sets}세트 × ${it.reps}회${
                            it.weightKg !== null ? ` · ${it.weightKg}kg` : " · 맨몸"
                          }`}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                    약 {it.kcal}kcal
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="워밍업">
          {warmupItems.length === 0 ? (
            <Empty text="완료된 워밍업이 없습니다." />
          ) : (
            <CondList items={warmupItems} />
          )}
        </Section>

        <Section title="마무리">
          {cooldownItems.length === 0 ? (
            <Empty text="완료된 마무리가 없습니다." />
          ) : (
            <CondList items={cooldownItems} />
          )}
        </Section>

        <section id="running">
          <h2 className="app-section-label">런닝 세션</h2>
          <div className="app-card overflow-hidden">
            <RunHistoryList rows={runSessions} />
          </div>
        </section>
      </main>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="app-section-label">{title}</h2>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="app-card px-3 py-2.5 text-sm text-zinc-500 dark:text-zinc-400">
      {text}
    </p>
  );
}

function CondList({
  items,
}: {
  items: { name: string; detail: string; kcal: number }[];
}) {
  return (
    <ul className="app-list">
      {items.map((it, i) => (
        <li key={i} className="flex min-h-12 items-center gap-3 px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm text-zinc-950 dark:text-zinc-100">{it.name}</p>
            <p className="truncate text-xs tabular-nums text-zinc-500 dark:text-zinc-400">{it.detail}</p>
          </div>
          <span className="shrink-0 text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
            약 {it.kcal}kcal
          </span>
        </li>
      ))}
    </ul>
  );
}
