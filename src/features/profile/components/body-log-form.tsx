"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { logBodyAction } from "@/features/profile/actions";
import { BODY_TYPE_OPTIONS, type BodyType } from "@/features/profile/data";

const FIELDS = [
  { key: "weightKg", label: "몸무게", unit: "kg", ph: "65" },
  { key: "bodyFatPct", label: "체지방률", unit: "%", ph: "18" },
  { key: "muscleMassKg", label: "근육량", unit: "kg", ph: "32" },
  { key: "heightCm", label: "키", unit: "cm", ph: "170" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

export function BodyLogForm({
  current,
  withBodyType = false,
  currentBodyType = null,
  onDone,
}: {
  current: Partial<Record<FieldKey, number | null>>;
  withBodyType?: boolean;
  currentBodyType?: BodyType | null;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [vals, setVals] = useState<Record<FieldKey, string>>({
    weightKg: current.weightKg ? String(current.weightKg) : "",
    bodyFatPct: current.bodyFatPct ? String(current.bodyFatPct) : "",
    muscleMassKg: current.muscleMassKg ? String(current.muscleMassKg) : "",
    heightCm: current.heightCm ? String(current.heightCm) : "",
  });
  const [type, setType] = useState<BodyType | null>(currentBodyType);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function parse(k: FieldKey): number | null {
    const s = vals[k].trim();
    return s === "" ? null : Number(s);
  }

  function submit() {
    start(async () => {
      const res = await logBodyAction({
        weightKg: parse("weightKg"),
        bodyFatPct: parse("bodyFatPct"),
        muscleMassKg: parse("muscleMassKg"),
        heightCm: parse("heightCm"),
        bodyType: withBodyType ? type : null,
      });
      setMsg(
        res.ok
          ? { ok: true, text: "기록했습니다." }
          : { ok: false, text: res.error },
      );
      if (res.ok) {
        router.refresh();
        onDone?.();
      }
    });
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {FIELDS.map((f) => (
          <label key={f.key} className="space-y-1">
            <span className="text-xs font-semibold text-zinc-700">
              {f.label} ({f.unit})
            </span>
            <input
              type="number"
              inputMode="decimal"
              value={vals[f.key]}
              placeholder={f.ph}
              onChange={(e) =>
                setVals((p) => ({ ...p, [f.key]: e.target.value }))
              }
              className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </label>
        ))}
      </div>

      {withBodyType ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-semibold text-zinc-700">체형</p>
          <div className="grid grid-cols-3 gap-2">
            {BODY_TYPE_OPTIONS.map((o) => {
              const active = type === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setType(o.id)}
                  className={cn(
                    "rounded-lg border-2 px-3 py-2 text-sm font-semibold transition",
                    active
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                      : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300",
                  )}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <p className="mt-2 text-xs text-zinc-500">
        입력한 항목만 기록됩니다. 체형 정보와 추천에 바로 반영돼요.
      </p>
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={15} />
          ) : null}
          기록
        </button>
        {msg ? (
          <span
            className={`text-sm font-medium ${
              msg.ok ? "text-emerald-700" : "text-red-600"
            }`}
          >
            {msg.text}
          </span>
        ) : null}
      </div>
    </div>
  );
}
