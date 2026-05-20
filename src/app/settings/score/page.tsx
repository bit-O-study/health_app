import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, ChevronLeft, Flame, Trophy } from "lucide-react";

import { getUserProfile } from "@/features/profile/data-access";
import { getRecentExerciseCompletions } from "@/features/routine/exercise-completions";
import { computeScore } from "@/features/routine/score";
import { seoulYmd } from "@/features/routine/data";
import {
  Mannequin,
  REGION_LABEL,
  type BodyRegion,
} from "@/features/routine/components/mannequin";

export const dynamic = "force-dynamic";

const FOCUS_TO_REGIONS: Record<string, BodyRegion[]> = {
  chest: ["chest"],
  back: ["back"],
  shoulder: ["shoulder"],
  arm: ["arm"],
  lower: ["leg"],
  core: ["core"],
  push: ["chest", "shoulder", "arm"],
  pull: ["back", "arm"],
  fullbody: ["chest", "back", "leg", "shoulder", "core"],
  upper: ["chest", "back", "shoulder", "arm"],
};

const REGIONS: BodyRegion[] = ["chest", "back", "shoulder", "arm", "leg", "core"];

function ymdToEpochDay(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Math.floor(Date.UTC(y, m - 1, d) / 86_400_000);
}

export default async function ScorePage() {
  const profile = await getUserProfile();
  if (!profile) redirect("/onboarding");

  const completions = await getRecentExerciseCompletions(90);
  const done = completions.filter((c) => c.status === "done");

  const s = computeScore(done);

  // 부위별 가중 점수 계산
  const todayEpoch = ymdToEpochDay(seoulYmd());
  const regionPoints = Object.fromEntries(
    REGIONS.map((r) => [r, 0]),
  ) as Record<BodyRegion, number>;
  for (const c of done) {
    if (!c.focus) continue;
    const regs = FOCUS_TO_REGIONS[c.focus];
    if (!regs) continue;
    const age = Math.max(0, todayEpoch - ymdToEpochDay(c.forDate));
    const pts = 2 * Math.pow(0.5, age / 14);
    for (const r of regs) regionPoints[r] += pts;
  }
  const REGION_CAP = 30; // 부위별 0..100 정규화 기준
  const regionNorm = Object.fromEntries(
    REGIONS.map((r) => [
      r,
      Math.min(100, Math.round((regionPoints[r] / REGION_CAP) * 100)),
    ]),
  ) as Record<BodyRegion, number>;

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
  const grade =
    s.normalized >= 80
      ? { label: "최상", color: "text-emerald-700" }
      : s.normalized >= 60
        ? { label: "양호", color: "text-emerald-600" }
        : s.normalized >= 40
          ? { label: "보통", color: "text-amber-600" }
          : s.normalized >= 20
            ? { label: "주의", color: "text-orange-600" }
            : { label: "낮음", color: "text-rose-600" };

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
          완료된 운동만 합산하고 오래된 기록일수록 가중치가 줄어듭니다(반감기
          14일). 부위별 발달도는 아래 마네킹과 카드에서 확인하세요.
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
            <p className={`text-sm font-bold uppercase tracking-wide ${grade.color}`}>
              종합 등급 · {grade.label}
            </p>
            <p className="text-sm leading-6 text-zinc-600">
              완료 운동 가중합계: <strong>{s.score}점</strong>
            </p>
            <p className="text-xs text-zinc-500">
              마지막 완료: {s.lastCompletedYmd ?? "—"} · 최근 7일 {s.last7DayCount}일 활동
            </p>
          </div>
        </div>

        {/* 서브 지표 */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <MetricCard icon={<Flame size={18} />} label="연속" value={`${s.currentStreak}일`} tone="rose" />
          <MetricCard icon={<Trophy size={18} />} label="최장 연속" value={`${s.longestStreak}일`} tone="amber" />
          <MetricCard icon={<Activity size={18} />} label="최근 7일" value={`${s.last7DayCount}일`} tone="emerald" />
          <MetricCard icon={<Activity size={18} />} label="총 완료" value={`${s.totalCount}건`} tone="indigo" />
        </div>

        {/* 21일 미니 캘린더 */}
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
          <p className="mt-2 text-[11px] text-zinc-400">
            초록 = 그 날 운동 완료 · 회색 = 미완료
          </p>
        </div>
      </section>

      {/* 부위별 발달도 (마네킹) */}
      <section className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-base font-bold text-zinc-950">부위별 발달도</h2>

        <div className="flex flex-col gap-6 md:flex-row">
          <Mannequin scores={regionNorm} />

          <div className="grid flex-1 grid-cols-2 gap-2 self-start">
            {REGIONS.map((r) => (
              <div
                key={r}
                className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm"
              >
                <p className="text-xs font-semibold text-zinc-500">
                  {REGION_LABEL[r]}
                </p>
                <p className="mt-1 text-xl font-bold text-zinc-950">
                  {regionNorm[r]}
                  <span className="ml-1 text-xs font-medium text-zinc-500">
                    %
                  </span>
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${regionNorm[r]}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="mt-4 text-[11px] text-zinc-400">
          점수 계산: 완료 1회 = 2점에서 시작, <strong>0.5^(지난일수/14)</strong>
          가중치로 감쇠한 합. 부위별 정규화 기준은 30점.
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
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-md ${t.bg} ${t.text}`}
        >
          {icon}
        </span>
        <p className="text-xs font-semibold text-zinc-500">{label}</p>
      </div>
      <p className="mt-1.5 text-xl font-bold text-zinc-950">{value}</p>
    </div>
  );
}
