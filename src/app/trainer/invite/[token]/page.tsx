import { createHash } from "node:crypto";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { TrainerForm, SharingFields } from "@/features/trainer/forms";
export const dynamic = "force-dynamic";
export const metadata = { title: "트레이너 초대", robots: { index: false, follow: false }, referrer: "no-referrer" as const };
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!(await getCurrentUser())) redirect(`/login?redirect=${encodeURIComponent(`/trainer/invite/${token}`)}`);
  const db = await createSupabaseServerClient();
  const { data } = /^[a-f0-9]{64}$/.test(token) ? await db.rpc("pt_preview_invite", { p_hash: createHash("sha256").update(token).digest("hex") }) : { data: null };
  return <main className="app-container space-y-5 py-6"><h1 className="app-title">트레이너 초대</h1>
    {data ? <section className="app-card space-y-4 p-5"><h2 className="text-lg font-semibold">{data.trainer} 트레이너의 초대</h2>
      <p className="text-sm text-muted">본인에게 온 초대인지 확인해 주세요. 허용할 정보만 선택하세요. 설정에서 언제든 공유를 끄거나 연결을 삭제할 수 있어요.</p>
      <TrainerForm intent="accept" label="동의하고 연결"><input type="hidden" name="token" value={token} /><SharingFields />
        <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" name="consent" required />이 트레이너의 관리를 받는 데 동의합니다.</label>
      </TrainerForm>
    </section> : <p className="app-card p-5">만료되었거나 이미 사용한 초대예요. 트레이너에게 새 초대를 요청해 주세요.</p>}
    <Link href="/settings/trainers" className="text-brand">내 트레이너 연결 보기</Link>
  </main>;
}