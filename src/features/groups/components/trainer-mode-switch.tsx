"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Dumbbell, Users } from "lucide-react";

import {
  MY_MODE_KEY,
  currentSwitchLabel,
  shouldShowTrainerSwitch,
  trainerSwitchOptions,
  type TrainerSwitchGroup,
} from "@/features/groups/trainer-switch";

/**
 * 홈 상단 헤더의 모드 전환 — 지갑 전환(바이낸스)과 같은 모양.
 * 접혀 있을 땐 현재 모드 한 줄, 펼치면 항목마다 **체크**가 붙어 어디 있는지 보인다.
 *
 * 🔴 **트레이너(자기 그룹의 그룹장)에게만 그린다.** 일반 회원에게는 `null` —
 *    "회원 관리" 라는 말 자체가 안 보여야 한다(`shouldShowTrainerSwitch`).
 *
 * 열림 상태를 뒤로가기로 닫지 않는다(작은 드롭다운은 `useBackClose` 대상에서 제외 —
 * 2026-09-14 결정). Escape·바깥 탭으로 닫는다.
 */
export function TrainerModeSwitch({ groups }: { groups: TrainerSwitchGroup[] }) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // 훅은 조건보다 먼저 — 일반 회원(빈 목록)이어도 호출 수가 같아야 한다.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // 화면을 옮기면 닫는다(전환 후에도 열린 채 남으면 새 화면을 가린다).
  // effect 가 아니라 **렌더 중 보정**이다 — effect 에서 setState 하면 한 번 더 그린다
  // (뒤로가기로 돌아온 경우까지 같은 규칙으로 덮인다).
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  if (!shouldShowTrainerSwitch(groups)) return null;

  const options = trainerSwitchOptions(groups, pathname);
  const label = currentSwitchLabel(options);
  const inTrainerMode = !options.find((o) => o.key === MY_MODE_KEY)?.active;

  return (
    <div ref={boxRef} className="relative" data-testid="trainer-mode-switch">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="모드 전환"
        data-testid="trainer-mode-button"
        className={`inline-flex max-w-[48vw] items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold transition sm:max-w-none ${
          inTrainerMode
            ? "border-brand/40 bg-brand-soft text-brand"
            : "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-white/[0.06]"
        }`}
      >
        {inTrainerMode ? (
          <Users aria-hidden="true" size={13} className="shrink-0" />
        ) : (
          <Dumbbell aria-hidden="true" size={13} className="shrink-0" />
        )}
        <span className="truncate">{label}</span>
        <ChevronDown
          aria-hidden="true"
          size={13}
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          role="menu"
          data-testid="trainer-mode-menu"
          className="absolute left-0 z-30 mt-1.5 w-60 max-w-[80vw] overflow-hidden rounded-2xl border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900"
        >
          {options.map((o) => (
            <Link
              key={o.key}
              href={o.href}
              role="menuitem"
              data-testid="trainer-mode-option"
              data-active={o.active ? "true" : "false"}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-semibold transition ${
                o.active
                  ? "text-brand"
                  : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/[0.06]"
              }`}
            >
              <span className="w-4 shrink-0">
                {o.active ? <Check aria-hidden="true" size={15} /> : null}
              </span>
              <span className="min-w-0 flex-1 truncate">{o.label}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
