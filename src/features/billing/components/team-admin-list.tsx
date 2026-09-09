"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import {
  approveTeamPlanAction,
  cancelTeamPlanAction,
} from "@/features/billing/team-actions";
import {
  TEAM_PLAN_META,
  TEAM_STATUS_LABEL,
  addMonthsYmd,
  formatBizNumber,
  type TeamSubscription,
} from "@/features/billing/team-plans";

type Row = TeamSubscription & { groupName: string };

/**
 * 관리자 — 입금을 확인하고 이용 기간을 넣는다.
 *
 * 🔴 **금액과 기간을 사람이 넣는다.** 신청서의 요금제는 안내가일 뿐이고 실제 청구는
 * 인원·기간에 따라 달라진다. 신청값을 그대로 승인해 버리면 협의한 금액과 장부가 갈린다.
 * 기본값만 채워 두고 고칠 수 있게 둔다.
 */
export function TeamAdminList({ rows, today }: { rows: Row[]; today: string }) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 text-sm text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
        아직 팀 요금제 신청이 없어요.
      </p>
    );
  }
  return (
    <ul className="space-y-3" data-testid="team-admin-list">
      {rows.map((r) => (
        <TeamRow key={r.groupId} row={r} today={today} />
      ))}
    </ul>
  );
}

function TeamRow({ row, today }: { row: Row; today: string }) {
  const router = useRouter();
  const [start, setStart] = useState(row.periodStart ?? today);
  const [end, setEnd] = useState(row.periodEnd ?? addMonthsYmd(today, 1));
  const [price, setPrice] = useState(
    String(row.priceKrw || TEAM_PLAN_META[row.plan].monthlyKrw),
  );
  const [seats, setSeats] = useState(String(row.seats || 0));
  const [memo, setMemo] = useState(row.memo ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, run] = useTransition();

  function approve() {
    if (pending) return;
    setMsg(null);
    run(async () => {
      const res = await approveTeamPlanAction({
        groupId: row.groupId,
        periodStart: start,
        periodEnd: end,
        priceKrw: Number(price) || 0,
        seats: Number(seats) || 0,
        memo,
      });
      setMsg(res.ok ? "적용했어요." : res.error);
      if (res.ok) router.refresh();
    });
  }

  function cancel() {
    if (pending) return;
    run(async () => {
      const res = await cancelTeamPlanAction(row.groupId);
      setMsg(res.ok ? "해지했어요." : res.error);
      if (res.ok) router.refresh();
    });
  }

  return (
    <li
      data-testid="team-admin-row"
      data-group={row.groupId}
      className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-zinc-950 dark:text-zinc-100">
            {row.groupName}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500">
            {TEAM_PLAN_META[row.plan].label} · {TEAM_STATUS_LABEL[row.status]}
            {row.periodEnd ? ` · ~${row.periodEnd}` : ""}
          </p>
          {row.bizName ? (
            <p className="mt-0.5 text-[11px] text-zinc-400">
              {row.bizName}
              {row.bizNumber ? ` · ${formatBizNumber(row.bizNumber)}` : ""}
              {row.bizEmail ? ` · ${row.bizEmail}` : ""}
            </p>
          ) : (
            <p className="mt-0.5 text-[11px] text-zinc-400">사업자 정보 없음</p>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {[
          { label: "시작", value: start, set: setStart, type: "date" },
          { label: "종료", value: end, set: setEnd, type: "date" },
          { label: "금액(원)", value: price, set: setPrice, type: "number" },
          { label: "인원", value: seats, set: setSeats, type: "number" },
        ].map((f) => (
          <label key={f.label} className="block">
            <span className="mb-1 block text-[11px] font-bold text-zinc-500">
              {f.label}
            </span>
            <input
              aria-label={`${row.groupName} ${f.label}`}
              type={f.type}
              value={f.value}
              onChange={(e) => f.set(e.target.value)}
              className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-2 text-sm outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </label>
        ))}
      </div>
      <input
        aria-label={`${row.groupName} 메모`}
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="입금 확인 메모(입금자명·계좌 등)"
        className="mt-2 h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
      />

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          data-testid="team-approve"
          disabled={pending}
          onClick={approve}
          className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
        >
          {pending ? <Loader2 aria-hidden="true" size={14} className="animate-spin" /> : null}
          {row.status === "active" ? "기간 연장·수정" : "입금 확인 · 이용 시작"}
        </button>
        {row.status === "active" ? (
          <button
            type="button"
            disabled={pending}
            onClick={cancel}
            className="h-10 rounded-xl border border-red-300 px-3 text-xs font-bold text-red-600 disabled:opacity-50 dark:border-red-800"
          >
            해지
          </button>
        ) : null}
      </div>

      {msg ? <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">{msg}</p> : null}
    </li>
  );
}
