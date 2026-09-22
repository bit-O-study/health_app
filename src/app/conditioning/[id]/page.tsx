import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import {
  getConditioningItem,
  PARAM_LABEL,
  PARAM_UNIT,
} from "@/features/routine/conditioning-catalog";
import { ConditioningIcon } from "@/features/exercises/components/conditioning-icon";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const item = getConditioningItem(id);
  if (!item) {
    return {
      title: "컨디셔닝 상세",
      robots: { index: false, follow: false },
    };
  }

  const kindLabel = item.kinds
    .map((k) => (k === "warmup" ? "워밍업" : "마무리"))
    .join(" · ");
  const description =
    item.target ??
    `${item.name} ${kindLabel} 동작 방법과 루틴 적용 포인트를 확인하세요.`;

  return {
    title: `${item.name} ${kindLabel}`,
    description,
    alternates: {
      canonical: absoluteUrl(`/conditioning/${item.id}`),
    },
    openGraph: {
      title: `${item.name} ${kindLabel} | 헬쑤`,
      description,
      url: absoluteUrl(`/conditioning/${item.id}`),
    },
  };
}

export default async function ConditioningDetailPage({ params }: Props) {
  const { id } = await params;
  const item = getConditioningItem(id);
  if (!item) notFound();

  const kindLabel = item.kinds
    .map((k) => (k === "warmup" ? "워밍업" : "마무리"))
    .join(" ·");

  // 공통 머리글(항목 이름 = 큰 제목) + 섹션 라벨 + 카드(2026-09-16 8단계).
  // 경로 글자("/plan")를 늘어놓던 안내 문장·준비 중 점선 카드는 뺐다.
  return (
    <div className="app-page">
      <PageHeader title={item.name} back="운동" backHref="/routine" />
      <main className="app-container space-y-4">
        <div className="flex items-center gap-3 px-1">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <ConditioningIcon id={item.id} size={28} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">{kindLabel}</p>
            {item.target ? (
              <p className="text-sm leading-5 text-zinc-700 dark:text-zinc-300">{item.target}</p>
            ) : null}
          </div>
        </div>

        {item.method && item.method.length > 0 ? (
          <section>
            <h2 className="app-section-label">동작 방법</h2>
            <ol className="app-card space-y-2 p-3">
              {item.method.map((step, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold tabular-nums text-brand">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm leading-5 text-zinc-700 dark:text-zinc-300">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {item.params && item.params.length > 0 ? (
          <section>
            <h2 className="app-section-label">입력 가능한 항목</h2>
            <ul className="app-list">
              {item.params.map((p) => (
                <li key={p} className="app-row justify-between text-sm">
                  <span className="text-zinc-900 dark:text-zinc-100">{PARAM_LABEL[p]}</span>
                  <span className="whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400">
                    {PARAM_UNIT[p]}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  );
}
