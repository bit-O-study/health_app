"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Video, X } from "lucide-react";

import {
  MAX_TEACHING_CAPTION,
  MAX_TAG,
  TEACHING_MAX_SECONDS,
  TEACHING_RULES,
  normalizeTag,
} from "@/features/teaching/teaching";
import { uploadTeachingVideo } from "@/features/teaching/upload-video";
import { createTeachingPostAction } from "@/features/teaching/teaching-actions";

/**
 * 운동 티칭 영상 올리기 — 30초 이내 영상 + 운동 태그 + 한마디.
 * 운동모드/티칭 보드 공용. defaultTag·defaultSlug 로 현재 운동을 미리 채운다.
 */
export function TeachingComposeModal({
  defaultTag = "",
  defaultSlug = null,
  onClose,
  onDone,
}: {
  defaultTag?: string;
  defaultSlug?: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [tag, setTag] = useState(defaultTag);
  const [caption, setCaption] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pick(f: File | null) {
    setError(null);
    if (!f) {
      setFile(null);
      setPreview(null);
      return;
    }
    // 길이 검사 — 30초(여유 포함 35초) 초과면 막는다. 메타데이터를 못 읽으면 통과.
    const url = URL.createObjectURL(f);
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      const dur = v.duration;
      if (Number.isFinite(dur) && dur > TEACHING_MAX_SECONDS) {
        setError(`영상은 30초 이내로 올려주세요. (현재 ${Math.round(dur)}초)`);
        setFile(null);
        setPreview(null);
        URL.revokeObjectURL(url);
        return;
      }
      setFile(f);
      setPreview(url);
    };
    v.onerror = () => {
      // 메타데이터를 못 읽어도 업로드는 허용(서버 용량 제한이 최종 방어).
      setFile(f);
      setPreview(url);
    };
    v.src = url;
  }

  function submit() {
    setError(null);
    if (!file) {
      setError("영상을 골라주세요.");
      return;
    }
    if (!normalizeTag(tag)) {
      setError("어떤 운동인지 태그를 입력해주세요.");
      return;
    }
    start(async () => {
      try {
        const videoUrl = await uploadTeachingVideo(file);
        const r = await createTeachingPostAction({
          videoUrl,
          exerciseTag: tag,
          exerciseSlug: defaultSlug,
          caption,
        });
        if (r.ok) onDone();
        else setError(r.error);
      } catch (e) {
        setError(e instanceof Error ? e.message : "업로드에 실패했어요.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 sm:items-center">
      <div className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] dark:bg-zinc-900 sm:rounded-3xl sm:pb-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-extrabold">운동 티칭 영상 올리기 🎬</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded-full p-1 text-zinc-400"
          >
            <X size={20} />
          </button>
        </div>

        {/* 영상 */}
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          capture="environment"
          className="hidden"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
        />
        {preview ? (
          <video
            src={preview}
            controls
            playsInline
            className="aspect-video w-full rounded-2xl bg-black object-contain"
          />
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-zinc-300 bg-zinc-50 text-sm text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <Video size={32} />
            30초 이내 영상 찍기 / 올리기
          </button>
        )}
        {preview ? (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-2 w-full rounded-xl border border-zinc-200 py-2 text-xs font-bold text-zinc-500 dark:border-zinc-700"
          >
            다시 찍기 / 다른 영상
          </button>
        ) : null}

        {/* 운동 태그 */}
        <label className="mt-3 block text-xs font-bold text-zinc-500">
          어떤 운동인가요? (태그)
        </label>
        <input
          value={tag}
          onChange={(e) => setTag(e.target.value.slice(0, MAX_TAG))}
          placeholder="예: 스쿼트, 벤치프레스"
          className="mt-1 w-full rounded-2xl border border-zinc-200 bg-white p-3 text-sm outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-800"
        />

        {/* 한마디 */}
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value.slice(0, MAX_TEACHING_CAPTION))}
          rows={2}
          placeholder="자세 팁 한마디 (선택)"
          className="mt-3 w-full resize-none rounded-2xl border border-zinc-200 bg-white p-3 text-sm outline-none focus:border-emerald-400 dark:border-zinc-700 dark:bg-zinc-800"
        />

        {error ? (
          <p className="mt-2 text-xs font-bold text-rose-500">{error}</p>
        ) : null}

        {/* 게시판 규칙 */}
        <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-[11px] leading-relaxed text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400">
          {TEACHING_RULES}
        </p>

        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 text-sm font-extrabold text-white active:scale-[0.99] disabled:opacity-60"
        >
          {pending ? (
            <>
              <Loader2 size={18} className="animate-spin" /> 올리는 중…
            </>
          ) : (
            "티칭 영상 올리기"
          )}
        </button>
      </div>
    </div>
  );
}