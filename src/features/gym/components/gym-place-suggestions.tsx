"use client";

import { useEffect, useState } from "react";
import { MapPin } from "lucide-react";

import { searchGymPlacesAction } from "@/features/gym/gym-actions";
import { placeAddress, type GymPlace } from "@/features/gym/naver-places";

/**
 * 헬스장 이름 입력값(query)으로 네이버 지역검색 결과를 띄우고, 고르면 이름·주소를 채운다.
 * 네이버 키가 없거나 결과가 없으면 아무것도 렌더하지 않는다(앱은 수기 입력으로 동작).
 */
export function GymPlaceSuggestions({
  query,
  onPick,
}: {
  query: string;
  onPick: (name: string, address: string) => void;
}) {
  const [hits, setHits] = useState<GymPlace[]>([]);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    // 방금 고른 값과 같으면 다시 띄우지 않는다.
    if (q.length < 2 || q === picked) {
      setHits([]);
      return;
    }
    let alive = true;
    const id = window.setTimeout(() => {
      void searchGymPlacesAction(q).then((r) => {
        if (alive) setHits(r);
      });
    }, 300);
    return () => {
      alive = false;
      window.clearTimeout(id);
    };
  }, [query, picked]);

  if (hits.length === 0) return null;

  return (
    <ul className="mt-1 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      {hits.map((h, i) => {
        const addr = placeAddress(h);
        return (
          <li key={`${h.name}-${i}`} className="border-b border-zinc-100 last:border-0 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => {
                setPicked(h.name);
                setHits([]);
                onPick(h.name, addr);
              }}
              className="flex w-full items-start gap-2 px-3 py-2 text-left transition hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            >
              <MapPin
                aria-hidden="true"
                size={14}
                className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {h.name}
                </span>
                <span className="block truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                  {addr || "주소 정보 없음"}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
