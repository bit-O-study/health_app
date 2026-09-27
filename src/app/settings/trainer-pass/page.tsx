import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { getTrainerPass } from "@/features/trainer/data";
import { TrainerForm } from "@/features/trainer/forms";
export const dynamic = "force-dynamic";
export default async function TrainerPassPage() {
  if (!(await getCurrentUser())) redirect("/login?redirect=/settings/trainer-pass");
  const pass = await getTrainerPass();
  return <main className="app-container space-y-6 py-6">
    <Link href="/settings" className="text-sm text-brand">설정으로</Link>
    <h1 className="app-title">트레이너 정액권</h1>
    <p className="text-sm text-muted">트레이너 본인의 회원 관리 이용권이에요. 그룹 가입과 별도로 운영돼요. 신청 후 관리자가 결제와 이용 기간을 확인하면 홈에 헬스 트레이너 앱이 나타나요.</p>
    {pass && <section className="app-card space-y-2 p-4"><h2 className="font-semibold">내 이용권</h2><p>{({ requested: "승인 대기", active: "승인됨", canceled: "해지됨" } as Record<string,string>)[pass.status]}</p><p>{pass.starts_on ?? "기간 미정"} ~ {pass.ends_on === "infinity" ? "무제한" : pass.ends_on ?? "기간 미정"} · 회원 {pass.seats}명</p><Link href="/trainer" className="text-brand">트레이너 앱 열기</Link></section>}
    <section className="app-card space-y-4 p-4"><h2 className="font-semibold">이용권 등록 신청</h2>
      <TrainerForm intent="request" label="등록 신청">
        <label className="block space-y-1 text-sm">트레이너 이름<input name="name" required maxLength={80} defaultValue={pass?.name} className="min-h-11 w-full rounded-xl border border-line px-3" /></label>
        <label className="block space-y-1 text-sm">알림 받을 휴대폰 번호<input name="phone" type="tel" required defaultValue={pass?.phone} className="min-h-11 w-full rounded-xl border border-line px-3" /></label>
        <p className="text-xs text-muted">회원이 연결을 삭제하면 이 번호로 알림톡을 보내요.</p>
      </TrainerForm>
    </section>
  </main>;
}