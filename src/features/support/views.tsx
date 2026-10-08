import Link from "next/link";
import Image from "next/image";
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
  return <div className="app-page"><PageHeader title="고객센터" back/><main className="app-container space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-semibold">새 답변 {unread.count??0}건</p><RefreshSupport/></div>
    <div className="grid gap-3 sm:grid-cols-2"><Link className="rounded-2xl bg-brand p-5 font-semibold text-white dark:text-zinc-950" href="/support/new">버그·불편 신고 / 문의하기 →</Link><p className="app-card sentences p-4 text-sm text-muted"><span>불편했던 화면과 상황을 알려 주세요.</span><span>답변은 이 화면의 ‘내 문의’에서 확인할 수 있어요.</span></p></div>
    <form className="app-card flex flex-wrap gap-3 p-4">
      <input aria-label="문의 검색" className="min-w-0 flex-1 rounded-lg border bg-transparent p-2" name="q" defaultValue={filters.q} placeholder="제목 또는 접수번호"/>
      <select aria-label="상태 필터" className="rounded-lg border bg-transparent p-2" name="status" defaultValue={filters.status??""}><option value="">모든 상태</option>{Object.entries(STATUSES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
      <select aria-label="종류 필터" className="rounded-lg border bg-transparent p-2" name="category" defaultValue={filters.category??""}><option value="">모든 종류</option>{Object.entries(CATEGORIES).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
      <button className="rounded-lg bg-brand px-4 py-2 text-white dark:text-zinc-950">검색</button>
    </form>
    {error?<p role="alert">문의 목록을 불러오지 못했어요.<br />잠시 후 다시 시도해 주세요.</p>:<section aria-label="문의 목록" className="space-y-3">{!data?.length?<p className="app-card p-6 text-muted">아직 문의가 없어요.</p>:(data as Ticket[]).map(t=><Link key={t.id} href={`/support/${t.id}`} className="app-card block space-y-2 p-4"><div className="flex flex-wrap gap-2 text-sm text-muted"><span>#{t.number}</span><span>{CATEGORIES[t.category]}</span><span className="font-semibold text-brand">{STATUSES[t.status]}</span>{!t.user_read_at&&<span>새 소식</span>}</div><h2 className="break-words font-semibold">{t.title}</h2><p className="text-sm text-muted">{date(t.updated_at)}</p></Link>)}</section>}
    <nav aria-label="문의 페이지" className="flex items-center justify-between">{page>1?<Link href={href(page-1)}>← 이전</Link>:<span/>}<span className="text-sm">{page}페이지 · {count??0}건</span>{page*20<(count??0)?<Link href={href(page+1)}>다음 →</Link>:<span/>}</nav>
    <details className="app-card p-4"><summary className="font-semibold">자주 묻는 질문</summary><p className="mt-3 text-sm">로그인이 안 되면 로그인 화면의 비밀번호 재설정을 이용해 주세요.<br />운동·식단 저장 문제는 발생한 화면과 시간을 함께 적어주시면 확인에 도움이 됩니다.</p></details>
  </main></div>;
}
export async function SupportDetail({id,created=false}:{id:string;created?:boolean}) {
  const d=await ticketDetail(id);const t=d.ticket;
  return <div className="app-page"><PageHeader title={`문의 #${t.number}`} back/><main className="app-container space-y-5"><ReadSupport id={id}/>
    {created&&<p role="status" className="rounded-xl bg-brand/10 p-4 text-brand">문의가 접수됐어요.<br />필요한 사진을 아래에 첨부해 주세요.</p>}
    <section className="app-card space-y-3 p-5"><p className="text-sm text-muted">{CATEGORIES[t.category]} · {STATUSES[t.status]}</p><h1 className="break-words text-xl font-bold">{t.title}</h1><p className="text-sm text-muted">{date(t.created_at)}</p></section>
    <section aria-label="문의 대화" className="space-y-3">{d.messages.map(m=><article key={m.id} className={`app-card p-5 ${m.is_admin?"border-brand/30":""}`}><div className="mb-3 flex justify-between gap-3 text-sm text-muted"><strong>{m.is_admin?"고객센터":"회원"}</strong><span>{date(m.created_at)}</span></div><p className="whitespace-pre-wrap break-words">{m.body}</p></article>)}{d.messages.length>=200&&<p className="text-sm">대화가 많아 처음 200개를 표시합니다.<br />새 문의로 이어 주세요.</p>}</section>
    {!!d.attachments.length&&<section aria-label="첨부 사진" className="grid grid-cols-2 gap-3">{d.attachments.map(f=>f.url?<div key={f.id}><a href={f.url} target="_blank" rel="noreferrer" className="app-card overflow-hidden"><Image unoptimized width={320} height={240} src={f.url} alt="문의 첨부 사진" className="h-40 w-full object-contain"/></a><DeleteAttachment id={f.id}/></div>:<p key={f.id}>사진을 불러오지 못했어요.</p>)}</section>}
    {d.attachments.length<3&&<section className="app-card p-5"><AttachmentForm id={id}/></section>}
    <section className="app-card p-5"><ReplyForm id={id}/></section>
    <Link className="block py-3 text-center underline" href="/support">문의 목록으로</Link>
  </main></div>;
}
