"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  UserX,
  X,
} from "lucide-react";

import { withdrawSelfAction } from "@/features/account/withdraw-actions";

/** 탈퇴 설문 — 이유 선택지. */
const REASONS = [
  "운동을 더 이상 하지 않아요",
  "앱이 불편하거나 어려워요",
  "원하는 기능이 없어요",
  "다른 앱을 사용하기로 했어요",
  "기타",
] as const;

/** 헬쑤를 계속 쓰면 좋은 점. */
const BENEFITS = [
  "체형·경력에 맞춘 루틴 자동 추천과 운동 가이드",
  "식단·체형·걸음수까지 한곳에서 기록·관리",
  "운동 점수·연속 기록·그룹 랭킹으로 동기 부여",
  "캘린더로 섭취·소비 칼로리 한눈에",
] as const;

/** 탈퇴 시 잃게 되는 것. */
const LOSSES = [
  "지금까지 쌓은 운동 기록과 운동 점수·연속 기록",
  "식단·사진·체형(몸무게·BMI 등) 기록 전부",
  "참여 중인 그룹과 랭킹 기록",
  "맞춤 루틴 설정 (탈퇴 후 접근 불가, 일정 기간 뒤 삭제)",
] as const;

type Step = "survey" | "confirm";

/** 마이페이지의 '회원탈퇴' — 설문 → 감사·장점·불이익 → 감수 체크 후 탈퇴. */
export function WithdrawButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("survey");
  const [reason, setReason] = useState<string | null>(null);
  const [etc, setEtc] = useState("");
  const [agree, setAgree] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    // 다음 열람을 위해 초기화
    setStep("survey");
    setReason(null);
    setEtc("");
    setAgree(false);
    setError(null);
  }

  function doWithdraw() {
    setError(null);
    const full =
      reason === "기타" && etc.trim() ? `기타: ${etc.trim()}` : reason ?? "";
    start(async () => {
      const res = await withdrawSelfAction(full);
      if (res.ok) {
        router.replace("/login");
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        data-testid="withdraw-account"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 underline-offset-2 transition hover:text-red-500 hover:underline dark:text-zinc-500 dark:hover:text-red-400"
      >
        <UserX aria-hidden="true" size={13} />
        회원탈퇴
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
          onClick={close}
        >
          <div
            className="flex max-h-[88dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white text-left shadow-2xl dark:bg-zinc-900 sm:max-h-[85vh] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                회원탈퇴
              </span>
              <button
                type="button"
                aria-label="닫기"
                onClick={close}
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-5">
              {step === "survey" ? (
                <>
                  <h3 className="text-lg font-bold text-zinc-950 dark:text-zinc-100">
                    떠나시는 이유를 알려주세요
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    더 나은 헬쑤를 만드는 데 큰 도움이 됩니다.
                  </p>
                  <div className="mt-4 space-y-2">
                    {REASONS.map((r) => (
                      <label
                        key={r}
                        className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                          reason === r
                            ? "border-emerald-400 bg-emerald-50 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-200"
                            : "border-zinc-200 text-zinc-700 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="withdraw-reason"
                          className="h-4 w-4 accent-emerald-600"
                          checked={reason === r}
                          onChange={() => setReason(r)}
                        />
                        {r}
                      </label>
                    ))}
                    {reason === "기타" ? (
                      <textarea
                        value={etc}
                        onChange={(e) => setEtc(e.target.value)}
                        rows={3}
                        placeholder="자세한 이유를 들려주세요 (선택)"
                        className="w-full rounded-xl border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
                      />
                    ) : null}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 aria-hidden="true" size={22} />
                    <h3 className="text-lg font-bold">
                      그동안 이용해 주셔서 감사합니다 🙏
                    </h3>
                  </div>

                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                    <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                      헬쑤와 함께라면
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {BENEFITS.map((b) => (
                        <li
                          key={b}
                          className="flex gap-2 text-sm text-emerald-900 dark:text-emerald-100"
                        >
                          <CheckCircle2
                            aria-hidden="true"
                            size={15}
                            className="mt-0.5 shrink-0 text-emerald-500"
                          />
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
                    <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-red-700 dark:text-red-300">
                      <AlertTriangle aria-hidden="true" size={14} />
                      탈퇴하면 이런 것들이 사라져요
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {LOSSES.map((l) => (
                        <li
                          key={l}
                          className="flex gap-2 text-sm text-red-900 dark:text-red-100"
                        >
                          <X
                            aria-hidden="true"
                            size={15}
                            className="mt-0.5 shrink-0 text-red-500"
                          />
                          {l}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl bg-zinc-50 p-3.5 dark:bg-zinc-800/60">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-red-600"
                      checked={agree}
                      onChange={(e) => setAgree(e.target.checked)}
                    />
                    <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-200">
                      위 내용을 모두 확인했으며, 운동·식단·체형 기록이 삭제되는
                      불이익을 감수하고 탈퇴하겠습니다.
                    </span>
                  </label>

                  {error ? (
                    <p className="mt-3 text-xs font-semibold text-red-600 dark:text-red-400">
                      {error}
                    </p>
                  ) : null}
                </>
              )}
            </div>

            {/* 하단 버튼 */}
            <div className="flex items-center gap-2 border-t border-zinc-100 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] dark:border-zinc-800">
              {step === "survey" ? (
                <>
                  <button
                    type="button"
                    onClick={close}
                    className="h-11 flex-1 rounded-xl border border-zinc-300 text-sm font-bold text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
                  >
                    다시 사용하기
                  </button>
                  <button
                    type="button"
                    disabled={!reason}
                    onClick={() => setStep("confirm")}
                    className="h-11 flex-1 rounded-xl bg-zinc-900 text-sm font-bold text-white transition hover:bg-zinc-700 disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                  >
                    다음
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => router.push("/routine")}
                    className="h-11 flex-1 rounded-xl bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-500"
                  >
                    다시 사용하기
                  </button>
                  <button
                    type="button"
                    data-testid="withdraw-confirm"
                    disabled={!agree || pending}
                    onClick={doWithdraw}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-red-300 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-40 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    {pending ? (
                      <Loader2 aria-hidden="true" size={15} className="animate-spin" />
                    ) : (
                      <UserX aria-hidden="true" size={15} />
                    )}
                    탈퇴하기
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
