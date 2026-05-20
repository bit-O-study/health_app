import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, ChevronLeft, Flame, Trophy } from "lucide-react";

import { getUserProfile } from "@/features/profile/data-access";
import { getRecentExerciseCompletions } from "@/features/routine/exercise-completions";
import {
  balanceStatusFor,
  BALANCE_COLOR,
  BALANCE_LABEL,
  computeScore,
  FOCUS_TO_REGIONS,
  type BalanceStatus,
} from "@/features/routine/score";
import { seoulYmd } from "@/features/routine/data";
import {
  Mannequin,
  REGION_LABEL,
  type BodyRegion,
} from "@/features/routine/components/mannequin";

export const dynamic = "force-dynamic";

const REGIONS: BodyRegion[] = [
  "chest",
  "back",
  "shoulder",
  "arm",
  "leg",
  "core",
];

function ymdToEpochDay(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

export default async function ScorePage() {
  const profile = await getUserProfile();
  if (!profile) redirect("/onboarding");

  const userWeight = profile.weightKg ?? 65;
  const completions = await getRecentExerciseCompletions(90);
  const done = completions.filter((c) => c.status === "done");
  const s = computeScore(
    done.map((c) => ({
      forDate: c.forDate,
      sets: c.sets,
      reps: c.reps,
      weightKg: c.weightKg,
    })),
    userWeight,
  );

  // 부위별 운동량 기반 누적 (volume × decay)
  const todayEpoch = ymdToEpochDay(seoulYmd());
  const regionPoints = Object.fromEntries(
    REGIONS.map((r) => [r, 0]),
  ) as Record<BodyRegion, number>;
  for (const c of done) {
    if (!c.focus) continue;
    const regs = FOCUS_TO_REGIONS[c.focus];
    if (!regs) continue;
    const sets = c.sets ?? 1;
    const reps = c.reps ?? 10;
    const w = c.weightKg ?? userWeight;
    const volume = sets * reps * Math.max(0, w);
    const age = Math.max(0, todayEpoch - ymdToEpochDay(c.forDate));
    const pts = (volume / 200) * Math.pow(0.5, age / 14);
    for (const r of regs) regionPoints[r] += pts;
  }
  const maxRegion = Math.max(...REGIONS.map((r) => regionPoints[r]));
  const regionStatus = Object.fromEntries(
    REGIONS.map((r) => [r, balanceStatusFor(regionPoints[r], maxRegion)]),
  ) as Record<BodyRegion, BalanceStatus>;
  const regionColors = Object.fromEntries(
    REGIONS.map((r) => [r, BALANCE_COLOR[regionStatus[r]]]),
  ) as Record<BodyRegion, string>;

  // 21일 미니 캘린더 — 그 날 한 개라도 완료
  const todayYmd = seoulYmd();
  const [yy, mm, dd] = todayYmd.split("-").map(Number);
  const todayMs = Date.UTC(yy, mm - 1, dd);
  const doneDates = new Set(done.map((c) => c.forDate));
  const grid = Array.from({ length: 21 }, (_, i) => {
    const d = new Date(todayMs - (20 - i) * 86_400_000);
    const ymd = d.toISOString().slice(0, 10);
    return { ymd, day: d.getUTCDate(), done: doneDates.has(ymd) };
  });

  // 게이지
  const W = 220;
  const R = 92;
  const C = 110;
  const circ = 2 * Math.PI * R;
  const offset = circ * (1 - s.normalized / 100);

  // 밸런스 점수 — under 부위가 적을수록 좋음
  const underCount = REGIONS.filter((r) => regionStatus[r] === "under").length;
  const lowCount = REGIONS.filter((r) => regionStatus[r] === "low").length;
  const balancedCount = REGIONS.filter(
    (r) => regionStatus[r] === "balanced",
  ).length;

  return (
    <main className="mx-auto w-full max-w-3xl px-6 py-10 sm:px-8">
      <Link
        className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800"
        href="/settings"
      >
        <ChevronLeft aria-hidden="true" size={16} />
        설정
      </Link>

      <div className="mt-6 mb-6 space-y-1">
        <h1 className="text-2xl font-bold text-zinc-950">내 운동 점수</h1>
        <p className="text-sm leading-6 text-zinc-600">
          완료된 운동의 실제 운동량(세트×횟수×무게)을 누적합니다. 오래된
          기록일수록 가중치가 줄고(반감기 14일), 아래 마네킹은 부위 간 균형이
          깨진 곳을 보여줍니다.
        </p>
      </div>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <svg
            viewBox={`0 0 ${W} ${W}`}
            className="h-44 w-44 shrink-0"
            role="img"
            aria-label="운동 점수 게이지"
          >
            <circle cx={C} cy={C} r={R} fill="none" stroke="#e4e4e7" strokeWidth={14} />
            <circle
              cx={C}
              cy={C}
              r={R}
              fill="none"
              stroke="#059669"
              strokeWidth={14}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              transform={`rotate(-90 ${C} ${C})`}
            />
            <text x={C} y={C - 6} textAnchor="middle" fontSize={42} fontWeight={700} fill="#18181b">
              {s.score}
            </text>
            <text x={C} y={C + 22} textAnchor="middle" fontSize={12} fill="#71717a">
              점 · {s.normalized}%
            </text>
          </svg>

          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm leading-6 text-zinc-600">
              운동량 가중합계: <strong>{s.score}점</strong>
            </p>
            <p className="text-xs text-zinc-500">
              마지막 완료: {s.lastCompletedYmd ?? "—"} · 최근 7일{" "}
              {s.last7DayCount}일 활동
            </p>
            <p className="text-xs text-zinc-500">
              체중 기준: <strong>{userWeight}kg</strong>
              {profile.weightKg === null ? " (미입력 · 65kg 가정)" : ""}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard icon={<Flame size={18} />} label="연속" value={`${s.currentStreak}일`} tone="rose" />
          <MetricCard icon={<Trophy size={18} />} label="최장 연속" value={`${s.longestStreak}일`} tone="amber" />
          <MetricCard icon={<Activity size={18} />} label="최근 7일" value={`${s.last7DayCount}일`} tone="emerald" />
          <MetricCard icon={<Activity size={18} />} label="총 완료" value={`${s.totalCount}건`} tone="indigo" />
        </div>

        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            최근 21일 활동
          </p>
          <div className="grid grid-cols-7 gap-1.5">
            {grid.map((cell) => (
              <div
                key={cell.ymd}
                title={cell.ymd}
                className={`flex h-9 items-center justify-center rounded-md text-[11px] font-semibold ${
                  cell.done ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-400"
                }`}
              >
                {cell.day}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 부위별 밸런스 마네킹 */}
      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-base font-bold text-zinc-950">부위별 밸런스</h2>
        <p className="mb-4 text-xs text-zinc-500">
          가장 강한 부위 대비 비율 — <strong>균형 ≥70%</strong>,{" "}
          <strong>부족 40~70%</strong>, <strong>심하게 부족 &lt;40%</strong>.
          빨간 부위를 보강하면 균형이 잡힙니다.
        </p>

        <div className="flex flex-col gap-6 md:flex-row">
          <div className="flex flex-col items-center gap-3">
            <Mannequin colors={regionColors} />
            <div className="flex items-center gap-3 text-[11px] text-zinc-600">
              <Legend color={BALANCE_COLOR.balanced} label="균형" />
              <Legend color={BALANCE_COLOR.low} label="부족" />
              <Legend color={BALANCE_COLOR.under} label="심하게 부족" />
            </div>
          </div>

          <div className="grid flex-1 grid-cols-2 gap-2 self-start">
            {REGIONS.map((r) => (
              <div
                key={r}
                className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-zinc-500">
                    {REGION_LABEL[r]}
                  </p>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                    style={{ backgroundColor: BALANCE_COLOR[regionStatus[r]] }}
                  >
                    {BALANCE_LABEL[regionStatus[r]]}
                  </span>
                </div>
                <p className="mt-1 text-xl font-bold text-zinc-950">
                  {Math.round(regionPoints[r])}
                  <span className="ml-1 text-xs font-medium text-zinc-500">
                    점
                  </span>
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${maxRegion > 0 ? Math.round((regionPoints[r] / maxRegion) * 100) : 0}%`,
                      backgroundColor: BALANCE_COLOR[regionStatus[r]],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-4 text-sm font-semibold text-zinc-700">
          밸런스 요약 — 균형 {balancedCount} · 부족 {lowCount} · 심하게 부족{" "}
          {underCount}
        </p>
      </section>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "rose" | "amber" | "emerald" | "indigo";
}) {
  const tones = {
    rose: { bg: "bg-rose-100", text: "text-rose-700" },
    amber: { bg: "bg-amber-100", text: "text-amber-700" },
    emerald: { bg: "bg-emerald-100", text: "text-emerald-700" },
    indigo: { bg: "bg-indigo-100", text: "text-indigo-700" },
  } as const;
  const t = tones[tone];
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 items-center justify-center rounded-md ${t.bg} ${t.text}`}>
          {icon}
        </span>
        <p className="text-xs font-semibold text-zinc-500">{label}</p>
      </div>
      <p className="mt-1.5 text-xl font-bold text-zinc-950">{value}</p>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="h-2.5 w-2.5 rounded"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
