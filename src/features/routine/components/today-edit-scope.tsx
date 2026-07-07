"use client";

import {
  createContext,
  useContext,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2, X } from "lucide-react";

import {
  deleteConditioningRowAction,
  deleteMainExerciseAction,
} from "@/features/routine/delete-actions";
import { ConfirmDialog } from "@/components/confirm-dialog";

type Ctx = {
  editMode: boolean;
  setEditMode: (b: boolean) => void;
  selectedMain: Set<string>;
  selectedCond: Set<string>;
  toggleMain: (id: string) => void;
  toggleCond: (id: string) => void;
  clear: () => void;
};

const TodayEditCtx = createContext<Ctx | null>(null);

export function TodayEditScope({ children }: { children: ReactNode }) {
  const [editMode, setEditMode] = useState(false);
  const [selectedMain, setSelectedMain] = useState<Set<string>>(new Set());
  const [selectedCond, setSelectedCond] = useState<Set<string>>(new Set());

  function toggleMain(id: string) {
    setSelectedMain((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function toggleCond(id: string) {
    setSelectedCond((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }
  function clear() {
    setSelectedMain(new Set());
    setSelectedCond(new Set());
  }

  return (
    <TodayEditCtx.Provider
      value={{
        editMode,
        setEditMode,
        selectedMain,
        selectedCond,
        toggleMain,
        toggleCond,
        clear,
      }}
    >
      {children}
    </TodayEditCtx.Provider>
  );
}

export function useTodayEdit() {
  const c = useContext(TodayEditCtx);
  if (!c) {
    throw new Error("useTodayEdit must be inside <TodayEditScope>");
  }
  return c;
}

export function TodayEditBar() {
  const router = useRouter();
  const ctx = useTodayEdit();
  const [pending, start] = useTransition();
  const [askDelete, setAskDelete] = useState(false);
  const count = ctx.selectedMain.size + ctx.selectedCond.size;

  function onDelete() {
    if (count === 0) return;
    setAskDelete(true);
  }
  function confirmDelete() {
    setAskDelete(false);
    start(async () => {
      await Promise.all([
        ...Array.from(ctx.selectedMain).map((id) =>
          deleteMainExerciseAction(id),
        ),
        ...Array.from(ctx.selectedCond).map((id) =>
          deleteConditioningRowAction(id),
        ),
      ]);
      ctx.clear();
      ctx.setEditMode(false);
      router.refresh();
    });
  }

  function onCancel() {
    ctx.clear();
    ctx.setEditMode(false);
  }

  if (!ctx.editMode) {
    return (
      <button
        type="button"
        onClick={() => ctx.setEditMode(true)}
        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 transition hover:text-emerald-600 dark:hover:text-emerald-300"
      >
        <Pencil aria-hidden="true" size={13} />
        편집하기
      </button>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        disabled={pending || count === 0}
        onClick={onDelete}
        className="inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/40 px-2 text-xs font-semibold text-red-700 dark:text-red-400 transition hover:bg-red-100 disabled:opacity-50"
      >
        {pending ? (
          <Loader2 aria-hidden="true" className="animate-spin" size={13} />
        ) : (
          <Trash2 aria-hidden="true" size={13} />
        )}
        삭제{count > 0 ? ` (${count})` : ""}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={onCancel}
        className="inline-flex h-7 shrink-0 items-center gap-1 whitespace-nowrap rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-50"
      >
        <X aria-hidden="true" size={13} />
        취소
      </button>
      <ConfirmDialog
        open={askDelete}
        title="운동 삭제"
        message={`선택한 ${count}개 운동을 삭제할까요? 기록·점수에서도 함께 사라집니다.`}
        confirmLabel="삭제"
        tone="danger"
        onConfirm={confirmDelete}
        onCancel={() => setAskDelete(false)}
      />
    </div>
  );
}
