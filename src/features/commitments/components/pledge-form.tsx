"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, Lock, Plus, Trash2 } from "lucide-react";

import {
  createPledgeAction,
  updatePledgeAction,
} from "@/features/commitments/pledge-actions";
import {
  PLEDGE_PARTS,
  PROTEIN_MIN_PER_KG,
  PROTEIN_RECOMMEND_PER_KG,
  validatePledge,
  type PledgeSpec,
  type StrengthPledge,
} from "@/features/commitments/pledge";
import {
  planForGoal,
  predictPledge,
  type BodyInput,
  type Calibration,
  type GoalInput,
} from "@/features/commitments/prediction";
import { BODY_PART_LABEL, type BodyPart } from "@/features/routine/exercise-catalog-labels";
import { PredictionCard } from "@/features/commitments/components/prediction-card";

type Group = { id: string; name: string };

const DAY_CHOICES = [7, 14, 30, 60, 90];
const chip = (on: boolean) =>
  `h-9 min-w-9 rounded-full px-3 text-sm font-semibold transition ${
    on
      ? "bg-brand text-white dark:text-zinc-950"
      : "bg-zinc-100 text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300"
  }`;
const field =
  "h-10 w-24 rounded-md border border-zinc-300 bg-white px-2 text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-800";
const round = (v: number, unit: number) => Math.round(v / unit) * unit;

/**
 * 다짐 만들기/편집 폼.
 *
 * - 항목을 켜고 숫자를 넣으면 **그 자리에서 예상이 다시 계산**된다(계산은 순수 함수라 화면에서 돈다).
 * - 필수 묶음(소모→식단, 근력→단백질)과 끼니 수는 저장 버튼 위에 이유와 함께 막는다.
 * - 990원(라이트)은 '목표로 만들기' — 목표를 넣으면 다짐을 역산해 채워 준다(숫자는 고칠 수 있다).
 * - 편집: 시작 후에는 제목과 그룹 공유만(항목은 잠김).
 */
export function PledgeForm({
  body,
  calibration,
  groups,
  canReverse,
  today,
  initial,
}: {
  body: BodyInput;
  calibration: Calibration | null;
  groups: Group[];
  canReverse: boolean;
  today: string;
  /** 편집이면 기존 값. */
  initial?: {
    id: string;
    title: string;
    spec: PledgeSpec;
    startDate: string;
    sharedGroupIds: string[];
    editableSpec: boolean;
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const editing = !!initial;
  const locked = editing && !initial!.editableSpec;

  const defaultIntake = useMemo(() => {
    const m = predictPledge({ days: 30, intakeMax: 2000, mealsPerDay: 3 }, body).baseline.maintenanceKcal;
    return Math.max(body.gender === "male" ? 1500 : 1200, round(m - 300, 50));
  }, [body]);

  const [mode, setMode] = useState<"action" | "goal">("action");
  const [goal, setGoal] = useState<GoalInput>({ type: "lose_weight", kg: 5 });
  const [goalUsed, setGoalUsed] = useState<GoalInput | null>(null);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate ?? today);
  const [spec, setSpec] = useState<PledgeSpec>(
    initial?.spec ?? { days: 30, workoutDays: 4, burnKcal: 500, mealsPerDay: 3, intakeMax: defaultIntake },
  );
  const [share, setShare] = useState<string[]>(initial?.sharedGroupIds ?? []);

  const set = (patch: Partial<PledgeSpec>) => setSpec((s) => clean({ ...s, ...patch }));
  const check = validatePledge(spec, { weightKg: body.weightKg, gender: body.gender });
  const pred = useMemo(() => predictPledge(spec, body, { calibration }), [spec, body, calibration]);
  const plan = useMemo(() => (mode === "goal" ? planForGoal(goal, body) : null), [mode, goal, body]);
  const proteinNeed = Math.ceil(body.weightKg * PROTEIN_MIN_PER_KG);
  const proteinRec = round(body.weightKg * PROTEIN_RECOMMEND_PER_KG, 5);

  function applyGoal() {
    if (!plan || plan.error) return;
    setSpec(plan.pledge);
    setGoalUsed(goal);
    setMode("action");
  }

  function save() {
    setError(null);
    if (check.errors.length > 0) {
      setError(check.errors[0]);
      return;
    }
    start(async () => {
      const res = editing
        ? await updatePledgeAction({
            id: initial!.id,
            title,
            ...(locked ? {} : { spec, startDate }),
            shareGroupIds: share,
          })
        : await createPledgeAction({ title, spec, startDate, shareGroupIds: share, goal: goalUsed });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.push("/commitments");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4" data-testid="pledge-form">
      {!editing ? (
        <div className="flex gap-1.5">
          <button type="button" className={`flex-1 ${chip(mode === "action")}`} onClick={() => setMode("action")}>
            행동으로 만들기
          </button>
          <button
            type="button"
            className={`flex-1 ${chip(mode === "goal")} inline-flex items-center justify-center gap-1`}
            onClick={() => setMode("goal")}
            data-testid="goal-mode"
          >
            {canReverse ? null : <Lock aria-hidden="true" size={13} />}
            목표로 만들기
          </button>
        </div>
      ) : null}

      {mode === "goal" ? (
        canReverse ? (
          <GoalPanel goal={goal} setGoal={setGoal} plan={plan} onApply={applyGoal} />
        ) : (
          <div className="app-card space-y-2 p-4 text-sm" data-testid="goal-locked">
            <p className="font-semibold">목표를 넣으면 다짐을 대신 짜 드려요</p>
            <p className="text-zinc-500 dark:text-zinc-400">
              ‘20kg 빼고 싶어’처럼 결과를 넣으면 기간·소모·식단·근력 다짐을 계산해 만들어요. 라이트(990원)
              요금제부터 쓸 수 있어요.
            </p>
            <Link href="/settings/subscription" className="inline-flex h-9 items-center rounded-full bg-brand px-4 text-sm font-semibold text-white dark:text-zinc-950">
              라이트 알아보기
            </Link>
          </div>
        )
      ) : (
        <>
          {goalUsed ? (
            <p className="rounded-lg bg-brand-soft px-3 py-2 text-xs font-semibold text-brand">
              목표로 계산한 다짐이에요 — 숫자는 고칠 수 있어요.
            </p>
          ) : null}
          {locked ? (
            <p className="rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:bg-white/[0.06] dark:text-zinc-300">
              시작한 다짐은 항목을 바꿀 수 없어요(예상과 판정이 어긋나요). 이름과 그룹 공유만 바꿀 수 있어요.
            </p>
          ) : null}

          <fieldset disabled={locked || pending} className="space-y-4 disabled:opacity-60">
            <Section title="기간">
              <div className="flex flex-wrap gap-1.5">
                {DAY_CHOICES.map((d) => (
                  <button key={d} type="button" className={chip(spec.days === d)} onClick={() => set({ days: d })}>
                    {d}일
                  </button>
                ))}
              </div>
              <label className="mt-2 flex items-center gap-2 text-xs font-semibold text-zinc-500">
                시작일
                <input type="date" value={startDate} min={today} onChange={(e) => setStartDate(e.target.value)} className="h-10 rounded-md border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-600 dark:bg-zinc-800" />
              </label>
            </Section>

            <Section
              title="운동"
              toggle={spec.workoutDays !== undefined}
              onToggle={(on) => set(on ? { workoutDays: 4 } : { workoutDays: undefined, burnKcal: undefined })}
            >
              <p className="mb-1.5 text-xs text-zinc-500">주 며칠</p>
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                  <button key={n} type="button" className={chip(spec.workoutDays === n)} onClick={() => set({ workoutDays: n })}>
                    {n}
                  </button>
                ))}
              </div>
              <NumRow
                label="운동한 날 소모 칼로리(kcal 이상)"
                value={spec.burnKcal}
                placeholder="안 정함"
                onChange={(v) => set({ burnKcal: v })}
                testId="burn-kcal"
              />
              {spec.burnKcal !== undefined ? (
                <p className="text-xs text-zinc-500">칼로리 소모 다짐은 식단 칼로리 다짐과 같이 만들어야 해요.</p>
              ) : null}
            </Section>

            <Section
              title="근력운동"
              toggle={(spec.strength?.length ?? 0) > 0}
              onToggle={(on) =>
                set(on ? { strength: [{ part: "any", perWeek: 2 }], proteinG: spec.proteinG ?? proteinRec, mealsPerDay: spec.mealsPerDay ?? 3 } : { strength: undefined })
              }
            >
              <ul className="space-y-2">
                {(spec.strength ?? []).map((s, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <select
                      aria-label="부위"
                      value={s.part}
                      onChange={(e) => set({ strength: replaceAt(spec.strength!, i, { ...s, part: e.target.value as StrengthPledge["part"] }) })}
                      className="h-10 flex-1 rounded-md border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
                    >
                      <option value="any">부위 상관없이</option>
                      {PLEDGE_PARTS.map((p) => (
                        <option key={p} value={p}>
                          {BODY_PART_LABEL[p]}
                        </option>
                      ))}
                    </select>
                    <span className="text-sm">주</span>
                    <input
                      aria-label="주 몇 회"
                      type="number"
                      min={1}
                      max={7}
                      value={s.perWeek}
                      onChange={(e) => set({ strength: replaceAt(spec.strength!, i, { ...s, perWeek: clampInt(e.target.value, 1, 7) }) })}
                      className="h-10 w-14 rounded-md border border-zinc-300 bg-white px-2 text-sm tabular-nums dark:border-zinc-600 dark:bg-zinc-800"
                    />
                    <span className="text-sm">회</span>
                    <button
                      type="button"
                      aria-label="부위 빼기"
                      onClick={() => set({ strength: spec.strength!.filter((_, j) => j !== i) })}
                      className="grid h-8 w-8 place-items-center rounded-full text-zinc-400 hover:text-danger"
                    >
                      <Trash2 aria-hidden="true" size={14} />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => set({ strength: [...(spec.strength ?? []), { part: nextPart(spec.strength ?? []), perWeek: 2 }] })}
                className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand"
              >
                <Plus aria-hidden="true" size={12} /> 부위 추가
              </button>
              <p className="mt-1 text-xs text-zinc-500">근력 다짐은 단백질 다짐(하루 {proteinNeed}g 이상)과 같이 만들어야 해요.</p>
            </Section>

            <Section
              title="유산소"
              toggle={spec.cardioMinWeek !== undefined}
              onToggle={(on) => set({ cardioMinWeek: on ? 150 : undefined })}
            >
              <NumRow label="주 몇 분" value={spec.cardioMinWeek} onChange={(v) => set({ cardioMinWeek: v })} />
            </Section>

            <Section
              title="걸음"
              toggle={spec.steps !== undefined}
              onToggle={(on) => set({ steps: on ? { steps: 8000, perWeek: 5 } : undefined })}
            >
              {spec.steps ? (
                <>
                  <NumRow label="하루 걸음" value={spec.steps.steps} onChange={(v) => set({ steps: { ...spec.steps!, steps: v ?? 8000 } })} />
                  <NumRow label="주 며칠" value={spec.steps.perWeek} onChange={(v) => set({ steps: { ...spec.steps!, perWeek: Math.min(7, v ?? 5) } })} />
                </>
              ) : null}
            </Section>

            <Section
              title="식단"
              toggle={spec.mealsPerDay !== undefined}
              onToggle={(on) =>
                set(on ? { mealsPerDay: 3 } : { mealsPerDay: undefined, intakeMax: undefined, intakeMin: undefined, proteinG: undefined })
              }
            >
              <p className="mb-1.5 text-xs text-zinc-500">하루 몇 끼 기록할지 — 하루라도 모자라면 다짐 실패예요</p>
              <div className="flex gap-1.5">
                {([1, 2, 3] as const).map((n) => (
                  <button key={n} type="button" className={chip(spec.mealsPerDay === n)} onClick={() => set({ mealsPerDay: n })} data-testid={`meals-${n}`}>
                    {n}끼
                  </button>
                ))}
              </div>
              <NumRow label="하루 섭취 상한(kcal 이하)" value={spec.intakeMax} placeholder="안 정함" onChange={(v) => set({ intakeMax: v })} testId="intake-max" />
              <NumRow label="하루 섭취 하한(kcal 이상)" value={spec.intakeMin} placeholder="안 정함" onChange={(v) => set({ intakeMin: v })} />
              <NumRow label={`단백질(g 이상) · 권장 ${proteinRec}g`} value={spec.proteinG} placeholder="안 정함" onChange={(v) => set({ proteinG: v })} testId="protein" />
              <p className="text-xs text-zinc-500">칼로리·단백질은 7일 평균으로 판정해요.</p>
            </Section>
          </fieldset>

          <PredictionCard pred={pred} body={body} />
        </>
      )}

      {mode === "action" ? (
        <>
          <Section title="이름">
            <input
              aria-label="다짐 이름"
              value={title}
              placeholder="예: 30일 감량 다짐"
              onChange={(e) => setTitle(e.target.value)}
              className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-600 dark:bg-zinc-800"
            />
          </Section>

          <Section title="그룹에 공유">
            {groups.length === 0 ? (
              <p className="text-xs text-zinc-500">속한 그룹이 없어요.</p>
            ) : (
              <ul className="space-y-1.5" data-testid="share-groups">
                {groups.map((g) => {
                  const on = share.includes(g.id);
                  return (
                    <li key={g.id}>
                      <label className="flex items-center justify-between rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700">
                        <span className="font-semibold">{g.name}</span>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={(e) => setShare((s) => (e.target.checked ? [...s, g.id] : s.filter((x) => x !== g.id)))}
                          className="h-5 w-5 accent-brand"
                        />
                      </label>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-1 text-xs text-zinc-500">공유되는 것: 이름·항목·기간·성공/실패. 체중·체성분·식단은 공유되지 않아요.</p>
          </Section>

          {check.warnings.map((w) => (
            <p key={w} className="text-xs font-semibold text-warn">
              {w}
            </p>
          ))}
          {!locked && check.errors.length > 0 ? (
            <ul className="space-y-0.5" data-testid="pledge-errors">
              {check.errors.map((e) => (
                <li key={e} className="text-xs font-semibold text-danger">
                  {e}
                </li>
              ))}
            </ul>
          ) : null}
          {error ? <p className="text-sm font-semibold text-danger">{error}</p> : null}

          <button
            type="button"
            onClick={save}
            disabled={pending || (!locked && check.errors.length > 0)}
            className="app-press inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-full bg-brand text-sm font-semibold text-white disabled:opacity-50 dark:text-zinc-950"
          >
            {pending ? <Loader2 aria-hidden="true" size={15} className="animate-spin" /> : <Check aria-hidden="true" size={15} />}
            {editing ? "저장" : "다짐 만들기"}
          </button>
        </>
      ) : null}
    </div>
  );
}

function GoalPanel({
  goal,
  setGoal,
  plan,
  onApply,
}: {
  goal: GoalInput;
  setGoal: (g: GoalInput) => void;
  plan: ReturnType<typeof planForGoal> | null;
  onApply: () => void;
}) {
  return (
    <div className="app-card space-y-3 p-4" data-testid="goal-panel">
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className={chip(goal.type === "lose_weight")} onClick={() => setGoal({ type: "lose_weight", kg: 5 })}>
          체중 감량
        </button>
        <button type="button" className={chip(goal.type === "gain_muscle")} onClick={() => setGoal({ type: "gain_muscle", kg: 2 })}>
          근육 늘리기
        </button>
        <button type="button" className={chip(goal.type === "grow_part")} onClick={() => setGoal({ type: "grow_part", part: "back" })}>
          부위 키우기
        </button>
      </div>
      {goal.type === "grow_part" ? (
        <select
          aria-label="키울 부위"
          value={goal.part}
          onChange={(e) => setGoal({ type: "grow_part", part: e.target.value as BodyPart })}
          className="h-10 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
        >
          {PLEDGE_PARTS.map((p) => (
            <option key={p} value={p}>
              {BODY_PART_LABEL[p]}
            </option>
          ))}
        </select>
      ) : (
        <label className="flex items-center gap-2 text-sm font-semibold">
          {goal.type === "lose_weight" ? "몇 kg 뺄까요" : "골격근 몇 kg 늘릴까요"}
          <input
            aria-label="목표 kg"
            type="number"
            min={0.5}
            step={0.5}
            value={goal.kg}
            onChange={(e) => setGoal({ ...goal, kg: Number(e.target.value) || 0 })}
            className={field}
            data-testid="goal-kg"
          />
          kg
        </label>
      )}
      {plan?.error ? (
        <p className="text-sm font-semibold text-danger" data-testid="goal-error">
          {plan.error}
        </p>
      ) : plan ? (
        <div className="space-y-1.5 text-sm" data-testid="goal-plan">
          {plan.totalDays ? (
            <p className="font-bold">
              약 {plan.totalDays}일 · 30일 다짐 {plan.stages}단계
            </p>
          ) : null}
          <ul className="list-disc space-y-0.5 pl-5 text-xs text-zinc-500 dark:text-zinc-400">
            {plan.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <button type="button" onClick={onApply} className="mt-1 inline-flex h-10 items-center rounded-full bg-brand px-4 text-sm font-semibold text-white dark:text-zinc-950" data-testid="goal-apply">
            이 다짐으로 채우기
          </button>
          {plan.stages > 1 ? (
            <p className="text-xs text-zinc-500">첫 30일부터 시작해요. 끝나면 실제 몸 변화로 다음 단계를 다시 계산해요.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Section({
  title,
  toggle,
  onToggle,
  children,
}: {
  title: string;
  toggle?: boolean;
  onToggle?: (on: boolean) => void;
  children: React.ReactNode;
}) {
  const hasToggle = toggle !== undefined && onToggle;
  return (
    <section className="app-card space-y-2 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold">{title}</h2>
        {hasToggle ? (
          <button
            type="button"
            aria-pressed={toggle}
            aria-label={`${title} 다짐 ${toggle ? "끄기" : "켜기"}`}
            onClick={() => onToggle!(!toggle)}
            className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${toggle ? "justify-end bg-brand" : "justify-start bg-zinc-300 dark:bg-zinc-600"}`}
          >
            <span className="h-5 w-5 rounded-full bg-white" />
          </button>
        ) : null}
      </div>
      {!hasToggle || toggle ? children : null}
    </section>
  );
}

function NumRow({
  label,
  value,
  placeholder,
  onChange,
  testId,
}: {
  label: string;
  value: number | undefined;
  placeholder?: string;
  onChange: (v: number | undefined) => void;
  testId?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-2 pt-1 text-sm">
      <span className="text-zinc-700 dark:text-zinc-200">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => {
          const n = Math.floor(Number(e.target.value));
          onChange(e.target.value === "" || !(n > 0) ? undefined : n);
        }}
        className={field}
        data-testid={testId}
      />
    </label>
  );
}

function clean(s: PledgeSpec): PledgeSpec {
  const out = { ...s } as Record<string, unknown>;
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  if (Array.isArray(out.strength) && out.strength.length === 0) delete out.strength;
  return out as PledgeSpec;
}

function replaceAt<T>(xs: T[], i: number, v: T): T[] {
  return xs.map((x, j) => (j === i ? v : x));
}

function clampInt(v: string, lo: number, hi: number): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
}

function nextPart(list: StrengthPledge[]): StrengthPledge["part"] {
  const used = new Set(list.map((s) => s.part));
  return PLEDGE_PARTS.find((p) => !used.has(p)) ?? "any";
}
