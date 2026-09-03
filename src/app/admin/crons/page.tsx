import { getCronRuns } from "@/features/admin/cron-runs";
import {
  formatDuration,
  formatSuccessRate,
  type CronRunSummary,
} from "@/lib/cron/run-log";

export const dynamic = "force-dynamic";

const CRON_LABEL: Record<string, string> = {
  "daily-reminders": "하루 리마인더 (매일 20시)",
  "weekly-group-mvp": "주간 그룹 MVP (월요일)",
  "workout-inactivity": "운동 무활동 감지 (10분마다)",
};

const STATUS_LABEL: Record<string, string> = {
  ok: "정상",
  skipped: "건너뜀",
  error: "실패",
};

/** 크론 실행 현황 — 돌긴 도는지, 몇 명에게 갔는지, 왜 죽었는지. */
export default async function AdminCronsPage() {
  // 레이아웃(admin/layout.tsx)에서 isAdminUser 게이트 — 여기선 데이터만 로드.
  const { summaries, recent, lookbackDays } = await getCronRuns();

  return (
    <main className="mx-auto w-full max-w-4xl px-6 py-10 sm:px-8">
      <h1 className="mb-1 text-2xl font-bold text-zinc-950 dark:text-zinc-100">
        크론 실행
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        최근 {lookbackDays}일 기준 · 실행 {recent.length > 0 ? "기록 있음" : "기록 없음"}
      </p>

      <div className="mb-8 grid gap-3">
        {summaries.map((s) => (
          <CronCard key={s.name} summary={s} />
        ))}
      </div>

      <h2 className="mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
        최근 실행
      </h2>
      {recent.length === 0 ? (
        <p className="rounded-xl border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          아직 기록이 없습니다. 크론이 한 번도 실행되지 않았거나, 이 기능 배포 전
          실행분입니다.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              <tr>
                <th className="px-3 py-2 font-medium">시각</th>
                <th className="px-3 py-2 font-medium">크론</th>
                <th className="px-3 py-2 font-medium">상태</th>
                <th className="px-3 py-2 font-medium">소요</th>
                <th className="px-3 py-2 font-medium">발송</th>
                <th className="px-3 py-2 font-medium">중복제외</th>
                <th className="px-3 py-2 font-medium">사유</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((r, i) => (
                <tr
                  key={`${r.name}-${r.started_at}-${i}`}
                  className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                >
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {formatSeoul(r.started_at)}
                  </td>
                  <td className="px-3 py-2 text-zinc-800 dark:text-zinc-200">
                    {r.name}
                  </td>
                  <td className="px-3 py-2">
                    <StatusChip status={r.status} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {formatDuration(r.duration_ms)}
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {r.sent}
                    {r.failed > 0 ? (
                      <span className="text-rose-600 dark:text-rose-400">
                        {" "}
                        (실패 {r.failed})
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                    {r.deduped}
                  </td>
                  <td className="max-w-[16rem] truncate px-3 py-2 text-zinc-500 dark:text-zinc-400">
                    {r.reason ?? "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function CronCard({ summary: s }: { summary: CronRunSummary }) {
  const neverRan = s.runs === 0;
  return (
    <section
      className={`rounded-xl border px-4 py-3 ${
        neverRan
          ? "border-amber-300 bg-amber-50 dark:border-amber-700/60 dark:bg-amber-950/30"
          : s.errors > 0
            ? "border-rose-300 bg-rose-50 dark:border-rose-800/60 dark:bg-rose-950/30"
            : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
      }`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          {CRON_LABEL[s.name] ?? s.name}
        </h2>
        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {neverRan
            ? "실행 기록 없음"
            : `마지막 ${formatSeoul(s.lastRunAt)} · ${STATUS_LABEL[s.lastStatus ?? ""] ?? s.lastStatus}`}
        </span>
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-zinc-600 sm:grid-cols-4 dark:text-zinc-400">
        <Stat label="성공률" value={formatSuccessRate(s.successRate)} />
        <Stat label="실행" value={`${s.runs}회`} />
        <Stat label="평균 소요" value={formatDuration(s.avgMs)} />
        <Stat label="최대 소요" value={formatDuration(s.maxMs)} />
        <Stat label="발송" value={`${s.sent}건`} />
        <Stat label="중복 제외" value={`${s.deduped}건`} />
        <Stat label="발송 실패" value={`${s.failed}건`} />
        <Stat label="건너뜀" value={`${s.skipped}회`} />
      </dl>
      {s.lastFailure ? (
        <p className="mt-2 text-xs text-rose-700 dark:text-rose-300">
          최근 실패 {formatSeoul(s.lastFailure.at)} — {s.lastFailure.reason}
        </p>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2 sm:block">
      <dt className="text-zinc-500 dark:text-zinc-500">{label}</dt>
      <dd className="font-medium text-zinc-800 dark:text-zinc-200">{value}</dd>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const tone =
    status === "error"
      ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
      : status === "skipped"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tone}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

/** KST 표기(서버가 UTC 라도 한국 시각으로 보이게). */
function formatSeoul(iso: string | null): string {
  if (!iso) return "-";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(t));
}
