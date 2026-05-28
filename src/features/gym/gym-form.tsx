"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Save } from "lucide-react";

import {
  GYM_EQUIPMENT_GROUPS,
  DEFAULT_KOREAN_GYM_EQUIPMENT,
} from "@/features/gym/gym-equipment-catalog";
import { upsertGymAction } from "@/features/gym/gym-actions";

export type GymFormInitial = {
  id: string | null;
  name: string;
  address: string;
  equipmentIds: string[];
};

/**
 * 헬스장 정보 입력 폼.
 * - 신규: initial.id === null, equipmentIds 는 DEFAULT_KOREAN_GYM_EQUIPMENT 추천
 * - 수정: 기존 값을 그대로 prefill
 */
export function GymForm({ initial }: { initial: GymFormInitial | null }) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [equipment, setEquipment] = useState<Set<string>>(
    () =>
      new Set(
        initial?.equipmentIds ??
          (DEFAULT_KOREAN_GYM_EQUIPMENT as readonly string[]),
      ),
  );
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTx] = useTransition();

  function toggle(id: string) {
    setEquipment((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    startTx(async () => {
      const res = await upsertGymAction({
        id: initial?.id ?? null,
        name,
        address,
        equipmentIds: Array.from(equipment),
      });
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      router.push("/settings");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold text-zinc-950 dark:text-zinc-100">
          기본 정보
        </h2>
        <label className="block">
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            헬스장 이름
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="예: 강남 OO 헬스"
            maxLength={100}
            className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none"
          />
        </label>
        <label className="mt-3 block">
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            주소 (선택)
          </span>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="예: 서울 강남구 ..."
            maxLength={200}
            className="mt-1 block w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-950 dark:text-zinc-100 focus:border-emerald-500 focus:outline-none"
          />
        </label>
      </section>

      <section className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5 shadow-sm">
        <h2 className="text-sm font-bold text-zinc-950 dark:text-zinc-100">
          보유 기구
        </h2>
        <p className="mb-4 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          평균 한국 헬스장 기준 자주 보이는 기구가 미리 체크돼 있어요. 없는 것만
          체크 해제해주세요.
        </p>
        <div className="space-y-4">
          {GYM_EQUIPMENT_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map((it) => {
                  const on = equipment.has(it.id);
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => toggle(it.id)}
                      aria-pressed={on}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        on
                          ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                          : "border-zinc-300 bg-white text-zinc-600 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-400"
                      }`}
                    >
                      {on ? <Check aria-hidden="true" size={12} /> : null}
                      {it.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      {err ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          {err}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
      >
        <Save aria-hidden="true" size={16} />
        {pending ? "저장 중…" : initial?.id ? "저장" : "등록"}
      </button>
    </form>
  );
}
