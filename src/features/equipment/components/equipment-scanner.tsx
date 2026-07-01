"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Camera, Dumbbell, Loader2, Target } from "lucide-react";

import {
  analyzeEquipmentAction,
  type EquipmentAnalysis,
} from "@/features/equipment/analyze-actions";

/** 사진을 캔버스로 긴 변 maxPx 이하로 줄여 JPEG base64 로 만든다(토큰·업로드 절감). */
async function fileToResizedBase64(
  file: File,
  maxPx = 1024,
): Promise<{ base64: string; mediaType: string; preview: string }> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
    fr.readAsDataURL(file);
  });
  const img: HTMLImageElement = await new Promise((resolve, reject) => {
    const el = new window.Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("이미지를 열지 못했습니다."));
    el.src = dataUrl;
  });
  const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("이미지 처리를 지원하지 않는 브라우저입니다.");
  ctx.drawImage(img, 0, 0, w, h);
  const jpeg = canvas.toDataURL("image/jpeg", 0.82);
  const base64 = jpeg.split(",")[1] ?? "";
  return { base64, mediaType: "image/jpeg", preview: jpeg };
}

const CONFIDENCE_LABEL: Record<string, string> = {
  high: "정확도 높음",
  medium: "정확도 보통",
  low: "정확도 낮음(사진을 다시 찍어보세요)",
};

export function EquipmentScanner() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<EquipmentAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일 다시 선택 가능하게
    if (!file) return;
    setError(null);
    setAnalysis(null);
    let img: { base64: string; mediaType: string; preview: string };
    try {
      img = await fileToResizedBase64(file);
    } catch (err) {
      setError((err as Error).message);
      return;
    }
    setPreview(img.preview);
    start(async () => {
      const res = await analyzeEquipmentAction({
        imageBase64: img.base64,
        mediaType: img.mediaType,
      });
      if (res.ok) setAnalysis(res.analysis);
      else setError(res.error);
    });
  }

  return (
    <div className="space-y-5">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onPick}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:opacity-50"
      >
        {pending ? (
          <Loader2 aria-hidden="true" size={17} className="animate-spin" />
        ) : (
          <Camera aria-hidden="true" size={17} />
        )}
        {pending ? "분석 중…" : "기구 사진 찍기 / 올리기"}
      </button>

      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="선택한 기구 사진"
          className="max-h-64 w-full rounded-xl object-contain ring-1 ring-zinc-200 dark:ring-zinc-700"
        />
      ) : null}

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400">
          {error}
        </p>
      ) : null}

      {analysis ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
            <div className="flex items-center gap-2">
              <Dumbbell
                aria-hidden="true"
                size={18}
                className="text-emerald-600 dark:text-emerald-400"
              />
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {analysis.equipmentName}
              </h2>
            </div>
            {analysis.equipmentNameEn ? (
              <p className="text-xs text-zinc-500">{analysis.equipmentNameEn}</p>
            ) : null}
            <p className="mt-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              {CONFIDENCE_LABEL[analysis.confidence] ?? analysis.confidence}
            </p>
            {analysis.summary ? (
              <p className="mt-2 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                {analysis.summary}
              </p>
            ) : null}
            {analysis.muscles.length > 0 ? (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Target aria-hidden="true" size={14} className="text-zinc-400" />
                {analysis.muscles.map((m) => (
                  <span
                    key={m}
                    className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200"
                  >
                    {m}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          {analysis.exercises.length > 0 ? (
            <div>
              <h3 className="mb-2 text-sm font-bold text-zinc-800 dark:text-zinc-200">
                할 수 있는 운동
              </h3>
              <ul className="space-y-2">
                {analysis.exercises.map((ex, i) => {
                  const body = (
                    <>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {ex.name}
                        {ex.catalog ? (
                          <span className="ml-1.5 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                            상세보기
                          </span>
                        ) : null}
                      </p>
                      {ex.description ? (
                        <p className="mt-0.5 text-xs leading-5 text-zinc-600 dark:text-zinc-400">
                          {ex.description}
                        </p>
                      ) : null}
                    </>
                  );
                  return (
                    <li
                      key={`${ex.name}-${i}`}
                      className="rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800"
                    >
                      {ex.catalog ? (
                        <Link
                          href={`/exercises/${ex.catalog.slug}`}
                          className="block transition hover:opacity-80"
                        >
                          {body}
                        </Link>
                      ) : (
                        body
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
