"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Check, Dumbbell, Loader2, Plus, Salad, Trash2 } from "lucide-react";

import {
  addCommitmentAction,
  addSurveyCommitmentAction,
  deleteCommitmentAction,
} from "@/features/commitments/actions";
import {
  COMMITMENT_METRICS,
  COMMITMENT_PRESETS,
  type CommitmentMetric,
} from "@/features/commitments/commitment";
import {
  DEFAULT_SURVEY,
  GOAL_PRESETS,
  buildMissionsFromSurvey,
  missionLabel,
  type SurveyAnswers,
  type SurveyGoal,
} from "@/features/commitments/missions";
import type { CommitmentView } from "@/features/commitments/data-access";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}
function addDays(base: string, n: number): string {
  const [y, m, d] = base.split("-").map(Number);
  return ymd(new Date(y, m - 1, d + n));
}

export function CommitmentManager({
  commitments,
}: {
  commitments: CommitmentView[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"survey" | "manual">("survey");
  const today = ymd(new Date());

  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("custom");
  const [metric, setMetric] = useState<CommitmentMetric>("workout_days");
  const [target, setTarget] = useState("12");
  const [startDate, setStartDate] = useState(today);
  const [deadline, setDeadline] = useState(addDays(today, 28));

  function applyPreset(p: (typeof COMMITMENT_PRESETS)[number]) {
    setTitle(p.title);
    setTag(p.tag);
    setMetric(p.metric);
    setTarget(String(p.target));
    setOpen(true);
    setError(null);
  }

  function save() {
    setError(null);
    start(async () => {
      const res = await addCommitmentAction({
        title,
        tag,
        metric,
        target: Number(target),
        startDate,
        deadline,
      });
      if (res.ok) {
        setOpen(false);
        setTitle("");
        setTag("custom");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function remove(id: string) {
    start(async () => {
      const res = await deleteCommitmentAction(id);
      if (res.ok) router.refresh();
      else setError(res.error);
    });
  }

  return (
    <div className="space-y-5">
      {/* 생성 모드 — 설문으로 만들기 / 직접 설정 */}
      <div className="flex gap-1.5">
        {(
          [
            ["survey", "🧭 설문으로 만들기"],
            ["manual", "✍️ 직접 설정"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setMode(k);
              setError(null);
            }}
            className={`h-10 flex-1 rounded-xl text-sm font-bold transition ${
              mode === k
                ? "bg-emerald-600 text-white"
                : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "survey" ? (
        <SurveyForm
          today={today}
          onDone={() => router.refresh()}
        />
      ) : (
      <>
      {/* 태그 체크식 빠른 추가 */}
      <div>
        <p className="mb-2 text-xs font-semibold text-zinc-500">빠른 다짐 추가</p>
        <div className="flex flex-wrap gap-2">
          {COMMITMENT_PRESETS.map((p) => (
            <button
              key={p.tag}
              type="button"
              onClick={() => applyPreset(p)}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:border-emerald-300 hover:text-emerald-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              <Plus aria-hidden="true" size={12} /> {p.title}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setOpen((v) => !v);
              setError(null);
            }}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-500"
          >
            직접 입력
          </button>
        </div>
      </div>

      {open ? (
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <input
            aria-label="다짐 내용"
            type="text"
            placeholder="예: 이번 달 12일 운동하기"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={pending}
            className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          />
          <div className="flex gap-2">
            <select
              aria-label="목표 종류"
              value={metric}
              onChange={(e) => setMetric(e.target.value as CommitmentMetric)}
              disabled={pending}
              className="h-10 flex-1 rounded-md border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            >
              {COMMITMENT_METRICS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label} ({m.unit})
                </option>
              ))}
            </select>
            <input
              aria-label="목표 값"
              type="number"
              min={1}
              inputMode="numeric"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              disabled={pending}
              className="h-10 w-24 rounded-md border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="flex-1 text-xs font-semibold text-zinc-500">
              시작일
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={pending}
                className="mt-1 h-10 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              />
            </label>
            <label className="flex-1 text-xs font-semibold text-zinc-500">
              데드라인
              <input
                type="date"
                value={deadline}
                min={startDate}
                onChange={(e) => setDeadline(e.target.value)}
                disabled={pending}
                className="mt-1 h-10 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
              />
            </label>
          </div>
          {error ? (
            <p className="text-xs font-semibold text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending || title.trim() === ""}
              className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
            >
              {pending ? (
                <Loader2 aria-hidden="true" size={15} className="animate-spin" />
              ) : (
                <Check aria-hidden="true" size={15} />
              )}
              다짐 저장
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="h-10 rounded-md border border-zinc-300 px-4 text-sm font-semibold text-zinc-600 dark:border-zinc-600 dark:text-zinc-300"
            >
              취소
            </button>
          </div>
        </div>
      ) : null}
      </>
      )}

      {/* 목록 */}
      {commitments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
          아직 다짐이 없어요. 위에서 하나 추가해보세요.
        </p>
      ) : (
        <ul className="space-y-3">
          {commitments.map((c) => {
            const p = c.progress;
            const barColor = p.done
              ? "bg-emerald-500"
              : p.expired
                ? "bg-red-400"
                : "bg-emerald-400";
            return (
              <li
                key={c.id}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                      {c.kind === "diet" ? (
                        <Salad aria-hidden="true" size={14} className="text-emerald-600" />
                      ) : (
                        <Dumbbell aria-hidden="true" size={14} className="text-emerald-600" />
                      )}
                      {c.title}
                    </p>
                    <p className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-500">
                      <CalendarClock aria-hidden="true" size={11} />
                      {c.startDate} ~ {c.deadline}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="다짐 삭제"
                    onClick={() => remove(c.id)}
                    disabled={pending}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-400 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40 dark:hover:bg-red-950/40"
                  >
                    <Trash2 aria-hidden="true" size={14} />
                  </button>
                </div>

                <div className="mt-3">
                  <div className="mb-1 flex items-end justify-between text-xs">
                    <span className="font-semibold text-zinc-600 dark:text-zinc-400">
                      {c.metricLabel}
                      {p.done ? (
                        <span className="ml-1 font-bold text-emerald-600 dark:text-emerald-400">
                          달성 ✓
                        </span>
                      ) : p.upcoming ? (
                        <span className="ml-1 text-zinc-400">시작 전</span>
                      ) : p.expired ? (
                        <span className="ml-1 font-bold text-red-500">기간 종료</span>
                      ) : (
                        <span className="ml-1 text-zinc-400">D-{p.daysLeft}</span>
                      )}
                    </span>
                    <span className="font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
                      {p.current.toLocaleString()} / {p.target.toLocaleString()} {c.unit}
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className={`h-full rounded-full transition-all ${barColor}`}
                      style={{ width: `${p.pct}%` }}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const GOALS: { id: SurveyGoal; label: string; emoji: string }[] = [
  { id: "lose", label: "체지방 감량", emoji: "🔥" },
  { id: "gain", label: "근육 증가", emoji: "💪" },
  { id: "maintain", label: "꾸준함 유지", emoji: "🌱" },
  { id: "stamina", label: "체력 기르기", emoji: "🏃" },
];

/** 설문으로 다짐 만들기 — 목표·항목을 고르면 하루 미션이 자동 생성된다. */
function SurveyForm({ today, onDone }: { today: string; onDone: () => void }) {
  const [a, setA] = useState<SurveyAnswers>(DEFAULT_SURVEY);
  const [startDate, setStartDate] = useState(today);
  const [deadline, setDeadline] = useState(addDays(today, 28));
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof SurveyAnswers>(k: K, v: SurveyAnswers[K]) =>
    setA((prev) => ({ ...prev, [k]: v }));
  function pickGoal(g: SurveyGoal) {
    setA({ ...DEFAULT_SURVEY, ...GOAL_PRESETS[g], goal: g });
    setError(null);
  }

  const missions = buildMissionsFromSurvey(a);

  function save() {
    setError(null);
    if (missions.length === 0) {
      setError("미션이 될 항목을 하나 이상 켜주세요.");
      return;
    }
    start(async () => {
      const res = await addSurveyCommitmentAction({ answers: a, startDate, deadline });
      if (res.ok) {
        setA(DEFAULT_SURVEY);
        onDone();
      } else {
        setError(res.error);
      }
    });
  }

  const numField =
    "h-9 w-20 rounded-md border border-zinc-300 bg-white px-2 text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-800";

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
      {/* 목표 */}
      <div>
        <p className="mb-1.5 text-xs font-bold text-zinc-500">1. 목표가 뭐예요?</p>
        <div className="grid grid-cols-2 gap-2">
          {GOALS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => pickGoal(g.id)}
              className={`rounded-lg border px-3 py-2.5 text-left text-sm font-semibold transition ${
                a.goal === g.id
                  ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                  : "border-zinc-200 text-zinc-700 dark:border-zinc-700 dark:text-zinc-200"
              }`}
            >
              {g.emoji} {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* 항목 */}
      <div>
        <p className="mb-1.5 text-xs font-bold text-zinc-500">2. 하루 미션 (켤 것만)</p>
        <div className="space-y-1.5">
          <SwitchRow label="매일 운동하기" on={a.workoutDaily} onToggle={(v) => set("workoutDaily", v)} />
          <SwitchRow label="근력 운동하기" on={a.strengthDaily} onToggle={(v) => set("strengthDaily", v)} />
          <NumRow label="유산소 (분)" value={a.cardioMin} onChange={(v) => set("cardioMin", v)} field={numField} />
          <NumRow label="소비 칼로리 (kcal)" value={a.burnKcal} onChange={(v) => set("burnKcal", v)} field={numField} />
          <SwitchRow label="식단 기록하기" on={a.logMeals} onToggle={(v) => set("logMeals", v)} />
          <NumRow label="끼니 수 (끼)" value={a.mealCount} onChange={(v) => set("mealCount", v)} field={numField} />
          <NumRow label="섭취 상한 (kcal 이하)" value={a.intakeMax} onChange={(v) => set("intakeMax", v)} field={numField} />
          <NumRow label="단백질 (g)" value={a.proteinMin} onChange={(v) => set("proteinMin", v)} field={numField} />
        </div>
        <p className="mt-1 text-[11px] text-zinc-400">숫자 항목은 0으로 두면 미션에서 빠져요.</p>
      </div>

      {/* 미션 미리보기 */}
      <div>
        <p className="mb-1.5 text-xs font-bold text-zinc-500">
          3. 생성될 하루 미션 ({missions.length}개)
        </p>
        {missions.length === 0 ? (
          <p className="text-xs text-zinc-400">켠 항목이 없어요.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {missions.map((m) => (
              <li
                key={m.type}
                className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
              >
                {missionLabel(m)}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 기간 */}
      <div className="flex items-center gap-2">
        <label className="flex-1 text-xs font-semibold text-zinc-500">
          시작일
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={pending}
            className="mt-1 h-10 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          />
        </label>
        <label className="flex-1 text-xs font-semibold text-zinc-500">
          데드라인
          <input
            type="date"
            value={deadline}
            min={startDate}
            onChange={(e) => setDeadline(e.target.value)}
            disabled={pending}
            className="mt-1 h-10 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
          />
        </label>
      </div>

      {error ? (
        <p className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <button
        type="button"
        onClick={save}
        disabled={pending || missions.length === 0}
        className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-md bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending ? (
          <Loader2 aria-hidden="true" size={15} className="animate-spin" />
        ) : (
          <Check aria-hidden="true" size={15} />
        )}
        이 설문으로 다짐 만들기
      </button>
      <p className="text-[11px] leading-4 text-zinc-400">
        만든 미션은 매일 운동·식단 기록으로 자동 판정돼요. 달성률에 따라 캘린더에{" "}
        <span className="font-bold text-emerald-500">○</span>{" "}
        <span className="font-bold text-amber-500">△</span>{" "}
        <span className="font-bold text-rose-400">✕</span> 로 표시됩니다.
      </p>
    </div>
  );
}

function SwitchRow({
  label,
  on,
  onToggle,
}: {
  label: string;
  on: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!on)}
      className="flex w-full items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700"
    >
      <span className="font-semibold text-zinc-700 dark:text-zinc-200">{label}</span>
      <span
        className={`flex h-5 w-9 items-center rounded-full p-0.5 transition ${
          on ? "justify-end bg-emerald-500" : "justify-start bg-zinc-300 dark:bg-zinc-600"
        }`}
      >
        <span className="h-4 w-4 rounded-full bg-white" />
      </span>
    </button>
  );
}

function NumRow({
  label,
  value,
  onChange,
  field,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  field: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-700">
      <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">{label}</span>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
        className={field}
      />
    </div>
  );
}
