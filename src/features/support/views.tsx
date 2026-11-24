import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Headset, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { supportAccess, ticketDetail } from "./data";
import { CATEGORIES, STATUSES, type Ticket } from "./model";
import { DeleteAttachment, AttachmentForm, ReadSupport, RefreshSupport, ReplyForm } from "./forms";
// 회원 화면 전용. 문의 관리(관리자)는 통합 관리자 콘솔 /admin/health/support 에 있다.
export type Filters = { page?: string; status?: string; category?: string; q?: string };

const date = (value: string) => new Date(value).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
const control = "min-h-11 rounded-xl border border-line bg-[var(--surface-strong)] px-3 text-sm";

/** 상태별 색 — 해결/종료는 차분하게, 답변 대기는 눈에 띄게. */
const STATUS_TONE: Record<Ticket["status"], string> = {
  new: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  in_progress: "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
  waiting_user: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  resolved: "bg-brand-soft text-brand",
  closed: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
};
function StatusBadge({ status }: { status: Ticket["status"] }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_TONE[status]}`}>
      {STATUSES[status]}
    </span>
  );
}

export async function SupportList({ filters = {} }: { filters?: Filters }) {
  const { db, user } = await supportAccess();
  const page = Math.max(1, Math.min(1000, Number.parseInt(filters.page ?? "1") || 1));
  let query = db.from("support_tickets").select("*", { count: "exact" }).eq("user_id", user.id).order("updated_at", { ascending: false });
  if (filters.status && Object.hasOwn(STATUSES, filters.status)) query = query.eq("status", filters.status);
  if (filters.category && Object.hasOwn(CATEGORIES, filters.category)) query = query.eq("category", filters.category);
  const search = (filters.q ?? "").trim().slice(0, 100);
  if (search) {
    if (/^\d+$/.test(search)) query = query.eq("number", search);
    else query = query.ilike("title", `%${search.replace(/[%_\\]/g, "\\$&")}%`);
  }
  const { data, error, count } = await query.range((page - 1) * 20, page * 20 - 1);
  const unread = await db.from("support_tickets").select("id", { count: "exact", head: true }).is("user_read_at", null).eq("user_id", user.id);
  const href = (n: number) => `/support?${new URLSearchParams({ ...filters, page: String(n) })}`;
  const unreadCount = unread.count ?? 0;
  return (
    <div className="app-page">
      <PageHeader title="고객센터" back />
      <main className="app-container space-y-6">
        <Link href="/support/new" className="flex items-center gap-4 rounded-2xl bg-brand p-4 text-white shadow-sm transition active:opacity-90 dark:text-zinc-950">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/20 dark:bg-black/15">
            <Headset aria-hidden="true" size={22} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">버그·불편 신고 / 문의하기 →</span>
            <span className="mt-0.5 block text-sm opacity-85">불편했던 화면과 상황을 알려 주세요.</span>
          </span>
        </Link>

        <section aria-label="내 문의" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">
              내 문의 <span className="text-sm font-medium text-muted">{count ?? 0}건</span>
            </h2>
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <p className="rounded-full bg-brand px-2.5 py-0.5 text-xs font-semibold text-white dark:text-zinc-950">새 답변 {unreadCount}건</p>
              )}
              <RefreshSupport />
            </div>
          </div>
          <form className="flex flex-wrap gap-2">
            <div className="relative min-w-0 flex-1 basis-full sm:basis-auto">
              <Search aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input aria-label="문의 검색" className={`${control} w-full pl-9`} name="q" defaultValue={filters.q} placeholder="제목 또는 접수번호" />
            </div>
            <select aria-label="상태 필터" className={control} name="status" defaultValue={filters.status ?? ""}>
              <option value="">모든 상태</option>
              {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select aria-label="종류 필터" className={control} name="category" defaultValue={filters.category ?? ""}>
              <option value="">모든 종류</option>
              {Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <button className="min-h-11 rounded-xl border border-line bg-[var(--surface-strong)] px-4 text-sm font-semibold text-brand">검색</button>
          </form>

          {error ? (
            <p role="alert" className="py-6 text-center text-sm text-muted">문의 목록을 불러오지 못했어요.<br />잠시 후 다시 시도해 주세요.</p>
          ) : !data?.length ? (
            <p className="py-10 text-center text-sm text-muted">아직 문의가 없어요.</p>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-[var(--surface-strong)]">
              {(data as Ticket[]).map((t) => (
                <li key={t.id}>
                  <Link href={`/support/${t.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 transition active:bg-black/5 dark:active:bg-white/5">
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-xs text-muted">
                        <span>#{t.number}</span>
                        <span>{CATEGORIES[t.category]}</span>
                        {!t.user_read_at && <span className="font-semibold text-brand">새 소식</span>}
                      </span>
                      <span className="mt-0.5 block truncate font-semibold">{t.title}</span>
                      <span className="mt-0.5 block text-xs text-muted">{date(t.updated_at)}</span>
                    </span>
                    <StatusBadge status={t.status} />
                    <ChevronRight aria-hidden="true" size={18} className="shrink-0 text-muted" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {/* 문의가 없으면 "1페이지 · 0건" 을 숨긴다 — 바로 위 "아직 문의가 없어요" 와 겹친다. */}
          {(count ?? 0) > 0 ? (
            <nav aria-label="문의 페이지" className="flex items-center justify-between text-sm">
              {page > 1 ? <Link className="inline-flex min-h-11 items-center text-brand" href={href(page - 1)}>← 이전</Link> : <span />}
              <span className="text-muted">{page}페이지 · {count ?? 0}건</span>
              {page * 20 < (count ?? 0) ? <Link className="inline-flex min-h-11 items-center text-brand" href={href(page + 1)}>다음 →</Link> : <span />}
            </nav>
          ) : null}
        </section>

        <details className="group border-t border-line pt-4">
          <summary className="flex min-h-11 cursor-pointer items-center justify-between font-semibold">
            자주 묻는 질문
            <ChevronRight aria-hidden="true" size={18} className="text-muted transition group-open:rotate-90" />
          </summary>
          <p className="pb-2 pt-1 text-sm leading-relaxed text-muted">
            로그인이 안 되면 로그인 화면의 비밀번호 재설정을 이용해 주세요.<br />
            운동·식단 저장 문제는 발생한 화면과 시간을 함께 적어주시면 확인에 도움이 됩니다.
          </p>
        </details>
      </main>
    </div>
  );
}

export async function SupportDetail({ id, created = false }: { id: string; created?: boolean }) {
  const d = await ticketDetail(id);
  const t = d.ticket;
  return (
    <div className="app-page">
      <PageHeader title={`문의 #${t.number}`} back />
      <main className="app-container space-y-6">
        <ReadSupport id={id} />
        {created && (
          <p role="status" className="rounded-xl bg-brand-soft p-4 text-sm font-medium text-brand">
            문의가 접수됐어요.<br />필요한 사진을 아래에 첨부해 주세요.
          </p>
        )}
        <section className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted">
            <StatusBadge status={t.status} />
            <span>{CATEGORIES[t.category]}</span>
          </div>
          <h1 className="break-words text-xl font-bold">{t.title}</h1>
          <p className="text-xs text-muted">{date(t.created_at)}</p>
        </section>
        <section aria-label="문의 대화" className="space-y-3">
          {d.messages.map((m) => (
            <article key={m.id} className={`flex flex-col gap-1 ${m.is_admin ? "items-start" : "items-end"}`}>
              <div className="flex items-center gap-2 text-xs text-muted">
                <strong className="font-semibold">{m.is_admin ? "고객센터" : "나"}</strong>
                <span>{date(m.created_at)}</span>
              </div>
              <p
                className={`max-w-[88%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-base leading-relaxed ${
                  m.is_admin ? "rounded-tl-md bg-brand-soft" : "rounded-tr-md bg-[var(--surface-strong)] ring-1 ring-inset ring-[var(--line)]"
                }`}
              >
                {m.body}
              </p>
            </article>
          ))}
          {d.messages.length >= 200 && <p className="text-sm text-muted">대화가 많아 처음 200개를 표시합니다.<br />새 문의로 이어 주세요.</p>}
        </section>
        {!!d.attachments.length && (
          <section aria-label="첨부 사진" className="grid grid-cols-2 gap-3">
            {d.attachments.map((f) =>
              f.url ? (
                <div key={f.id}>
                  <a href={f.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-xl border border-line bg-[var(--surface-strong)]">
                    <Image unoptimized width={320} height={240} src={f.url} alt="문의 첨부 사진" className="h-40 w-full object-contain" />
                  </a>
                  <DeleteAttachment id={f.id} />
                </div>
              ) : (
                <p key={f.id} className="text-sm text-muted">사진을 불러오지 못했어요.</p>
              ),
            )}
          </section>
        )}
        {d.attachments.length < 3 && <section className="border-t border-line pt-5"><AttachmentForm id={id} /></section>}
        <section className="border-t border-line pt-5"><ReplyForm id={id} /></section>
        <Link className="flex min-h-11 items-center justify-center text-sm font-medium text-brand" href="/support">← 문의 목록으로</Link>
      </main>
    </div>
  );
}
