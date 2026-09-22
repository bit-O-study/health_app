import { redirect } from "next/navigation";
import { LogOut } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Section } from "@/components/ui/compact";
import { getCurrentUser } from "@/lib/supabase/server";
import { signOut } from "@/features/auth/actions";
import { WithdrawButton } from "@/features/account/components/withdraw-button";
import { getUserProfile } from "@/features/profile/data-access";
import {
  bmiOf,
  bmiCategory,
  GENDER_OPTIONS,
  EXPERIENCE_OPTIONS,
  BODY_TYPE_OPTIONS,
} from "@/features/profile/data";
import { NicknameEditor } from "@/features/profile/components/nickname-editor";
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
      // 드롭세트·피라미드는 여기에 있다 — 안 넘기면 균일 세트로만 세어 운동량이 틀어진다.
      setDetails: c.setDetails,
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
  const displayName =
    profile.nickname ?? profile.name ?? user.email?.split("@")[0] ?? "회원";
  const initial = (profile.nickname ?? profile.name ?? user.email ?? "?")
    .trim()
    .charAt(0)
    .toUpperCase();

  // 공통 머리글 + 촘촘한 카드(2026-09-16 8단계) — 섹션 라벨은 카드 밖, 숫자 칸은 한 장 안에.
  return (
    <div className="app-page">
      <PageHeader title="마이페이지" back="설정" />
      <main className="app-container space-y-4">
        {/* 프로필 */}
        <section className="app-card flex items-center gap-3 p-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand text-xl font-bold text-white dark:text-zinc-950">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-semibold text-zinc-950 dark:text-zinc-100">
              {displayName}
            </p>
            <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{user.email}</p>
            <div className="mt-1 flex flex-wrap gap-1">
              {genderLabel ? <Badge>{genderLabel}</Badge> : null}
              {expLabel ? <Badge>{expLabel}</Badge> : null}
              {bodyTypeLabel ? <Badge>{bodyTypeLabel}</Badge> : null}
              {profile.phone ? <Badge>{profile.phone}</Badge> : null}
            </div>
            <NicknameEditor initial={profile.nickname ?? ""} />
          </div>
        </section>

        {/* 신체 정보 */}
        <Section label="신체 정보" action={{ href: "/settings/profile", label: "기록" }}>
          <div className="app-card grid grid-cols-3 gap-y-2 py-2.5">
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
        </Section>

        {/* 오늘 식단 */}
        <Section label="오늘 식단" action={{ href: "/diet", label: "식단" }}>
          <div className="app-card p-3">
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-sm text-zinc-600 dark:text-zinc-300">섭취 칼로리</span>
              <span className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
                {consumed}
                <span className="text-xs font-medium text-zinc-400"> / {target.kcal} kcal</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.08]">
              <div className="h-full rounded-full bg-brand" style={{ width: `${kcalPct}%` }} />
            </div>
            <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
              {logs.length > 0
                ? `${logs.length}개 기록 · ${Math.max(0, target.kcal - consumed)} kcal 남음`
                : "기록 없음"}
            </p>
          </div>
        </Section>

        {/* 운동 요약 */}
        <Section label="운동 요약" action={{ href: "/settings/score", label: "운동 점수" }}>
          <div className="app-card grid grid-cols-4 divide-x divide-[var(--line)] py-2.5">
            <Stat label="운동 점수" value={`${score.score}`} unit="점" />
            <Stat label="연속" value={`${score.currentStreak}`} unit="일" />
            <Stat label="최근 7일" value={`${score.last7DayCount}`} unit="일" />
            <Stat label="총 완료" value={`${score.totalCount}`} unit="건" />
          </div>
        </Section>

        {/* 계정 — 하단에 조용히(로그아웃·회원탈퇴), 양옆으로 나란히 */}
        <section className="flex items-center justify-center gap-3 pt-4">
          <form action={signOut}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 underline-offset-2 transition hover:text-zinc-600 hover:underline dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              <LogOut aria-hidden="true" size={13} />
              로그아웃
            </button>
          </form>
          <span aria-hidden="true" className="text-zinc-300 dark:text-zinc-600">
            |
          </span>
          <WithdrawButton />
        </section>
      </main>
    </div>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300">
      {children}
    </span>
  );
}

/** 숫자 한 칸 — 라벨 위, 숫자 아래. 한 장짜리 카드 격자 안에 놓는다. */
function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="min-w-0 px-2 text-center">
      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-0.5 truncate text-base font-semibold tabular-nums text-zinc-950 dark:text-zinc-100">
        {value}
        {unit ? <span className="ml-0.5 text-xs font-medium text-zinc-400">{unit}</span> : null}
      </p>
    </div>
  );
}
