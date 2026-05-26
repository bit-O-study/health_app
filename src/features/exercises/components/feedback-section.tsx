"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Send } from "lucide-react";

import { supabase } from "@/lib/supabase";
import type { ExerciseVideo } from "@/types/exercise";

type FeedbackSectionProps = {
  videos: ExerciseVideo[];
};

export function FeedbackSection({ videos }: FeedbackSectionProps) {
  if (!videos.length) {
    return (
      <section className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 p-6 text-center">
        <MessageSquare
          aria-hidden="true"
          className="mx-auto text-zinc-400 dark:text-zinc-500"
          size={28}
        />
        <h2 className="mt-3 text-lg font-semibold text-zinc-950 dark:text-zinc-100">
          아직 업로드된 영상이 없습니다
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          첫 자세 영상을 업로드하면 익명 피드백을 받을 수 있습니다.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-5">
      {videos.map((video) => (
        <article
          className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 shadow-sm"
          key={video.id}
        >
          <div className="bg-zinc-950">
            <video
              className="aspect-video w-full bg-zinc-950"
              controls
              preload="metadata"
              src={video.videoUrl}
            />
          </div>

          <div className="space-y-5 p-5">
            <div>
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-100">
                {video.title}
              </h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {new Intl.DateTimeFormat("ko-KR", {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(video.createdAt))}
              </p>
            </div>

            <CommentForm videoId={video.id} />

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                익명 피드백 {video.comments.length}개
              </h3>
              {video.comments.length ? (
                <div className="space-y-3">
                  {video.comments.map((comment) => (
                    <div
                      className="rounded-md bg-zinc-50 dark:bg-zinc-900 p-4"
                      key={comment.id}
                    >
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {comment.nickname}
                        </span>
                        <span>
                          {new Intl.DateTimeFormat("ko-KR", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(comment.createdAt))}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                        {comment.body}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-md bg-zinc-50 dark:bg-zinc-900 p-4 text-sm text-zinc-600 dark:text-zinc-400">
                  아직 피드백이 없습니다.
                </p>
              )}
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}

function CommentForm({ videoId }: { videoId: string }) {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!body.trim()) {
      setStatus("피드백 내용을 입력해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    const { error } = await supabase.from("video_comments").insert({
      video_id: videoId,
      nickname: nickname.trim() || "익명",
      body: body.trim(),
    });

    if (error) {
      setStatus(error.message);
      setIsSubmitting(false);
      return;
    }

    setNickname("");
    setBody("");
    setStatus("피드백을 등록했습니다.");
    setIsSubmitting(false);
    router.refresh();
  }

  return (
    <form className="grid gap-3" onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-[180px_1fr]">
        <input
          className="h-11 rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          onChange={(event) => setNickname(event.target.value)}
          placeholder="닉네임(선택)"
          type="text"
          value={nickname}
        />
        <textarea
          className="min-h-24 resize-y rounded-md border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 px-3 py-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
          onChange={(event) => setBody(event.target.value)}
          placeholder="자세 피드백을 남겨주세요."
          value={body}
        />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
          disabled={isSubmitting}
          type="submit"
        >
          <Send aria-hidden="true" size={16} />
          댓글 등록
        </button>
        {status ? (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{status}</p>
        ) : null}
      </div>
    </form>
  );
}
