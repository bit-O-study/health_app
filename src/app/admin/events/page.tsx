import { getAppEvents } from "@/features/admin/app-events";
import {
  APP_EVENT_LABEL,
  APP_EVENT_RETENTION_DAYS,
  isAppEventKind,
  type AppEventGroup,
  type AppEventRow,
} from "@/lib/observability/app-event";

export const dynamic = "force-dynamic";

/**
 * 실사용 오류 현황 — 로드맵 1.3.
 *
 * "폰에서 팅긴다"는 말만 있고 근거가 없던 게 이 화면을 만든 이유다. 종류·화면·버전·
 * 기기 네 축으로 나눠 본다. 한 축만 봐서는 원인이 안 잡힌다 — 특정 기기만인지,
 * 특정 배포부터인지, 특정 화면에서만인지가 서로 다른 답으로 이어지기 때문이다.
 */
export default async function AdminEventsPage() {
  // 레이아웃(admin/layout.tsx)에서 isAdminUser 게이트 — 여기선 데이터만 로드.
  const { summary, recent, lookbackDays } = await getAppEvents();
  const empty = summary.total === 0;

  return (
    <main className="mx-auto w-full max-w-5xl px-6 py-10 sm:px-8">
      <h1 className="mb-1 text-2xl font-bold text-zinc-950 dark:text-zinc-100">
        실사용 오류
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-400">
        최근 {lookbackDays}일 기준 · 보존 {APP_EVENT_RETENTION_DAYS}일 · 전체{" "}
        {summary.total}건(오류 {summary.errors} / 경고{" "}
        {summary.total - summary.errors})
      </p>

      {empty ? (
        <p className="rounded-xl border border-zinc-200 bg-white px-4 py-6 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          아직 기록이 없습니다. 아무 일도 없었거나, 이 기능 배포 전 사용분입니다.
        </p>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <GroupCard title="종류별" groups={summary.byKind} showSample />
            <GroupCard title="화면별" groups={summary.byRoute} />
            <GroupCard title="버전별 (플랫폼 · 빌드)" groups={summary.byVersion} />
            <GroupCard title="기기별" groups={summary.byDevice} />
          </div>

          <h2 className="mb-2 mt-8 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
            최근 발생
          </h2>
          <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
            <table className="w-full min-w-[48rem] text-left text-sm">
              <thead className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                <tr>
                  <th className="px-3 py-2 font-medium">시각</th>
                  <th className="px-3 py-2 font-medium">종류</th>
                  <th className="px-3 py-2 font-medium">화면</th>
                  <th className="px-3 py-2 font-medium">기기</th>
                  <th className="px-3 py-2 font-medium">버전</th>
                  <th className="px-3 py-2 font-medium">횟수</th>
                  <th className="px-3 py-2 font-medium">내용</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((r, i) => (
                  <tr
                    key={`${r.kind}-${r.occurred_at}-${i}`}
                    className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
                  >
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-400">
                      {formatSeoul(r.occurred_at)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <KindChip row={r} />
                    </td>
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                      {r.route || "-"}
                    </td>
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                      {r.device || "-"}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-zinc-600 dark:text-zinc-400">
                      {r.platform} · {r.app_version || "-"}
                    </td>
                    <td className="px-3 py-2 text-zinc-600 dark:text-zinc-400">
                      {r.count}
                      {r.value !== null ? (
                        <span className="text-zinc-400"> ({r.value})</span>
                      ) : null}
                    </td>
                    <td className="max-w-[20rem] truncate px-3 py-2 text-zinc-500 dark:text-zinc-400">
                      {r.message || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-500">
        수집 내용에는 이메일·토큰·식별자가 남지 않습니다(자리표시자로 치환).
        사용자가 쓴 글·메모는 애초에 수집하지 않습니다.
      </p>
    </main>
  );
}

function GroupCard({
  title,
  groups,
  showSample = false,
}: {
  title: string;
  groups: AppEventGroup[];
  /** 종류별 카드에서만 대표 메시지를 같이 보여준다(다른 축은 줄이 길어진다). */
  showSample?: boolean;
}) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </h2>
      {groups.length === 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">기록 없음</p>
      ) : (
        <ul className="space-y-1.5">
          {groups.slice(0, 8).map((g) => (
            <li key={g.key} className="text-xs">
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate font-medium text-zinc-800 dark:text-zinc-200">
                  {g.label}
                </span>
                <span className="shrink-0 text-zinc-500 dark:text-zinc-400">
                  {g.total}건
                  {g.errors > 0 ? (
                    <span className="text-rose-600 dark:text-rose-400">
                      {" "}
                      · 오류 {g.errors}
                    </span>
                  ) : null}
                </span>
              </div>
              {showSample && g.sample ? (
                <p className="truncate text-[11px] text-zinc-500 dark:text-zinc-500">
                  {g.sample}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function KindChip({ row }: { row: AppEventRow }) {
  const label = isAppEventKind(row.kind) ? APP_EVENT_LABEL[row.kind] : row.kind;
  const tone =
    row.severity === "error"
      ? "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
      : "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
      {label}
    </span>
  );
}

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
