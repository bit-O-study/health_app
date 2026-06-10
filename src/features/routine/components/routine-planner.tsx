"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Loader2,
  Moon,
  Pencil,
  Plus,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  composeDayPlan,
  CUSTOM_SPLITS,
  CUSTOM_VARIANT_ID,
  DAY_BLOCKS,
  DAY_LABELS,
  DEFAULT_CUSTOM_WEEK,
  DEFAULT_SPLITS,
  DEFAULT_VARIANT_ID,
  MUSCLE_BLOCK_GROUPS,
  normalizeCustomWeek,
  SPLIT_PRESETS,
  TONE_STYLES,
  type DayBlockId,
  type RoutineVariant,
} from "@/features/routine/data";
import type {
  RoutineFillMode,
  SaveRoutineResult,
} from "@/features/routine/actions";

type RoutinePlannerProps = {
  initialSplits?: number;
  initialVariantId?: string;
  /** variantId 가"custom" 일 때의 초기 주간 — 신/구 포맷 모두 허용 */
  initialCustomWeek?: DayBlockId[][] | DayBlockId[] | null;
  /** 제공되면"이 루틴으로 저장" 버튼을 노출 */
  saveAction?: (
    splits: number,
    variantId: string,
    customWeek?: DayBlockId[][] | null,
    fillMode?: RoutineFillMode,
  ) => Promise<SaveRoutineResult>;
  /** 저장 성공 시 이동할 경로 — 추천 채우기는 메인("/"), 직접 등록은 이 경로(보통"/plan") */
  redirectOnSuccess?: string;
};

/** 단일 선택 시 쓸 수 있는"세션 그룹"(부위가 아니라 묶음). 주 부위 select 에서만 노출. */
const SESSION_GROUPS: DayBlockId[] = ["fullbody", "upper", "push", "pull"];

export function RoutinePlanner({
  initialSplits = DEFAULT_SPLITS,
  initialVariantId = DEFAULT_VARIANT_ID,
  initialCustomWeek = null,
  saveAction,
  redirectOnSuccess,
}: RoutinePlannerProps = {}) {
  const router = useRouter();
  const [splits, setSplits] = useState(initialSplits);
  const [variantId, setVariantId] = useState(initialVariantId);
  const [customWeek, setCustomWeek] = useState<DayBlockId[][]>(
    normalizeCustomWeek(initialCustomWeek) ?? DEFAULT_CUSTOM_WEEK,
  );
  const [isSaving, startSaving] = useTransition();
  const [saveStatus, setSaveStatus] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  /** 저장 시 본운동/워밍업/마무리 자동 채우기 방식 — 기본은 추천 */
  const [fillMode, setFillMode] = useState<RoutineFillMode>("recommend");

  const isCustom = variantId === CUSTOM_VARIANT_ID;

  const preset =
    SPLIT_PRESETS.find((item) => item.splits === splits) ?? SPLIT_PRESETS[0];

  const variant: RoutineVariant =
    preset.variants.find((item) => item.id === variantId) ?? preset.variants[0];

  /** 미리보기 주간: 커스텀이면 composeDayPlan, 아니면 변형에서 */
  const previewWeek = isCustom ? customWeek.map(composeDayPlan) : variant.week;

  const trainingDays = previewWeek.filter((day) => day.tone !== "rest").length;
  const summary = {
    trainingDays,
    restDays: previewWeek.length - trainingDays,
  };

  function handleSelectSplit(nextSplits: number) {
    const nextPreset = SPLIT_PRESETS.find((item) => item.splits === nextSplits);
    if (!nextPreset) return;
    setSplits(nextSplits);
    setVariantId(nextPreset.variants[0].id);
    setSaveStatus(null);
  }

  function handleSelectCustom() {
    setVariantId(CUSTOM_VARIANT_ID);
    setSaveStatus(null);
  }

  function handleSelectVariant(nextVariantId: string) {
    setVariantId(nextVariantId);
    setSaveStatus(null);
  }

  function setDayBlocks(index: number, blocks: DayBlockId[]) {
    setCustomWeek((prev) => {
      const next = [...prev];
      next[index] = blocks.length === 0 ? ["rest"] : blocks;
      return next;
    });
    setSaveStatus(null);
  }

  function setDayPrimary(index: number, blockId: DayBlockId) {
    // 첫 블록 교체. rest 선택하면 그 날은 휴식으로 단일화.
    if (blockId === "rest") {
      setDayBlocks(index, ["rest"]);
      return;
    }
    setCustomWeek((prev) => {
      const cur = prev[index].filter((b) => b !== "rest");
      // 새 부위가 이미 있으면 그대로, 없으면 첫 자리에 교체
      const next = cur.includes(blockId) ? cur : [blockId, ...cur.slice(1)];
      const out = [...prev];
      out[index] = next.length === 0 ? ["rest"] : next;
      return out;
    });
    setSaveStatus(null);
  }

  function addDayBlock(index: number, blockId: DayBlockId) {
    if (blockId === "rest") return;
    setCustomWeek((prev) => {
      const cur = prev[index].filter((b) => b !== "rest");
      if (cur.includes(blockId)) return prev;
      if (cur.length >= 3) return prev; // 한 날 최대 3 부위
      const out = [...prev];
      out[index] = [...cur, blockId];
      return out;
    });
    setSaveStatus(null);
  }

  function removeDayBlock(index: number, blockId: DayBlockId) {
    setCustomWeek((prev) => {
      const next = prev[index].filter((b) => b !== blockId);
      const out = [...prev];
      out[index] = next.length === 0 ? ["rest"] : next;
      return out;
    });
    setSaveStatus(null);
  }

  function handleSave() {
    if (!saveAction) return;
    startSaving(async () => {
      const result = isCustom
        ? await saveAction(
            CUSTOM_SPLITS,
            CUSTOM_VARIANT_ID,
            customWeek,
            fillMode,
          )
        : await saveAction(splits, variant.id, null, fillMode);
      if (result.ok) {
        // 추천 = 운동까지 완비 → 운동 화면(/routine). 근육별 = 3D 마네킹. 직접 = /plan.
        // ("/" 는 운동/파워리프팅 모드 선택 랜딩이라 운동이 안 보임 — /routine 으로 직접 이동)
        const target =
          fillMode === "recommend"
            ? "/routine"
            : fillMode === "byMuscle"
              ? "/plan/muscle"
              : redirectOnSuccess;
        if (target) {
          router.push(target);
          router.refresh();
          return;
        }
      }
      setSaveStatus(
        result.ok
          ? {
              ok: true,
              message: "루틴을 저장했습니다. 메인에서 오늘 운동을 확인하세요.",
            }
          : { ok: false, message: result.error },
      );
    });
  }

  return (
    <section className="rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-6 shadow-sm sm:p-7">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
          <CalendarDays aria-hidden="true" size={20} />
          <p className="text-sm font-semibold uppercase tracking-wide">
            My routine
          </p>
        </div>
        <h2 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100 sm:text-3xl">
          나의 루틴
        </h2>
        <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          주당 운동 일수를 고르면 7일 주기 계획이 자동으로 채워집니다. 1·2일
          루틴이나 원하는 구성이 없으면 <strong>커스텀</strong>으로 직접 정할 수
          있어요.
        </p>
      </div>

      {/* 루틴 선택 */}
      <div className="mt-6">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          루틴 선택
        </p>
        <div className="flex flex-wrap gap-2">
          {SPLIT_PRESETS.map((item) => {
            const active = !isCustom && item.splits === splits;
            return (
              <button
                key={item.splits}
                type="button"
                onClick={() => handleSelectSplit(item.splits)}
                className={cn(
                  "whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition",
                  active
                    ? "border-emerald-600 bg-emerald-600 text-white"
                    : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30",
                )}
              >
                {item.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={handleSelectCustom}
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition",
              isCustom
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-dashed border-zinc-400 dark:border-zinc-500 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30",
            )}
          >
            <Pencil aria-hidden="true" size={14} />
            커스텀
          </button>
        </div>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {isCustom
            ? "7일 주기를 직접 부위별로 채우는 나만의 루틴"
            : preset.tagline}
        </p>
      </div>

      {isCustom ? (
        /* 커스텀 빌더 — 주기 일자별 부위 (1개 이상) 지정. 멀티 부위 = "가슴 + 팔" 같은 묶음 */
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            일자별 부위 지정 — 한 날에 부위 여러 개 묶기 가능 (최대 3)
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {DAY_LABELS.map((dayLabel, index) => (
              <DayBlockEditor
                key={dayLabel}
                weekday={dayLabel}
                blocks={customWeek[index]}
                onSetPrimary={(id) => setDayPrimary(index, id)}
                onAdd={(id) => addDayBlock(index, id)}
                onRemove={(id) => removeDayBlock(index, id)}
              />
            ))}
          </div>
        </div>
      ) : (
        /* 변형 선택 */
        <div className="mt-5">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
            나누는 방식
          </p>
          <div className="flex flex-wrap gap-2">
            {preset.variants.map((item) => {
              const active = item.id === variant.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectVariant(item.id)}
                  className={cn(
                    "whitespace-nowrap rounded-md border px-3 py-2 text-left text-sm font-semibold transition",
                    active
                      ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
                      : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30",
                  )}
                >
                  {item.name}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
            {variant.description}
          </p>
        </div>
      )}

      {/* 주기 그리드 (프리셋·커스텀 공통 미리보기) */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {DAY_LABELS.map((dayLabel, index) => {
          const day = previewWeek[index];
          const style = TONE_STYLES[day.tone];
          const isRest = day.tone === "rest";

          return (
            <div
              key={dayLabel}
              className={cn("flex flex-col rounded-lg border p-3", style.card)}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {dayLabel}
                </span>
                {isRest ? (
                  <Moon
                    aria-hidden="true"
                    className="text-zinc-400 dark:text-zinc-500"
                    size={16}
                  />
                ) : (
                  <Dumbbell
                    aria-hidden="true"
                    className="text-zinc-500 dark:text-zinc-400"
                    size={16}
                  />
                )}
              </div>

              <span
                className={cn(
                  "mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                  style.badge,
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 shrink-0 rounded-full",
                    style.dot,
                  )}
                />
                <span className="min-w-0 truncate">{day.focus}</span>
              </span>

              {isRest ? (
                <p className="mt-3 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                  근육 회복일 — 가벼운 스트레칭이나 걷기 권장
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      자극 부위
                    </p>
                    <p className="mt-0.5 break-keep text-xs leading-5 text-zinc-700 dark:text-zinc-300">
                      {day.muscles.join(", ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      대표 운동
                    </p>
                    <ul className="mt-0.5 space-y-0.5">
                      {day.examples.map((example) => (
                        <li
                          key={example}
                          className="break-keep text-xs leading-5 text-zinc-700 dark:text-zinc-300"
                        >
                          · {example}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-zinc-600 dark:text-zinc-400">
        <span>
          주{" "}
          <strong className="text-zinc-900 dark:text-zinc-100">
            {summary.trainingDays}
          </strong>
          회 운동
        </span>
        <span>
          휴식{" "}
          <strong className="text-zinc-900 dark:text-zinc-100">
            {summary.restDays}
          </strong>
          일
        </span>
        <span className="text-zinc-400 dark:text-zinc-500">
          {isCustom
            ? "커스텀 루틴"
            : `${preset.label} · ${variant.name}`}
        </span>
      </div>

      {saveAction ? (
        <div className="mt-6 flex flex-col gap-4 border-t border-zinc-200 dark:border-zinc-700 pt-5">
          <fieldset>
            <legend className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              운동 선택 방식
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              <label
                data-testid="fillmode-recommend"
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm transition",
                  fillMode === "recommend"
                    ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
                    : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-700",
                )}
              >
                <input
                  type="radio"
                  name="fillMode"
                  value="recommend"
                  checked={fillMode === "recommend"}
                  onChange={() => setFillMode("recommend")}
                  className="mt-0.5 accent-emerald-600"
                />
                <span className="min-w-0">
                  <span className="block font-semibold text-zinc-900 dark:text-zinc-100">
                    추천으로 운동선택
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-zinc-600 dark:text-zinc-400">
                    체형·성별·경력에 맞춘 본운동과 워밍업/마무리까지 한 번에
                    채웁니다.
                  </span>
                </span>
              </label>
              <label
                data-testid="fillmode-manual"
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm transition",
                  fillMode === "manual"
                    ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
                    : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-700",
                )}
              >
                <input
                  type="radio"
                  name="fillMode"
                  value="manual"
                  checked={fillMode === "manual"}
                  onChange={() => setFillMode("manual")}
                  className="mt-0.5 accent-emerald-600"
                />
                <span className="min-w-0">
                  <span className="block font-semibold text-zinc-900 dark:text-zinc-100">
                    직접 운동선택
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-zinc-600 dark:text-zinc-400">
                    아무것도 자동으로 채우지 않습니다. 운동 등록 화면에서 직접
                    골라 넣습니다.
                  </span>
                </span>
              </label>
              <label
                data-testid="fillmode-byMuscle"
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-lg border p-3 text-sm transition",
                  fillMode === "byMuscle"
                    ? "border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40"
                    : "border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 hover:border-emerald-300 dark:hover:border-emerald-700",
                )}
              >
                <input
                  type="radio"
                  name="fillMode"
                  value="byMuscle"
                  checked={fillMode === "byMuscle"}
                  onChange={() => setFillMode("byMuscle")}
                  className="mt-0.5 accent-emerald-600"
                />
                <span className="min-w-0">
                  <span className="block font-semibold text-zinc-900 dark:text-zinc-100">
                    근육별로 운동선택
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-zinc-600 dark:text-zinc-400">
                    3D 마네킹을 돌려 근육 부위를 누르고 그 부위 운동을 직접
                    골라 담습니다.
                  </span>
                </span>
              </label>
            </div>
          </fieldset>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              {saveStatus ? (
                <p
                  className={cn(
                    "font-medium",
                    saveStatus.ok
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400",
                  )}
                >
                  {saveStatus.message}
                </p>
              ) : (
                <p className="text-zinc-500 dark:text-zinc-400">
                  {fillMode === "recommend"
                    ? "저장 후 메인 화면에서 오늘 운동을 확인하세요."
                    : fillMode === "byMuscle"
                      ? "저장 후 3D 마네킹에서 근육별로 운동을 골라 담으세요."
                      : "저장 후 운동 등록 화면에서 부위별로 직접 채워 넣으세요."}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-400"
            >
              {isSaving ? (
                <Loader2
                  aria-hidden="true"
                  className="animate-spin"
                  size={17}
                />
              ) : (
                <Check aria-hidden="true" size={17} />
              )}
              저장
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

/**
 * 요일별 부위 편집 카드.
 * - 첫 부위 → 셀렉트로 직접 변경 (rest 선택 시 그 날을 휴식으로 단일화)
 * - 추가 부위는 칩 + ×, 옆에"+ 부위 추가" 드롭다운으로 더하기
 * -"한 날 최대 3 부위" 제약은 부모에서 처리
 */
function DayBlockEditor({
  weekday,
  blocks,
  onSetPrimary,
  onAdd,
  onRemove,
}: {
  weekday: string;
  blocks: DayBlockId[];
  onSetPrimary: (id: DayBlockId) => void;
  onAdd: (id: DayBlockId) => void;
  onRemove: (id: DayBlockId) => void;
}) {
  const primary = blocks[0] ?? "rest";
  const extras = blocks.slice(1).filter((b) => b !== "rest");
  const isRest = primary === "rest";
  const style = TONE_STYLES[DAY_BLOCKS[primary].day.tone];

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 p-3">
      <div className="flex items-center gap-2">
        <span className="w-6 text-sm font-bold text-zinc-900 dark:text-zinc-100">
          {weekday}
        </span>
        <span className={cn("h-2 w-2 shrink-0 rounded-full", style.dot)} />
        <select
          aria-label={`${weekday}요일 첫 부위`}
          value={primary}
          onChange={(e) => onSetPrimary(e.target.value as DayBlockId)}
          className="h-9 min-w-0 flex-1 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        >
          <option value="rest">휴식</option>
          {MUSCLE_BLOCK_GROUPS.map((g) => (
            <optgroup key={g.whole} label={g.label}>
              <option value={g.whole}>{g.label} 전체</option>
              {g.subs.map((s) => (
                <option key={s} value={s}>
                  {DAY_BLOCKS[s].label}
                </option>
              ))}
            </optgroup>
          ))}
          <optgroup label="묶음">
            {SESSION_GROUPS.map((s) => (
              <option key={s} value={s}>
                {DAY_BLOCKS[s].label}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {!isRest ? (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {extras.map((b) => (
            <span
              key={b}
              className="inline-flex items-center gap-1 rounded-full bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300"
            >
              + {DAY_BLOCKS[b].label}
              <button
                type="button"
                aria-label={`${DAY_BLOCKS[b].label} 제거`}
                onClick={() => onRemove(b)}
                className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-emerald-700 dark:text-emerald-400 transition hover:bg-emerald-200"
              >
                <X aria-hidden="true" size={11} />
              </button>
            </span>
          ))}

          {blocks.filter((b) => b !== "rest").length < 3 ? (
            <AddBlockMenu blocks={blocks} onAdd={onAdd} />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/**"+ 부위 추가" — 2단 드릴다운.
 * 1단계: 부위(가슴/등/…) 선택 → 2단계: "전체" 또는 세부근육(상부/하부, 이두/삼두 등).
 * 세부근육과 전체를 한 화면에 늘어놓지 않아 정신없지 않게 한다. */
function AddBlockMenu({
  blocks,
  onAdd,
}: {
  blocks: DayBlockId[];
  onAdd: (id: DayBlockId) => void;
}) {
  const [open, setOpen] = useState(false);
  // 드릴다운 중인 부위(whole id). null 이면 1단계(부위 목록).
  const [groupId, setGroupId] = useState<DayBlockId | null>(null);

  function reset() {
    setOpen(false);
    setGroupId(null);
  }
  function pick(id: DayBlockId) {
    onAdd(id);
    reset();
  }

  // 이미 담긴 블록은 제외. 고를 게 남은 부위 그룹만 노출.
  const groups = MUSCLE_BLOCK_GROUPS.map((g) => ({
    ...g,
    options: [g.whole, ...g.subs].filter((id) => !blocks.includes(id)),
  })).filter((g) => g.options.length > 0);

  if (groups.length === 0) return null;
  const active = groups.find((g) => g.whole === groupId) ?? null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setGroupId(null);
        }}
        className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-zinc-400 dark:border-zinc-500 bg-white dark:bg-zinc-800 px-2 py-0.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 transition hover:border-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-400"
      >
        <Plus aria-hidden="true" size={11} />
        부위 추가
      </button>
      {open ? (
        <>
          {/* 바깥 클릭 닫기 */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={reset}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute left-0 top-full z-20 mt-1 flex w-44 flex-col rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-1 shadow-lg">
            {active === null ? (
              // 1단계: 부위 선택
              groups.map((g) => {
                const hasSubs =
                  g.subs.filter((s) => g.options.includes(s)).length > 0;
                return (
                  <button
                    key={g.whole}
                    type="button"
                    onClick={() =>
                      hasSubs ? setGroupId(g.whole) : pick(g.whole)
                    }
                    className="flex items-center justify-between rounded px-2 py-1.5 text-left text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-700 dark:hover:text-emerald-400"
                  >
                    {g.label}
                    {hasSubs ? (
                      <ChevronRight aria-hidden="true" size={13} />
                    ) : null}
                  </button>
                );
              })
            ) : (
              // 2단계: 전체 / 세부근육
              <>
                <button
                  type="button"
                  onClick={() => setGroupId(null)}
                  className="mb-0.5 flex items-center gap-1 rounded px-2 py-1.5 text-left text-[11px] font-semibold text-zinc-500 transition hover:bg-zinc-100 dark:hover:bg-zinc-700"
                >
                  <ChevronLeft aria-hidden="true" size={13} />
                  {active.label}
                </button>
                {active.options.includes(active.whole) ? (
                  <button
                    type="button"
                    onClick={() => pick(active.whole)}
                    className="rounded px-2 py-1.5 text-left text-xs font-semibold text-emerald-700 dark:text-emerald-400 transition hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                  >
                    {active.label} 전체
                  </button>
                ) : null}
                {active.subs
                  .filter((s) => active.options.includes(s))
                  .map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => pick(s)}
                      className="rounded px-2 py-1.5 text-left text-xs font-medium text-zinc-700 dark:text-zinc-300 transition hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-700 dark:hover:text-emerald-400"
                    >
                      {DAY_BLOCKS[s].label}
                    </button>
                  ))}
              </>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
