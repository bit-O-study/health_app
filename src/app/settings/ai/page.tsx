import { redirect } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { getCurrentUser } from "@/lib/supabase/server";
import { hasAiConsent } from "@/features/coach/ai-consent";
import { AiConsentToggle } from "@/features/coach/components/ai-consent-toggle";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI 이용 동의" };

/** AI 맞춤 추천 동의·철회(처리방침 2·4항, 2026-09-30). 철회하면 기록 요약을 AI 로 보내지 않는다. */
export default async function AiConsentPage() {
  if (!(await getCurrentUser())) redirect("/login?redirect=/settings/ai");
  const consent = await hasAiConsent();
  return (
    <div className="app-page">
      <PageHeader title="AI 이용 동의" back="설정" />
      <main className="app-container space-y-3">
        <section className="app-card space-y-2 p-3 text-sm text-zinc-700 dark:text-zinc-200">
          <p>
            AI 트레이너가 오늘의 운동·식단·다짐을 추천하려면 운동·체중·체성분·식단·수분 기록의
            <b> 숫자 요약</b>을 외부 AI(Google Gemini 등, 국외 서버)로 보내요. 이름·이메일·연락처는 보내지 않아요.
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            철회하면 그때부터 보내지 않고, AI 맞춤 추천만 쓸 수 없어요. 기록과 다른 기능은 그대로예요.
          </p>
        </section>
        <AiConsentToggle initial={consent} />
      </main>
    </div>
  );
}
