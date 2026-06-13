/**
  * 운동 id → free-exercise-db(퍼블릭도메인, Unlicense) 운동 id 매핑.
  * 두 프레임(0/1.jpg)을 교차해 실제 시연 동작을 보여준다. jsdelivr CDN 로 로드.
  * 출처: https://github.com/yuhonas/free-exercise-db (The Unlicense)
  */
export const EXERCISE_PHOTO_DB: Record<string, string> = {
  "ab-rollout": "Barbell_Ab_Rollout",
  "arnold-press": "Arnold_Dumbbell_Press",
  "assisted-pull-up": "Band_Assisted_Pull-Up",
  "barbell-row": "Bent_Over_Barbell_Row",
  "bench-dip": "Weighted_Bench_Dip",
  "bench-press": "Barbell_Bench_Press_-_Medium_Grip",
  "biceps-curl": "Barbell_Curl",
  "box-squat": "Box_Squat",
  "bulgarian-split-squat": "Split_Squat_with_Dumbbells",
  "cable-crossover": "Cable_Crossover",
  "cable-crunch": "Cable_Crunch",
  "cable-kickback": "One-Legged_Cable_Kickback",
  "cable-lateral-raise": "Cable_Seated_Lateral_Raise",
  "cable-pull-through": "Pull_Through",
  "cable-rope-hammer-curl": "Cable_Hammer_Curls_-_Rope_Attachment",
  "chest-fly": "Dumbbell_Flyes",
  "chin-up": "Chin-Up",
  "close-grip-bench-press": "Close-Grip_Barbell_Bench_Press",
  "concentration-curl": "Standing_Concentration_Curl",
  "crunch": "Crunches",
  "deadlift": "Barbell_Deadlift",
  "decline-press": "Decline_Smith_Press",
  "dips": "Dips_-_Triceps_Version",
  "donkey-calf-raise": "Donkey_Calf_Raises",
  "drag-curl": "Drag_Curl",
  "dumbbell-pullover": "Bent-Arm_Dumbbell_Pullover",
  "ez-bar-curl": "EZ-Bar_Curl",
  "face-pull": "Face_Pull",
  "front-raise": "Front_Dumbbell_Raise",
  "front-squat": "Front_Barbell_Squat",
  "glute-bridge": "Butt_Lift_Bridge",
  "goblet-squat": "Goblet_Squat",
  "good-morning": "Good_Morning",
  "hack-squat": "Hack_Squat",
  "hammer-curl": "Hammer_Curls",
  "hanging-leg-raise": "Hanging_Leg_Raise",
  "hip-adduction": "Cable_Hip_Adduction",
  "hip-thrust": "Barbell_Hip_Thrust",
  "hyperextension": "Reverse_Hyperextension",
  "incline-cable-fly": "Incline_Dumbbell_Flyes",
  "incline-curl": "Incline_Dumbbell_Curl",
  "incline-press": "Barbell_Incline_Bench_Press_-_Medium_Grip",
  "inverted-row": "Inverted_Row",
  "lat-pulldown": "Wide-Grip_Lat_Pulldown",
  "lateral-raise": "Side_Lateral_Raise",
  "leg-curl": "Lying_Leg_Curls",
  "leg-extension": "Leg_Extensions",
  "leg-press": "Leg_Press",
  "low-row-machine": "Low_Pulley_Row_To_Neck",
  "lunge": "Dumbbell_Lunges",
  "machine-chest-press": "Leverage_Chest_Press",
  "machine-rear-delt-fly": "Reverse_Machine_Flyes",
  "machine-shoulder-press": "Machine_Shoulder_Military_Press",
  "ohp": "Barbell_Shoulder_Press",
  "one-arm-dumbbell-row": "One-Arm_Dumbbell_Row",
  "overhead-triceps-extension": "Sled_Overhead_Triceps_Extension",
  "pallof-press": "Pallof_Press",
  "pec-deck": "Butterfly",
  "pistol-squat": "Kettlebell_Pistol_Squat",
  "plank": "Plank",
  "preacher-curl": "Preacher_Curl",
  "pull-up": "Pullups",
  "push-up": "Pushups",
  "rdl": "Romanian_Deadlift",
  "rear-delt-fly": "Cable_Rear_Delt_Fly",
  "reverse-crunch": "Reverse_Crunch",
  "reverse-curl": "Reverse_Barbell_Curl",
  "reverse-pec-deck": "Reverse_Machine_Flyes",
  "russian-twist": "Russian_Twist",
  "seated-cable-row": "Seated_Cable_Rows",
  "seated-calf-raise": "Seated_Calf_Raise",
  "seated-leg-curl": "Seated_Leg_Curl",
  "shrug": "Barbell_Shrug",
  "single-leg-leg-press": "Leg_Press",
  "sissy-squat": "Weighted_Sissy_Squat",
  "sit-up": "3_4_Sit-Up",
  "skull-crusher": "Lying_Triceps_Press",
  "smith-bench-press": "Smith_Machine_Bench_Press",
  "smith-squat": "Smith_Machine_Squat",
  "squat": "Barbell_Squat",
  "standing-cable-curl": "Standing_Biceps_Cable_Curl",
  "standing-calf-raise": "Rocking_Standing_Calf_Raise",
  "step-up": "Step-up_with_Knee_Raise",
  "stiff-leg-deadlift": "Stiff-Legged_Barbell_Deadlift",
  "straight-arm-pulldown": "Straight-Arm_Pulldown",
  "sumo-deadlift": "Sumo_Deadlift",
  "t-bar-row": "Lying_T-Bar_Row",
  "triceps-pushdown": "Triceps_Pushdown_-_Rope_Attachment",
  "upright-row": "Upright_Barbell_Row",
  "walking-lunge": "Dumbbell_Lunges",
  "wide-grip-pull-up": "Wide-Grip_Rear_Pull-Up",
  "wrist-curl": "Cable_Wrist_Curl",
  "zottman-curl": "Zottman_Curl",
  // 단일 기구·맨몸 운동(기존에 사진이 없던 것들) — 동작이 가장 비슷한 실사로.
  "hip-abduction": "Thigh_Abductor",
  "side-plank": "Side_Bridge",
  "mountain-climber": "Mountain_Climbers",
  "wood-chopper": "Standing_Cable_Wood_Chop",
  "pendlay-row": "Reverse_Grip_Bent-Over_Rows",
  "meadows-row": "Bent_Over_One-Arm_Long_Bar_Row",
  "triceps-kickback": "Tricep_Dumbbell_Kickback",
  "diamond-pushup": "Close-Grip_Push-Up_off_of_a_Dumbbell",
  "cossack-squat": "Bodyweight_Squat",
  "belt-squat": "Hack_Squat",
  "v-up": "Jackknife_Sit-Up",
  "hollow-hold": "Flat_Bench_Lying_Leg_Raise",
  "toes-to-bar": "Hanging_Leg_Raise",
  "bicycle-crunch": "Air_Bike",
};

/**
 * 기구별 시연 사진 — 같은 운동이라도 바벨/덤벨/머신/케이블/맨몸은 동작이 달라서
 * 각기 다른 free-exercise-db 항목으로 보여준다. (없는 기구는 기본 매핑으로 폴백.)
 * 슬러그는 scripts/validate-equip-map.js 로 2프레임 존재를 검증함.
 */
export const EXERCISE_PHOTO_DB_BY_EQUIP: Record<
  string,
  Partial<Record<string, string>>
> = {
  "bench-press": { barbell: "Barbell_Bench_Press_-_Medium_Grip", dumbbell: "Dumbbell_Bench_Press_with_Neutral_Grip", machine: "Machine_Bench_Press" },
  "incline-press": { barbell: "Barbell_Incline_Bench_Press_-_Medium_Grip", dumbbell: "Hammer_Grip_Incline_DB_Bench_Press" },
  "chest-fly": { dumbbell: "Dumbbell_Flyes", cable: "Flat_Bench_Cable_Flyes", machine: "Butterfly" },
  "decline-press": { barbell: "Decline_Barbell_Bench_Press", dumbbell: "Decline_Dumbbell_Bench_Press", machine: "Decline_Smith_Press" },
  "barbell-row": { barbell: "Bent_Over_Barbell_Row", dumbbell: "Bent_Over_Two-Dumbbell_Row" },
  "t-bar-row": { barbell: "Lying_Cambered_Barbell_Row", machine: "Lying_T-Bar_Row" },
  "lat-pulldown": { cable: "Wide-Grip_Lat_Pulldown" },
  ohp: { barbell: "Barbell_Shoulder_Press", dumbbell: "Dumbbell_Shoulder_Press", machine: "Leverage_Shoulder_Press" },
  "lateral-raise": { dumbbell: "Side_Lateral_Raise", cable: "Cable_Seated_Lateral_Raise" },
  "front-raise": { dumbbell: "Front_Dumbbell_Raise", cable: "Front_Cable_Raise", barbell: "Standing_Front_Barbell_Raise_Over_Head" },
  "rear-delt-fly": { dumbbell: "Reverse_Flyes", machine: "Reverse_Machine_Flyes", cable: "Cable_Rear_Delt_Fly" },
  "upright-row": { barbell: "Upright_Barbell_Row", dumbbell: "Dumbbell_One-Arm_Upright_Row", cable: "Low_Pulley_Row_To_Neck" },
  shrug: { barbell: "Barbell_Shrug", dumbbell: "Dumbbell_Shrug" },
  "biceps-curl": { barbell: "Barbell_Curl", dumbbell: "Dumbbell_Bicep_Curl", cable: "Standing_Biceps_Cable_Curl" },
  "preacher-curl": { barbell: "Preacher_Curl", dumbbell: "One_Arm_Dumbbell_Preacher_Curl", machine: "Machine_Bicep_Curl" },
  "reverse-curl": { barbell: "Reverse_Barbell_Curl", dumbbell: "Standing_Dumbbell_Reverse_Curl" },
  "wrist-curl": { dumbbell: "Palms-Down_Dumbbell_Wrist_Curl_Over_A_Bench", barbell: "Palms-Down_Wrist_Curl_Over_A_Bench" },
  "triceps-pushdown": { cable: "Triceps_Pushdown_-_Rope_Attachment", machine: "Machine_Triceps_Extension" },
  "skull-crusher": { barbell: "Lying_Close-Grip_Barbell_Triceps_Press_To_Chin", dumbbell: "Seated_Triceps_Press" },
  "overhead-triceps-extension": { dumbbell: "Decline_Dumbbell_Triceps_Extension", cable: "Cable_Rope_Overhead_Triceps_Extension" },
  squat: { barbell: "Barbell_Squat", machine: "Smith_Machine_Squat", bodyweight: "Bodyweight_Squat" },
  "smith-squat": { machine: "Smith_Machine_Squat" },
  "goblet-squat": { dumbbell: "Dumbbell_Squat" },
  rdl: { barbell: "Romanian_Deadlift", dumbbell: "Stiff-Legged_Dumbbell_Deadlift" },
  "hip-thrust": { barbell: "Barbell_Hip_Thrust", machine: "Smith_Machine_Hip_Raise" },
  "glute-bridge": { bodyweight: "Butt_Lift_Bridge", barbell: "Barbell_Glute_Bridge" },
  hyperextension: { machine: "Reverse_Hyperextension", bodyweight: "Hyperextensions_With_No_Hyperextension_Bench" },
  "step-up": { dumbbell: "Dumbbell_Step_Ups", bodyweight: "Step-up_with_Knee_Raise" },
  lunge: { dumbbell: "Dumbbell_Lunges", bodyweight: "Bodyweight_Walking_Lunge" },
  "walking-lunge": { dumbbell: "Dumbbell_Lunges", bodyweight: "Bodyweight_Walking_Lunge" },
  "bulgarian-split-squat": { dumbbell: "Split_Squat_with_Dumbbells", bodyweight: "Bodyweight_Walking_Lunge" },
  "hip-adduction": { machine: "Thigh_Adductor" },
  "russian-twist": { bodyweight: "Russian_Twist", dumbbell: "Dumbbell_Side_Bend" },
  "curtsy-lunge": { dumbbell: "Dumbbell_Rear_Lunge", bodyweight: "Crossover_Reverse_Lunge" },
  "sumo-squat": { dumbbell: "Plie_Dumbbell_Squat", bodyweight: "Bodyweight_Squat" },
  "chest-supported-row": { machine: "Leverage_Iso_Row", dumbbell: "Incline_Bench_Pull" },
};

/**
 * 워밍업·마무리(컨디셔닝) 종목 id → free-exercise-db 실사 항목. 스트레칭·유산소도
 * 데이터셋에 있어 실제 시연 사진을 보여준다. 매핑 없는 항목(천국의 계단·데드행 등)은
 * 호출부가 기존 모션 일러스트(플립북)로 폴백. 슬러그는 scripts/validate-equip-map.js 로 검증.
 */
export const CONDITIONING_PHOTO_DB: Record<string, string> = {
  running: "Running_Treadmill",
  walking: "Jogging_Treadmill",
  cycling: "Bicycling_Stationary",
  rowing: "Rowing_Stationary",
  elliptical: "Elliptical_Trainer",
  "stair-master": "Stairmaster",
  "jump-rope": "Rope_Jumping",
  "jumping-jack": "Star_Jump",
  "shoulder-circle": "Shoulder_Circles",
  "cat-cow": "Cat_Stretch",
  "dead-hang": "Scapular_Pull-Up",
  "wall-slide": "Band_Pull_Apart",
  "sleeper-stretch": "Shoulder_Stretch",
  "band-pull-apart": "Band_Pull_Apart",
  "dynamic-lunge": "Bodyweight_Walking_Lunge",
  "bw-squat": "Bodyweight_Squat",
  "dead-bug": "Dead_Bug",
  "glute-bridge-warm": "Butt_Lift_Bridge",
  "hip-circle": "Standing_Hip_Circles",
  "wrist-circle": "Wrist_Circles",
  "push-up-warm": "Pushups",
  "chest-door-stretch": "Dynamic_Chest_Stretch",
  "shoulder-cross-stretch": "Shoulder_Stretch",
  "child-pose": "Childs_Pose",
  "cobra-stretch": "Upward_Stretch",
  "lat-stretch": "Standing_Lateral_Stretch",
  "triceps-overhead-stretch": "Triceps_Stretch",
  "biceps-door-stretch": "Standing_Biceps_Stretch",
  "wrist-stretch": "Wrist_Circles",
  "hamstring-stretch": "Hamstring_Stretch",
  "pigeon-pose": "IT_Band_and_Glute_Stretch",
  "calf-stretch": "Calf_Stretch_Hands_Against_Wall",
  "neck-stretch": "Side_Neck_Stretch",
};

const CDN = "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises";

/**
 * 시연 사진 2프레임 URL. 기구가 주어지고 그 기구 전용 매핑이 있으면 그걸,
 * 없으면 운동 기본 매핑으로 폴백. 둘 다 없으면 null → 호출부가 SVG 폴백.
 */
export function exercisePhotoFrames(
  exerciseId: string,
  equipment?: string,
): [string, string] | null {
  const db =
    (equipment ? EXERCISE_PHOTO_DB_BY_EQUIP[exerciseId]?.[equipment] : undefined) ??
    EXERCISE_PHOTO_DB[exerciseId];
  if (!db) return null;
  return [`${CDN}/${db}/0.jpg`, `${CDN}/${db}/1.jpg`];
}

/** 워밍업·마무리 종목 2프레임 URL. 매핑 없으면 null → 호출부가 모션 일러스트로 폴백. */
export function conditioningPhotoFrames(itemId: string): [string, string] | null {
  const db = CONDITIONING_PHOTO_DB[itemId];
  if (!db) return null;
  return [`${CDN}/${db}/0.jpg`, `${CDN}/${db}/1.jpg`];
}
