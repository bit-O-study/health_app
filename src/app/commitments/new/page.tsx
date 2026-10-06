import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { canReverse, getBodyContext } from "@/features/commitments/pledge-data";
import { getMyGroups } from "@/features/groups/data-access";
import { PledgeForm } from "@/features/commitments/components/pledge-form";
import { BodySetup } from "@/features/commitments/components/body-setup";
import { seoulYmd } from "@/features/routine/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "다짐 생성" };

/** 다짐 생성 — 몸 정보(키·체중·체지방·골격근)가 없으면 먼저 등록/입력. */
export default async function NewPledgePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/commitments/new");
  const [ctx, groups] = await Promise.all([getBodyContext(), getMyGroups()]);

  return (
    <div className="app-page">
      <PageHeader title="다짐 생성" />
      <main className="app-container">
        {!ctx.body || ctx.missing.length > 0 ? (
          <BodySetup missing={ctx.missing} defaults={{ heightCm: ctx.source.heightCm, weightKg: ctx.source.weightKg }} />
        ) : (
          <PledgeForm
            body={ctx.body}
            calibration={ctx.calibration}
            groups={groups.map((g) => ({ id: g.id, name: g.name }))}
            canReverse={canReverse(ctx.plan)}
            today={seoulYmd()}
          />
        )}
      </main>
    </div>
  );
}
