"use client";

/**
 * 근육별 운동선택 — 3D 마네킹에서 부위/세부근육을 누르면 그 근육에 특화된 운동이
 * 뜨고, 운동을 탭해 담은 뒤 저장하면 루틴에 등록된다.
 *
 * 2단 드릴다운: 부위(가슴/등/…) → 세부근육(이두 장두/단두 등). 세부근육을 고르면
 * 그 근육에 특화된 운동만 필터링한다.
 *
 * 3D 마네킹은 WebGL 이라 next/dynamic(ssr:false) 로 클라이언트에서만 로드한다.
 */

import {
  Component,
  useMemo,
  useEffect,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Loader2, Plus, Trash2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  MUSCLE_GROUPS,
  muscleGroup,
  type MuscleId,
} from "@/features/routine/muscle-map";
import {
  exercisesForMuscleAction,
  type MuscleExerciseOption,
} from "@/features/routine/muscle-exercise-actions";
// ⚠ 카탈로그를 안 물고 있는 얇은 모듈만 쓴다 — 목록은 서버에서 받아온다.
import {
  subMuscle,
  subMusclesFor,
  subMusclesForExerciseData,
} from "@/features/routine/sub-muscles";
import { majorMuscleTag } from "@/features/routine/exercise-body-parts";
import { saveMuscleSelectionAction } from "@/features/routine/plan-actions";
import { useLightMode } from "@/features/performance/use-light-mode";

const MuscleMannequin3D = dynamic(
  () => import("@/features/routine/components/muscle-mannequin-3d"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[360px] w-full items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 sm:h-[440px]">
        3D 마네킹 불러오는 중…
      </div>
    ),
  },
);

/** 3D 캔버스 렌더 실패해도 페이지가 죽지 않게 막는 경계(칩으로 계속 선택 가능). */
class Mannequin3DBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="flex h-[120px] w-full items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 text-center text-sm text-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
          3D 마네킹을 표시할 수 없는 환경이에요. 아래 부위 버튼으로 선택하세요.
        </div>
      );
    }
    return this.props.children;
  }
}

export function MuscleExercisePicker({
  gender = "male",
}: {
  gender?: "male" | "female";
}) {
  const router = useRouter();
  const lightMode = useLightMode();
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleId>("chest");
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  /** 부위(focus)별 선택한 운동 id 목록 */
  const [picked, setPicked] = useState<Record<string, string[]>>({});
  /**
   * 부위별 운동 목록 — 서버에서 **누른 부위 것만** 받아 캐시한다.
   * (예전엔 1,237개 카탈로그를 통째로 번들에 싣고 있었다.)
   */
  const [byMuscle, setByMuscle] = useState<
    Partial<Record<MuscleId, MuscleExerciseOption[]>>
  >({});
  /** 담은 운동 이름 — 요약 줄에서 쓰려고 담는 순간 기억해 둔다(목록 재조회 불필요). */
  const [nameById, setNameById] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // 선택한 부위의 목록만 서버에서 받아온다. 이미 받은 부위는 다시 안 부른다.
  useEffect(() => {
    let alive = true;
    if (byMuscle[selectedMuscle]) return;
    void exercisesForMuscleAction(selectedMuscle).then((rows) => {
      if (alive) setByMuscle((prev) => ({ ...prev, [selectedMuscle]: rows }));
    });
    return () => {
      alive = false;
    };
  }, [selectedMuscle, byMuscle]);

  // 마네킹에서 하이라이트할 세부근육: 세부 선택이 있으면 그것만, 없으면 부위 전체
  const activeSubs = useMemo(() => {
    if (selectedSub) return new Set([selectedSub]);
    return new Set(subMusclesFor(selectedMuscle).map((s) => s.id));
  }, [selectedMuscle, selectedSub]);

  const counts = useMemo(() => {
    const c: Partial<Record<MuscleId, number>> = {};
    for (const g of MUSCLE_GROUPS) c[g.id] = picked[g.id]?.length ?? 0;
    return c;
  }, [picked]);

  const totalPicked = useMemo(
    () => Object.values(picked).reduce((sum, ids) => sum + ids.length, 0),
    [picked],
  );

  // 마네킹 메쉬를 탭 → 해당 세부근육 + 그 부위 선택
  function selectSub(subId: string) {
    const sm = subMuscle(subId);
    if (!sm) return;
    setSelectedMuscle(sm.muscle);
    setSelectedSub(subId);
    setError(null);
  }

  function selectMuscle(muscle: MuscleId) {
    setSelectedMuscle(muscle);
    setSelectedSub(null);
    setError(null);
  }

  function toggle(focus: MuscleId, exerciseId: string, name?: string) {
    setError(null);
    if (name) setNameById((prev) => ({ ...prev, [exerciseId]: name }));
    setPicked((prev) => {
      const cur = prev[focus] ?? [];
      const next = cur.includes(exerciseId)
        ? cur.filter((id) => id !== exerciseId)
        : [...cur, exerciseId];
      return { ...prev, [focus]: next };
    });
  }

  function removeMuscle(focus: MuscleId) {
    setPicked((prev) => {
      const next = { ...prev };
      delete next[focus];
      return next;
    });
  }

  /** 담은 운동 전체 초기화 */
  function clearAll() {
    setPicked({});
    setError(null);
  }

  function handleSave() {
    const selections = Object.entries(picked).flatMap(([focus, ids]) =>
      ids.map((exerciseId) => ({ focus, exerciseId })),
    );
    if (selections.length === 0) {
      setError("부위를 눌러 운동을 1개 이상 담아주세요.");
      return;
    }
    start(async () => {
      const res = await saveMuscleSelectionAction(selections);
      if (res.ok) {
        router.push("/routine");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  // 선택 부위의 운동 — 세부근육 선택 시 그 근육 특화 운동만
  const base = byMuscle[selectedMuscle] ?? null;
  const list = useMemo(() => {
    if (!base) return [];
    if (!selectedSub) return base;
    return base.filter((ex) =>
      subMusclesForExerciseData(ex.id, ex.name, ex.target).some(
        (s) => s.id === selectedSub,
      ),
    );
  }, [base, selectedSub]);

  const pickedHere = picked[selectedMuscle] ?? [];
  const subs = subMusclesFor(selectedMuscle);
  const regionColor = muscleGroup(selectedMuscle).color;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3">
        {lightMode ? (
          <div
            data-testid="light-mode-mannequin-fallback"
            className="flex h-24 w-full items-center justify-center rounded-xl border border-zinc-200 bg-zinc-50 px-6 text-center text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          >
            경량 모드에서는 아래 부위 버튼으로 운동 부위를 선택하세요.
          </div>
        ) : (
          <Mannequin3DBoundary>
            <MuscleMannequin3D
              gender={gender}
              activeSubs={activeSubs}
              onSelectSub={selectSub}
            />
          </Mannequin3DBoundary>
        )}

        {/* 부위 칩 (범례 겸용, 항상 표시) */}
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="근육 부위 선택"
        >
          {MUSCLE_GROUPS.map((g) => {
            const active = selectedMuscle === g.id;
            const n = counts[g.id] ?? 0;
            return (
              <button
                key={g.id}
                type="button"
                data-testid={`muscle-chip-${g.id}`}
                aria-pressed={active}
                onClick={() => selectMuscle(g.id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                  active
                    ? "border-transparent text-white"
                    : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-200",
                )}
                style={active ? { backgroundColor: g.color } : undefined}
              >
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: active ? "#fff" : g.color }}
                />
                {g.label}
                {n > 0 ? (
                  <span
                    className={cn(
                      "ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold",
                      active
                        ? "bg-white/25 text-white"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
                    )}
                  >
                    {n}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {/* 세부근육 + 운동 목록 */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-700 dark:bg-zinc-800">
        <div className="flex flex-wrap items-center gap-2">
          <span
            aria-hidden
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: regionColor }}
          />
          <h2 className="text-lg font-bold text-zinc-950 dark:text-zinc-100">
            {muscleGroup(selectedMuscle).label}
            {selectedSub ? ` · ${subMuscle(selectedSub)?.label}` : ""} 운동
          </h2>
          <span className="text-sm text-zinc-500 dark:text-zinc-400">
            {base === null ? "불러오는 중" : `${list.length}개`}
          </span>
        </div>

        {/* 세부근육 칩 — 부위 안에서 더 좁히기 */}
        <div
          className="mt-3 flex flex-wrap gap-1.5"
          role="group"
          aria-label="세부 근육 선택"
        >
          <button
            type="button"
            data-testid="submuscle-chip-all"
            aria-pressed={selectedSub === null}
            onClick={() => setSelectedSub(null)}
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs font-semibold transition",
              selectedSub === null
                ? "border-transparent text-white"
                : "border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
            )}
            style={selectedSub === null ? { backgroundColor: regionColor } : undefined}
          >
            전체
          </button>
          {subs.map((s) => {
            const active = selectedSub === s.id;
            return (
              <button
                key={s.id}
                type="button"
                data-testid={`submuscle-chip-${s.id}`}
                aria-pressed={active}
                onClick={() => setSelectedSub(active ? null : s.id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-xs font-semibold transition",
                  active
                    ? "border-transparent text-white"
                    : "border-zinc-300 bg-white text-zinc-600 hover:border-zinc-400 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300",
                )}
                style={active ? { backgroundColor: regionColor } : undefined}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {list.map((ex) => {
            const on = pickedHere.includes(ex.id);
            const exSubs = subMusclesForExerciseData(ex.id, ex.name, ex.target);
            return (
              <li
                key={ex.id}
                className={cn(
                  "flex items-start gap-2 rounded-lg border p-3 transition",
                  on
                    ? "border-emerald-500 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40"
                    : "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900",
                )}
              >
                <button
                  type="button"
                  data-testid={`pick-${ex.id}`}
                  aria-pressed={on}
                  onClick={() => toggle(selectedMuscle, ex.id, ex.name)}
                  className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition",
                    on
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-zinc-300 bg-white text-transparent hover:border-emerald-400 dark:border-zinc-600 dark:bg-zinc-800",
                  )}
                >
                  {on ? (
                    <Check size={15} />
                  ) : (
                    <Plus size={15} className="text-zinc-400" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {ex.name}
                    </span>
                    {/* 대근육 부위 1개 + 세부근육 1개만 */}
                    {(() => {
                      const major = majorMuscleTag(ex.id);
                      return (
                        <span
                          className={cn(
                            "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                            major.tone,
                          )}
                        >
                          {major.label}
                        </span>
                      );
                    })()}
                    {exSubs[0] ? (
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                        style={{
                          backgroundColor: muscleGroup(exSubs[0].muscle).color,
                        }}
                      >
                        {exSubs[0].label}
                      </span>
                    ) : null}
                  </div>
                  <Link
                    href={`/exercises/${ex.id}`}
                    className="mt-1 inline-flex items-center gap-0.5 text-xs font-semibold text-emerald-700 hover:underline dark:text-emerald-400"
                  >
                    자세히 <ArrowRight size={12} />
                  </Link>
                </div>
              </li>
            );
          })}
          {base === null ? (
            <li
              data-testid="muscle-exercises-loading"
              className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400"
            >
              <Loader2 size={14} className="animate-spin" />
              운동 목록을 불러오는 중…
            </li>
          ) : list.length === 0 ? (
            <li className="text-sm text-zinc-500 dark:text-zinc-400">
              이 세부근육에 매핑된 운동이 없습니다. ‘전체’로 보세요.
            </li>
          ) : null}
        </ul>
      </section>

      {/* 담은 운동 요약 */}
      {totalPicked > 0 ? (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-800 dark:bg-emerald-950/30">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              담은 운동 {totalPicked}개
            </h3>
            <button
              type="button"
              data-testid="clear-all-picked"
              onClick={clearAll}
              className="inline-flex h-7 items-center gap-1 whitespace-nowrap rounded-md border border-red-300 px-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <Trash2 size={13} />
              전체 초기화
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {MUSCLE_GROUPS.filter((g) => (picked[g.id]?.length ?? 0) > 0).map(
              (g) => (
                <div
                  key={g.id}
                  className="flex flex-wrap items-center gap-2 text-sm"
                >
                  <span className="inline-flex items-center gap-1 font-semibold text-zinc-800 dark:text-zinc-200">
                    <span
                      aria-hidden
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: g.color }}
                    />
                    {g.label}
                  </span>
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {(picked[g.id] ?? [])
                      .map((id) => nameById[id] ?? id)
                      .join(", ")}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeMuscle(g.id)}
                    aria-label={`${g.label} 전체 비우기`}
                    className="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md text-zinc-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ),
            )}
          </div>
        </section>
      ) : null}

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          저장하면 담은 운동이 부위별 루틴에 등록되고 메인에 표시됩니다.
        </p>
        <button
          type="button"
          data-testid="save-muscle-selection"
          onClick={handleSave}
          disabled={pending || totalPicked === 0}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-400"
        >
          {pending ? (
            <Loader2 className="animate-spin" size={17} />
          ) : (
            <Check size={17} />
          )}
          저장 ({totalPicked})
        </button>
      </div>
    </div>
  );
}
