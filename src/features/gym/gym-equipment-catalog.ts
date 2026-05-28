/**
 * 헬스장 시설 카탈로그.
 *
 * 운동별 EquipmentId (바벨/덤벨/머신/케이블/맨몸) 와는 다른 차원이다.
 * 이건 "이 헬스장에 어떤 하드웨어가 있는가" 의 세분화된 목록 — 나중에 루틴
 * 추천에서 '스미스머신 없음' 같은 필터링에 사용한다.
 *
 * 평균 한국 헬스장 기준으로 자주 보이는 기구들 위주.
 */

export type GymEquipmentItem = {
  id: string;
  label: string;
};

export type GymEquipmentGroup = {
  label: string;
  items: readonly GymEquipmentItem[];
};

export const GYM_EQUIPMENT_GROUPS: readonly GymEquipmentGroup[] = [
  {
    label: "기본",
    items: [
      { id: "barbell", label: "바벨" },
      { id: "dumbbell", label: "덤벨" },
      { id: "bench_flat", label: "플랫 벤치" },
      { id: "bench_incline", label: "인클라인 벤치" },
      { id: "bench_decline", label: "디클라인 벤치" },
      { id: "squat_rack", label: "스쿼트 랙" },
      { id: "power_rack", label: "파워 랙" },
      { id: "smith", label: "스미스 머신" },
      { id: "deadlift_platform", label: "데드리프트 플랫폼" },
    ],
  },
  {
    label: "케이블",
    items: [
      { id: "cable_dual", label: "케이블 머신 (양쪽)" },
      { id: "cable_crossover", label: "케이블 크로스오버" },
      { id: "lat_pulldown", label: "랫풀다운" },
      { id: "seated_row", label: "시티드 로우 머신" },
    ],
  },
  {
    label: "상체 머신",
    items: [
      { id: "chest_press", label: "체스트 프레스 머신" },
      { id: "shoulder_press", label: "숄더 프레스 머신" },
      { id: "pec_deck", label: "펙덱 (버터플라이)" },
      { id: "lateral_raise", label: "사이드 레터럴 머신" },
      { id: "tricep_machine", label: "트라이셉 익스텐션 머신" },
      { id: "preacher_curl", label: "프리처 컬 벤치" },
    ],
  },
  {
    label: "하체 머신",
    items: [
      { id: "leg_press", label: "레그 프레스" },
      { id: "hack_squat", label: "핵 스쿼트" },
      { id: "leg_extension", label: "레그 익스텐션" },
      { id: "leg_curl", label: "레그 컬" },
      { id: "calf_raise", label: "카프 레이즈 머신" },
      { id: "adduction", label: "어덕션/어브덕션 머신" },
      { id: "glute_machine", label: "글루트 머신" },
    ],
  },
  {
    label: "맨몸·기능성",
    items: [
      { id: "pullup_bar", label: "풀업 바" },
      { id: "dip_bar", label: "딥 바" },
      { id: "kettlebell", label: "케틀벨" },
      { id: "trx", label: "TRX" },
      { id: "battle_rope", label: "배틀로프" },
      { id: "jump_box", label: "점프 박스" },
      { id: "medicine_ball", label: "메디신볼" },
      { id: "foam_roller", label: "폼롤러" },
    ],
  },
  {
    label: "유산소",
    items: [
      { id: "treadmill", label: "트레드밀" },
      { id: "stationary_bike", label: "실내 자전거" },
      { id: "elliptical", label: "일립티컬" },
      { id: "rowing", label: "로잉머신" },
      { id: "stepper", label: "스텝퍼" },
      { id: "assault_bike", label: "어쎌트 바이크" },
    ],
  },
] as const;

/** 평균 한국 헬스장에 거의 다 있는 기구 — 초기 체크 상태 */
export const DEFAULT_KOREAN_GYM_EQUIPMENT: readonly string[] = [
  "barbell",
  "dumbbell",
  "bench_flat",
  "bench_incline",
  "squat_rack",
  "smith",
  "cable_dual",
  "lat_pulldown",
  "seated_row",
  "chest_press",
  "shoulder_press",
  "pec_deck",
  "leg_press",
  "leg_extension",
  "leg_curl",
  "calf_raise",
  "adduction",
  "pullup_bar",
  "dip_bar",
  "treadmill",
  "stationary_bike",
  "stepper",
] as const;

/** 전체 ID 집합 — 검증·정규화용 */
export const ALL_GYM_EQUIPMENT_IDS: ReadonlySet<string> = new Set(
  GYM_EQUIPMENT_GROUPS.flatMap((g) => g.items.map((i) => i.id)),
);

export function getGymEquipmentLabel(id: string): string {
  for (const g of GYM_EQUIPMENT_GROUPS) {
    for (const it of g.items) if (it.id === id) return it.label;
  }
  return id;
}
