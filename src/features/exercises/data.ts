import { FALLBACK_EXERCISES } from "@/constants/exercises";
import { supabase } from "@/lib/supabase";
import type {
  Exercise,
  ExerciseDifficulty,
  ExerciseVideo,
  VideoComment,
} from "@/types/exercise";

type ExerciseRow = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  difficulty: ExerciseDifficulty;
  equipment: string;
  target_muscles: string[];
  cues: string[];
  created_at: string;
};

type VideoRow = {
  id: string;
  exercise_id: string;
  title: string;
  video_url: string;
  storage_path: string;
  created_at: string;
};

type CommentRow = {
  id: string;
  video_id: string;
  nickname: string | null;
  body: string;
  created_at: string;
};

function toExercise(row: ExerciseRow): Exercise {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    summary: row.summary,
    difficulty: row.difficulty,
    equipment: row.equipment,
    targetMuscles: row.target_muscles ?? [],
    cues: row.cues ?? [],
    createdAt: row.created_at,
  };
}

function toComment(row: CommentRow): VideoComment {
  return {
    id: row.id,
    videoId: row.video_id,
    nickname: row.nickname?.trim() || "익명",
    body: row.body,
    createdAt: row.created_at,
  };
}

function toVideo(row: VideoRow, comments: VideoComment[]): ExerciseVideo {
  return {
    id: row.id,
    exerciseId: row.exercise_id,
    title: row.title,
    videoUrl: row.video_url,
    storagePath: row.storage_path,
    createdAt: row.created_at,
    comments,
  };
}

export async function getExerciseBySlug(
  slug: string,
): Promise<Exercise | null> {
  const { data, error } = await supabase
    .from("exercises")
    .select(
      "id, slug, name, summary, difficulty, equipment, target_muscles, cues, created_at",
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return (
      FALLBACK_EXERCISES.find((exercise) => exercise.slug === slug) ?? null
    );
  }

  return toExercise(data as ExerciseRow);
}

export async function getExerciseVideos(
  exerciseId: string,
): Promise<ExerciseVideo[]> {
  const { data: videos, error: videosError } = await supabase
    .from("exercise_videos")
    .select("id, exercise_id, title, video_url, storage_path, created_at")
    .eq("exercise_id", exerciseId)
    .order("created_at", { ascending: false });

  if (videosError || !videos?.length) {
    return [];
  }

  const videoRows = videos as VideoRow[];
  const videoIds = videoRows.map((video) => video.id);

  const { data: comments, error: commentsError } = await supabase
    .from("video_comments")
    .select("id, video_id, nickname, body, created_at")
    .in("video_id", videoIds)
    .order("created_at", { ascending: false });

  const commentsByVideoId = new Map<string, VideoComment[]>();

  if (!commentsError && comments?.length) {
    for (const comment of comments as CommentRow[]) {
      const mappedComment = toComment(comment);
      const group = commentsByVideoId.get(mappedComment.videoId) ?? [];
      group.push(mappedComment);
      commentsByVideoId.set(mappedComment.videoId, group);
    }
  }

  return videoRows.map((video) =>
    toVideo(video, commentsByVideoId.get(video.id) ?? []),
  );
}
