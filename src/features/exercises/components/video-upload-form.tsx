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
  // 고른 파일 이름 — 브라우저 기본 파일칸(영어 "Choose File") 대신 한국어 버튼 옆에 보여 준다.
  const [fileName, setFileName] = useState("");

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
        setFileName("");
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
        <label className="grid gap-1 text-xs font-semibold text-muted">
          영상 제목
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-10 rounded-[10px] bg-[var(--surface-strong)] ring-1 ring-inset ring-[var(--line)] px-3 text-sm font-normal text-zinc-900 outline-none transition focus:ring-2 focus:ring-brand/40 dark:bg-white/[0.08] dark:text-zinc-100"
            placeholder="예: 스쿼트 측면 자세"
            type="text"
          />
        </label>

        <label className="grid gap-1 text-xs font-semibold text-muted">
          영상 파일
          <input
            ref={fileInputRef}
            accept="video/mp4,video/quicktime,video/webm"
            className="peer sr-only"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
            type="file"
          />
          <span className="flex min-h-11 items-center gap-3 rounded-[10px] bg-[var(--surface-strong)] px-3 py-2 text-sm font-normal ring-1 ring-inset ring-[var(--line)] peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40 dark:bg-white/[0.08]">
            <span className="shrink-0 rounded-full bg-zinc-200/70 px-3 py-1 font-semibold text-foreground dark:bg-white/[0.12]">파일 선택</span>
            <span className={`min-w-0 truncate ${fileName ? "text-foreground" : "text-muted"}`}>{fileName || "선택한 파일 없음"}</span>
          </span>
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
            <p className="text-sm text-muted">{status}</p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
