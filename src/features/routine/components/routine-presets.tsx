"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Download, Loader2, Save, Trash2 } from "lucide-react";

import {
  deleteRoutinePresetAction,
  loadRoutinePresetAction,
  saveRoutinePresetAction,
} from "@/features/routine/preset-actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import type { RoutinePresetSummary } from "@/features/routine/presets";

export function RoutinePresets({
  presets,
}: {
  presets: RoutinePresetSummary[];
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [loadTarget, setLoadTarget] = useState<RoutinePresetSummary | null>(
    null,
  );
  const [deleteTarget, setDeleteTarget] =
    useState<RoutinePresetSummary | null>(null);

  function save() {
    setError(null);
    start(async () => {
      const res = await saveRoutinePresetAction(name);
      if (res.ok) {
        setName("");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function confirmLoad() {
    const t = loadTarget;
    setLoadTarget(null);
    if (!t) return;
    start(async () => {
      const res = await loadRoutinePresetAction(t.id);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  function confirmDelete() {
    const t = deleteTarget;
    setDeleteTarget(null);
    if (!t) return;
    start(async () => {
      const res = await deleteRoutinePresetAction(t.id);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <section className="app-card p-3">
      {/* 설명 문단은 뺐다(2026-09-16 촘촘하게) — 입력칸 + '현재 루틴 저장' 버튼이 스스로 설명한다. */}
      <div className="mb-2 flex items-center gap-1.5">
        <Bookmark
          aria-hidden="true"
          className="text-zinc-500 dark:text-zinc-400"
          size={16}
        />
        <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">
          루틴 프리셋
        </h2>
      </div>

      {/* 현재 루틴 저장 */}
      <div className="flex items-center gap-2">
        <input
          aria-label="프리셋 이름"
          type="text"
          value={name}
          maxLength={60}
          placeholder="예: 가슴 집중 루틴"
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          disabled={pending}
          className="h-10 min-w-0 flex-1 rounded-[10px] bg-zinc-100 px-3 text-sm text-zinc-800 outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-brand/40 dark:bg-white/[0.08] dark:text-zinc-200"
        />
        <button
          type="button"
          onClick={save}
          disabled={pending || name.trim() === ""}
          className="app-press inline-flex h-10 shrink-0 items-center gap-1 rounded-[10px] bg-brand px-3 text-sm font-semibold text-white dark:text-zinc-950 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={15} />
          ) : (
            <Save aria-hidden="true" size={15} />
          )}
          현재 루틴 저장
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {/* 저장된 프리셋 목록 */}
      {presets.length > 0 ? (
        <ul className="mt-2 divide-y divide-[var(--line)]">
          {presets.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-2 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {p.name}
                </p>
                <p className="text-xs text-zinc-500">운동 {p.exerciseCount}개</p>
              </div>
              <button
                type="button"
                onClick={() => setLoadTarget(p)}
                disabled={pending}
                className="app-press inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-zinc-100 px-3 text-xs font-semibold text-brand disabled:opacity-50 dark:bg-white/[0.08]"
              >
                <Download aria-hidden="true" size={14} />
                불러오기
              </button>
              <button
                type="button"
                aria-label="삭제"
                onClick={() => setDeleteTarget(p)}
                disabled={pending}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-zinc-400 transition hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 disabled:opacity-50"
              >
                <Trash2 aria-hidden="true" size={15} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-zinc-500">아직 저장된 프리셋이 없습니다.</p>
      )}

      <ConfirmDialog
        open={loadTarget !== null}
        title="프리셋 불러오기"
        message={`'${loadTarget?.name ?? ""}' 프리셋으로 현재 루틴을 덮어씁니다. 지금 등록된 운동 구성이 이 프리셋으로 교체됩니다. 계속할까요?`}
        confirmLabel="불러오기"
        tone="default"
        onConfirm={confirmLoad}
        onCancel={() => setLoadTarget(null)}
      />
      <ConfirmDialog
        open={deleteTarget !== null}
        title="프리셋 삭제"
        message={`'${deleteTarget?.name ?? ""}' 프리셋을 삭제할까요?`}
        confirmLabel="삭제"
        tone="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  );
}
