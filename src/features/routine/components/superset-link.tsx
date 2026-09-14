"use client";

import { Link2, Link2Off } from "lucide-react";

/**
 * 두 운동 **사이**의 슈퍼세트 묶기/풀기 — 루틴 편집·오늘 편집이 같은 모양으로 쓴다.
 *
 * 줄이 아니라 **줄 사이**를 다룬다. 슈퍼세트는 "이 운동과 바로 다음 운동을 쉬지 않고
 * 번갈아 한다" 는 뜻이라, 관계의 주체가 줄 하나가 아니라 두 줄의 경계다.
 * (넷을 묶어 놓고 가운데를 끊으면 둘·둘로 갈라지는 것도 그래서 자연스럽다.)
 *
 * 묶을 수 없는 자리(마지막 줄, 부위가 다른 줄 사이)에는 **아무것도 안 그린다** —
 * 눌러도 아무 일이 없는 버튼을 두지 않는다.
 */
export function SupersetLink({
  linked,
  disabled = false,
  onToggle,
}: {
  linked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative flex justify-center py-0.5" data-testid="superset-link">
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={linked}
        aria-label={linked ? "슈퍼세트 풀기" : "다음 운동과 슈퍼세트로 묶기"}
        className={`inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs font-bold transition disabled:opacity-40 ${
          linked
            ? "border-violet-300 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300"
            : "border-dashed border-zinc-300 bg-transparent text-zinc-400 hover:border-violet-400 hover:text-violet-600 dark:border-zinc-700 dark:text-zinc-500"
        }`}
      >
        {linked ? (
          <>
            <Link2 aria-hidden="true" size={11} />
            슈퍼세트
          </>
        ) : (
          <>
            <Link2Off aria-hidden="true" size={11} />
            묶기
          </>
        )}
      </button>
    </div>
  );
}

/** 묶음에 속한 줄에 붙는 배지 — 'A'·'B' 로 순서를 보여준다. */
export function SupersetBadge({ label }: { label: string }) {
  return (
    <span
      data-testid="superset-badge"
      className="inline-flex h-5 shrink-0 items-center gap-0.5 rounded-md bg-violet-100 px-1.5 text-xs font-bold text-violet-700 dark:bg-violet-950/50 dark:text-violet-300"
    >
      <Link2 aria-hidden="true" size={9} />
      {label}
    </span>
  );
}
