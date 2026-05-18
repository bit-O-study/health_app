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

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm"
    >
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-zinc-950">자세 영상 업로드</h2>
        <p className="text-sm leading-6 text-zinc-600">
          MP4, MOV, WebM 형식의 운동 영상을 올려 피드백을 받을 수 있습니다.
        </p>
      </div>

      <div className="mt-5 grid gap-4">
        <label className="grid gap-2 text-sm font-medium text-zinc-800">
          영상 제목
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            placeholder="예: 스쿼트 측면 자세"
            type="text"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-zinc-800">
          영상 파일
          <input
            ref={fileInputRef}
            accept="video/mp4,video/quicktime,video/webm"
            className="block w-full rounded-md border border-dashed border-zinc-300 bg-zinc-50 px-3 py-3 text-sm text-zinc-700 file:mr-4 file:rounded-md file:border-0 file:bg-zinc-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
            type="file"
          />
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
          disabled={isUploading}
          type="submit"
        >
          {isUploading ? (
            <Loader2 aria-hidden="true" className="animate-spin" size={18} />
          ) : (
            <Upload aria-hidden="true" size={18} />
          )}
          업로드
        </button>
        {status ? <p className="text-sm text-zinc-600">{status}</p> : null}
      </div>
    </form>
  );
}
