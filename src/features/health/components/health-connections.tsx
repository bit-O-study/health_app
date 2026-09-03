"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Plug, RefreshCw } from "lucide-react";

import {
  HEALTH_FEATURES,
  type HealthFeatureId,
} from "@/features/health/health-features";
import {
  formatLastSync,
  loadSyncMap,
  markSynced,
  type HealthSyncMap,
} from "@/features/health/health-sync-state";
import {
  getHealthAvailability,
  readBodyEntries,
  requestHealthFeature,
  type HealthAvailability,
} from "@/features/health/health-native";
import { importBodyLogsAction } from "@/features/health/body-actions";
import { connectSteps } from "@/features/health/steps-native";
import { saveStepsDaysAction } from "@/features/health/steps-actions";
import {
  formatSleepRecovery,
  readLatestSleepRecovery,
} from "@/features/health/sleep-recovery";

/**
 * 건강 연동 설정 — 로드맵 6.1.
 *
 * 🔴 **항목마다 따로 켠다.** 진입하자마자 전부 요청하면 사용자는 무엇에 왜 동의하는지
 * 모른 채 거절하고, 한 번 거절당하면 설정 앱을 직접 열어야 해서 되돌리기도 어렵다.
 * 그래서 이 화면은 **왜 필요한지 먼저 적고**, 누른 항목의 권한만 그때 요청한다.
 *
 * '마지막 동기화'는 **이 기기 기준**이다 — Health Connect 는 그 폰에 있는 데이터라,
 * 다른 폰에서 한 동기화를 이 폰의 상태로 보여주면 거짓말이 된다. 화면에도 그렇게 적는다.
 */
export function HealthConnections() {
  const router = useRouter();
  const [avail, setAvail] = useState<HealthAvailability | null>(null);
  const [sync, setSync] = useState<HealthSyncMap>({});
  const [busyId, setBusyId] = useState<HealthFeatureId | null>(null);
  const [msg, setMsg] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  useEffect(() => {
    let alive = true;
    // 진입 시엔 **확인만** — 권한창(액티비티)을 자동으로 띄우면 크래시가 났다.
    // 마지막 동기화도 여기서 함께 읽는다. 첫 렌더에 읽으면 서버(빈 맵)와 화면이 달라져
    // 하이드레이션이 어긋나고, 효과 본문에서 바로 setState 하면 렌더가 한 번 더 돈다.
    void getHealthAvailability().then((a) => {
      if (!alive) return;
      setAvail(a);
      setSync(loadSyncMap());
    });
    return () => {
      alive = false;
    };
  }, []);

  const grantedIds =
    avail?.kind === "available" ? new Set(avail.grantedIds) : new Set<string>();

  /** 권한 요청 → 곧바로 첫 동기화까지. 눌렀는데 아무 일도 안 나면 붙은 건지 알 수 없다. */
  function connect(id: HealthFeatureId) {
    setBusyId(id);
    setMsg((m) => ({ ...m, [id]: "" }));
    start(async () => {
      try {
        const res = await requestHealthFeature(id);
        if (!res.ok) {
          setMsg((m) => ({ ...m, [id]: res.reason }));
          return;
        }
        await syncOne(id);
        setAvail(await getHealthAvailability());
        router.refresh();
      } finally {
        setBusyId(null);
      }
    });
  }

  /** 이미 붙은 항목 다시 읽기 — 권한창 없이 값만 새로 가져온다. */
  function resync(id: HealthFeatureId) {
    setBusyId(id);
    setMsg((m) => ({ ...m, [id]: "" }));
    start(async () => {
      try {
        await syncOne(id);
        router.refresh();
      } finally {
        setBusyId(null);
      }
    });
  }

  async function syncOne(id: HealthFeatureId) {
    if (id === "steps") {
      const r = await connectSteps();
      if (!r.ok) return setMsg((m) => ({ ...m, [id]: r.reason }));
      if (r.byDay && Object.keys(r.byDay).length > 0) {
        await saveStepsDaysAction(r.byDay);
      }
      setSync(markSynced("steps"));
      setMsg((m) => ({ ...m, steps: `오늘 ${r.steps.toLocaleString()}걸음` }));
      return;
    }
    if (id === "body") {
      const r = await readBodyEntries();
      if (!r.ok) return setMsg((m) => ({ ...m, [id]: r.reason }));
      const saved = await importBodyLogsAction(r.entries);
      if (!saved.ok) return setMsg((m) => ({ ...m, [id]: "저장하지 못했어요" }));
      setSync(markSynced("body"));
      setMsg((m) => ({
        ...m,
        body:
          saved.inserted > 0
            ? `${saved.inserted}건 새로 가져왔어요`
            : // 0건이 실패로 보이지 않게 — 겹쳐서 안 넣은 것과 아예 없는 것은 다르다.
              saved.skipped > 0
              ? "이미 다 가져온 기록이에요"
              : "가져올 새 기록이 없어요",
      }));
      return;
    }
    if (id === "sleep") {
      const result = await readLatestSleepRecovery();
      if (!result.ok) return setMsg((m) => ({ ...m, [id]: result.reason }));
      setSync(markSynced("sleep"));
      setMsg((m) => ({
        ...m,
        sleep: result.recovery
          ? formatSleepRecovery(result.recovery)
          : "최근 48시간에 완료된 수면 기록이 없어요",
      }));
    }
  }

  return (
    <div className="space-y-3">
      {avail?.kind === "web" ? (
        <p
          data-testid="health-web-notice"
          className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
        >
          건강 연동은 <strong>앱(안드로이드)</strong>에서만 동작해요. 아래 항목이
          무엇을 가져오는지 미리 확인할 수 있어요.
        </p>
      ) : null}
      {avail?.kind === "unavailable" ? (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {avail.reason}
        </p>
      ) : null}

      <ul className="space-y-2">
        {HEALTH_FEATURES.map((f) => {
          const connected = grantedIds.has(f.id);
          const busy = busyId === f.id && pending;
          const canAct = avail?.kind === "available" && f.status === "ready";
          return (
            <li
              key={f.id}
              data-testid={`health-feature-${f.id}`}
              data-connected={connected ? "1" : "0"}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-zinc-950 dark:text-zinc-100">
                    {f.label}
                    {f.status === "planned" ? (
                      <span className="rounded-full bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-500 dark:bg-zinc-700 dark:text-zinc-300">
                        준비 중
                      </span>
                    ) : connected ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        <Check aria-hidden="true" size={10} />
                        연결됨
                      </span>
                    ) : null}
                  </p>
                  {/* 동의를 구하려면 이유를 먼저 말해야 한다. */}
                  <p className="mt-0.5 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
                    {f.why}
                  </p>
                  {f.status === "ready" ? (
                    <p className="mt-1 text-[11px] text-zinc-400 dark:text-zinc-500">
                      마지막 동기화 · {formatLastSync(sync[f.id])}
                    </p>
                  ) : null}
                  {msg[f.id] ? (
                    <p className="mt-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-300">
                      {msg[f.id]}
                    </p>
                  ) : null}
                </div>

                {f.status === "ready" ? (
                  <button
                    type="button"
                    data-testid={`health-connect-${f.id}`}
                    disabled={!canAct || busy}
                    onClick={() => (connected ? resync(f.id) : connect(f.id))}
                    className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition disabled:opacity-50 ${
                      connected
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                        : "bg-emerald-600 text-white hover:bg-emerald-500"
                    }`}
                  >
                    {busy ? (
                      <Loader2 aria-hidden="true" size={13} className="animate-spin" />
                    ) : connected ? (
                      <RefreshCw aria-hidden="true" size={13} />
                    ) : (
                      <Plug aria-hidden="true" size={13} />
                    )}
                    {connected ? "다시 동기화" : "연결"}
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <p className="px-1 text-[11px] leading-5 text-zinc-400 dark:text-zinc-500">
        마지막 동기화 시각은 <strong>이 기기 기준</strong>이에요 — Health Connect 는
        폰에 있는 데이터라, 다른 폰에서는 거기서 따로 연결해야 해요. 연결은 언제든
        Health Connect 앱에서 되돌릴 수 있어요.
      </p>
    </div>
  );
}
