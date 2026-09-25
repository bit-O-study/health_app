import { PageHeader } from "@/components/page-header";
import { supportAccess } from "@/features/support/data";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { kakaoConfig } from "@/features/support/messaging.server";
import { RetryNotification, NotificationSettings, RefreshSupport } from "@/features/support/forms";
import { DELIVERY } from "@/features/support/model";
export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<{connection?:string}>}) {
 const {user,db}=await supportAccess(true);const service=createSupabaseAdminClient();
 const connection=service?(await service.from("support_kakao_connections").select("state,enabled,push_enabled,kakao_id").eq("user_id",user.id).maybeSingle()).data:null;
 const {data:rows,error}=await db.from("support_notification_outbox").select("id,status,error_code,created_at").eq("recipient_id",user.id).order("created_at",{ascending:false}).limit(30);
 const result=(await searchParams).connection;
 return <div className="app-page"><PageHeader title="고객센터 알림" back/><main className="app-container space-y-5">{result&&<p role="status">{result==="ok"?"카카오 연결을 완료했어요. 테스트 메시지를 보내 확인해 주세요.":"카카오 연결에 실패했어요. 동의항목과 서버 설정을 확인해 주세요."}</p>}<NotificationSettings configured={Boolean(service&&kakaoConfig())} connection={connection}/><section className="app-card space-y-3 p-5"><h2 className="font-semibold">최근 발송 내역</h2><RefreshSupport/><p className="text-sm text-muted">카카오 API 성공은 기기 수신·읽음 확인과 다릅니다. 확인 불가 건은 자동 재발송하지 않아요. 자체 상한은 최근 24시간 15회입니다.</p>{error?<p role="alert">발송 내역을 불러오지 못했어요.</p>:!rows?.length?<p className="text-sm">아직 발송 내역이 없어요.</p>:rows.map(r=><div key={r.id} className="border-t py-3 text-sm"><p>{DELIVERY[r.status as keyof typeof DELIVERY]??r.status}</p><p className="text-muted">{new Date(r.created_at).toLocaleString("ko-KR",{timeZone:"Asia/Seoul"})}{r.error_code?` · ${r.error_code}`:""}</p>{["failed","unknown"].includes(r.status)&&<RetryNotification id={r.id}/>}</div>)}</section></main></div>;
}
