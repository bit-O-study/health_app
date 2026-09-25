import { redirect } from "next/navigation";
import { isAdminUser } from "@/features/admin/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TrainerForm } from "@/features/trainer/forms";
import type { TrainerPass } from "@/features/trainer/types";
export const dynamic = "force-dynamic";
export default async function TrainerAdminPage() {
  if (!(await isAdminUser())) redirect("/home");
  const db = await createSupabaseServerClient();
  const [{ data: passes, error }, { data: messages }] = await Promise.all([
    db.from("pt_passes").select("*").order("updated_at", { ascending: false }),
    db.from("pt_notifications").select("id,kind,status,created_at,provider_id").order("created_at", { ascending: false }).limit(30),
  ]);
  if (error) throw new Error("트레이너 신청 내역을 불러오지 못했어요.");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
  return <main className="space-y-6 p-5"><h1 className="app-title">트레이너 이용권</h1>
    <p className="text-sm text-muted">결제 확인 후 기간과 회원 수를 승인하세요. 그룹 요금제와 별도입니다.</p>
    {!(passes?.length) && <p>신청 내역이 없어요.</p>}
    {(passes as TrainerPass[] ?? []).map(pass => <section key={pass.trainer_id} className="app-card space-y-3 p-5"><h2 className="font-semibold">{pass.name} · {pass.phone}</h2><p className="text-sm">{pass.status === "requested" ? "승인 대기" : pass.status === "active" ? "승인됨" : "해지됨"}</p>
      <TrainerForm intent="approve" label="기간 승인·변경"><input type="hidden" name="trainer" value={pass.trainer_id} />
        <div className="grid gap-3 sm:grid-cols-3"><label className="text-sm">시작일<input type="date" name="start" required defaultValue={pass.starts_on ?? today} className="block min-h-11 w-full rounded-lg border border-line px-2" /></label>
        <label className="text-sm">종료일{pass.ends_on === "infinity" ? <><span className="block min-h-11 py-2">무제한</span><input type="hidden" name="end" value="infinity" /></> : <input type="date" name="end" required defaultValue={pass.ends_on ?? today} className="block min-h-11 w-full rounded-lg border border-line px-2" />}</label>
        <label className="text-sm">회원 수<input type="number" name="seats" min={1} max={1000} required defaultValue={pass.seats} className="block min-h-11 w-full rounded-lg border border-line px-2" /></label></div>
      </TrainerForm>
      {pass.status === "active" && <TrainerForm intent="cancel" label="이용권 해지"><input type="hidden" name="trainer" value={pass.trainer_id} /><input type="hidden" name="start" value={pass.starts_on ?? today} /><input type="hidden" name="end" value={pass.ends_on ?? today} /><input type="hidden" name="seats" value={pass.seats} /></TrainerForm>}
    </section>)}
    <section className="app-card space-y-3 p-5"><h2 className="font-semibold">알림 발송 내역</h2><p className="text-xs text-muted">접수는 최종 수신 완료가 아닙니다. 결과 불명·처리 중인 건은 업체에서 확인 후 처리하세요.</p>
      {messages?.map(note => <article key={note.id} className="space-y-2 border-t border-line pt-3 text-sm"><p>{note.kind === "invite" ? "회원 초대" : "연결 삭제"} · {({ queued: "설정·발송 대기", processing: "처리 중", submitted: "업체 접수", failed: "발송 거절", unknown: "결과 확인 필요" } as Record<string,string>)[note.status]}</p>
        {note.provider_id && <p>업체 접수 번호: {note.provider_id}</p>}
        {["queued","failed"].includes(note.status) && <TrainerForm intent="retry" label="발송 재시도"><input type="hidden" name="notification" value={note.id} /></TrainerForm>}
      </article>)}
    </section>
  </main>;
}