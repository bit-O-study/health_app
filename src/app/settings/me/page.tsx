import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowRight,
  ChevronLeft,
  Dumbbell,
  Flame,
  Scale,
  Trophy,
  Utensils,
} from "lucide-react";

import { getCurrentUser } from "@/lib/supabase/server";
import { getUserProfile } from "@/features/profile/data-access";
import {
  bmiOf,
  bmiCategory,
  GENDER_OPTIONS,
  EXPERIENCE_OPTIONS,
  BODY_TYPE_OPTIONS,
} from "@/features/profile/data";
import { getRecentExerciseCompletions } from "@/features/routine/exercise-completions";
import { computeScore } from "@/features/routine/score";
import { getFoodLogsForDate } from "@/features/diet/data-access";
import { dailyTarget } from "@/features/diet/calorie-target";
import { seoulYmd } from "@/features/routine/data";

export const dynamic = "force-dynamic";

export const metadata = { title: "마이페이지" };

const labelOf = (
  opts: { id: string; label: string }[],
  id: string | null,
): string | null => opts.find((o) => o.id === id)?.label ?? null;

export default async function MyPage() {
  const [user, profile] = await Promise.all([getCurrentUser(), getUserProfile()]);
  if (!user) redirect("/login");
  if (!profile) redirect("/onboarding");

  const today = seoulYmd();
  const [completions, logs] = await Promise.all([
    getRecentExerciseCompletions(90),
    getFoodLogsForDate(today),
  ]);

  const done = completions.filter((c) => c.status === "done");
  const userWeight = profile.weightKg ?? 65;
  const score = computeScore(
    done.map((c) => ({
      forDate: c.forDate,
      sets: c.sets,
      reps: c.reps,
      weightKg: c.weightKg,
    })),
    userWeight,
  );

  const target = dailyTarget({
    gender: profile.gender === "female" ? "female" : "male",
    weightKg: profile.weightKg,
    heightCm: profile.heightCm,
  });
  const consumed = Math.round(logs.reduce((s, l) => s + l.kcal, 0));
  const kcalPct = target.kcal > 0 ? Math.min(100, (consumed / target.kcal) * 100) : 0;

  const bmi = bmiOf(profile.heightCm, profile.weightKg);
  const genderLabel = labelOf(GENDER_OPTIONS, profile.gender);
  const expLabel = labelOf(EXPERIENCE_OPTIONS, profile.experience);
  const bodyTypeLabel = labelOf(BODY_TYPE_OPTIONS, profile.bodyType);
  const displayName = profile.name ?? user.email?.split("@")[0] ?? "회원";
  const initial = (profile.name ?? user.email ?? "?").trim().charAt(0).toUpperCase();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10 sm:px-8">
      <Link
        className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200"
        href="/settings"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        설정
      </Link>

      <h1 className="mt-6 mb-6 text-2xl font-bold text-zinc-950 dark:text-zinc-100">
        마이페이지
      </h1>

      {/* 프로필 헤더 */}
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex items-center gap-4">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-2xl font-extrabold text-white">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold text-zinc-950 dark:text-zinc-100">
              {displayName}
            </p>
            <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
              {user.email}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {genderLabel ? <Badge>{genderLabel}</Badge> : null}
              {expLabel ? <Badge>{expLabel}</Badge> : null}
              {bodyTypeLabel ? <Badge>{bodyTypeLabel}</Badge> : null}
              {profile.phone ? <Badge>{profile.phone}</Badge> : null}
            </div>
          </div>
        </div>
      </section>

      {/* 신체 정보 */}
      <section className="mt-6">
        <SectionTitle icon={<Scale size={16} />} title="신체 정보" href="/settings/profile" cta="기록" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="키" value={profile.heightCm != null ? `${profile.heightCm}` : "—"} unit="cm" />
          <Stat label="몸무게" value={profile.weightKg != null ? `${profile.weightKg}` : "—"} unit="kg" />
          <Stat
            label="BMI"
            value={bmi != null ? bmi.toFixed(1) : "—"}
            unit={bmi != null ? bmiCategory(bmi) : ""}
          />
          <Stat
            label="체지방률"
            value={profile.bodyFatPct != null ? `${profile.bodyFatPct}` : "—"}
            unit="%"
          />
          <Stat
            label="근육량"
            value={profile.muscleMassKg != null ? `${profile.muscleMassKg}` : "—"}
            unit="kg"
          />
        </div>
      </section>

      {/* 오늘 식단 */}
      <section className="mt-6">
        <SectionTitle icon={<Utensils size={16} />} title="오늘 식단" href="/diet" cta="식단" />
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-300">
              섭취 칼로리
            </span>
            <span className="text-sm font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
              {consumed}
              <span className="text-xs font-medium text-zinc-400"> / {target.kcal} kcal</span>
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-700">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${kcalPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            {logs.length > 0
              ? `오늘 ${logs.length}개 기록 · 목표까지 ${Math.max(0, target.kcal - consumed)} kcal`
              : "아직 오늘 기록이 없어요 — 식단을 올려보세요"}
          </p>
        </div>
      </section>

      {/* 운동 요약 */}
      <section className="mt-6">
        <SectionTitle icon={<Dumbbell size={16} />} title="운동 요약" href="/settings/score" cta="운동 점수" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="운동 점수" value={`${score.score}`} unit="점" icon={<Trophy size={15} />} tone="amber" />
          <Stat label="연속" value={`${score.currentStreak}`} unit="일" icon={<Flame size={15} />} tone="rose" />
          <Stat label="최근 7일" value={`${score.last7DayCount}`} unit="일" icon={<Activity size={15} />} tone="emerald" />
          <Stat label="총 완료" value={`${score.totalCount}`} unit="건" icon={<Activity size={15} />} tone="indigo" />
        </div>
      </section>
    </main>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-bold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300">
      {children}
    </span>
  );
}

function SectionTitle({
  icon,
  title,
  href,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
        <span className="text-emerald-600 dark:text-emerald-400">{icon}</span>
        {title}
      </h2>
      <Link
        href={href}
        className="inline-flex items-center gap-0.5 text-xs font-semibold text-zinc-400 transition hover:text-emerald-600 dark:hover:text-emerald-400"
      >
        {cta}
        <ArrowRight aria-hidden="true" size={13} />
      </Link>
    </div>
  );
}

function Stat({
  label,
  value,
  unit,
  icon,
  tone = "zinc",
}: {
  label: string;
  value: string;
  unit?: string;
  icon?: React.ReactNode;
  tone?: "zinc" | "amber" | "rose" | "emerald" | "indigo";
}) {
  const tones = {
    zinc: "text-zinc-400",
    amber: "text-amber-600 dark:text-amber-400",
    rose: "text-rose-500",
    emerald: "text-emerald-600 dark:text-emerald-400",
    indigo: "text-indigo-600 dark:text-indigo-400",
  } as const;
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
      <p className="flex items-center gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
        {icon ? <span className={tones[tone]}>{icon}</span> : null}
        {label}
      </p>
      <p className="mt-1 text-xl font-bold tabular-nums text-zinc-950 dark:text-zinc-100">
        {value}
        {unit ? (
          <span className="ml-1 text-xs font-medium text-zinc-400">{unit}</span>
        ) : null}
      </p>
    </div>
  );
}

