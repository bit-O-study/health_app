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
  // 섹션 라벨 + 카드(2026-09-16 8단계 촘촘하게) — 빈 상태는 큰 점선 카드 대신 한 줄.
  if (!videos.length) {
    return (
      <section>
        <h2 className="app-section-label">자세 영상</h2>
        <p className="app-list app-row text-sm text-zinc-500 dark:text-zinc-400">
          <MessageSquare aria-hidden="true" className="shrink-0 text-zinc-400" size={16} />
          아직 업로드된 영상이 없습니다
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="app-section-label">자세 영상</h2>
      <div className="space-y-3">
        {videos.map((video) => (
          <article className="app-card overflow-hidden" key={video.id}>
            <div className="bg-zinc-950">
              <video
                className="aspect-video w-full bg-zinc-950"
                controls
                preload="metadata"
                src={video.videoUrl}
              />
            </div>

            <div className="space-y-3 p-3">
              <div>
                <h3 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">
                  {video.title}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {new Intl.DateTimeFormat("ko-KR", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(video.createdAt))}
                </p>
              </div>

              <CommentForm videoId={video.id} />

              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  익명 피드백 {video.comments.length}개
                </h4>
                {video.comments.length ? (
                  <div className="space-y-2">
                    {video.comments.map((comment) => (
                      <div
                        className="rounded-[10px] bg-zinc-100 p-3 dark:bg-white/[0.06]"
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
                        <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                          {comment.body}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    아직 피드백이 없습니다.
                  </p>
                )}
              </div>
            </div>
          </article>
        ))}
      </div>
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
    <form className="grid gap-2" onSubmit={handleSubmit}>
      <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
        <input
          className="h-10 rounded-[10px] bg-zinc-100 px-3 text-sm outline-none transition focus:ring-2 focus:ring-brand/40 dark:bg-white/[0.08]"
          onChange={(event) => setNickname(event.target.value)}
          placeholder="닉네임(선택)"
          type="text"
          value={nickname}
        />
        <textarea
          className="min-h-20 resize-y rounded-[10px] bg-zinc-100 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-brand/40 dark:bg-white/[0.08]"
          onChange={(event) => setBody(event.target.value)}
          placeholder="자세 피드백을 남겨주세요."
          value={body}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          className="app-press inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-brand px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40 dark:text-zinc-950"
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
