import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getUserProfile } from "@/features/profile/data-access";
import { getLatestBodyComposition } from "@/features/body-composition/data-access";
import { regionScoresFromBodyComp } from "@/features/body-composition/data";
import { getRecentExerciseCompletions } from "@/features/routine/exercise-completions";
import {
  balanceStatusFor,
  BALANCE_COLOR,
  BALANCE_LABEL,
  computeScore,
  hasRegionTraining,
  hasSubMuscleTraining,
  regionPointsFromTraining,
  subMusclePointsFromTraining,
  type BalanceStatus,
} from "@/features/routine/score";
import {
  ALL_SUB_MUSCLES,
  SUB_MUSCLES,
} from "@/features/routine/muscle-detail";
import {
  MUSCLE_ORDER,
  muscleGroup,
} from "@/features/routine/muscle-map";
import { seoulYmd } from "@/features/routine/data";
import {
  REGION_LABEL,
  type BodyRegion,
} from "@/features/routine/components/mannequin";
import { MuscleBalance3D } from "@/features/routine/components/muscle-balance-3d";
import { WeeklyTrainingCard } from "@/features/routine/components/weekly-training-card";
import { buildWeeklyTrainingView } from "@/features/routine/weekly-training-view";
import {
  VOLUME_COLOR,
  VOLUME_LABEL,
  WEEKLY_SET_MAX,
  WEEKLY_SET_MIN,
  volumeStatusFor,
} from "@/features/routine/training-volume";

export const dynamic = "force-dynamic";

const REGIONS: BodyRegion[] = [
  "chest",
  "back",
  "shoulder",
  "arm",
  "leg",
  "core",
];

export default async function ScorePage() {
  // 독립 쿼리 병렬화 — profile 만 redirect 판단에 필요하고 나머지는 의존성 없음.
  const [profile, bodyComp, completions] = await Promise.all([
    getUserProfile(),
    getLatestBodyComposition(),
    getRecentExerciseCompletions(90),
  ]);
  if (!profile) redirect("/onboarding");

  const userWeight = profile.weightKg ?? 65;
  const done = completions.filter((c) => c.status === "done");
  const s = computeScore(
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

  // 이번 주 훈련(주당 직접 세트 기준) — 트레이너의 회원 화면과 **같은 판정**을 쓴다.
  // 아래 마네킹·부위 카드 색이 이 값을 따라가므로 먼저 계산한다.
  const todayYmdForWeek = seoulYmd();
  const weekly = buildWeeklyTrainingView(
    done.map((c) => ({
      forDate: c.forDate,
      exerciseId: c.exerciseId,
      focus: c.focus,
      sets: c.sets,
      // 정체 판정에 필요한 값들 — 안 넘기면 "무게가 안 오르는 종목"이 항상 비어 있다.
      reps: c.reps,
      weightKg: c.weightKg,
      equipment: c.equipment,
      // 드롭세트·피라미드는 여기 길이가 진짜 세트 수다.
      setDetails: c.setDetails,
    })),
    todayYmdForWeek,
    profile.experience,
  );
  const weeklyByRegion = Object.fromEntries(
    weekly.regions.map((r) => [r.region, r]),
  ) as Record<BodyRegion, (typeof weekly.regions)[number]>;

  // 부위별 누적 — 운동 기록이 있으면 운동량 기반을 우선(완료한 운동이 반영되도록),
  // 운동 기록이 없을 때만 체성분 분석값으로 fallback.
  const trainingRegion = regionPointsFromTraining(
    done.map((c) => ({
      forDate: c.forDate,
      focus: c.focus,
      sets: c.sets,
      reps: c.reps,
      weightKg: c.weightKg,
      // 드롭세트·피라미드는 여기에 있다 — 안 넘기면 균일 세트로만 세어 운동량이 틀어진다.
      setDetails: c.setDetails,
    })),
    userWeight,
  );
  let regionPoints: Record<BodyRegion, number>;
  let balanceSource: "body" | "training";
  if (hasRegionTraining(trainingRegion)) {
    regionPoints = trainingRegion;
    balanceSource = "training";
  } else if (bodyComp) {
    regionPoints = regionScoresFromBodyComp(bodyComp);
    balanceSource = "body";
  } else {
    regionPoints = Object.fromEntries(REGIONS.map((r) => [r, 0])) as Record<
      BodyRegion,
      number
    >;
    balanceSource = "training";
  }
  const maxRegion = Math.max(...REGIONS.map((r) => regionPoints[r]));
  const regionStatus = Object.fromEntries(
    REGIONS.map((r) => [r, balanceStatusFor(regionPoints[r], maxRegion)]),
  ) as Record<BodyRegion, BalanceStatus>;
  // 🔴 마네킹 색은 **이번 주 직접 세트(절대 기준)** 로 칠한다.
  //    예전엔 '내 최강 부위 대비 비율' 이라, 카드에 "6세트(부족)" 라고 쓰여 있는데
  //    마네킹은 초록(균형)으로 보이는 일이 생겼다 — 한 화면이 두 말을 하면 안 된다.
  //    운동 기록이 없어 체성분으로 떨어질 때만 예전 상대 기준을 쓴다.
  const regionColors = Object.fromEntries(
    REGIONS.map((r) => [
      r,
      balanceSource === "training"
        ? VOLUME_COLOR[volumeStatusFor(weeklyByRegion[r]?.sets ?? 0)]
        : BALANCE_COLOR[regionStatus[r]],
    ]),
  ) as Record<BodyRegion, string>;

  // 세부근육 단위 밸런스 — 완료한 운동(exercise_id)을 세부근육에 균등 배분.
  // 운동 기록이 있을 때만 의미 있음(체성분 기반일 땐 세부 분포가 없음).
  const subPoints = subMusclePointsFromTraining(
    done.map((c) => ({
      forDate: c.forDate,
      exerciseId: c.exerciseId,
      sets: c.sets,
      reps: c.reps,
      weightKg: c.weightKg,
      // 드롭세트·피라미드는 여기에 있다 — 안 넘기면 균일 세트로만 세어 운동량이 틀어진다.
      setDetails: c.setDetails,
    })),
    userWeight,
  );
  const hasSub = hasSubMuscleTraining(subPoints);
  // 🔴 세부근육 칩은 **이번 주 세 단계**로만 칠한다(주동근으로 함 / 거들기만 / 안 함).
  //    예전엔 '최강 세부근육 대비 비율' 이었는데, 세부근육마다 걸리는 운동 수가 13배까지
  //    달라서(상복부 254 ↔ 하복부 19) 그 비율은 내 훈련이 아니라 매핑의 치우침이었다.
  const untouchedThisWeek = new Set(weekly.untouchedSubs.map((u) => u.id));
  const synergistOnly = new Set(weekly.synergistOnlySubs.map((u) => u.id));
  function subTier(id: string): "primary" | "synergist" | "none" {
    if (untouchedThisWeek.has(id)) return "none";
    return synergistOnly.has(id) ? "synergist" : "primary";
  }
  const SUB_TIER_COLOR = {
    primary: VOLUME_COLOR.optimal,
    synergist: VOLUME_COLOR.low,
    none: VOLUME_COLOR.none,
  } as const;
  const SUB_TIER_LABEL = {
    primary: "직접 함",
    synergist: "거들기만",
    none: "안 함",
  } as const;
  // 🔴 세부근육은 **이번 주 했나/안 했나**로만 칠한다.
  //    세트 수끼리 비교하면 내 훈련이 아니라 매핑의 치우침을 보게 된다 —
  //    1,351개 중 명시 매핑이 114개뿐이라 세부근육마다 걸리는 운동 수가 13배 차이다
  //    (상복부 254 ↔ 하복부 19). 0이냐 아니냐는 그 치우침과 무관하게 참이다.
  const subColors: Record<string, string> | undefined = hasSub
    ? (Object.fromEntries(
        ALL_SUB_MUSCLES.map((s) => [s.id, SUB_TIER_COLOR[subTier(s.id)]]),
      ) as Record<string, string>)
    : undefined;

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

  // 공통 머리글 + 요약 한 장 + 섹션 라벨·카드(2026-09-16 8단계) — 긴 설명 문단·색 칩은 뺐다.
  return (
    <div className="app-page">
      <PageHeader title="내 운동 점수" back="설정" />
      <main className="app-container space-y-4">
        <section className="app-card p-3">
          <div className="flex items-center gap-4">
            <svg
              viewBox={`0 0 ${W} ${W}`}
              className="h-28 w-28 shrink-0 text-zinc-950 dark:text-zinc-50"
              role="img"
              aria-label="운동 점수 게이지"
            >
              <circle cx={C} cy={C} r={R} fill="none" stroke="var(--line)" strokeWidth={16} />
              <circle
                cx={C}
                cy={C}
                r={R}
                fill="none"
                stroke="var(--brand)"
                strokeWidth={16}
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${C} ${C})`}
              />
              <text x={C} y={C + 4} textAnchor="middle" fontSize={48} fontWeight={700} fill="currentColor">
                {s.score}
              </text>
              <text x={C} y={C + 36} textAnchor="middle" fontSize={20} fill="var(--muted)">
                점 · {s.normalized}%
              </text>
            </svg>

            <div className="min-w-0 flex-1 space-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              <p className="truncate">마지막 완료 {s.lastCompletedYmd ?? "—"}</p>
              <p className="truncate">
                체중 기준 {userWeight}kg{profile.weightKg === null ? " (65kg 가정)" : ""}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-4 divide-x divide-[var(--line)] border-t border-[var(--line)] pt-2.5 text-center">
            <Stat label="연속" value={`${s.currentStreak}일`} />
            <Stat label="최장 연속" value={`${s.longestStreak}일`} />
            <Stat label="최근 7일" value={`${s.last7DayCount}일`} />
            <Stat label="총 완료" value={`${s.totalCount}건`} />
          </div>

          <p className="mb-1.5 mt-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400">최근 21일 활동</p>
          <div className="grid grid-cols-7 gap-1">
            {grid.map((cell) => (
              <div
                key={cell.ymd}
                title={cell.ymd}
                className={`flex h-7 items-center justify-center rounded-md text-xs font-semibold tabular-nums ${
                  cell.done
                    ? "bg-brand text-white dark:text-zinc-950"
                    : "bg-zinc-100 text-zinc-400 dark:bg-white/[0.06] dark:text-zinc-500"
                }`}
              >
                {cell.day}
              </div>
            ))}
          </div>
        </section>

        {/* 이번 주 훈련 — 요일 히트맵 + 부위별 주당 세트 + 균형 경고 */}
        <WeeklyTrainingCard
          weekStart={weekly.weekStart}
          todayYmd={weekly.todayYmd}
          cells={weekly.cells}
          regions={weekly.regions}
          pushPull={weekly.pushPull}
          upperLower={weekly.upperLower}
          untouchedSubs={weekly.untouchedSubs}
          synergistOnlySubs={weekly.synergistOnlySubs}
          stalled={weekly.stalled}
        />

        {/* 부위별 밸런스 마네킹 — E2E 가 이 <section>(글자 "부위별 밸런스") 안에서 배지·점수·토글을 찾는다. */}
        <section>
          <div className="flex items-center gap-1.5">
            <h2 className="app-section-label">부위별 밸런스</h2>
            <span
              className={`mb-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                balanceSource === "body"
                  ? "bg-brand-soft text-brand"
                  : "bg-zinc-100 text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-400"
              }`}
            >
              {balanceSource === "body" ? "체성분 기반" : "운동량 기반"}
            </span>
          </div>
          <div className="app-card p-3">
            <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
              {balanceSource === "training"
                ? `이번 주 직접 세트 ${WEEKLY_SET_MIN}~${WEEKLY_SET_MAX} = ${VOLUME_LABEL.optimal}`
                : "가장 강한 부위 대비 비율"}
              <Link href="/settings/body-composition" className="ml-1.5 font-semibold text-brand">
                {balanceSource === "body" ? "체성분 갱신" : "체성분 등록"}
              </Link>
            </p>

            <div className="flex flex-col gap-4 md:flex-row">
              <div className="flex flex-col items-center gap-2">
                <div className="w-full sm:w-72">
                  <MuscleBalance3D
                    gender={profile.gender}
                    colors={regionColors}
                    subColors={subColors}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-600 dark:text-zinc-400">
                  {balanceSource === "training" ? (
                    <>
                      <Legend color={VOLUME_COLOR.optimal} label={VOLUME_LABEL.optimal} />
                      <Legend color={VOLUME_COLOR.low} label={VOLUME_LABEL.low} />
                      <Legend color={VOLUME_COLOR.high} label={VOLUME_LABEL.high} />
                      <Legend color={VOLUME_COLOR.none} label={VOLUME_LABEL.none} />
                    </>
                  ) : (
                    <>
                      <Legend color={BALANCE_COLOR.balanced} label="균형" />
                      <Legend color={BALANCE_COLOR.low} label="부족" />
                      <Legend color={BALANCE_COLOR.under} label="심하게 부족" />
                    </>
                  )}
                </div>
              </div>

              {/* 운동 기록이 있으면 부위별 이번 주 세트는 위 카드가 이미 보여준다 —
                  여기서 또 그리면 같은 화면에 같은 표가 둘이 된다. 대신 성격이 다른 값
                  (90일 누적, 반감기 14일)을 짧게 곁들인다. 체성분 기반일 때만 예전 표를 쓴다. */}
              {balanceSource === "training" ? (
                <div className="flex-1 self-start">
                  <p className="mb-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    90일 누적 점수
                  </p>
                  <ul className="space-y-1.5">
                    {REGIONS.map((r) => (
                      <li key={r} className="flex items-center gap-2">
                        <span className="w-10 shrink-0 text-xs text-zinc-600 dark:text-zinc-300">
                          {REGION_LABEL[r]}
                        </span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.08]">
                          <span
                            className="block h-full rounded-full"
                            style={{
                              width: `${maxRegion > 0 ? Math.round((regionPoints[r] / maxRegion) * 100) : 0}%`,
                              backgroundColor: regionColors[r],
                            }}
                          />
                        </span>
                        <span className="w-14 shrink-0 text-right text-xs font-semibold tabular-nums text-zinc-700 dark:text-zinc-200">
                          {Math.round(regionPoints[r])}점
                        </span>
                        <span className="w-12 shrink-0 text-right text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                          {weeklyByRegion[r]?.sets ?? 0}세트
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="grid flex-1 grid-cols-2 gap-2 self-start">
                  {REGIONS.map((r) => (
                    <div key={r} className="rounded-[10px] bg-zinc-50 p-2.5 dark:bg-white/[0.04]">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                          {REGION_LABEL[r]}
                        </p>
                        <span
                          className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                          style={{ backgroundColor: BALANCE_COLOR[regionStatus[r]] }}
                        >
                          {BALANCE_LABEL[regionStatus[r]]}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xl font-bold tabular-nums text-zinc-950 dark:text-zinc-100">
                        {Math.round(regionPoints[r])}
                        <span className="ml-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          점
                        </span>
                      </p>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-white/[0.08]">
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
              )}
            </div>

            <p className="mt-3 text-sm text-zinc-700 dark:text-zinc-300">
              {balanceSource === "training" ? (
                <>
                  이번 주 — {VOLUME_LABEL.optimal}{" "}
                  {weekly.regions.filter((r) => r.status === "optimal").length} ·{" "}
                  {VOLUME_LABEL.low}{" "}
                  {weekly.regions.filter((r) => r.status === "low").length} ·{" "}
                  {VOLUME_LABEL.none}{" "}
                  {weekly.regions.filter((r) => r.status === "none").length}
                </>
              ) : (
                <>
                  균형 {balancedCount} · 부족 {lowCount} · 심하게 부족 {underCount}
                </>
              )}
            </p>

            {/* 세부근육 분포 — 같은 부위라도 어느 갈래를 직접 노렸는지(운동 기록 기반).
                벤치프레스처럼 여러 갈래에 걸리는 운동은 주동근이 아닌 쪽을 거들기만으로 센다. */}
            {hasSub ? (
              <div className="mt-3 border-t border-[var(--line)] pt-3">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  세부근육 분포
                </p>
                <p className="mb-2 text-xs text-zinc-500 dark:text-zinc-400">
                  이번 주 직접 노렸는지 · 주동근이 아니면 거들기만
                </p>
                <div className="space-y-2">
                  {MUSCLE_ORDER.map((m) => (
                    <div key={m}>
                      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                        <span
                          aria-hidden
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: muscleGroup(m).color }}
                        />
                        {muscleGroup(m).label}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {SUB_MUSCLES[m].map((s) => (
                          <span
                            key={s.id}
                            className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-300"
                            data-sub-tier={subTier(s.id)}
                            title={`${s.label} · 이번 주 ${SUB_TIER_LABEL[subTier(s.id)]} · 누적 ${Math.round(subPoints[s.id] ?? 0)}점`}
                          >
                            <span
                              aria-hidden
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: SUB_TIER_COLOR[subTier(s.id)] }}
                            />
                            {s.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}

/** 요약 한 칸 — 라벨 위, 값 아래. */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-1">
      <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="mt-0.5 truncate text-base font-semibold tabular-nums text-zinc-950 dark:text-zinc-50">
        {value}
      </p>
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
