"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { setDepositInfoAction } from "@/features/admin/admin-actions";
import {
  isDepositReady,
  type DepositInfo,
} from "@/features/billing/deposit-info";

/**
 * 입금 계좌 안내 설정 — 팀 요금제(B2B) 신청자가 보는 계좌.
 *
 * 🔴 **셋 중 하나라도 비면 화면에 안 뜬다**(은행·계좌번호·예금주). 그 상태를 여기서
 * 그대로 알려 준다 — 안 그러면 "저장했는데 왜 신청자에게 안 보이지"로 헤맨다.
 */
export function DepositInfoManager({ initial }: { initial: DepositInfo }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const ready = isDepositReady(form);

  function save() {
    if (pending) return;
    setMsg(null);
    start(async () => {
      const res = await setDepositInfoAction(form);
      setMsg(res.ok ? "저장했어요." : res.error);
      if (res.ok) router.refresh();
    });
  }

  const set = (k: keyof DepositInfo) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-2">
      {(
        [
          { k: "bank" as const, label: "은행", ph: "국민은행" },
          { k: "account" as const, label: "계좌번호", ph: "123456-78-901234" },
          { k: "holder" as const, label: "예금주", ph: "홍길동" },
          { k: "note" as const, label: "안내 문구 (선택)", ph: "입금자명을 상호로 적어 주세요" },
        ]
      ).map((f) => (
        <label key={f.k} className="block">
          <span className="mb-1 block text-[11px] font-bold text-zinc-500">
            {f.label}
          </span>
          <input
            aria-label={f.label}
            value={form[f.k]}
            onChange={(e) => set(f.k)(e.target.value)}
            placeholder={f.ph}
            className="h-10 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </label>
      ))}

      <p
        data-testid="deposit-ready"
        data-ready={ready ? "1" : "0"}
        className={`text-[11px] leading-5 ${
          ready
            ? "text-emerald-700 dark:text-emerald-400"
            : "text-amber-700 dark:text-amber-400"
        }`}
      >
        {ready
          ? "신청자에게 이 계좌가 보여요."
          : "은행·계좌번호·예금주를 모두 채워야 신청자에게 보여요. (지금은 안 보임)"}
      </p>

      <button
        type="button"
        data-testid="deposit-save"
        disabled={pending}
        onClick={save}
        className="inline-flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending ? <Loader2 aria-hidden="true" size={14} className="animate-spin" /> : null}
        저장
      </button>

      {msg ? (
        <p data-testid="deposit-message" className="text-xs text-zinc-600 dark:text-zinc-300">
          {msg}
        </p>
      ) : null}
    </div>
  );
}
