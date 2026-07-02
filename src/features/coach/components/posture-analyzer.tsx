"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Sparkles, Video } from "lucide-react";

import { analyzePostureAction } from "@/features/coach/coach-actions";
import type { CoachAnalysis } from "@/features/coach/parse";

/** 영상에서 균등 간격 4프레임을 뽑아 JPEG base64 로. (긴 변 640px 로 축소) */
async function extractFrames(file: File, count = 4): Promise<{ base64: string; mediaType: string }[]> {
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("영상을 열지 못했습니다."));
    });
    const dur = video.duration || 0;
    if (!dur || !isFinite(dur)) throw new Error("영상 길이를 읽지 못했습니다.");

    const maxPx = 640;
    const scale = Math.min(1, maxPx / Math.max(video.videoWidth, video.videoHeight));
    const w = Math.max(1, Math.round(video.videoWidth * scale));
    const h = Math.max(1, Math.round(video.videoHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("이 브라우저에선 프레임 추출이 안 돼요.");

    const frames: { base64: string; mediaType: string }[] = [];
    for (let i = 0; i < count; i++) {
      const t = (dur * (i + 0.5)) / count; // 균등 간격(양끝 살짝 안쪽)
      await new Promise<void>((resolve, reject) => {
        video.onseeked = () => resolve();
        video.onerror = () => reject(new Error("프레임 탐색 실패"));
        video.currentTime = Math.min(dur - 0.05, t);
      });
      ctx.drawImage(video, 0, 0, w, h);
      const jpeg = canvas.toDataURL("image/jpeg", 0.8);
      frames.push({ base64: jpeg.split(",")[1] ?? "", mediaType: "image/jpeg" });
    }
    return frames;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PostureAnalyzer() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [phase, setPhase] = useState<"idle" | "extracting">("idle");
  const [analysis, setAnalysis] = useState<CoachAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exerciseName, setExerciseName] = useState("");

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setAnalysis(null);
    let frames: { base64: string; mediaType: string }[];
    try {
      setPhase("extracting");
      frames = await extractFrames(file);
    } catch (err) {
      setError((err as Error).message);
      setPhase("idle");
      return;
    }
    setPhase("idle");
    start(async () => {
      const res = await analyzePostureAction({ frames, exerciseName });
      if (res.ok) setAnalysis(res.analysis);
      else setError(res.error);
    });
  }

  const busy = pending || phase === "extracting";

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
          <Video aria-hidden="true" size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
            자세 분석
          </h2>
          <p className="text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            운동 영상을 올리면 자세를 분석해 교정점을 알려드려요.
          </p>
        </div>
      </div>

      <input
        aria-label="운동 이름(선택)"
        type="text"
        placeholder="운동 이름 (선택, 예: 스쿼트)"
        value={exerciseName}
        onChange={(e) => setExerciseName(e.target.value)}
        disabled={busy}
        className="mt-3 h-9 w-full rounded-md border border-zinc-300 bg-white px-2 text-sm dark:border-zinc-600 dark:bg-zinc-800"
      />
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        capture="environment"
        onChange={onPick}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="mt-2 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
      >
        {busy ? (
          <Loader2 aria-hidden="true" size={16} className="animate-spin" />
        ) : (
          <Sparkles aria-hidden="true" size={16} />
        )}
        {phase === "extracting"
          ? "프레임 추출 중…"
          : pending
            ? "분석 중…"
            : "영상 올리고 자세 분석"}
      </button>

      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {analysis ? (
        <div className="mt-4 space-y-3">
          <p className="rounded-xl bg-emerald-50 p-3 text-sm leading-6 text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
            {analysis.summary}
          </p>
          <ul className="space-y-2">
            {analysis.points.map((p, i) => (
              <li key={i} className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {p.title}
                </p>
                {p.detail ? (
                  <p className="mt-0.5 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
                    {p.detail}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
