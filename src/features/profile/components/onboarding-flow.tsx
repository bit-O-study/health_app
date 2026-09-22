"use client";

import { useState, type ReactNode } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "@/features/brand/logo";
import { RoutinePlanner } from "@/features/routine/components/routine-planner";
import { saveRoutineAction } from "@/features/routine/actions";
import { saveProfileAction } from "@/features/profile/actions";
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
import {
  BODY_TYPE_OPTIONS,
  EXPERIENCE_OPTIONS,
  GENDER_OPTIONS,
  recommendRoutine,
  type BodyType,
  type ExperienceLevel,
  type Gender,
} from "@/features/profile/data";
import {
  GOAL_OPTIONS,
  goalTargetKind,
  type Goal,
} from "@/features/profile/goal";

type Step = "gender" | "experience" | "body" | "goal" | "gym" | "recommend";

const STEP_ORDER: Step[] = [
  "gender",
  "experience",
  "body",
  "goal",
  "gym",
  "recommend",
];

export function OnboardingFlow({
  redirectOnSuccess = "/",
}: {
  redirectOnSuccess?: string;
} = {}) {
  const [step, setStep] = useState<Step>("gender");
  const [gender, setGender] = useState<Gender | null>(null);
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [bodyType, setBodyType] = useState<BodyType | null>(null);
  // 운동 목표 + 목표치(목표 종류에 맞는 입력만 사용).
  const [goal, setGoal] = useState<Goal | null>(null);
  const [targetWeight, setTargetWeight] = useState("");
  const [targetBodyFat, setTargetBodyFat] = useState("");
  const [targetMuscle, setTargetMuscle] = useState("");
  // 헬스장 — 선택사항. 검색해서 고르기 전엔 null 이고, 그 상태로 넘어가면 저장 안 함.
  const [gym, setGym] = useState<{
    gymId: string | null;
    name: string;
    address: string;
    /** 미리 체크된 값의 출처 — 안내 문구가 달라진다. */
    source: GymEquipmentSource;
  } | null>(null);
  const [gymEquipment, setGymEquipment] = useState<Set<string>>(
    () => new Set<string>(),
  );

  function toggleEquipment(id: string) {
    setGymEquipment((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /**
   * 검색 결과에서 헬스장을 고른 시점에 기구 기본값이 정해진다.
   * 회원이 있는 헬스장이면 그 합집합, 없으면 평균 한국 헬스장 기본 보유기구.
   */
  function pickGym(candidate: GymCandidate) {
    setGym({
      gymId: candidate.gymId,
      name: candidate.name,
      address: candidate.address,
      source: candidate.equipmentIds.length > 0 ? "union" : "default",
    });
    setGymEquipment(new Set(defaultGymEquipment(candidate.equipmentIds)));
  }

  const heightNum = Number(heightCm);
  const weightNum = Number(weightKg);
  const bodyValid =
    heightNum >= 120 &&
    heightNum <= 230 &&
    weightNum >= 30 &&
    weightNum <= 250 &&
    bodyType !== null;

  // 목표 단계 — 목표를 고르고, 목표치가 필요한 목표면 값이 유효해야 다음으로.
  const goalKind = goal ? goalTargetKind(goal) : null;
  const goalTargetNum =
    goalKind === "weight"
      ? Number(targetWeight)
      : goalKind === "bodyFat"
        ? Number(targetBodyFat)
        : goalKind === "muscle"
          ? Number(targetMuscle)
          : null;
  const goalValid =
    goal !== null &&
    (goalKind === null ||
      (goalTargetNum !== null &&
        Number.isFinite(goalTargetNum) &&
        goalTargetNum > 0));

  function buildGoalInput() {
    if (!goal) return undefined;
    return {
      goal,
      targetWeightKg: goalKind === "weight" ? Number(targetWeight) : null,
      targetBodyFatPct: goalKind === "bodyFat" ? Number(targetBodyFat) : null,
      targetMuscleKg: goalKind === "muscle" ? Number(targetMuscle) : null,
    };
  }

  /**
   * 프로필 저장 → 루틴 저장. 이동은 RoutinePlanner 가 fillMode 에 맞춰 처리한다
   * (recommend/manual → "/", byMuscle → "/plan/muscle"). 여기서 직접 router 를
   * 호출하면 RoutinePlanner 이동과 경합하므로 저장만 하고 결과만 돌려준다.
   */
  async function handleSaveRoutine(
    splits: number,
    variantId: string,
    customWeek?: Parameters<typeof saveRoutineAction>[2],
  ) {
    if (!gender || !experience || !bodyType || !bodyValid) {
      return {
        ok: false as const,
        error: "성별·경력·체형 정보를 먼저 입력해 주세요.",
      };
    }

    const profileResult = await saveProfileAction(
      gender,
      experience,
      {
        heightCm: heightNum,
        weightKg: weightNum,
        bodyType,
      },
      buildGoalInput(),
    );
    if (!profileResult.ok) {
      return profileResult;
    }

    // 헬스장을 골랐으면 저장 — 실패해도 루틴 저장은 계속 (선택사항이라)
    if (gym && gym.name.trim().length > 0) {
      await upsertGymAction({
        id: gym.gymId,
        name: gym.name,
        address: gym.address,
        equipmentIds: Array.from(gymEquipment),
      });
    }

    // 온보딩의 자동 채우기 정책은 기존 그대로 유지(여기서 fillMode 를 saveRoutineAction
    // 에 넘기지 않음 → 기본 manual 저장). 이동은 RoutinePlanner 가 담당.
    return saveRoutineAction(splits, variantId, customWeek);
  }

  const recommendation =
    gender && experience ? recommendRoutine(gender, experience) : null;

  return (
    <div className="app-page">
      <div className="app-container pt-3">
        {/* 로고 + 진행 막대 한 줄(2026-09-16 8단계 촘촘하게) */}
        <div className="flex items-center gap-3 px-1">
          <Logo size={28} />
          <div className="flex flex-1 items-center gap-1">
            {STEP_ORDER.map((s, i) => {
              const reached = STEP_ORDER.indexOf(step) >= i;
              return (
                <span
                  key={s}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    reached ? "bg-brand" : "bg-zinc-200 dark:bg-white/[0.12]",
                  )}
                />
              );
            })}
          </div>
        </div>

        {step === "gender" ? (
          <section className="mt-6">
            <h1 className="app-title px-1">성별을 알려주세요</h1>

            <div className="mt-4 grid grid-cols-2 gap-2">
              {GENDER_OPTIONS.map((option) => {
                const active = gender === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setGender(option.id)}
                    className={cn(OPTION_CLS, "h-16 items-center justify-center text-center", active && OPTION_ACTIVE)}
                  >
                    <span className="text-base font-semibold text-zinc-950 dark:text-zinc-50">
                      {option.label}
                    </span>
                  </button>
                );
              })}
            </div>

            <StepNav>
              <NextButton disabled={!gender} onClick={() => setStep("experience")} />
            </StepNav>
          </section>
        ) : null}

        {step === "experience" ? (
          <section className="mt-6">
            <h1 className="app-title px-1">운동 경력은 어느 정도인가요?</h1>

            <div className="mt-4 space-y-2">
              {EXPERIENCE_OPTIONS.map((option) => (
                <OptionButton
                  key={option.id}
                  active={experience === option.id}
                  label={option.label}
                  description={option.description}
                  onClick={() => setExperience(option.id)}
                />
              ))}
            </div>

            <StepNav>
              <PrevButton onClick={() => setStep("gender")} />
              <NextButton disabled={!experience} onClick={() => setStep("body")} />
            </StepNav>
          </section>
        ) : null}

        {step === "body" ? (
          <section className="mt-6">
            <h1 className="app-title px-1">체형 정보를 입력해 주세요</h1>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <label className="block">
                <span className={LABEL_CLS}>키 (cm)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="170"
                  className={FIELD_CLS}
                />
              </label>
              <label className="block">
                <span className={LABEL_CLS}>몸무게 (kg)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="65"
                  className={FIELD_CLS}
                />
              </label>
            </div>

            <p className={cn(LABEL_CLS, "mt-4")}>체형</p>
            <div className="space-y-2">
              {BODY_TYPE_OPTIONS.map((option) => (
                <OptionButton
                  key={option.id}
                  active={bodyType === option.id}
                  label={option.label}
                  description={option.description}
                  onClick={() => setBodyType(option.id)}
                />
              ))}
            </div>

            <StepNav>
              <PrevButton onClick={() => setStep("experience")} />
              <NextButton disabled={!bodyValid} onClick={() => setStep("goal")} />
            </StepNav>
          </section>
        ) : null}

        {step === "goal" ? (
          <section className="mt-6">
            <h1 className="app-title px-1">목표가 무엇인가요?</h1>

            <div className="mt-4 space-y-2">
              {GOAL_OPTIONS.map((option) => (
                <OptionButton
                  key={option.id}
                  active={goal === option.id}
                  label={option.label}
                  description={option.description}
                  onClick={() => setGoal(option.id)}
                />
              ))}
            </div>

            {/* 목표치 입력 — 목표 종류에 맞는 것만. */}
            {goalKind === "weight" ? (
              <label className="mt-4 block">
                <span className={LABEL_CLS}>목표 체중 (kg)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(e.target.value)}
                  placeholder={weightKg || "60"}
                  className={FIELD_CLS}
                />
              </label>
            ) : null}
            {goalKind === "bodyFat" ? (
              <label className="mt-4 block">
                <span className={LABEL_CLS}>목표 체지방률 (%)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={targetBodyFat}
                  onChange={(e) => setTargetBodyFat(e.target.value)}
                  placeholder="15"
                  className={FIELD_CLS}
                />
              </label>
            ) : null}
            {goalKind === "muscle" ? (
              <label className="mt-4 block">
                <span className={LABEL_CLS}>목표 근육량 (kg)</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={targetMuscle}
                  onChange={(e) => setTargetMuscle(e.target.value)}
                  placeholder="35"
                  className={FIELD_CLS}
                />
              </label>
            ) : null}

            <StepNav>
              <PrevButton onClick={() => setStep("body")} />
              <NextButton disabled={!goalValid} onClick={() => setStep("gym")} />
            </StepNav>
          </section>
        ) : null}

        {step === "gym" ? (
          <section className="mt-6">
            <h1 className="app-title px-1">헬스장 검색</h1>
            <p className="mt-1 px-1 text-sm text-zinc-500 dark:text-zinc-400">
              선택 — 나중에 설정에서 입력해도 돼요.
            </p>

            <div className="mt-4">
              {gym ? (
                <div className="space-y-4">
                  <SelectedGymSummary
                    name={gym.name}
                    address={gym.address}
                    onChange={() => {
                      setGym(null);
                      setGymEquipment(new Set());
                    }}
                  />
                  <GymEquipmentPicker
                    selected={gymEquipment}
                    onToggle={toggleEquipment}
                    source={gym.source}
                  />
                </div>
              ) : (
                <GymPicker onPick={pickGym} />
              )}
            </div>

            <StepNav>
              <PrevButton onClick={() => setStep("goal")} />
              <button
                type="button"
                onClick={() => {
                  // 건너뛰기 = 고른 헬스장 없이 다음 단계로 (저장하지 않음)
                  setGym(null);
                  setGymEquipment(new Set());
                  setStep("recommend");
                }}
                className={cn(SECONDARY_BTN_CLS, "text-zinc-500 dark:text-zinc-400")}
              >
                건너뛰기
              </button>
              <NextButton onClick={() => setStep("recommend")} />
            </StepNav>
          </section>
        ) : null}

        {step === "recommend" && recommendation ? (
          <section className="mt-6 space-y-4">
            <div className="app-card p-4">
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand">
                <Sparkles aria-hidden="true" size={12} />
                추천 루틴
              </span>
              <h1 className="mt-2 text-xl font-bold text-zinc-950 dark:text-zinc-50">
                {recommendation.headline}
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {recommendation.reason}
              </p>
            </div>

            <RoutinePlanner
              initialSplits={recommendation.splits}
              initialVariantId={recommendation.variantId}
              saveAction={handleSaveRoutine}
              redirectOnSuccess={redirectOnSuccess}
            />

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setStep("experience")}
                className={cn(SECONDARY_BTN_CLS, "h-9 px-4 text-sm")}
              >
                경력 다시 선택
              </button>
              <button
                type="button"
                onClick={() => setStep("gym")}
                className={cn(SECONDARY_BTN_CLS, "h-9 px-4 text-sm")}
              >
                헬스장 다시 입력
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

/* ── 촘촘한 온보딩 조각(2026-09-16 8단계) ─────────────────────────────── */

/** 아이폰 입력칸 — 테두리 없는 옅은 회색 바탕. */
const FIELD_CLS =
  "h-11 w-full rounded-[10px] bg-zinc-100 px-3 text-base outline-none transition placeholder:text-zinc-400 focus:ring-2 focus:ring-brand/40 dark:bg-white/[0.08] dark:text-zinc-100";

const LABEL_CLS = "block px-1 pb-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400";

/**
 * 고르는 칸. 🔴 `w-full` 은 지우지 말 것 — E2E 가입 헬퍼가
 * `section button.w-full` 첫 번째로 경력·체형 첫 항목을 누른다.
 */
const OPTION_CLS =
  "app-press flex w-full flex-col gap-0.5 rounded-[14px] border border-[var(--line)] bg-[var(--surface-strong)] px-4 py-3 text-left transition";
const OPTION_ACTIVE = "border-brand bg-brand-soft";

const SECONDARY_BTN_CLS =
  "app-press inline-flex h-11 items-center justify-center rounded-full bg-zinc-100 px-5 text-base font-semibold text-zinc-700 transition dark:bg-white/[0.08] dark:text-zinc-200";

function OptionButton({
  active,
  label,
  description,
  onClick,
}: {
  active: boolean;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={cn(OPTION_CLS, active && OPTION_ACTIVE)}>
      <span className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{label}</span>
      <span className="text-sm text-zinc-500 dark:text-zinc-400">{description}</span>
    </button>
  );
}

/** 단계 이동 버튼 줄. */
function StepNav({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex items-center gap-2">{children}</div>;
}

function PrevButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={SECONDARY_BTN_CLS}>
      이전
    </button>
  );
}

/** 주 버튼 — 남은 폭을 채운다(`w-full` 이 아니라 `flex-1`: 위 OPTION_CLS 주석 참고). */
function NextButton({ disabled = false, onClick }: { disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="app-press inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-brand px-6 text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-950"
    >
      다음
      <ArrowRight aria-hidden="true" size={17} />
    </button>
  );
}
