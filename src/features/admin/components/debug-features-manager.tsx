"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { setDebugFeatureAction } from "@/features/admin/admin-actions";
import {
  DEBUG_VISIBILITIES,
  DEBUG_VISIBILITY_LABEL,
  type DebugFeatureId,
  type DebugVisibility,
} from "@/features/admin/debug-features";

export type DebugFeatureView = {
  id: DebugFeatureId;
  label: string;
  visibility: DebugVisibility;
};

const HINT: Record<DebugVisibility, string> = {
  hidden: "숨김 — 아무에게도 표시 안 함",
  debug: "디버그 계정에만 표시 (테스트 중)",
  public: "전체 공개 — 모든 사용자에게 표시",
};

/**
 * 관리자용 — 기능별 노출 범위를 3단계(숨김 / 디버그 계정만 / 전체 공개)로 고른다.
 * '디버그 계정만' 이 기본. '전체 공개' 로 바꾸면 모든 사용자가 쓸 수 있다.
 */
export function DebugFeaturesManager({
  features,
}: {
  features: DebugFeatureView[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function set(id: DebugFeatureId, v: DebugVisibility) {
    setError(null);
    setBusyId(id);
    start(async () => {
      const res = await setDebugFeatureAction(id, v);
      if (res.ok) router.refresh();
      else setError(res.error);
      setBusyId(null);
    });
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-xs font-semibold text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
      <ul className="space-y-2">
        {features.map((f) => {
          const busy = pending && busyId === f.id;
          return (
            <li
              key={f.id}
              className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800"
            >
              <p className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {f.label}
              </p>
              <div
                role="group"
                aria-label={`${f.label} 노출 범위`}
                className="inline-flex rounded-lg border border-zinc-200 p-0.5 dark:border-zinc-600"
              >
                {DEBUG_VISIBILITIES.map((v) => {
                  const on = f.visibility === v;
                  const activeCls =
                    v === "public"
                      ? "bg-emerald-600 text-white"
                      : v === "debug"
                        ? "bg-amber-500 text-white"
                        : "bg-zinc-500 text-white";
                  return (
                    <button
                      key={v}
                      type="button"
                      aria-pressed={on}
                      disabled={busy}
                      onClick={() => set(f.id, v)}
                      className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                        on
                          ? activeCls
                          : "text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-700"
                      }`}
                    >
                      {busy && on ? (
                        <Loader2
                          aria-hidden="true"
                          size={12}
                          className="animate-spin"
                        />
                      ) : null}
                      {DEBUG_VISIBILITY_LABEL[v]}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[11px] text-zinc-500">{HINT[f.visibility]}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
