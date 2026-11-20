import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Lightbulb, MessageSquare, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { supportAccess, ticketDetail } from "./data";
import { CATEGORIES, STATUSES, type Ticket } from "./model";
import { DeleteAttachment, AttachmentForm, ReadSupport, RefreshSupport, ReplyForm } from "./forms";
// 회원 화면 전용. 문의 관리(관리자)는 통합 관리자 콘솔 /admin/health/support 에 있다.
export type Filters = { page?: string; status?: string; category?: string; q?: string };
const date = (value:string)=>new Date(value).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"});
export async function SupportList({filters={}}:{filters?:Filters}) {
  const {db,user}=await supportAccess();
  const page=Math.max(1,Math.min(1000,Number.parseInt(filters.page??"1")||1));
  let query=db.from("support_tickets").select("*",{count:"exact"}).eq("user_id",user.id).order("updated_at",{ascending:false});
  if(filters.status&&Object.hasOwn(STATUSES,filters.status))query=query.eq("status",filters.status);
  if(filters.category&&Object.hasOwn(CATEGORIES,filters.category))query=query.eq("category",filters.category);
  const search=(filters.q??"").trim().slice(0,100);
  if(search){if(/^\d+$/.test(search))query=query.eq("number",search);else query=query.ilike("title",`%${search.replace(/[%_\\]/g,"\\$&")}%`);}
  const {data,error,count}=await query.range((page-1)*20,page*20-1);
  const unread=await db.from("support_tickets").select("id",{count:"exact",head:true}).is("user_read_at",null).eq("user_id",user.id);
  const href=(n:number)=>`/support?${new URLSearchParams({...filters,page:String(n)})}`;
  const filtered = Boolean(search || filters.category || filters.status);
  const filterField = "app-field min-h-11 w-full min-w-0 rounded-xl border px-3 text-base";
  return <div className="app-page"><PageHeader title="고객센터" back/><main className="app-container space-y-7">
    <nav aria-label="문의 작성" className="grid gap-2 sm:grid-cols-2">
      <Link className="app-card flex min-h-16 items-center gap-3 px-4 py-3" href="/support/new?category=idea">
        <span className="rounded-xl bg-brand-soft p-2.5 text-brand"><Lightbulb size={22} aria-hidden="true"/></span>
        <span className="flex-1 text-lg font-bold">기능 개선 제안</span><ChevronRight size={18} className="text-muted" aria-hidden="true"/>
      </Link>
      <Link className="app-card flex min-h-16 items-center gap-3 px-4 py-3" href="/support/new">
        <span className="rounded-xl bg-foreground/5 p-2.5"><MessageSquare size={22} aria-hidden="true"/></span>
        <span className="flex-1 text-lg font-bold">불편·오류 문의</span><ChevronRight size={18} className="text-muted" aria-hidden="true"/>
      </Link>
    </nav>

    <section aria-labelledby="my-tickets" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="my-tickets" className="flex items-baseline gap-2 text-xl font-bold">내 문의
          {!!unread.count && <span className="text-sm font-semibold text-brand">읽지 않음 {unread.count}건</span>}
        </h2>
        <RefreshSupport/>
      </div>
      <details open={filtered || undefined} className="group">
        <summary className="flex min-h-11 w-fit cursor-pointer list-none items-center gap-2 text-sm font-semibold text-muted">
          <Search size={17} aria-hidden="true"/>문의 검색·필터<ChevronRight size={15} className="group-open:rotate-90" aria-hidden="true"/>
        </summary>
        <form className="app-card grid grid-cols-2 gap-3 p-4">
          <input aria-label="문의 검색" className={`${filterField} col-span-2`} name="q" defaultValue={filters.q} placeholder="제목 또는 접수번호"/>
          <select aria-label="상태 필터" className={filterField} name="status" defaultValue={filters.status??""}><option value="">모든 상태</option>{Object.entries(STATUSES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
          <select aria-label="종류 필터" className={filterField} name="category" defaultValue={filters.category??""}><option value="">모든 종류</option>{Object.entries(CATEGORIES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
          <div className="col-span-2 flex items-center justify-end gap-4">
            {filtered && <Link href="/support" className="text-sm underline">조건 지우기</Link>}
            <button className="app-action">검색</button>
          </div>
        </form>
      </details>
      {error ? <p role="alert">문의 목록을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p> :
        <div aria-label="문의 목록" role="region" className="space-y-3">
          {!data?.length && <p className="app-card p-5 text-muted">{filtered ? "조건에 맞는 문의가 없어요." : "아직 등록한 문의가 없어요."}</p>}
          {(data as Ticket[] | null)?.map(t => <article key={t.id} className="app-card relative px-5 py-4 focus-within:outline-2 focus-within:outline-brand">
            <h3 className="text-safe text-lg font-bold leading-snug">
              <Link href={`/support/${t.id}`} className="flex items-center justify-between gap-4 after:absolute after:inset-0 after:rounded-[inherit]">
                {t.title}<ChevronRight size={18} className="shrink-0 text-muted" aria-hidden="true"/>
              </Link>
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted">{CATEGORIES[t.category]}</p>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-line pt-3">
              <p className="flex flex-wrap items-baseline gap-x-2 text-sm leading-6">
                <span className="text-muted">처리 상태 </span><strong className="text-brand">{STATUSES[t.status]}</strong>
              </p>
              <p className="text-sm leading-6 text-muted">
                {!t.user_read_at && <span className="font-semibold text-foreground">읽지 않음 · </span>}
                <time dateTime={t.updated_at}>{new Date(t.updated_at).toLocaleDateString("ko-KR",{timeZone:"Asia/Seoul"})}</time>
              </p>
            </div>
          </article>)}
        </div>}
      {(page > 1 || page * 20 < (count ?? 0)) && <nav aria-label="문의 페이지" className="flex items-center justify-between">{page>1?<Link href={href(page-1)}>← 이전</Link>:<span/>}<span className="text-sm">{page}페이지 · {count??0}건</span>{page*20<(count??0)?<Link href={href(page+1)}>다음 →</Link>:<span/>}</nav>}
    </section>
    <details className="app-card p-4"><summary className="font-semibold">자주 묻는 질문</summary><p className="mt-3 text-sm">로그인이 안 되면 로그인 화면의 비밀번호 재설정을 이용해 주세요.<br />운동·식단 저장 문제는 발생한 화면과 시간을 함께 적어주시면 확인에 도움이 됩니다.</p></details>
  </main></div>;
}
export async function SupportDetail({id,created=false}:{id:string;created?:boolean}) {
  const d=await ticketDetail(id);const t=d.ticket;
  return <div className="app-page"><PageHeader title="문의 상세" back/><main className="app-container space-y-5"><ReadSupport id={id}/>
    {created&&<p role="status" className="rounded-xl bg-brand/10 p-4 text-brand">문의가 접수됐어요.<br />필요한 사진을 아래에 첨부해 주세요.</p>}
    <section className="app-card space-y-3 p-5">
      <div className="flex items-start justify-between gap-3"><h2 className="text-safe text-xl font-bold leading-snug">{t.title}</h2><span className="shrink-0 rounded-lg bg-brand-soft px-2.5 py-1 text-sm font-semibold text-brand">{STATUSES[t.status]}</span></div>
      <p className="flex flex-wrap gap-x-3 text-sm leading-6 text-muted"><span>{CATEGORIES[t.category]}</span><time dateTime={t.created_at}>{date(t.created_at)}</time></p>
    </section>
    <section aria-label="문의 대화" className="space-y-3">{d.messages.map(m=><article key={m.id} className={`app-card p-5 ${m.is_admin?"border-brand/30":""}`}><div className="mb-3 flex justify-between gap-3 text-sm text-muted"><strong>{m.is_admin?"고객센터":"회원"}</strong><span>{date(m.created_at)}</span></div><p className="whitespace-pre-wrap break-words">{m.body}</p></article>)}{d.messages.length>=200&&<p className="text-sm">대화가 많아 처음 200개를 표시합니다.<br />새 문의로 이어 주세요.</p>}</section>
    {!!d.attachments.length&&<section aria-label="첨부 사진" className="grid grid-cols-2 gap-3">{d.attachments.map(f=>f.url?<div key={f.id}><a href={f.url} target="_blank" rel="noreferrer" className="app-card overflow-hidden"><Image unoptimized width={320} height={240} src={f.url} alt="문의 첨부 사진" className="h-40 w-full object-contain"/></a><DeleteAttachment id={f.id}/></div>:<p key={f.id}>사진을 불러오지 못했어요.</p>)}</section>}
    {d.attachments.length<3&&<section className="app-card p-5"><AttachmentForm id={id}/></section>}
    <section className="app-card p-5"><ReplyForm id={id}/></section>
    <Link className="block py-3 text-center underline" href="/support">문의 목록으로</Link>
  </main></div>;
}
