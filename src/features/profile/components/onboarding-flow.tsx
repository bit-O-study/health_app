"use client";

import { useState } from "react";
import { ArrowRight, Building2, Check, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Logo } from "@/features/brand/logo";
import { RoutinePlanner } from "@/features/routine/components/routine-planner";
import { saveRoutineAction } from "@/features/routine/actions";
import { saveProfileAction } from "@/features/profile/actions";
import { upsertGymAction } from "@/features/gym/gym-actions";
import { GymPlaceSuggestions } from "@/features/gym/components/gym-place-suggestions";
import {
  DEFAULT_KOREAN_GYM_EQUIPMENT,
  GYM_EQUIPMENT_GROUPS,
} from "@/features/gym/gym-equipment-catalog";
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
  // 헬스장 — 선택사항. 비워두면 저장 안 함.
  const [gymName, setGymName] = useState("");
  const [gymAddress, setGymAddress] = useState("");
  const [gymEquipment, setGymEquipment] = useState<Set<string>>(
    () => new Set(DEFAULT_KOREAN_GYM_EQUIPMENT as readonly string[]),
  );

  function toggleEquipment(id: string) {
    setGymEquipment((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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

    // 헬스장 정보 입력했으면 저장 — 실패해도 루틴 저장은 계속 (선택사항이라)
    const trimmedGymName = gymName.trim();
    if (trimmedGymName.length > 0) {
      await upsertGymAction({
        id: null,
        name: trimmedGymName,
        address: gymAddress,
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
    <div className="min-h-screen bg-zinc-50 transition-colors dark:bg-zinc-900">
      <div className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-10">
        <div className="flex items-center">
          <Logo size={36} />
        </div>

        {/* 진행 표시 */}
        <div className="mt-8 flex items-center gap-2">
          {STEP_ORDER.map((s, i) => {
            const reached = STEP_ORDER.indexOf(step) >= i;
            return (
              <span
                key={s}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  reached ? "bg-emerald-600" : "bg-zinc-200 dark:bg-zinc-700",
                )}
              />
            );
          })}
        </div>

        {step === "gender" ? (
          <section className="mt-10">
            <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100 sm:text-3xl">
              성별을 알려주세요
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              경력과 함께 추천 루틴을 잡는 데 사용됩니다.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {GENDER_OPTIONS.map((option) => {
                const active = gender === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setGender(option.id)}
                    className={cn(
                      "rounded-xl border-2 px-4 py-6 text-base font-bold transition sm:px-5 sm:py-8 sm:text-lg",
                      active
                        ? option.id === "female"
                          ? "border-pink-400 bg-pink-100 text-pink-700"
                          : "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
                        : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-500",
                    )}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              disabled={!gender}
              onClick={() => setStep("experience")}
              className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-md bg-emerald-600 px-6 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
            >
              다음
              <ArrowRight aria-hidden="true" size={17} />
            </button>
          </section>
        ) : null}

        {step === "experience" ? (
          <section className="mt-10">
            <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100 sm:text-3xl">
              운동 경력은 어느 정도인가요?
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              난이도에 맞춰 주당 운동 일수 루틴을 추천해 드립니다.
            </p>

            <div className="mt-6 space-y-3">
              {EXPERIENCE_OPTIONS.map((option) => {
                const active = experience === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setExperience(option.id)}
                    className={cn(
                      "flex w-full flex-col gap-1 rounded-xl border-2 px-5 py-4 text-left transition",
                      active
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
                        : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-500",
                    )}
                  >
                    <span className="text-base font-bold text-zinc-950 dark:text-zinc-100">
                      {option.label}
                    </span>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep("gender")}
                className="inline-flex h-12 items-center justify-center rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                이전
              </button>
              <button
                type="button"
                disabled={!experience}
                onClick={() => setStep("body")}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-emerald-600 px-6 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                다음
                <ArrowRight aria-hidden="true" size={17} />
              </button>
            </div>
          </section>
        ) : null}

        {step === "body" ? (
          <section className="mt-10">
            <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100 sm:text-3xl">
              체형 정보를 입력해 주세요
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              키·몸무게·체형에 맞춰 운동별 세트·횟수·무게를 추천합니다.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  키 (cm)
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  placeholder="170"
                  className="h-11 w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  몸무게 (kg)
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  placeholder="65"
                  className="h-11 w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
            </div>

            <p className="mt-5 mb-2 text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              체형
            </p>
            <div className="space-y-3">
              {BODY_TYPE_OPTIONS.map((option) => {
                const active = bodyType === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setBodyType(option.id)}
                    className={cn(
                      "flex w-full flex-col gap-1 rounded-xl border-2 px-5 py-4 text-left transition",
                      active
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
                        : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-500",
                    )}
                  >
                    <span className="text-base font-bold text-zinc-950 dark:text-zinc-100">
                      {option.label}
                    </span>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-8 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep("experience")}
                className="inline-flex h-12 items-center justify-center rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                이전
              </button>
              <button
                type="button"
                disabled={!bodyValid}
                onClick={() => setStep("goal")}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-emerald-600 px-6 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                다음
                <ArrowRight aria-hidden="true" size={17} />
              </button>
            </div>
          </section>
        ) : null}

        {step === "goal" ? (
          <section className="mt-10">
            <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100 sm:text-3xl">
              목표가 무엇인가요?
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              목표에 맞춰 운동탭 체형기록에서 목표까지 얼마나 남았는지 보여드려요.
            </p>

            <div className="mt-6 space-y-3">
              {GOAL_OPTIONS.map((option) => {
                const active = goal === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setGoal(option.id)}
                    className={cn(
                      "flex w-full flex-col gap-1 rounded-xl border-2 px-5 py-4 text-left transition",
                      active
                        ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
                        : "border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-500",
                    )}
                  >
                    <span className="text-base font-bold text-zinc-950 dark:text-zinc-100">
                      {option.label}
                    </span>
                    <span className="text-sm text-zinc-600 dark:text-zinc-400">
                      {option.description}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 목표치 입력 — 목표 종류에 맞는 것만. */}
            {goalKind === "weight" ? (
              <label className="mt-5 block">
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  목표 체중 (kg)
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={targetWeight}
                  onChange={(e) => setTargetWeight(e.target.value)}
                  placeholder={weightKg || "60"}
                  className="mt-1 h-11 w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
            ) : null}
            {goalKind === "bodyFat" ? (
              <label className="mt-5 block">
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  목표 체지방률 (%)
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={targetBodyFat}
                  onChange={(e) => setTargetBodyFat(e.target.value)}
                  placeholder="15"
                  className="mt-1 h-11 w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
            ) : null}
            {goalKind === "muscle" ? (
              <label className="mt-5 block">
                <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                  목표 근육량 (kg)
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={targetMuscle}
                  onChange={(e) => setTargetMuscle(e.target.value)}
                  placeholder="35"
                  className="mt-1 h-11 w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
            ) : null}

            <div className="mt-8 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep("body")}
                className="inline-flex h-12 items-center justify-center rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                이전
              </button>
              <button
                type="button"
                disabled={!goalValid}
                onClick={() => setStep("gym")}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-emerald-600 px-6 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                다음
                <ArrowRight aria-hidden="true" size={17} />
              </button>
            </div>
          </section>
        ) : null}

        {step === "gym" ? (
          <section className="mt-10">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Building2 aria-hidden="true" size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide">
                Optional
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-bold text-zinc-950 dark:text-zinc-100 sm:text-3xl">
              헬스장 정보 (선택)
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              헬스장 이름·주소와 보유 기구를 등록해두면 추후 루틴 추천에
              반영됩니다. 나중에 설정에서 입력해도 됩니다.
            </p>

            <div className="mt-6 space-y-3">
              <label className="block">
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  헬스장 이름
                </span>
                <input
                  type="text"
                  value={gymName}
                  onChange={(e) => setGymName(e.target.value)}
                  placeholder="예: 강남 OO 헬스"
                  maxLength={100}
                  className="mt-1 h-11 w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
                <GymPlaceSuggestions
                  query={gymName}
                  onPick={(picked, addr) => {
                    setGymName(picked);
                    if (addr) setGymAddress(addr);
                  }}
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  주소
                </span>
                <input
                  type="text"
                  value={gymAddress}
                  onChange={(e) => setGymAddress(e.target.value)}
                  placeholder="예: 서울 강남구 ..."
                  maxLength={200}
                  className="mt-1 h-11 w-full rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              </label>
            </div>

            <div className="mt-6">
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                보유 기구
              </p>
              <p className="mt-0.5 mb-3 text-xs text-zinc-500 dark:text-zinc-400">
                평균 한국 헬스장 기준 자주 보이는 기구가 미리 체크돼 있어요.
                없는 것만 체크 해제해주세요.
              </p>
              <div className="space-y-3">
                {GYM_EQUIPMENT_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                      {group.label}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.items.map((it) => {
                        const on = gymEquipment.has(it.id);
                        return (
                          <button
                            key={it.id}
                            type="button"
                            onClick={() => toggleEquipment(it.id)}
                            aria-pressed={on}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                              on
                                ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                                : "border-zinc-300 bg-white text-zinc-600 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-400",
                            )}
                          >
                            {on ? <Check aria-hidden="true" size={12} /> : null}
                            {it.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep("body")}
                className="inline-flex h-12 items-center justify-center rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                이전
              </button>
              <button
                type="button"
                onClick={() => {
                  // 건너뛰기 = 이름 비우고 다음 단계로
                  setGymName("");
                  setStep("recommend");
                }}
                className="inline-flex h-12 items-center justify-center rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-5 text-sm font-semibold text-zinc-500 dark:text-zinc-400 transition hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                건너뛰기
              </button>
              <button
                type="button"
                onClick={() => setStep("recommend")}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-emerald-600 px-6 text-sm font-semibold text-white transition hover:bg-emerald-500"
              >
                추천 루틴 보기
                <ArrowRight aria-hidden="true" size={17} />
              </button>
            </div>
          </section>
        ) : null}

        {step === "recommend" && recommendation ? (
          <section className="mt-10 space-y-6">
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 p-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                <Sparkles aria-hidden="true" size={13} />
                추천 루틴
              </span>
              <h1 className="mt-3 text-2xl font-bold text-zinc-950 dark:text-zinc-100">
                {recommendation.headline}
              </h1>
              <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                {recommendation.reason}
              </p>
              <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-400">
                마음에 안 들면 아래에서 루틴을 바꾸거나 커스텀으로 직접 짤 수
                있어요.
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
                className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-100 dark:hover:bg-zinc-700"
              >
                경력 다시 선택
              </button>
              <button
                type="button"
                onClick={() => setStep("gym")}
                className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 transition hover:bg-zinc-100 dark:hover:bg-zinc-700"
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
