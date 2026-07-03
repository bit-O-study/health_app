"use client";

import { useState } from "react";
import { ScanSearch, X } from "lucide-react";

import { EquipmentScanner } from "@/features/equipment/components/equipment-scanner";

/**
 * '운동 시작' 왼쪽에 놓는 작은 아이콘 버튼 — 누르면 기구 사진 스캐너가 모달로 뜬다.
 * 사진 → AI 가 기구 식별 + 앱에 등록된(할 수 있는) 운동 안내.
 */
export function EquipmentScanButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="기구 사진으로 운동 찾기"
        title="기구 사진으로 운동 찾기"
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-600 transition hover:border-emerald-400 hover:text-emerald-600 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:text-emerald-400"
      >
        <ScanSearch aria-hidden="true" size={18} />
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 sm:items-center">
          <div className="max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-zinc-50 p-4 pb-[max(env(safe-area-inset-bottom),1.25rem)] shadow-xl dark:bg-zinc-950 sm:max-h-[85dvh] sm:rounded-2xl sm:pb-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-base font-bold text-zinc-900 dark:text-zinc-100">
                <ScanSearch aria-hidden="true" size={18} />
                기구 사진으로 운동 찾기
              </h3>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>
            <EquipmentScanner />
          </div>
        </div>
      ) : null}
    </>
  );
}
