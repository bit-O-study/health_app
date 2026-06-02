import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ListChecks, Target } from "lucide-react";

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
      title: `${item.name} ${kindLabel} | HELTCH`,
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

  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-900 px-6 py-10 text-zinc-950 dark:text-zinc-100 sm:px-10">
      <section className="mx-auto w-full max-w-3xl space-y-6">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400 transition hover:text-zinc-950 dark:hover:text-zinc-100"
          href="/"
        >
          <ArrowLeft aria-hidden="true" size={16} />
          메인으로
        </Link>

        <header className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
              <ConditioningIcon id={item.id} size={36} />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold sm:text-3xl">{item.name}</h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {kindLabel}
              </p>
            </div>
          </div>
          {item.target ? (
            <p className="mt-4 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
              <Target
                aria-hidden="true"
                className="mr-1 inline-block text-orange-600"
                size={14}
              />
              {item.target}
            </p>
          ) : null}
        </header>

        {item.method && item.method.length > 0 ? (
          <section className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <ListChecks
                aria-hidden="true"
                className="text-emerald-700 dark:text-emerald-400"
                size={18}
              />
              <h2 className="text-base font-bold text-zinc-950 dark:text-zinc-100">
                동작 방법
              </h2>
            </div>
            <ol className="space-y-3">
              {item.method.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    {i + 1}
                  </span>
                  <span className="flex-1 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                    {step}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        ) : (
          <section className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 p-6 text-sm leading-6 text-zinc-500 dark:text-zinc-400">
            이 항목의 자세한 운동법은 준비 중입니다. 본인 페이스에 맞춰 동작
            폼을 우선시하세요.
          </section>
        )}

        {item.params && item.params.length > 0 ? (
          <section className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm">
            <h2 className="mb-3 text-base font-bold text-zinc-950 dark:text-zinc-100">
              입력 가능한 항목
            </h2>
            <ul className="space-y-2">
              {item.params.map((p) => (
                <li
                  key={p}
                  className="flex items-baseline justify-between text-sm"
                >
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {PARAM_LABEL[p]}
                  </span>
                  <span className="whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400">
                    단위: {PARAM_UNIT[p]}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">
              <Link
                href="/plan"
                className="font-semibold text-emerald-700 dark:text-emerald-400"
              >
                /plan
              </Link>
              {" "}
              에서 부위별 기본값을,{" "}
              <Link
                href="/plan/today"
                className="font-semibold text-emerald-700 dark:text-emerald-400"
              >
                /plan/today
              </Link>
              {" "}
              에서 오늘만 설정을 변경할 수 있습니다.
            </p>
          </section>
        ) : null}
      </section>
    </main>
  );
}
