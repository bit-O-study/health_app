"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { saveManualBodyAction } from "@/features/commitments/pledge-actions";

type Missing = ("height" | "weight" | "bodyFat" | "skeletalMuscle")[];

const LABEL: Record<Missing[number], string> = {
  height: "키",
  weight: "체중",
  bodyFat: "체지방",
  skeletalMuscle: "골격근량",
};

/**
 * 다짐을 만들기 전 몸 정보 — 인바디가 없으면 **등록하거나 직접 입력해야** 다짐을 만들 수 있다.
 * 예상 결과가 이 값들로 계산되기 때문이다. 직접 입력은 오늘 날짜 체성분 기록으로 저장된다.
 */
export function BodySetup({
  missing,
  defaults,
}: {
  missing: Missing;
  defaults: { heightCm: number | null; weightKg: number | null };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [v, setV] = useState({
    heightCm: defaults.heightCm ? String(defaults.heightCm) : "",
    weightKg: defaults.weightKg ? String(defaults.weightKg) : "",
    bodyFatPct: "",
    skeletalMuscleKg: "",
  });

  function save() {
    setError(null);
    start(async () => {
      const res = await saveManualBodyAction({
        heightCm: Number(v.heightCm),
        weightKg: Number(v.weightKg),
        bodyFatPct: Number(v.bodyFatPct),
        skeletalMuscleKg: Number(v.skeletalMuscleKg),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  const input = (key: keyof typeof v, label: string, unit: string) => (
    <label className="flex items-center justify-between gap-2 text-sm">
      <span className="font-semibold">{label}</span>
      <span className="flex items-center gap-1">
        <input
          aria-label={label}
          type="number"
          inputMode="decimal"
          step="0.1"
          value={v[key]}
          onChange={(e) => setV((s) => ({ ...s, [key]: e.target.value }))}
          className="h-10 w-24 rounded-md border border-zinc-300 bg-white px-2 text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-800"
        />
        <span className="w-6 text-xs text-zinc-500">{unit}</span>
      </span>
    </label>
  );

  return (
    <div className="space-y-4" data-testid="body-setup">
      <section className="app-card space-y-2 p-4">
        <h2 className="text-sm font-bold">다짐을 만들려면 몸 정보가 필요해요</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          예상 체중·근육 변화가 내 몸으로 계산돼요. 비어 있는 값: {missing.map((m) => LABEL[m]).join(" · ")}
        </p>
        <Link
          href="/settings/body-composition"
          className="inline-flex h-10 items-center rounded-full bg-brand px-4 text-sm font-semibold text-white dark:text-zinc-950"
        >
          인바디 결과 등록하기
        </Link>
      </section>

      <section className="app-card space-y-3 p-4">
        <h2 className="text-sm font-bold">인바디가 없으면 직접 입력</h2>
        {input("heightCm", "키", "cm")}
        {input("weightKg", "체중", "kg")}
        {input("bodyFatPct", "체지방률", "%")}
        {input("skeletalMuscleKg", "골격근량", "kg")}
        <p className="text-xs text-zinc-500">헬스장·보건소 인바디 결과지나 체성분 체중계 값을 넣어 주세요.</p>
        {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="app-press inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-brand text-sm font-semibold text-white disabled:opacity-50 dark:text-zinc-950"
          data-testid="body-save"
        >
          {pending ? <Loader2 aria-hidden="true" size={15} className="animate-spin" /> : null}
          저장하고 다짐 만들기
        </button>
      </section>
    </div>
  );
}
