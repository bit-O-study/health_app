import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getTrainerLinks, hasTrainerPass } from "./data";
import { TrainerForm } from "./forms";

export async function TrainerSectionPage({ section, query = "" }: {section:"members"|"prescriptions"|"notifications";query?:string}) {
  const user=await getCurrentUser();
  if(!user) redirect("/login");
  if(!await hasTrainerPass()) redirect("/settings/trainer-pass");
  const title=section==="members"?"회원 관리":section==="prescriptions"?"운동 처방":"관리 알림";
  const links=section==="notifications"?[]:await getTrainerLinks(true);
  // Only this authenticated, active trainer's notification rows are read, including member-created disconnect notices.
  const admin=section==="notifications"?createSupabaseAdminClient():null;
  const notifications=admin ? await admin.from("pt_notifications").select("id,kind,channel,status,created_at,payload").eq("trainer_id",user.id).order("created_at",{ascending:false}).limit(100) : null;
  const db=admin;
  const disconnected=db?await db.from("pt_links").select("id,member_name,revoked_at").eq("trainer_id",user.id).eq("active",false).order("revoked_at",{ascending:false}).limit(100):null;
  const status:Record<string,string>={queued:"발송 대기",processing:"접수 중",submitted:"업체 접수 · 수신 미확인",failed:"발송 요청 실패",unknown:"결과 확인 필요"};
  return <div className="app-page"><PageHeader branded title={title}/><main className="app-container space-y-5"><h2 className="text-2xl font-bold">{title}</h2>
    {section==="notifications" ? <>
      <p className="text-sm text-muted">초대·연결 해제 내역과 알림톡·문자 접수 상태를 확인하세요.<br />업체 접수는 휴대폰 수신 완료를 뜻하지 않아요.</p>
      {!process.env.SOLAPI_API_KEY || !process.env.SOLAPI_API_SECRET ? <p role="status" className="app-card p-4 text-sm">메시지 발송 설정을 기다리고 있어요.<br />초대 링크는 회원 관리에서 직접 복사할 수 있어요.</p>:null}
      {!admin || notifications?.error || disconnected?.error ? <p role="alert">알림 내역을 불러오지 못했어요.<br />잠시 후 다시 확인해 주세요.</p>:null}
      <div className="app-card divide-y divide-line">{notifications?.data?.map(note=><article key={note.id} className="space-y-2 p-4"><h3 className="font-semibold">{note.kind==="invite"?"회원 초대":"회원 연결 해제"}{note.payload?.member ? ` · ${note.payload.member}`:""}</h3><p className="text-sm text-brand">{note.channel==="ATA"?"알림톡":"문자"} · {status[note.status]??note.status}</p><time className="text-xs text-muted">{new Date(note.created_at).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})}</time></article>)}</div>
      {notifications?.data?.length===0 && <p className="text-sm text-muted">아직 관리 알림이 없어요.</p>}
      {!!disconnected?.data?.length && <section className="app-card p-4"><h3 className="font-semibold">관리 연결이 해제된 회원</h3>{disconnected.data.map(row=><p key={row.id} className="mt-2 text-sm">{row.member_name} · {row.revoked_at?.slice(0,10)}</p>)}</section>}
    </> : <>
      {section==="members" && <section className="app-card space-y-3 p-5"><h3 className="font-semibold">회원 초대</h3><TrainerForm intent="invite" label="초대 보내기"><label className="block text-sm">회원 휴대폰 번호<input type="tel" name="phone" required className="mt-1 min-h-11 w-full rounded-xl border border-line px-3"/></label><label className="block text-sm">발송 방법<select name="channel" className="mt-1 min-h-11 w-full rounded-xl border border-line px-3"><option value="ATA">카카오 알림톡</option><option value="LMS">문자</option></select></label></TrainerForm></section>}
      <form className="flex gap-2"><input type="search" name="q" defaultValue={query} aria-label="회원 검색" placeholder="회원 이름 검색" className="min-h-11 min-w-0 flex-1 rounded-xl border border-line px-3"/><button className="rounded-xl bg-brand px-4 text-sm font-semibold text-white dark:text-zinc-950">검색</button></form>
      <p className="text-sm text-muted">{section==="prescriptions"?"운동 처방을 허용한 회원에게만 처방할 수 있어요.":"회원이 동의한 정보만 조회할 수 있어요."}</p>
      <div className="app-card divide-y divide-line">{links.filter(link=>link.member_name.includes(query.trim())).map(link=><article key={link.id} className="space-y-2 p-4"><h3 className="font-semibold">{link.member_name}</h3><p className="text-xs text-muted">운동 {link.share_workout?"공유":"비공개"} · 식단 {link.share_diet?"공유":"비공개"} · 체형 {link.share_body?"공유":"비공개"}</p>{section==="prescriptions"&&!link.allow_prescription?<p className="text-sm text-muted">회원의 처방 허용을 기다리고 있어요.</p>:<Link href={`/trainer/members/${link.id}?view=${section==="prescriptions"?"prescription":"stats"}`} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand">{section==="prescriptions"?"처방 작성·수정":"회원 상세 보기"} →</Link>}</article>)}</div>
      {!links.filter(link=>link.member_name.includes(query.trim())).length && <p className="text-sm text-muted">표시할 회원이 없어요.</p>}
    </>}
  </main></div>;
}
