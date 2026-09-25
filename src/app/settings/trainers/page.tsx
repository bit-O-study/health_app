import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getTrainerLinks } from "@/features/trainer/data";
import { TrainerForm, SharingFields } from "@/features/trainer/forms";
import { linkSharing } from "@/features/trainer/types";
export const dynamic = "force-dynamic";
export default async function TrainerConnectionsPage() {
  if (!(await getCurrentUser())) redirect("/login?redirect=/settings/trainers");
  const connections = await getTrainerLinks();
  const db = await createSupabaseServerClient();
  const { data: trainers } = connections.length ? await db.from("pt_passes").select("trainer_id,name").in("trainer_id", connections.map(link => link.trainer_id)) : { data: [] };
  const [{ data: notes }, { data: notices }] = await Promise.all([
    db.from("pt_notes").select("id,body,created_at").order("created_at", { ascending: false }).limit(20),
    db.from("pt_notifications").select("id,status").eq("kind", "disconnect").eq("created_by", (await getCurrentUser())!.id).order("created_at", { ascending: false }).limit(5),
  ]);
  return <main className="app-container space-y-6 py-6"><Link href="/settings" className="text-sm text-brand">설정으로</Link>
    <h1 className="app-title">트레이너 연결</h1>
    <p className="text-sm text-muted">공유 항목은 언제든 끌 수 있어요. 연결을 삭제하면 트레이너의 관리 권한이 해제되고 알림톡을 보내요. 그룹 가입 상태는 바뀌지 않아요. 그룹에 공개한 기록은 그룹의 공유 설정을 따라요.</p>
    {!connections.length && <p className="app-card p-5 text-sm">연결된 트레이너가 없어요. 초대 링크에서 동의하고 수락하면 여기에 나타나요.</p>}
    {connections.map(link => <section key={link.id} className="app-card space-y-5 p-5">
      <h2 className="font-semibold">{trainers?.find(row => row.trainer_id === link.trainer_id)?.name ?? "트레이너"}</h2>
      <TrainerForm intent="share" label="공유 설정 저장"><input type="hidden" name="connection" value={link.id} /><SharingFields key={JSON.stringify(linkSharing(link))} initial={linkSharing(link)} /></TrainerForm>
      <details className="border-t border-line pt-4"><summary className="cursor-pointer text-sm text-danger">트레이너 연결 삭제</summary>
        <div className="pt-3"><TrainerForm intent="disconnect" label="연결 삭제"><input type="hidden" name="connection" value={link.id} />
          <label className="flex min-h-11 items-center gap-3 text-sm"><input name="confirm" type="checkbox" required />이 트레이너의 관리 권한을 해제합니다.</label>
        </TrainerForm></div>
      </details>
    </section>)}
    {!!notices?.length && <section className="app-card space-y-2 p-5"><h2 className="font-semibold">연결 삭제 알림</h2>{notices.map(note => <p key={note.id} className="text-sm">관리 권한은 해제됐어요. {note.status === "submitted" ? "알림톡은 발송 업체에 접수됐어요." : "알림톡은 발송 대기 또는 결과 확인 중이에요."}</p>)}</section>}
    {!!notes?.length && <section className="app-card space-y-3 p-5"><h2 className="font-semibold">받은 운동 처방</h2>{notes.map(note => <p key={note.id} className="text-sm">{note.body}</p>)}</section>}
  </main>;
}