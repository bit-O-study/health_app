"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";

import { joinGroupByTokenAction } from "@/features/groups/group-actions";
import { groupTabHref } from "@/features/groups/group-mode";

export function JoinConfirm({
  token,
  groupName,
}: {
  token: string;
  groupName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function accept() {
    setErr(null);
    start(async () => {
      const res = await joinGroupByTokenAction(token);
      if (res.ok && res.id) {
        // 그룹탭 정식 경로 — 현재 모드(헬스장/인증)에 맞는 화면으로 들어간다.
        // (`/groups/[id]` 는 헬스장 전용이라 인증 모드에서도 캐릭터 키우기가 떴다.)
        router.push(groupTabHref(res.id));
        router.refresh();
      } else if (!res.ok) {
        // 비로그인(카톡 인앱 브라우저 등)이면 로그인 후 이 초대로 되돌아오게 한다.
        if (res.error.includes("로그인")) {
          router.push(
            `/login?redirect=${encodeURIComponent(`/groups/join/${token}`)}`,
          );
          return;
        }
        setErr(res.error);
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-sm app-card p-4 text-center">
      <span className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand">
        <Users aria-hidden="true" size={24} />
      </span>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">그룹 초대</p>
      <h1 className="mt-0.5 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
        {groupName}
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        이 그룹에 가입하시겠어요?
      </p>

      {err ? (
        <p className="mt-3 rounded-[10px] bg-danger/10 px-3 py-2 text-sm text-danger">
          {err}
        </p>
      ) : null}

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => router.push("/groups")}
          className="app-press h-11 flex-1 rounded-xl bg-zinc-100 text-base font-semibold text-zinc-600 disabled:opacity-50 dark:bg-white/[0.08] dark:text-zinc-300"
        >
          거절
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={accept}
          className="app-press h-11 flex-1 rounded-xl bg-brand text-base font-semibold text-white dark:text-zinc-950 disabled:opacity-50"
        >
          {pending ? "가입 중…" : "확인"}
        </button>
      </div>
    </div>
  );
}
