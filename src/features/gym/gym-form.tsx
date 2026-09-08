"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";

import { upsertGymAction } from "@/features/gym/gym-actions";
import {
  defaultGymEquipment,
  type GymCandidate,
} from "@/features/gym/gym-search";
import { GymPicker } from "@/features/gym/components/gym-picker";
import {
  GymEquipmentPicker,
  SelectedGymSummary,
  type GymEquipmentSource,
} from "@/features/gym/components/gym-equipment-picker";

export type GymFormInitial = {
  id: string | null;
  name: string;
  address: string;
  equipmentIds: string[];
};

type Selection = {
  gymId: string | null;
  name: string;
  address: string;
  /** 미리 체크된 값의 출처 — 안내 문구가 달라진다. */
  source: GymEquipmentSource;
};

/**
 * 내 헬스장 설정.
 *
 * 흐름은 **검색 먼저**다. 헬스장을 고르기 전에는 기구 목록을 띄우지 않는다 —
 * 고른 헬스장에 회원이 있으면 그 회원들의 합집합이, 없으면 평균 한국 헬스장
 * 기본 보유기구가 기본 체크로 들어오기 때문이다.
 *
 * 이미 등록된 내 헬스장이 있으면 그 상태(개인 설정)로 바로 시작한다.
 */
export function GymForm({ initial }: { initial: GymFormInitial | null }) {
  const router = useRouter();
  const [selection, setSelection] = useState<Selection | null>(() =>
    initial
      ? {
          gymId: initial.id,
          name: initial.name,
          address: initial.address,
          source: "saved",
        }
      : null,
  );
  const [equipment, setEquipment] = useState<Set<string>>(
    () => new Set(initial?.equipmentIds ?? []),
  );
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTx] = useTransition();

  function pick(candidate: GymCandidate) {
    setErr(null);
    setSelection({
      gymId: candidate.gymId,
      name: candidate.name,
      address: candidate.address,
      source: candidate.equipmentIds.length > 0 ? "union" : "default",
    });
    setEquipment(new Set(defaultGymEquipment(candidate.equipmentIds)));
  }

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
    if (!selection) return;
    setErr(null);
    startTx(async () => {
      const res = await upsertGymAction({
        id: selection.gymId,
        name: selection.name,
        address: selection.address,
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

  if (!selection) {
    return (
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <GymPicker onPick={pick} />
      </section>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <h2 className="mb-3 text-sm font-bold text-zinc-950 dark:text-zinc-100">
          내 헬스장
        </h2>
        <SelectedGymSummary
          name={selection.name}
          address={selection.address}
          onChange={() => {
            setSelection(null);
            setEquipment(new Set());
          }}
        />
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <GymEquipmentPicker
          selected={equipment}
          onToggle={toggle}
          source={selection.source}
        />
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
