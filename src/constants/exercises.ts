import type { Exercise } from "@/types/exercise";

export const VIDEO_BUCKET = "exercise-videos";

export const FALLBACK_EXERCISES: Exercise[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "squat",
    name: "스쿼트",
    summary: "하체 전반과 코어 안정성을 함께 확인하기 좋은 기본 운동입니다.",
    difficulty: "beginner",
    equipment: "바벨 또는 맨몸",
    targetMuscles: ["대퇴사두근", "둔근", "햄스트링", "코어"],
    cues: [
      "무릎과 발끝 방향을 맞추기",
      "허리를 과하게 꺾지 않기",
      "발 전체로 바닥 밀기",
    ],
    createdAt: "",
  },
  {
    id: "00000000-0000-0000-0000-000000000002",
    slug: "deadlift",
    name: "데드리프트",
    summary: "힙 힌지와 등 고정, 바 경로를 점검하기 좋은 전신 근력 운동입니다.",
    difficulty: "intermediate",
    equipment: "바벨",
    targetMuscles: ["둔근", "햄스트링", "척추기립근", "광배근"],
    cues: [
      "바를 몸 가까이 유지하기",
      "등을 먼저 말아 올리지 않기",
      "엉덩이와 가슴을 함께 세우기",
    ],
    createdAt: "",
  },
  {
    id: "00000000-0000-0000-0000-000000000003",
    slug: "bench-press",
    name: "벤치프레스",
    summary:
      "상체 밀기 패턴과 견갑 안정성을 확인하는 대표적인 가슴 운동입니다.",
    difficulty: "intermediate",
    equipment: "바벨, 벤치",
    targetMuscles: ["대흉근", "삼두근", "전면 삼각근"],
    cues: [
      "견갑을 고정하기",
      "손목을 세워 바를 받치기",
      "가슴 위에서 일정한 경로 유지하기",
    ],
    createdAt: "",
  },
];
