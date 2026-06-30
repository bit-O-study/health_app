"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Search, Send, Sparkles, X } from "lucide-react";

import {
  searchExercises,
  type SearchHit,
} from "@/features/routine/exercise-search";

type Turn = { q: string; hits: SearchHit[] };

/**
 * 운동 찾기 — 헤더에서 열리는 대화형 검색.
 * 자연어로 묘사("덤벨 쓰고 머리 뒤로 왔다갔다 하는 운동")하면 키워드를 분석해
 * 추론한 운동 목록을 보여준다(로컬 검색, AI 없이).
 */
export function ExerciseFinder() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    const hits = searchExercises(q, 5);
    setTurns((t) => [...t, { q, hits }]);
    setInput("");
    // 다음 페인트에서 맨 아래로
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-3 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
      >
        <Search aria-hidden="true" size={15} />
        운동 찾기
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex h-[80dvh] max-h-[85dvh] w-full max-w-md flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl dark:bg-zinc-900 sm:h-[600px] sm:max-h-[82vh] sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
              <span className="flex items-center gap-1.5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
                <Sparkles aria-hidden="true" size={16} className="text-emerald-500" />
                운동 찾기
              </span>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => setOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>

            {/* 대화 영역 */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {/* 첫 인사 */}
              <div className="flex justify-start">
                <span className="max-w-[88%] rounded-2xl rounded-bl-sm bg-zinc-100 px-3 py-2 text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
                  안녕하세요? 궁금한 내용을 물어봐주세요 🙂
                </span>
              </div>

              {turns.map((t, i) => (
                <div key={i} className="space-y-2">
                  {/* 사용자 */}
                  <div className="flex justify-end">
                    <span className="max-w-[80%] rounded-2xl rounded-br-sm bg-emerald-600 px-3 py-2 text-sm text-white">
                      {t.q}
                    </span>
                  </div>
                  {/* 응답 */}
                  <div className="flex justify-start">
                    <div className="max-w-[88%] rounded-2xl rounded-bl-sm bg-zinc-100 px-3 py-2 text-sm text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100">
                      {t.hits.length > 0 ? (
                        <>
                          <p className="mb-1.5">
                            추론한 운동은{" "}
                            <strong>
                              {t.hits.map((h) => h.name).join(", ")}
                            </strong>{" "}
                            입니다.
                          </p>
                          <div className="flex flex-col gap-1">
                            {t.hits.map((h) => (
                              <Link
                                key={h.id}
                                href={`/exercises/${h.id}`}
                                onClick={() => setOpen(false)}
                                className="flex items-center justify-between gap-2 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-zinc-800 shadow-sm transition hover:bg-emerald-50 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-emerald-950/30"
                              >
                                <span className="truncate">{h.name}</span>
                                <span className="shrink-0 text-[10px] font-medium text-zinc-400">
                                  {h.target}
                                </span>
                              </Link>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p>
                          딱 맞는 운동을 못 찾았어요. 기구(덤벨/바벨/케이블)나 자극
                          부위(가슴/등/어깨), 동작을 더 넣어 다시 말해 보세요.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 입력 */}
            <form
              onSubmit={submit}
              className="flex items-center gap-2 border-t border-zinc-100 px-3 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] dark:border-zinc-800"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="메시지를 입력하세요"
                className="h-10 flex-1 rounded-full border border-zinc-300 bg-zinc-50 px-4 text-sm text-zinc-900 outline-none transition focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
              <button
                type="submit"
                aria-label="검색"
                disabled={!input.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white transition hover:bg-emerald-500 disabled:opacity-40"
              >
                <Send aria-hidden="true" size={17} />
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
