"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { setDebugFeatureAction } from "@/features/admin/admin-actions";
import type { DebugFeatureId } from "@/features/admin/debug-features";

export type DebugFeatureView = {
  id: DebugFeatureId;
  label: string;
  enabled: boolean;
};

/**
 * 관리자용 — 디버그(개발/진단) 기능을 기능별로 켜고/끄고/다시 켠다.
 * 여기서 끈 기능은 디버그 계정에서도 앱에 안 보인다. 기본값은 켜짐.
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

  function toggle(id: DebugFeatureId, next: boolean) {
    setError(null);
    setBusyId(id);
    start(async () => {
      const res = await setDebugFeatureAction(id, next);
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
        {features.map((f) => (
          <li
            key={f.id}
            className="flex items-center gap-3 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {f.label}
              </p>
              <p className="text-xs text-zinc-500">
                {f.enabled ? "켜짐 — 디버그 계정에 표시" : "꺼짐 — 숨김"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={f.enabled}
              aria-label={`${f.label} ${f.enabled ? "끄기" : "켜기"}`}
              onClick={() => toggle(f.id, !f.enabled)}
              disabled={pending && busyId === f.id}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:opacity-50 ${
                f.enabled
                  ? "bg-emerald-600"
                  : "bg-zinc-300 dark:bg-zinc-600"
              }`}
            >
              {pending && busyId === f.id ? (
                <Loader2
                  aria-hidden="true"
                  size={12}
                  className="absolute left-1/2 -translate-x-1/2 animate-spin text-white"
                />
              ) : (
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
                    f.enabled ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
