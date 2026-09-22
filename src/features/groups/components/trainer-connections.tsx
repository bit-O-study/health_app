"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldOff, UserMinus } from "lucide-react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { PendingButton } from "@/components/pending-button";
import {
  SHARE_HINT,
  SHARE_KINDS,
  SHARE_LABEL,
  shareSummary,
  type ShareKind,
} from "@/features/groups/share-prefs";
import {
  leaveTrainerGroupAction,
  setSharePrefAction,
} from "@/features/groups/share-prefs-actions";
import type { TrainerConnection } from "@/features/groups/share-prefs.server";

/**
 * 설정 → 트레이너 연결. 트레이너별로 **무엇을 보여줄지** 끄고 켜고, 연결을 끊는다.
 *
 * 🔴 스위치는 **누른 즉시** 화면에 반영한다(낙관적). 서버 왕복이 싱가포르라 기다리게
 *    하면 "안 눌리는 스위치" 로 느낀다. 실패하면 되돌리고 이유를 띄운다.
 */
export function TrainerConnections({ initial }: { initial: TrainerConnection[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<TrainerConnection | null>(null);
  const [pending, start] = useTransition();

  function toggle(groupId: string, kind: ShareKind, next: boolean) {
    setError(null);
    const before = rows;
    setRows((prev) =>
      prev.map((r) =>
        r.groupId === groupId ? { ...r, prefs: { ...r.prefs, [kind]: next } } : r,
      ),
    );
    start(async () => {
      const res = await setSharePrefAction(groupId, kind, next);
      if (!res.ok) {
        setRows(before); // 되돌린다 — 꺼진 줄 알았는데 켜져 있으면 최악이다.
        setError(res.error);
      }
    });
  }

  async function leave(groupId: string) {
    setError(null);
    const res = await leaveTrainerGroupAction(groupId);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setRows((prev) => prev.filter((r) => r.groupId !== groupId));
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <p
        data-testid="no-trainers"
        className="rounded-2xl border border-dashed border-zinc-300 px-4 py-8 text-center text-sm leading-6 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400"
      >
        연결된 트레이너가 없어요.
        <br />
        트레이너가 보낸 초대 링크로 들어가면 여기에 나타나요.
      </p>
    );
  }

  return (
    <div className="space-y-3" data-testid="trainer-connections">
      {error ? (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
        >
          {error}
        </p>
      ) : null}

      {rows.map((c) => (
        <section
          key={c.groupId}
          data-testid="trainer-connection"
          data-group={c.groupId}
          className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-zinc-950 dark:text-zinc-100">
                {c.trainerName}
              </h2>
              <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                {c.groupName} · {shareSummary(c.prefs)}
              </p>
            </div>
            <PendingButton
              onClick={() => setLeaving(c)}
              busy={pending}
              data-testid="remove-trainer"
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-rose-300 px-2.5 py-1.5 text-[11px] font-bold text-rose-600 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              <UserMinus aria-hidden="true" size={13} />
              제거
            </PendingButton>
          </div>

          <ul className="mt-3 divide-y divide-zinc-100 dark:divide-zinc-700">
            {SHARE_KINDS.map((k) => (
              <li key={k} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">
                    {SHARE_LABEL[k]}
                  </p>
                  <p className="text-[11px] leading-4 text-zinc-500 dark:text-zinc-400">
                    {SHARE_HINT[k]}
                  </p>
                </div>
                {/* 접근성: 스위치는 버튼 + aria-checked(체크박스 흉내 대신 role=switch). */}
                <button
                  type="button"
                  role="switch"
                  aria-checked={c.prefs[k]}
                  aria-label={`${c.trainerName} ${SHARE_LABEL[k]} 제공`}
                  data-testid="share-toggle"
                  data-kind={k}
                  data-on={c.prefs[k] ? "true" : "false"}
                  onClick={() => toggle(c.groupId, k, !c.prefs[k])}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                    c.prefs[k]
                      ? "bg-emerald-500"
                      : "bg-zinc-300 dark:bg-zinc-600"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                      c.prefs[k] ? "left-[1.375rem]" : "left-0.5"
                    }`}
                  />
                </button>
              </li>
            ))}
          </ul>

          {!c.prefs.prescription ? (
            <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
              <ShieldOff aria-hidden="true" size={12} />
              트레이너가 내 루틴을 바꿀 수 없어요
            </p>
          ) : null}
        </section>
      ))}

      <ConfirmDialog
        open={leaving !== null}
        tone="danger"
        title="트레이너 연결을 끊을까요?"
        message={
          leaving
            ? `${leaving.trainerName} 님과의 연결(${leaving.groupName})을 끊어요. 받은 코멘트도 함께 지워지고, 다시 연결하려면 초대 링크가 필요해요. 내 루틴과 기록은 그대로 남아요.`
            : ""
        }
        confirmLabel="연결 끊기"
        onConfirm={() => {
          const target = leaving;
          setLeaving(null);
          if (target) void leave(target.groupId);
        }}
        onCancel={() => setLeaving(null)}
      />
    </div>
  );
}
