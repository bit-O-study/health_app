"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Sparkles, Trash2 } from "lucide-react";

import {
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

type Row = {
  itemId: string;
  duration: string;
  speed: string;
  incline: string;
};

function toRow(r: ConditioningRow): Row {
  return {
    itemId: r.itemId,
    duration: r.durationMin === null ? "" : String(r.durationMin),
    speed: r.speed === null ? "" : String(r.speed),
    incline: r.incline === null ? "" : String(r.incline),
  };
}

const KIND_LABEL: Record<ConditioningKind, string> = {
  warmup: "워밍업",
  cooldown: "마무리",
};

export function ConditioningEditor({
  focus,
  kind,
  initial,
  dailyDate,
}: {
  /** 기본값 편집 모드일 때의 부위. dailyDate 가 있으면 사용하지 않음 */
  focus?: string;
  kind: ConditioningKind;
  initial: ConditioningRow[];
  /** 지정되면 해당 날짜의 오늘만 오버라이드로 저장 */
  dailyDate?: string;
}) {
  const router = useRouter();
  const options = conditioningOptions(kind);
  const [rows, setRows] = useState<Row[]>(initial.map(toRow));
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function update(next: Row[]) {
    setRows(next);
    setMsg(null);
  }

  function addRow() {
    const first = options[0];
    if (!first) return;
    update([
      ...rows,
      {
        itemId: first.id,
        duration: first.defaultMin ? String(first.defaultMin) : "",
        speed: first.defaultSpeed ? String(first.defaultSpeed) : "",
        incline: first.defaultIncline ? String(first.defaultIncline) : "",
      },
    ]);
  }

  function rowsToInput(list: Row[]): ConditioningInput[] {
    return list.map((r) => ({
      itemId: r.itemId,
      durationMin: r.duration.trim() === "" ? null : Number(r.duration),
      speed: r.speed.trim() === "" ? null : Number(r.speed),
      incline: r.incline.trim() === "" ? null : Number(r.incline),
    }));
  }

  function save() {
    start(async () => {
      const items = rowsToInput(rows);
      const res = dailyDate
        ? await saveDailyConditioningAction(dailyDate, kind, items)
        : await saveConditioningAction(focus ?? "", kind, items);
      setMsg(res.ok ? "저장됨" : res.error);
      if (res.ok) router.refresh();
    });
  }

  /** 부위 기본 추천으로 즉시 채우고 저장 */
  function recommend() {
    if (!focus) {
      setMsg("부위 정보가 없어 추천할 수 없습니다.");
      return;
    }
    const ids = defaultsFor(focus as FocusTone, kind);
    const next: Row[] = ids.map((id) => {
      const item = getConditioningItem(id);
      return {
        itemId: id,
        duration: item?.defaultMin ? String(item.defaultMin) : "",
        speed: item?.defaultSpeed ? String(item.defaultSpeed) : "",
        incline: item?.defaultIncline ? String(item.defaultIncline) : "",
      };
    });
    setRows(next);
    start(async () => {
      const items = rowsToInput(next);
      const res = dailyDate
        ? await saveDailyConditioningAction(dailyDate, kind, items)
        : await saveConditioningAction(focus, kind, items);
      setMsg(res.ok ? "추천으로 채워졌습니다" : res.error);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-zinc-800">
          {KIND_LABEL[kind]}
        </h4>
        <div className="flex flex-wrap items-center gap-1.5">
          {focus ? (
            <button
              type="button"
              disabled={pending}
              onClick={recommend}
              className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-md border border-emerald-300 bg-emerald-50 px-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
            >
              <Sparkles aria-hidden="true" size={13} />
              추천으로 채우기
            </button>
          ) : null}
          <button
            type="button"
            onClick={addRow}
            className="inline-flex h-7 items-center gap-1 rounded-md border border-zinc-300 bg-white px-2 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:bg-emerald-50"
          >
            <Plus aria-hidden="true" size={13} />
            추가
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-zinc-500">등록된 항목이 없습니다.</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((row, idx) => {
            const item = getConditioningItem(row.itemId) ?? options[0];
            const params: ConditioningParam[] = item.params ?? [];
            return (
              <div
                key={idx}
                className="flex flex-wrap items-center gap-1.5 rounded-md border border-zinc-200 bg-white p-2"
              >
                <select
                  aria-label="항목"
                  value={row.itemId}
                  onChange={(e) => {
                    const next = [...rows];
                    const nextItem = getConditioningItem(e.target.value);
                    next[idx] = {
                      ...row,
                      itemId: e.target.value,
                      duration: nextItem?.defaultMin
                        ? String(nextItem.defaultMin)
                        : "",
                      speed: nextItem?.defaultSpeed
                        ? String(nextItem.defaultSpeed)
                        : "",
                      incline: nextItem?.defaultIncline
                        ? String(nextItem.defaultIncline)
                        : "",
                    };
                    update(next);
                  }}
                  className="h-8 min-w-[8rem] flex-1 basis-full rounded border border-zinc-300 bg-white px-2 text-sm sm:basis-auto"
                >
                  {options.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>

                {params.map((p) => (
                  <span key={p} className="flex items-center gap-1">
                    <input
                      aria-label={PARAM_LABEL[p]}
                      type="number"
                      inputMode="decimal"
                      value={
                        p === "duration"
                          ? row.duration
                          : p === "speed"
                            ? row.speed
                            : row.incline
                      }
                      onChange={(e) => {
                        const next = [...rows];
                        const v = e.target.value;
                        next[idx] = {
                          ...row,
                          ...(p === "duration"
                            ? { duration: v }
                            : p === "speed"
                              ? { speed: v }
                              : { incline: v }),
                        };
                        update(next);
                      }}
                      placeholder={PARAM_LABEL[p]}
                      className="h-8 w-16 rounded border border-zinc-300 bg-white px-2 text-center text-sm"
                    />
                    <span className="text-xs text-zinc-500">
                      {PARAM_UNIT[p]}
                    </span>
                  </span>
                ))}

                <button
                  type="button"
                  aria-label="삭제"
                  onClick={() =>
                    update(rows.filter((_, i) => i !== idx))
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 transition hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 aria-hidden="true" size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={save}
          className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-zinc-900 px-3 text-xs font-semibold text-white transition hover:bg-zinc-700 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={13} />
          ) : null}
          저장
        </button>
        {msg ? (
          <span className="text-xs font-medium text-zinc-600">{msg}</span>
        ) : null}
      </div>
    </div>
  );
}
