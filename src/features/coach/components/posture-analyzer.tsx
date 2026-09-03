"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Sparkles, Video } from "lucide-react";

import { analyzePostureAction } from "@/features/coach/coach-actions";
import { AiDisclaimer } from "@/features/coach/components/ai-disclaimer";
import { isNativeApp } from "@/lib/platform/is-native-app";
import type { CoachAnalysis } from "@/features/coach/parse";

/**
 * 영상에서 균등 간격 4프레임을 뽑아 2×2 격자 '한 장'으로 합성해 JPEG base64 로 돌려준다.
 * (NVIDIA 비전은 요청당 이미지 1장만 허용 → 여러 프레임을 한 이미지에 이어붙인다.)
 * 좌상→우상→좌하→우하 순서가 동작 시간순(시작→끝)이며 각 칸에 번호를 찍는다.
 */
async function extractCompositeFrame(
  file: File,
  count = 4,
): Promise<{ base64: string; mediaType: string }> {
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

    const cell = 384; // 각 칸 한 변(px) — 2×2 → 768×768 합성
    const cols = 2;
    const rows = Math.ceil(count / cols);
    const canvas = document.createElement("canvas");
    canvas.width = cell * cols;
    canvas.height = cell * rows;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("이 브라우저에선 프레임 추출이 안 돼요.");
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 원본 비율 유지하며 칸 안에 맞춰 그리기(레터박스).
    const vw = video.videoWidth || 1;
    const vh = video.videoHeight || 1;
    const s = Math.min(cell / vw, cell / vh);
    const dw = Math.round(vw * s);
    const dh = Math.round(vh * s);

    for (let i = 0; i < count; i++) {
      const t = (dur * (i + 0.5)) / count; // 균등 간격(양끝 살짝 안쪽)
      await new Promise<void>((resolve, reject) => {
        video.onseeked = () => resolve();
        video.onerror = () => reject(new Error("프레임 탐색 실패"));
        video.currentTime = Math.min(dur - 0.05, t);
      });
      const cx = (i % cols) * cell + Math.round((cell - dw) / 2);
      const cy = Math.floor(i / cols) * cell + Math.round((cell - dh) / 2);
      ctx.drawImage(video, cx, cy, dw, dh);
      // 칸 번호(동작 순서) 표시
      const lx = (i % cols) * cell + 8;
      const ly = Math.floor(i / cols) * cell + 8;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.fillRect(lx, ly, 26, 22);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 16px sans-serif";
      ctx.textBaseline = "top";
      ctx.fillText(String(i + 1), lx + 8, ly + 4);
    }
    const jpeg = canvas.toDataURL("image/jpeg", 0.7);
    return { base64: jpeg.split(",")[1] ?? "", mediaType: "image/jpeg" };
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function PostureAnalyzer({
  defaultExerciseName = "",
}: {
  defaultExerciseName?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [phase, setPhase] = useState<"idle" | "extracting">("idle");
  const [analysis, setAnalysis] = useState<CoachAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exerciseName, setExerciseName] = useState(defaultExerciseName);
  // 앱(APK)에선 카메라로 촬영, 웹에선 영상 파일 업로드만.
  const [isApp, setIsApp] = useState(false);
  useEffect(() => setIsApp(isNativeApp()), []);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setAnalysis(null);
    let frame: { base64: string; mediaType: string };
    try {
      setPhase("extracting");
      frame = await extractCompositeFrame(file);
    } catch (err) {
      setError((err as Error).message);
      setPhase("idle");
      return;
    }
    setPhase("idle");
    start(async () => {
      const res = await analyzePostureAction({ frames: [frame], exerciseName });
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
            10~30초 운동 영상을 촬영/업로드하면 자세를 분석해 교정점을 알려드려요.
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
        {...(isApp ? { capture: "environment" as const } : {})}
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
          {/* 자세 조언도 같은 이유로 — 통증이 있는 사람이 "AI 가 괜찮대" 로 받으면 안 된다. */}
          <AiDisclaimer />
        </div>
      ) : null}
    </section>
  );
}
