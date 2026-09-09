"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

import {
  cancelTeamRequestAction,
  requestTeamPlanAction,
} from "@/features/billing/team-actions";
import {
  depositLine,
  isDepositReady,
  type DepositInfo,
} from "@/features/billing/deposit-info";
import {
  TEAM_PLANS,
  TEAM_PLAN_META,
  TEAM_STATUS_LABEL,
  daysLeft,
  formatBizNumber,
  isTeamActive,
  type TeamPlan,
  type TeamSubscription,
} from "@/features/billing/team-plans";

/**
 * 팀 요금제 신청 — 트레이너(그룹장)가 본다.
 *
 * 🔴 **결제창이 없다.** 사업자에게는 세금계산서·계좌이체가 필요해서 신청 → 입금 →
 * 관리자 승인 순서다. 화면이 이걸 숨기면 "눌렀는데 아무 일도 안 일어난다"가 되므로
 * **다음에 무슨 일이 일어나는지**를 문장으로 적어 둔다.
 */
export function TeamPlanForm({
  groupId,
  today,
  memberCount,
  initial,
  deposit,
}: {
  groupId: string;
  today: string;
  memberCount: number;
  initial: TeamSubscription | null;
  deposit: DepositInfo;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<TeamPlan>(initial?.plan ?? "trainer");
  const [bizName, setBizName] = useState(initial?.bizName ?? "");
  const [bizNumber, setBizNumber] = useState(initial?.bizNumber ?? "");
  const [bizEmail, setBizEmail] = useState(initial?.bizEmail ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const active = isTeamActive(initial, today);
  const left = daysLeft(initial, today);
  const requested = initial?.status === "requested";

  function submit() {
    if (pending) return;
    setMsg(null);
    start(async () => {
      const res = await requestTeamPlanAction(groupId, plan, {
        name: bizName,
        number: bizNumber,
        email: bizEmail,
      });
      setMsg(res.ok ? "신청이 접수됐어요. 확인 후 연락드릴게요." : res.error);
      if (res.ok) router.refresh();
    });
  }

  function cancel() {
    if (pending) return;
    setMsg(null);
    start(async () => {
      const res = await cancelTeamRequestAction(groupId);
      if (!res.ok) return setMsg(res.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {initial ? (
        <section
          data-testid="team-status"
          data-status={initial.status}
          className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-700 dark:bg-zinc-800"
        >
          <p className="text-sm font-bold text-zinc-950 dark:text-zinc-100">
            {TEAM_STATUS_LABEL[initial.status]}
            {active && left !== null ? (
              <span className="ml-2 text-xs font-normal text-zinc-500">
                {initial.periodEnd}까지 · {left}일 남음
              </span>
            ) : null}
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {TEAM_PLAN_META[initial.plan].label} 요금제
            {initial.priceKrw > 0
              ? ` · 월 ${initial.priceKrw.toLocaleString("ko-KR")}원`
              : ""}
          </p>
          {initial.bizName ? (
            <p className="mt-1 text-[11px] text-zinc-400">
              {initial.bizName}
              {initial.bizNumber ? ` · ${formatBizNumber(initial.bizNumber)}` : ""}
            </p>
          ) : null}
          {requested ? (
            <div className="mt-2 space-y-1.5">
              <p className="text-xs leading-5 text-amber-700 dark:text-amber-300">
                입금 확인 후 이용이 시작돼요.
              </p>
              {/* 🔴 계좌가 다 채워졌을 때만 띄운다 — 반쯤 채운 안내는 없는 것보다 나쁘다
                  (입금하다 만다). 관리자 설정에서 채우면 여기 뜬다. */}
              {isDepositReady(deposit) ? (
                <div
                  data-testid="deposit-info"
                  className="rounded-xl bg-zinc-100 p-3 dark:bg-zinc-900"
                >
                  <p className="text-[11px] font-bold text-zinc-500">입금 계좌</p>
                  <p className="mt-0.5 select-all text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {depositLine(deposit)}
                  </p>
                  {deposit.note ? (
                    <p className="mt-1 text-[11px] leading-5 text-zinc-500 dark:text-zinc-400">
                      {deposit.note}
                    </p>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
                  확인되면 연락드릴게요.
                </p>
              )}
            </div>
          ) : null}
        </section>
      ) : null}

      {active ? (
        <p className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          이용 중이에요. 이 그룹의 회원 {memberCount}명이 프리미엄으로 쓰고 있어요.
          연장·변경은 관리자에게 문의해 주세요.
        </p>
      ) : (
        <>
          <div className="space-y-2">
            {TEAM_PLANS.map((id) => {
              const meta = TEAM_PLAN_META[id];
              const on = plan === id;
              return (
                <button
                  key={id}
                  type="button"
                  data-testid={`plan-${id}`}
                  onClick={() => setPlan(id)}
                  className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition ${
                    on
                      ? "border-emerald-500 bg-emerald-50/60 dark:border-emerald-600 dark:bg-emerald-950/20"
                      : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800"
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      on
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-zinc-300 dark:border-zinc-600"
                    }`}
                  >
                    {on ? <Check aria-hidden="true" size={12} /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-bold text-zinc-950 dark:text-zinc-100">
                        {meta.label}
                      </span>
                      <span className="text-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                        월 {meta.monthlyKrw.toLocaleString("ko-KR")}원
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[11px] text-zinc-500 dark:text-zinc-400">
                      {meta.seatsHint} · {meta.desc}
                    </span>
                  </span>
                </button>
              );
            })}
            <p className="px-1 text-[11px] text-zinc-400">
              부가세 별도. 실제 청구액은 인원·기간에 따라 협의해요.
            </p>
          </div>

          <div className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
            <p className="text-xs font-bold text-zinc-700 dark:text-zinc-200">
              세금계산서 정보 (선택)
            </p>
            {[
              { v: bizName, set: setBizName, label: "상호", ph: "OO피트니스" },
              { v: bizNumber, set: setBizNumber, label: "사업자등록번호", ph: "000-00-00000" },
              { v: bizEmail, set: setBizEmail, label: "이메일", ph: "tax@example.com" },
            ].map((f) => (
              <label key={f.label} className="block">
                <span className="mb-1 block text-[11px] font-bold text-zinc-500">
                  {f.label}
                </span>
                <input
                  aria-label={f.label}
                  value={f.v}
                  onChange={(e) => f.set(e.target.value)}
                  placeholder={f.ph}
                  className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </label>
            ))}
            <p className="text-[11px] leading-5 text-zinc-400">
              계산서는 확인 후 사람이 발행해요. 지금 안 적어도 신청은 돼요.
            </p>
          </div>

          <button
            type="button"
            data-testid="team-request"
            disabled={pending}
            onClick={submit}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {pending ? <Loader2 aria-hidden="true" size={15} className="animate-spin" /> : null}
            {requested ? "신청 내용 수정" : "이용 신청"}
          </button>

          {requested ? (
            <button
              type="button"
              data-testid="team-cancel"
              disabled={pending}
              onClick={cancel}
              className="h-10 w-full rounded-xl border border-zinc-300 text-xs font-bold text-zinc-600 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300"
            >
              신청 취소
            </button>
          ) : null}
        </>
      )}

      {msg ? (
        <p data-testid="team-message" className="text-xs leading-5 text-zinc-700 dark:text-zinc-200">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
