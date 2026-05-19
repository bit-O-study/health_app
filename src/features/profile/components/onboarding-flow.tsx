"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Dumbbell, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { RoutinePlanner } from "@/features/routine/components/routine-planner";
import { saveRoutineAction } from "@/features/routine/actions";
import { saveProfileAction } from "@/features/profile/actions";
import {
  EXPERIENCE_OPTIONS,
  GENDER_OPTIONS,
  recommendRoutine,
  type ExperienceLevel,
  type Gender,
} from "@/features/profile/data";

type Step = "gender" | "experience" | "recommend";

export function OnboardingFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("gender");
  const [gender, setGender] = useState<Gender | null>(null);
  const [experience, setExperience] = useState<ExperienceLevel | null>(null);

  const isFemale = gender === "female";

  /** 프로필 저장 → 루틴 저장 → 메인 이동. RoutinePlanner 에 넘긴다. */
  async function handleSaveRoutine(
    splits: number,
    variantId: string,
    customWeek?: Parameters<typeof saveRoutineAction>[2],
  ) {
    if (!gender || !experience) {
      return { ok: false as const, error: "성별/경력을 먼저 선택해 주세요." };
    }

    const profileResult = await saveProfileAction(gender, experience);
    if (!profileResult.ok) {
      return profileResult;
    }

    const routineResult = await saveRoutineAction(
      splits,
      variantId,
      customWeek,
    );
    if (routineResult.ok) {
      router.replace("/");
      router.refresh();
    }
    return routineResult;
  }

  const recommendation =
    gender && experience ? recommendRoutine(gender, experience) : null;

  return (
    <div
      className={cn(
        "min-h-screen transition-colors",
        isFemale ? "bg-pink-50" : "bg-zinc-50",
      )}
    >
      <div className="mx-auto w-full max-w-3xl px-6 py-12 sm:px-10">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Dumbbell aria-hidden="true" size={20} />
          </span>
          <span className="text-base font-bold tracking-tight">HELTCH</span>
        </div>

        {/* 진행 표시 */}
        <div className="mt-8 flex items-center gap-2">
          {(["gender", "experience", "recommend"] as const).map((s, i) => {
            const order = ["gender", "experience", "recommend"];
            const reached = order.indexOf(step) >= i;
            return (
              <span
                key={s}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  reached ? "bg-emerald-600" : "bg-zinc-200",
                )}
              />
            );
          })}
        </div>

        {step === "gender" ? (
          <section className="mt-10">
            <h1 className="text-2xl font-bold text-zinc-950 sm:text-3xl">
              성별을 알려주세요
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
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
                      "rounded-xl border-2 px-5 py-8 text-lg font-bold transition",
                      active
                        ? option.id === "female"
                          ? "border-pink-400 bg-pink-100 text-pink-700"
                          : "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300",
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
            <h1 className="text-2xl font-bold text-zinc-950 sm:text-3xl">
              운동 경력은 어느 정도인가요?
            </h1>
            <p className="mt-2 text-sm leading-6 text-zinc-600">
              난이도에 맞춰 분할 루틴을 추천해 드립니다.
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
                        ? "border-emerald-500 bg-emerald-50"
                        : "border-zinc-200 bg-white hover:border-zinc-300",
                    )}
                  >
                    <span className="text-base font-bold text-zinc-950">
                      {option.label}
                    </span>
                    <span className="text-sm text-zinc-600">
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
                className="inline-flex h-12 items-center justify-center rounded-md border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
              >
                이전
              </button>
              <button
                type="button"
                disabled={!experience}
                onClick={() => setStep("recommend")}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-emerald-600 px-6 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:bg-zinc-300"
              >
                추천 루틴 보기
                <ArrowRight aria-hidden="true" size={17} />
              </button>
            </div>
          </section>
        ) : null}

        {step === "recommend" && recommendation ? (
          <section className="mt-10 space-y-6">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                <Sparkles aria-hidden="true" size={13} />
                추천 루틴
              </span>
              <h1 className="mt-3 text-2xl font-bold text-zinc-950">
                {recommendation.headline}
              </h1>
              <p className="mt-2 text-sm leading-6 text-zinc-700">
                {recommendation.reason}
              </p>
              <p className="mt-3 text-xs text-emerald-700">
                마음에 안 들면 아래에서 분할을 바꾸거나 커스텀으로 직접 짤 수
                있어요.
              </p>
            </div>

            <RoutinePlanner
              initialSplits={recommendation.splits}
              initialVariantId={recommendation.variantId}
              saveAction={handleSaveRoutine}
            />

            <button
              type="button"
              onClick={() => setStep("experience")}
              className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
            >
              경력 다시 선택
            </button>
          </section>
        ) : null}
      </div>
    </div>
  );
}