"use client";

import { useEffect, useState } from "react";
import { Building2, Loader2, MapPin, Search, Users } from "lucide-react";

import {
  searchGymCandidatesAction,
} from "@/features/gym/gym-actions";
import {
  manualGymCandidate,
  type GymCandidate,
} from "@/features/gym/gym-search";

/**
 * 헬스장 **검색 먼저** 단계.
 *
 * 이름으로 검색해 한 곳을 고르면 이름·주소가 함께 정해진다(주소를 따로 칠 일이 없다).
 * 검색에 안 나오는 곳만 "직접 헬스장 입력하기" 로 이름·주소를 손으로 넣는다.
 *
 * 고른 결과에 gymId 가 있으면 그 헬스장 회원들의 기구 합집합(equipmentIds)이 같이
 * 넘어오고, 없으면 빈 배열이라 부르는 쪽이 기본 보유기구로 시작한다.
 */
export function GymPicker({
  onPick,
  onCancel,
  cancelLabel = "취소",
}: {
  onPick: (candidate: GymCandidate) => void;
  onCancel?: () => void;
  cancelLabel?: string;
}) {
  const [mode, setMode] = useState<"search" | "manual">("search");
  const [query, setQuery] = useState("");
  /**
   * 결과는 **어떤 검색어의 결과인지**와 같이 들고 있는다. 검색어가 바뀌자마자
   * 이전 결과가 남의 것이 되는데, 따로 비우는 상태를 두면 effect 안에서 setState 를
   * 연쇄로 부르게 된다. 검색어를 붙여 두면 "지금 것인가" 를 렌더에서 판단할 수 있다.
   */
  const [result, setResult] = useState<{
    query: string;
    hits: GymCandidate[];
  } | null>(null);
  const [manualName, setManualName] = useState("");
  const [manualAddress, setManualAddress] = useState("");

  const q = query.trim();
  const ready = q.length >= 2;
  const fresh = ready && result?.query === q;
  const hits = fresh ? result.hits : [];

  useEffect(() => {
    if (mode !== "search" || q.length < 2) return;
    let alive = true;
    const timer = window.setTimeout(() => {
      void searchGymCandidatesAction(q)
        .then((res) => {
          if (alive) setResult({ query: q, hits: res });
        })
        .catch(() => {
          // 검색이 실패해도 화면은 멈추지 않는다 — 직접 입력으로 계속 갈 수 있다.
          if (alive) setResult({ query: q, hits: [] });
        });
    }, 300);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [mode, q]);

  function openManual() {
    setManualName(q);
    setManualAddress("");
    setMode("manual");
  }

  if (mode === "manual") {
    const nameOk = manualName.trim().length > 0;
    return (
      <div className="space-y-3">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          검색에 안 나오는 헬스장이에요. 이름과 주소를 직접 넣어주세요.
        </p>
        <label className="block">
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            헬스장 이름
          </span>
          <input
            type="text"
            value={manualName}
            onChange={(e) => setManualName(e.target.value)}
            placeholder="예: 강남 OO 헬스"
            maxLength={100}
            className="mt-1 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-emerald-600 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            주소
          </span>
          <input
            type="text"
            value={manualAddress}
            onChange={(e) => setManualAddress(e.target.value)}
            placeholder="예: 서울 강남구 테헤란로 1"
            maxLength={200}
            className="mt-1 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-950 outline-none transition focus:border-emerald-600 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </label>
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => onPick(manualGymCandidate(manualName, manualAddress))}
            disabled={!nameOk}
            className="inline-flex h-11 items-center justify-center rounded-md bg-emerald-600 px-5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            이 헬스장으로 진행
          </button>
          <button
            type="button"
            onClick={() => setMode("search")}
            className="inline-flex h-11 items-center justify-center rounded-md border border-zinc-300 bg-white px-5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
          >
            검색으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          헬스장 검색
        </span>
        <span className="relative mt-1 block">
          <Search
            aria-hidden="true"
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="헬스장 이름으로 검색 (2글자 이상)"
            maxLength={100}
            className="h-11 w-full rounded-md border border-zinc-300 bg-white pl-9 pr-9 text-sm text-zinc-950 outline-none transition focus:border-emerald-600 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
          />
          {ready && !fresh ? (
            <Loader2
              aria-hidden="true"
              size={16}
              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-zinc-400"
            />
          ) : null}
        </span>
      </label>

      {hits.length > 0 ? (
        <ul className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
          {hits.map((hit) => (
            <li
              key={hit.key}
              className="border-b border-zinc-100 last:border-0 dark:border-zinc-800"
            >
              <button
                type="button"
                onClick={() => onPick(hit)}
                className="flex w-full items-start gap-2 px-3 py-2.5 text-left transition hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
              >
                {hit.gymId ? (
                  <Building2
                    aria-hidden="true"
                    size={15}
                    className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
                  />
                ) : (
                  <MapPin
                    aria-hidden="true"
                    size={15}
                    className="mt-0.5 shrink-0 text-zinc-400"
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {hit.name}
                  </span>
                  <span className="block truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                    {hit.address || "주소 정보 없음"}
                  </span>
                </span>
                {hit.equipmentIds.length > 0 ? (
                  <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                    <Users aria-hidden="true" size={11} />
                    기구 {hit.equipmentIds.length}종
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {fresh && hits.length === 0 ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          검색 결과가 없어요. 아래에서 직접 입력해주세요.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={openManual}
          className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
        >
          직접 헬스장 입력하기
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 items-center justify-center rounded-md px-4 text-xs font-semibold text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            {cancelLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
