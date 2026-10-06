"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Crown, ExternalLink, X } from "lucide-react";

import type { BillingStatus } from "@/features/billing/actions";
import { PLANS } from "@/features/billing/plans";
import {
  FREE_TRIAL_DAYS,
  benefitsUsedLine,
  cancelNotice,
} from "@/features/billing/membership";
import { useBackClose } from "@/lib/platform/use-back-close";

/**
 * 멤버십 카드 — 배민클럽처럼(2026-09-30). 가입 전엔 무료 상태와 '첫 달 무료' 안내,
 * 가입 후엔 요금제 · 다음 결제일(또는 끝나는 날) · 이번 달 받은 혜택 · 구독 관리 · 해지.
 */
export function MembershipCard({ status }: { status: BillingStatus }) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const plan = PLANS[status.plan];
  const m = status.membership;
  const member = status.plan !== "free";
  const used = benefitsUsedLine(status.aiUsesThisMonth);

  const sub =
    status.sponsored && status.personalPlan === "free"
      ? "트레이너·팀 이용권으로 받은 요금제예요"
      : m.nextLine || status.label;

  return (
    <>
      <section
        data-testid="subscription-status"
        data-premium={member ? "1" : "0"}
        data-plan={status.plan}
        data-membership={m.kind}
        className={`app-card space-y-2 p-4 ${member ? "bg-brand-soft/60" : ""}`}
      >
        <div className="flex items-center gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              member
                ? "bg-brand text-white dark:text-zinc-950"
                : "bg-zinc-100 text-zinc-500 dark:bg-white/[0.08] dark:text-zinc-300"
            }`}
          >
            <Crown aria-hidden="true" size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-bold text-zinc-950 dark:text-zinc-100">
              {member ? `${plan.label} 멤버십` : "무료 이용 중"}
            </span>
            <span className="block text-xs text-zinc-600 dark:text-zinc-300">
              {member ? sub : "라이트(월 990원)로 내 기록 리포트와 상담함을 써 보세요"}
            </span>
          </span>
        </div>

        {member && used ? (
          <p data-testid="membership-used" className="rounded-lg bg-white/70 px-3 py-2 text-sm text-zinc-800 dark:bg-white/[0.06] dark:text-zinc-100">
            {used}
          </p>
        ) : null}

        {m.kind === "grace" || m.kind === "blocked" ? (
          <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs font-semibold text-danger">{m.nextLine}</p>
        ) : null}

        {status.personalPlan !== "free" || m.kind === "blocked" ? (
          <div className="flex gap-2 pt-1">
            <a
              href={status.manageUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="membership-manage"
              className="app-press inline-flex h-9 flex-1 items-center justify-center gap-1 rounded-full border border-line bg-white text-sm font-semibold text-zinc-800 dark:bg-transparent dark:text-zinc-100"
            >
              구독 관리
              <ExternalLink aria-hidden="true" size={13} />
            </a>
            {m.canCancel ? (
              <button
                type="button"
                data-testid="membership-cancel"
                onClick={() => setCancelOpen(true)}
                className="inline-flex h-9 items-center justify-center px-3 text-sm font-semibold text-zinc-500 dark:text-zinc-400"
              >
                해지하기
              </button>
            ) : null}
          </div>
        ) : null}
      </section>

      {!member && status.ready && FREE_TRIAL_DAYS > 0 ? (
        <p data-testid="free-trial" className="app-card p-3 text-sm text-zinc-800 dark:text-zinc-100">
          <b>처음 구독하면 {FREE_TRIAL_DAYS}일 무료</b>예요. 무료 기간이 끝나기 전에 해지하면
          결제되지 않아요.
        </p>
      ) : null}

      {cancelOpen ? (
        <CancelSheet status={status} onClose={() => setCancelOpen(false)} />
      ) : null}
    </>
  );
}

/**
 * 해지 안내 — 바로 끊지 않는다. 해지해도 언제까지 쓰는지, 무엇을 못 쓰게 되는지,
 * 한 단계 낮은 요금제가 있는지 보여 주고 구글 플레이 해지 화면으로 보낸다.
 */
function CancelSheet({ status, onClose }: { status: BillingStatus; onClose: () => void }) {
  useBackClose(true, onClose);
  const plan = PLANS[status.personalPlan];
  const notice = cancelNotice(status.personalPlan, status.expiresAt);
  const down = notice.downgrade ? PLANS[notice.downgrade] : null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="멤버십 해지 안내"
        data-testid="cancel-sheet"
        className="max-h-[88dvh] w-full max-w-md space-y-3 overflow-y-auto rounded-t-2xl bg-zinc-50 p-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] shadow-xl dark:bg-zinc-950 sm:rounded-2xl sm:pb-4"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">{plan.label} 멤버십을 해지할까요?</h3>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
          >
            <X aria-hidden="true" size={16} />
          </button>
        </div>

        <p className="text-sm text-zinc-800 dark:text-zinc-100">
          해지해도 <b>{notice.until}</b>까지는 지금처럼 쓸 수 있고, 그 뒤로는 결제되지 않아요.
        </p>

        {notice.lose.length ? (
          <div className="app-card space-y-1 p-3">
            <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">그 뒤로는 이런 걸 못 써요</p>
            <ul className="list-disc space-y-0.5 pl-5 text-sm text-zinc-800 dark:text-zinc-100">
              {notice.lose.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {benefitsUsedLine(status.aiUsesThisMonth) ? (
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{benefitsUsedLine(status.aiUsesThisMonth)}</p>
        ) : null}

        {down ? (
          <p data-testid="cancel-downgrade" className="rounded-lg bg-brand-soft px-3 py-2 text-sm text-zinc-800 dark:text-zinc-100">
            부담되면 <b>{down.label}(월 {down.priceKrw.toLocaleString("ko-KR")}원)</b>으로 바꿀 수도 있어요.
            구글 플레이 구독 관리에서 요금제를 바꿔 주세요.
          </p>
        ) : null}

        <div className="flex flex-col gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="app-press h-11 rounded-full bg-brand text-base font-semibold text-white dark:text-zinc-950"
          >
            계속 이용할게요
          </button>
          <a
            href={status.manageUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="cancel-go-play"
            className="inline-flex h-10 items-center justify-center gap-1 text-sm font-semibold text-zinc-500 dark:text-zinc-400"
          >
            구글 플레이에서 해지하기
            <ExternalLink aria-hidden="true" size={13} />
          </a>
        </div>
      </div>
    </div>,
    document.body,
  );
}
