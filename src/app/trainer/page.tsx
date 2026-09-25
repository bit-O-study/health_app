import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import { getTrainerLinks, hasTrainerPass } from "@/features/trainer/data";
import { TrainerForm } from "@/features/trainer/forms";
export const dynamic = "force-dynamic";
type Report = { name: string; workout: { days: number; sets: number; minutes: number } | null; diet: number | null; body: { weight_kg: number | null; body_fat_pct: number | null } | null; prescription: boolean };
export default async function TrainerPage() {
  if (!(await getCurrentUser())) redirect("/login?redirect=/trainer");
  if (!(await hasTrainerPass())) redirect("/settings/trainer-pass");
  const links = await getTrainerLinks(true);
  const db = await createSupabaseServerClient();
  const reports = await Promise.all(links.map(async link => {
    const { data, error } = await db.rpc("pt_member_report", { p_link: link.id });
    if (error) throw new Error("회원 현황을 불러오지 못했어요.");
    return { link, report: data as Report | null };
  }));
  return <main className="app-container space-y-6 py-6"><div className="flex items-center justify-between"><h1 className="app-title">헬스 트레이너</h1><Link href="/settings/trainer-pass" className="text-sm text-brand">이용권 관리</Link></div>
    <section className="app-card space-y-4 p-5"><h2 className="font-semibold">회원 초대</h2>
      <p className="text-sm text-muted">회원이 초대 링크에서 공유 범위를 정하고 수락하면 연결돼요.</p>
      <TrainerForm intent="invite" label="초대 보내기">
        <label className="block text-sm">회원 휴대폰 번호<input type="tel" name="phone" required className="mt-1 min-h-11 w-full rounded-xl border border-line px-3" /></label>
        <label className="block text-sm">발송 방법<select name="channel" className="mt-1 min-h-11 w-full rounded-xl border border-line px-3"><option value="ATA">카카오 알림톡</option><option value="LMS">문자</option></select></label>
      </TrainerForm>
    </section>
    <section className="space-y-3"><h2 className="text-lg font-semibold">담당 회원 · {links.length}명</h2><p className="text-xs text-muted">최근 30일 현황 · 회원이 허용한 정보만 표시해요.</p>
      {!links.length && <p className="app-card p-5 text-sm">아직 초대를 수락한 회원이 없어요.</p>}
      {reports.map(({ link, report }) => report && <article key={link.id} className="app-card space-y-3 p-5"><h3 className="font-semibold">{report.name}</h3><Link href={`/trainer/members/${link.id}`} className="text-sm text-brand">회원 통계 · 운동 처방</Link>
        {!report.prescription && <p className="text-sm text-muted">운동 처방은 회원의 허용을 기다리고 있어요.</p>}
        <dl className="grid gap-3 text-sm"><div><dt className="text-muted">운동</dt><dd>{report.workout ? `${report.workout.days}일 · ${report.workout.sets}세트 · ${report.workout.minutes}분` : "비공개"}</dd></div>
        <div><dt className="text-muted">식단 기록</dt><dd>{report.diet === null ? "비공개" : `${report.diet}일`}</dd></div>
        <div><dt className="text-muted">체중 · 체지방률</dt><dd>{report.body ? `${report.body.weight_kg ?? "미기록"} kg · ${report.body.body_fat_pct ?? "미기록"}%` : "비공개"}</dd></div></dl>
      </article>)}
    </section>
  </main>;
}