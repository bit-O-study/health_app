"use client";

import { type FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload } from "lucide-react";

import { VIDEO_BUCKET } from "@/constants/exercises";
import { supabase } from "@/lib/supabase";

type VideoUploadFormProps = {
  exerciseId: string;
};

export function VideoUploadForm({ exerciseId }: VideoUploadFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const file = fileInputRef.current?.files?.[0];

    if (!file) {
      setStatus("업로드할 영상을 선택해 주세요.");
      return;
    }

    setIsUploading(true);
    setStatus(null);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "mp4";
      const storagePath = `${exerciseId}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
      const videoTitle = title.trim() || file.name.replace(/\.[^/.]+$/, "");

      const { error: uploadError } = await supabase.storage
        .from(VIDEO_BUCKET)
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from(VIDEO_BUCKET)
        .getPublicUrl(storagePath);

      const { error: insertError } = await supabase
        .from("exercise_videos")
        .insert({
          exercise_id: exerciseId,
          title: videoTitle,
          video_url: publicUrlData.publicUrl,
          storage_path: storagePath,
        });

      if (insertError) {
        throw insertError;
      }

      setTitle("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setStatus("영상이 업로드됐습니다.");
      router.refresh();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "영상 업로드에 실패했습니다.";
      setStatus(message);
    } finally {
      setIsUploading(false);
    }
  }

  // 섹션 라벨 + 카드(2026-09-16 8단계 촘촘하게) — 형식 안내 문장은 파일 선택 칸의 accept 로 충분해 뺐다.
  return (
    <section>
      <h2 className="app-section-label">자세 영상 업로드</h2>
      <form onSubmit={handleSubmit} className="app-card space-y-2.5 p-3">
        <label className="grid gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          영상 제목
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-10 rounded-[10px] bg-zinc-100 px-3 text-sm font-normal text-zinc-900 outline-none transition focus:ring-2 focus:ring-brand/40 dark:bg-white/[0.08] dark:text-zinc-100"
            placeholder="예: 스쿼트 측면 자세"
            type="text"
          />
        </label>

        <label className="grid gap-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
          영상 파일
          <input
            ref={fileInputRef}
            accept="video/mp4,video/quicktime,video/webm"
            className="block w-full rounded-[10px] bg-zinc-100 px-3 py-2 text-sm font-normal text-zinc-700 file:mr-3 file:rounded-full file:border-0 file:bg-zinc-200 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-zinc-800 dark:bg-white/[0.08] dark:text-zinc-300 dark:file:bg-white/[0.12] dark:file:text-zinc-100"
            type="file"
          />
        </label>

        <div className="flex items-center gap-3">
          <button
            className="app-press inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-brand px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 dark:text-zinc-950"
            disabled={isUploading}
            type="submit"
          >
            {isUploading ? (
              <Loader2 aria-hidden="true" className="animate-spin" size={16} />
            ) : (
              <Upload aria-hidden="true" size={16} />
            )}
            업로드
          </button>
          {status ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{status}</p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
