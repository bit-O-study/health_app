"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";

import {
  conditioningDefaults,
  conditioningOptions,
  defaultsFor,
  getConditioningItem,
  PARAM_LABEL,
  PARAM_UNIT,
  type ConditioningKind,
  type ConditioningParam,
} from "@/features/routine/conditioning-catalog";
import type { FocusTone } from "@/features/routine/data";
import {
  saveConditioningAction,
  type ConditioningInput,
} from "@/features/routine/conditioning-actions";
import { saveDailyConditioningAction } from "@/features/routine/daily-conditioning-actions";
import type { ConditioningRow } from "@/features/routine/conditioning";
import { ExerciseSearchSelect } from "@/features/routine/components/exercise-search-select";
import type { ConditioningMutationState } from "@/features/routine/plan-editor-mutation-state";

type Row = {
  itemId: string;
  duration: string;
  speed: string;
  incline: string;
  sets: string;
  reps: string;
};

const str = (n: number | null | undefined) =>
  n === null || n === undefined ? "" : String(n);

function toRow(r: ConditioningRow): Row {
  return {
    itemId: r.itemId,
    duration: str(r.durationMin),
    speed: str(r.speed),
    incline: str(r.incline),
    sets: str(r.sets),
    reps: str(r.reps),
  };
}

/** 항목 선택/추가 시 그 항목의 기본값으로 채운 행. */
function defaultsRow(itemId: string): Row {
  const d = conditioningDefaults(itemId);
  return {
    itemId,
    duration: str(d.durationMin),
    speed: str(d.speed),
    incline: str(d.incline),
    sets: str(d.sets),
    reps: str(d.reps),
  };
}

/** 파라미터 → 행 필드 키. */
const FIELD: Record<ConditioningParam, keyof Row> = {
  duration: "duration",
  speed: "speed",
  incline: "incline",
  sets: "sets",
  reps: "reps",
};

const KIND_LABEL: Record<ConditioningKind, string> = {
  warmup: "워밍업",
  cooldown: "마무리",
};

export function ConditioningEditor({
  focus,
  kind,
  initial,
  dailyDate,
  lockWeightReps = false,
  recommendFocuses,
  hideRecommend = false,
  mutationKey,
  onMutationStateChange,
}: {
  /** 기본값 편집 모드일 때의 부위. dailyDate 가 있으면 사용하지 않음 */
  focus?: string;
  kind: ConditioningKind;
  initial: ConditioningRow[];
  /** 지정되면 해당 날짜의 오늘만 오버라이드로 저장 */
  dailyDate?: string;
  /** 시간·속도·경사 고정. false 면 입력란 숨기고 운동모드에서 설정. */
  lockWeightReps?: boolean;
  /** '추천으로 채우기' 시 이 부위들 전체의 추천을 합쳐 채운다(오늘만 변경 다부위). */
  recommendFocuses?: FocusTone[];
  /** 직접 담기 등 순수 수동 모드 — '추천으로 채우기' 버튼을 숨긴다. */
  hideRecommend?: boolean;
  /** /plan 부모가 팔 교환 전 미저장·저장중 상태를 함께 조정할 때 사용. */
  mutationKey?: string;
  onMutationStateChange?: (
    key: string,
    state: ConditioningMutationState | null,
  ) => void;
}) {
  const router = useRouter();
  const options = conditioningOptions(kind);
  const [rows, setRows] = useState<Row[]>(initial.map(toRow));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!mutationKey || !onMutationStateChange) return;
    onMutationStateChange(mutationKey, { dirty, pending });
  }, [dirty, mutationKey, onMutationStateChange, pending]);

  useEffect(() => {
    if (!mutationKey || !onMutationStateChange) return;
    return () => onMutationStateChange(mutationKey, null);
  }, [mutationKey, onMutationStateChange]);

  function update(next: Row[]) {
    setRows(next);
    setDirty(true);
    if (mutationKey && onMutationStateChange) {
      onMutationStateChange(mutationKey, { dirty: true, pending });
    }
    setMsg(null);
  }

  function addRow() {
    const first = options[0];
    if (!first) return;
    update([...rows, defaultsRow(first.id)]);
  }

  function rowsToInput(list: Row[]): ConditioningInput[] {
    const n = (s: string) => (s.trim() === "" ? null : Number(s));
    return list.map((r) => ({
      itemId: r.itemId,
      durationMin: n(r.duration),
      speed: n(r.speed),
      incline: n(r.incline),
      sets: n(r.sets),
      reps: n(r.reps),
    }));
  }

  function save() {
    if (mutationKey && onMutationStateChange) {
      onMutationStateChange(mutationKey, { dirty, pending: true });
    }
    start(async () => {
      const items = rowsToInput(rows);
      const res = dailyDate
        ? await saveDailyConditioningAction(dailyDate, kind, items)
        : await saveConditioningAction(focus ?? "", kind, items);
      setMsg(res.ok ? "저장됨" : res.error);
      if (res.ok) {
        setDirty(false);
        router.refresh();
      }
    });
  }

  /** 부위 기본 추천으로 행을 채움 — 여러 부위면 합쳐서(중복 itemId 제거). */
  function recommend() {
    const targets: FocusTone[] =
      recommendFocuses && recommendFocuses.length > 0
        ? recommendFocuses
        : focus
          ? [focus as FocusTone]
          : [];
    if (targets.length === 0) {
      setMsg("부위 정보가 없어 추천할 수 없습니다.");
      return;
    }
    const seen = new Set<string>();
    const ids: string[] = [];
    for (const f of targets) {
      for (const id of defaultsFor(f, kind)) {
        if (!seen.has(id)) {
          seen.add(id);
          ids.push(id);
        }
      }
    }
    update(ids.map((id) => defaultsRow(id)));
  }

  return (
    <fieldset
      disabled={pending}
      aria-busy={pending}
      data-testid={mutationKey ? `conditioning-editor-${mutationKey}` : undefined}
      className="m-0 min-w-0 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900"
    >
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
          {KIND_LABEL[kind]}
        </h4>
        <div className="flex flex-wrap items-center gap-1.5">
          {!hideRecommend &&
          (focus || (recommendFocuses && recommendFocuses.length > 0)) ? (
            <button
              type="button"
              disabled={pending}
              onClick={recommend}
              className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-md border border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 px-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 transition hover:bg-emerald-100 dark:hover:bg-emerald-900/30 disabled:opacity-60"
            >
              <Sparkles aria-hidden="true" size={13} />
              추천으로 채우기
            </button>
          ) : null}
          <button
            type="button"
            onClick={addRow}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
          >
            <Plus aria-hidden="true" size={13} />
            추가
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          등록된 항목이 없습니다.
        </p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((row, idx) => {
            const item = getConditioningItem(row.itemId) ?? options[0];
            const params: ConditioningParam[] = item.params ?? [];
            return (
              <div
                key={idx}
                className="flex flex-wrap items-center gap-1.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-2"
              >
                <div className="basis-full sm:basis-auto sm:flex-1">
                  <ExerciseSearchSelect
                    ariaLabel="항목"
                    options={options}
                    value={row.itemId}
                    onChange={(id) => {
                      const next = [...rows];
                      next[idx] = defaultsRow(id);
                      update(next);
                    }}
                  />
                </div>

                {lockWeightReps
                  ? params.map((p) => (
                      <span key={p} className="flex items-center gap-1">
                        <input
                          aria-label={PARAM_LABEL[p]}
                          type="number"
                          inputMode="decimal"
                          value={row[FIELD[p]]}
                          onChange={(e) => {
                            const next = [...rows];
                            next[idx] = { ...row, [FIELD[p]]: e.target.value };
                            update(next);
                          }}
                          placeholder={PARAM_LABEL[p]}
                          className="h-8 w-16 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 text-center text-sm"
                        />
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {PARAM_UNIT[p]}
                        </span>
                      </span>
                    ))
                  : null}

                <button
                  type="button"
                  aria-label="삭제"
                  onClick={() => update(rows.filter((_, i) => i !== idx))}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 dark:text-zinc-500 transition hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600"
                >
                  <Trash2 aria-hidden="true" size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {!lockWeightReps && rows.length > 0 ? (
        <p className="mt-2 text-[11px] text-zinc-500 dark:text-zinc-400">
          시간·속도·경사는 <b>운동 모드</b>에서 그때그때 설정해요. (설정 ▸ 무게·횟수
          고정을 켜면 여기서 직접 입력)
        </p>
      ) : null}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-zinc-900 dark:bg-zinc-100 px-3 text-xs font-semibold text-white dark:text-zinc-900 transition hover:bg-zinc-700 dark:hover:bg-white disabled:opacity-60"
        >
          {pending ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={13} />
          ) : null}
          저장
        </button>
        {msg ? (
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            {msg}
          </span>
        ) : null}
      </div>
    </fieldset>
  );
}
