import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Dumbbell } from "lucide-react";

import {
  getConditioningItem,
  PARAM_LABEL,
  PARAM_UNIT,
} from "@/features/routine/conditioning-catalog";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const item = getConditioningItem(id);
  return { title: item ? `${item.name} | Health Platform MVP` : "운동 상세" };
}

export default async function ConditioningDetailPage({ params }: Props) {
  const { id } = await params;
  const item = getConditioningItem(id);
  if (!item) notFound();

  const kindLabel = item.kinds
    .map((k) => (k === "warmup" ? "워밍업" : "마무리"))
    .join(" · ");

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-10 text-zinc-950 sm:px-10">
      <section className="mx-auto w-full max-w-3xl space-y-6">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-600 transition hover:text-zinc-950"
          href="/"
        >
          <ArrowLeft aria-hidden="true" size={16} />
          메인으로
        </Link>

        <header className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <Dumbbell aria-hidden="true" size={26} />
            </span>
            <div>
              <h1 className="text-3xl font-bold sm:text-4xl">{item.name}</h1>
              <p className="mt-1 text-sm text-zinc-500">{kindLabel}</p>
            </div>
          </div>
        </header>

        {item.params && item.params.length > 0 ? (
          <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-base font-bold text-zinc-950">
              입력 가능한 항목
            </h2>
            <ul className="space-y-2">
              {item.params.map((p) => (
                <li
                  key={p}
                  className="flex items-baseline justify-between text-sm"
                >
                  <span className="font-medium text-zinc-800">
                    {PARAM_LABEL[p]}
                  </span>
                  <span className="text-xs text-zinc-500">
                    단위: {PARAM_UNIT[p]}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-zinc-500">
              /plan 에서 부위별 기본값을, /plan/today 에서 오늘만 설정을 변경할
              수 있습니다.
            </p>
          </section>
        ) : null}

        <section className="rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-sm leading-6 text-zinc-500">
          이 항목의 자세한 운동법/시범 영상은 준비 중입니다. 본인 페이스에
          맞춰 동작 폼을 우선시하세요.
        </section>
      </section>
    </main>
  );
}
