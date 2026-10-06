import { notFound, redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { canReverse, getBodyContext, getMyPledges } from "@/features/commitments/pledge-data";
import { getMyGroups } from "@/features/groups/data-access";
import { PledgeForm } from "@/features/commitments/components/pledge-form";
import { BodySetup } from "@/features/commitments/components/body-setup";
import { seoulYmd } from "@/features/routine/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "다짐 편집" };

/** 다짐 편집 — 이름·그룹 공유는 언제든, 항목·수치는 시작 전에만. */
export default async function EditPledgePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?redirect=/commitments/${id}/edit`);
  const [pledges, ctx, groups] = await Promise.all([getMyPledges(), getBodyContext(), getMyGroups()]);
  const p = pledges.find((x) => x.id === id);
  if (!p) notFound();

  return (
    <div className="app-page">
      <PageHeader title="다짐 편집" back />
      <main className="app-container">
        {!ctx.body ? (
          <BodySetup missing={ctx.missing} defaults={{ heightCm: ctx.source.heightCm, weightKg: ctx.source.weightKg }} />
        ) : (
          <PledgeForm
            body={ctx.body}
            calibration={ctx.calibration}
            groups={groups.map((g) => ({ id: g.id, name: g.name }))}
            canReverse={canReverse(ctx.plan)}
            today={seoulYmd()}
            initial={{
              id: p.id,
              title: p.title,
              spec: p.spec,
              startDate: p.startDate,
              sharedGroupIds: p.sharedGroupIds,
              editableSpec: p.editableSpec,
            }}
          />
        )}
      </main>
    </div>
  );
}
