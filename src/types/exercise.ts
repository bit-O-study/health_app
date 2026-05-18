export type ExerciseDifficulty = "beginner" | "intermediate" | "advanced";

export type Exercise = {
  id: string;
  slug: string;
  name: string;
  summary: string;
  difficulty: ExerciseDifficulty;
  equipment: string;
  targetMuscles: string[];
  cues: string[];
  createdAt: string;
};

export type VideoComment = {
  id: string;
  videoId: string;
  nickname: string;
  body: string;
  createdAt: string;
};

export type ExerciseVideo = {
  id: string;
  exerciseId: string;
  title: string;
  videoUrl: string;
  storagePath: string;
  createdAt: string;
  comments: VideoComment[];
};
