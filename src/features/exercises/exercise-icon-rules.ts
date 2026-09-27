/**
 * 운동 id → 가장 가까운 동작 아이콘 **키** (순수 로직 · React 없음 · 테스트 가능).
 *
 * 배경(2026-09-15): 전용 아이콘은 큐레이션된 114개에만 있고, 확장 카탈로그 1,237개는 전부
 * 일반 덤벨 아이콘으로 떠서 "운동 로고가 실제 운동과 안 맞는다"는 제보가 있었다.
 * 확장 카탈로그 id 는 영어 슬러그(`incline-dumbbell-bench-press`)라 단어로 동작을 알 수 있다 —
 * 단어 규칙으로 기존 아이콘 중 가장 가까운 동작을 고른다.
 *
 * 🔴 규칙은 **위에서부터 먼저 맞는 것**을 쓴다. 헷갈리는 조합(레그 컬 vs 바이셉스 컬,
 *    레그 프레스 vs 벤치 프레스, 햄스트링 스트레치 vs 레그 컬)은 구체적인 규칙을 위에 둔다.
 *    못 고르면 null → 호출부가 일반 덤벨 아이콘을 쓴다(틀린 동작보다 중립 아이콘이 낫다).
 */

export type IconKey =
  // 근력(exercise-icon.tsx)
  | "BenchPress" | "InclinePress" | "DeclinePress" | "ChestFly" | "PecDeck" | "CableCrossover"
  | "PushUp" | "DiamondPushup" | "Dips" | "CloseGripBench" | "DumbbellPullover"
  | "Deadlift" | "BarbellRow" | "TBarRow" | "SeatedCableRow" | "OneArmDumbbellRow" | "InvertedRow"
  | "LatPulldown" | "PullUp" | "ChinUp" | "StraightArmPulldown" | "Shrug" | "Hyperextension"
  | "Ohp" | "ArnoldPress" | "LateralRaise" | "FrontRaise" | "RearDeltFly" | "UprightRow" | "FacePull"
  | "BicepsCurl" | "HammerCurl" | "PreacherCurl" | "EzBarCurl" | "InclineCurl" | "ConcentrationCurl"
  | "ReverseCurl" | "WristCurl" | "TricepsPushdown" | "SkullCrusher" | "OverheadTricepsExtension"
  | "BenchDip" | "TricepsKickback"
  | "Squat" | "FrontSquat" | "GobletSquat" | "HackSquat" | "SmithSquat" | "SumoSquat" | "PistolSquat"
  | "LegPress" | "LegExtension" | "LegCurl" | "SeatedLegCurl" | "HipThrust" | "GluteBridge"
  | "HipAbduction" | "HipAdduction" | "CableKickback" | "Lunge" | "BulgarianSplitSquat" | "WalkingLunge"
  | "StepUp" | "Rdl" | "SumoDeadlift" | "GoodMorning" | "StandingCalfRaise" | "SeatedCalfRaise"
  | "CablePullThrough"
  | "Plank" | "SidePlank" | "SitUp" | "Crunch" | "BicycleCrunch" | "CableCrunch" | "RussianTwist"
  | "AbRollout" | "MountainClimber" | "HangingLegRaise" | "WoodChopper" | "PallofPress" | "VUp" | "HollowHold"
  // 컨디셔닝·스트레칭(conditioning-icon.tsx)
  | "Running" | "StairMaster" | "Cycling" | "Rowing" | "Elliptical" | "JumpRope" | "Walking"
  | "ShoulderCircle" | "CatCow" | "DeadHang" | "WallSlide" | "HipCircle" | "DeadBug" | "JumpingJack"
  | "WristCircle" | "ChestDoorStretch" | "ShoulderCrossStretch" | "ChildPose" | "CobraStretch"
  | "LatStretch" | "TricepsOverheadStretch" | "BicepsDoorStretch" | "WristStretch" | "HamstringStretch"
  | "PigeonPose" | "CalfStretch" | "NeckStretch";

/** 같은 운동의 중복 슬러그(`ez-bar-curl-2`) 꼬리 숫자를 뗀다. */
export function baseExerciseId(id: string): string {
  return id.replace(/-\d+$/, "");
}

export function iconKeyFor(rawId: string): IconKey | null {
  const id = baseExerciseId(rawId.toLowerCase());
  const s = `-${id}-`;
  /** 단어(하이픈 경계) 전부 포함. 여러 단어는 `t("pull", "up")` 또는 `t("pull-up")`. */
  const t = (...words: string[]) => words.every((w) => s.includes(`-${w}-`));
  const any = (...words: string[]) => words.some((w) => s.includes(`-${w}-`));

  // 푸시업은 이름에 'release'(핸드 릴리즈 푸시업)가 들어가도 스트레칭이 아니다 — 스트레칭 규칙보다 먼저.
  if (t("push", "up") || any("push-up", "pushup", "pushups")) return t("diamond") ? "DiamondPushup" : "PushUp";

  // ── 스트레칭·요가·근막이완 — 부위 단어(햄스트링·가슴…)가 근력 규칙에 먼저 걸리지 않게 맨 위.
  if (any("stretch", "pose", "release", "roller", "foam", "mobility", "smr", "yoga", "fold")) {
    if (t("forward", "fold")) return "HamstringStretch";
    if (any("hamstring", "hamstrings")) return "HamstringStretch";
    if (any("calf", "calves", "ankle", "toe", "achilles")) return "CalfStretch";
    if (any("chest", "pec", "pecs")) return "ChestDoorStretch";
    if (any("lat", "lats") || t("side", "bend")) return "LatStretch";
    if (any("neck", "trap", "traps")) return "NeckStretch";
    if (any("wrist", "forearm")) return "WristStretch";
    if (any("triceps", "tricep")) return "TricepsOverheadStretch";
    if (any("biceps", "bicep")) return "BicepsDoorStretch";
    if (any("shoulder", "sleeper", "delt")) return "ShoulderCrossStretch";
    if (any("pigeon", "hip", "hips", "piriformis", "glute", "glutes", "lizard", "frog")) return "PigeonPose";
    if (any("cobra", "back", "spine", "spinal", "upward", "sphinx", "camel")) return "CobraStretch";
    return "ChildPose";
  }
  // 이름에 'stretch' 가 없는 스트레칭·요가 동작
  if (t("upward", "facing", "dog") || t("upward", "dog") || t("prone", "cobra") || any("swan")) return "CobraStretch";
  if (t("downward", "dog") || any("thread-the-needle") || t("thread", "the", "needle")) return "ChildPose";
  if (t("spinal", "twist") || t("thoracic", "rotation") || any("spinal-wave") || t("spinal", "wave")) return "CatCow";
  if (any("neck") || t("chin", "tuck")) return "NeckStretch";
  if (t("ankle", "circle") || t("ankle", "rock") || t("ankle", "dorsiflexion")) return "CalfStretch";

  // ── 가벼운 원 돌리기·모빌리티 드릴(워밍업 아이콘 재사용)
  if (any("halo") || t("arm", "circle") || t("arm", "circles") || t("shoulder", "circle")) return "ShoulderCircle";
  if (t("hip", "circle") || t("hip", "circles")) return "HipCircle";
  if (t("wrist", "circle") || t("wrist", "circles")) return "WristCircle";
  if (t("wall", "slide")) return "WallSlide";
  if (t("cat", "cow") || t("bird", "dog")) return "CatCow";
  if (t("dead", "bug")) return "DeadBug";
  if (t("dead", "hang")) return "DeadHang";

  // ── 유산소·점프
  if (t("jump", "rope") || any("skipping", "double-under") || t("single", "under") || t("double", "under") || t("triple", "under")) return "JumpRope";
  if (t("battle", "rope")) return "JumpRope";
  if (any("ladder", "cone", "carioca", "backpedal", "dash", "skip", "shuffle", "agility") || t("high", "knees") || t("butt", "kicks") || t("high", "knee", "skip")) return "Running";
  if (t("rope", "climb") || t("pegboard", "climb") || t("wall", "climb")) return "PullUp";
  if (any("sled") && !any("row")) return "Walking";
  if (t("jumping", "jack") || any("jacks")) return "JumpingJack";
  if (any("jump", "jumps", "hop", "hops", "bound", "bounds", "burpee", "burpees", "skater", "plyo")) return "JumpingJack";
  if (any("run", "running", "sprint", "sprints", "jog", "treadmill")) return "Running";
  if (any("bike", "cycling", "airbike", "spin")) return "Cycling";
  if (any("rower", "rowing", "erg")) return "Rowing";
  if (any("elliptical")) return "Elliptical";
  if (any("stair", "stairs", "stepmill")) return "StairMaster";

  // ── 종아리(프레스 규칙보다 먼저 — "calf-press")
  if (any("calf", "calves")) return t("seated") ? "SeatedCalfRaise" : "StandingCalfRaise";

  // ── 가슴
  if (t("bench", "dip") || t("chair", "dip") || t("bench", "dips")) return "BenchDip";
  if (any("dip", "dips")) return "Dips";
  if (any("pectoral") && any("machine")) return "PecDeck";
  if (any("fly", "flye", "flyes", "flys", "flies")) {
    if (any("rear", "reverse", "delt", "y", "t")) return "RearDeltFly";
    if (t("pec", "deck") || any("machine")) return "PecDeck";
    if (any("cable", "crossover", "band")) return "CableCrossover";
    return "ChestFly";
  }
  if (any("crossover")) return "CableCrossover";
  if (t("pec", "deck")) return any("reverse", "rear") ? "RearDeltFly" : "PecDeck";
  if (any("pullover")) return "DumbbellPullover";

  // ── 프레스 계열(레그 프레스는 하체)
  if (t("leg", "press")) return "LegPress";
  if (any("arnold")) return "ArnoldPress";
  if (t("tate", "press") || t("jm", "press")) return "SkullCrusher";
  if (any("pallof")) return "PallofPress";
  if (
    t("shoulder", "press") || t("overhead", "press") || any("military", "jerk", "viking") ||
    t("push", "press") || t("z", "press") || t("log", "press") || t("landmine", "press")
  ) return "Ohp";
  if (t("close", "grip") && any("bench", "press")) return "CloseGripBench";
  // '인클라인 벤치 바벨 로우'처럼 벤치를 도구로만 쓰는 로우는 프레스가 아니다.
  if (any("incline") && any("press", "bench") && !any("row", "rows", "curl", "curls", "raise", "fly")) return "InclinePress";
  if (any("decline") && any("press", "bench") && !any("row", "rows", "curl", "curls", "raise", "fly", "crunch", "twist")) return "DeclinePress";
  if (t("bench", "press") || t("chest", "press") || t("floor", "press") || any("svend") || (any("press") && any("chest", "pec"))) return "BenchPress";

  // ── 등
  if (any("pulldown", "pulldowns") || t("pull", "down")) return t("straight", "arm") ? "StraightArmPulldown" : "LatPulldown";
  if (t("straight", "arm")) return "StraightArmPulldown";
  if (t("chin", "up") || any("chinup", "chin-up", "chinups")) return "ChinUp";
  if (t("pull", "up") || any("pullup", "pull-up", "pullups") || t("muscle", "up")) return "PullUp";
  if (t("face", "pull")) return "FacePull";
  if (t("upright", "row") || t("high", "pull")) return "UprightRow";
  if (t("pull", "through")) return "CablePullThrough";
  if (any("row", "rows")) {
    if (any("inverted", "trx", "ring", "rings", "australian")) return "InvertedRow";
    if (t("t", "bar") || any("t-bar", "landmine", "meadows")) return "TBarRow";
    if (any("cable", "seated", "machine", "low", "high", "sled", "iso", "lateral", "chest-supported")) return "SeatedCableRow";
    if (t("single", "arm") || t("one", "arm") || any("kroc", "dumbbell", "kettlebell")) return "OneArmDumbbellRow";
    return "BarbellRow";
  }
  if (any("shrug", "shrugs")) return "Shrug";
  if (any("hyperextension", "hyperextensions", "superman") || t("back", "extension") || t("reverse", "hyper")) return "Hyperextension";
  if (t("good", "morning") || t("good", "mornings")) return "GoodMorning";

  // ── 힌지(데드리프트·역도)
  if (any("romanian", "rdl", "stiff") || (t("single", "leg") && any("deadlift"))) return "Rdl";
  if (any("sumo") && any("deadlift")) return "SumoDeadlift";
  if (any("deadlift", "deadlifts", "clean", "snatch", "swing", "swings") || t("rack", "pull") || t("block", "pull")) return "Deadlift";

  // ── 어깨 레이즈·회전
  if (t("lateral", "raise") || t("side", "raise") || t("y", "raise") || t("lu", "raise") || t("lateral", "raises")) return "LateralRaise";
  if (t("front", "raise") || t("plate", "raise") || t("front", "raises")) return "FrontRaise";
  if (t("rear", "delt") || t("reverse", "fly") || t("pull", "apart") || t("t", "raise") || t("reverse", "snow", "angel")) return "RearDeltFly";
  if (any("scaption")) return "FrontRaise";
  if (t("external", "rotation") || t("internal", "rotation") || any("cuban")) return "FacePull";

  // ── 팔
  if (t("leg", "curl") || t("hamstring", "curl") || any("nordic") || t("glute", "ham")) return t("seated") ? "SeatedLegCurl" : "LegCurl";
  if (t("wrist", "curl") || t("wrist", "curls") || t("wrist", "roller") || t("wrist", "extension") || t("wrist", "rotation") || any("gripper", "pinch") || t("grip", "crusher")) return "WristCurl";
  if (any("curl", "curls")) {
    if (any("hammer", "rope")) return "HammerCurl";
    if (any("preacher", "scott", "spider")) return "PreacherCurl";
    if (any("concentration")) return "ConcentrationCurl";
    if (any("incline")) return "InclineCurl";
    if (any("reverse")) return "ReverseCurl";
    if (any("ez", "ez-bar")) return "EzBarCurl";
    return "BicepsCurl";
  }
  if (any("pushdown", "pressdown") || t("push", "down")) return "TricepsPushdown";
  if (any("skull", "skullcrusher", "french") || t("lying", "triceps") || t("lying", "extension")) return "SkullCrusher";
  // 이름에 'triceps' 없이 '오버헤드 익스텐션'만 있는 삼두 운동
  if (t("overhead", "extension") || (t("overhead") && any("extension") && any("dumbbell", "barbell", "cable", "machine"))) return "OverheadTricepsExtension";
  if (any("kickback", "kickbacks")) {
    if (any("triceps", "tricep")) return "TricepsKickback";
    if (any("glute", "hip", "leg", "donkey", "cable")) return "CableKickback";
    return "TricepsKickback";
  }

  // ── 하체
  if (t("leg", "extension") || t("quad", "extension")) return "LegExtension";
  if (t("hip", "extension") || t("donkey", "kick")) return "CableKickback";
  if (any("triceps", "tricep") || t("cable", "extension")) return "OverheadTricepsExtension";
  if ((any("thrust", "thrusts") && !any("thruster")) || t("glute", "drive")) return "HipThrust";
  if (any("bridge", "bridges") || t("frog", "pump")) return "GluteBridge";
  if (any("abduction", "abductor", "clamshell") || t("fire", "hydrant")) return "HipAbduction";
  if (any("adduction", "adductor", "copenhagen")) return "HipAdduction";
  if (any("bulgarian") || t("split", "squat")) return "BulgarianSplitSquat";
  if (any("pistol") || t("single", "leg", "squat") || t("skater", "squat")) return "PistolSquat";
  if (t("walking", "lunge") || t("walking", "lunges")) return "WalkingLunge";
  if (any("lunge", "lunges", "cossack", "curtsy")) return "Lunge";
  if (t("step", "up") || t("step", "ups") || t("box", "step") || t("step", "down")) return "StepUp";
  if (any("thruster", "thrusters") || t("wall", "ball")) return "FrontSquat";
  if (any("squat", "squats") || t("wall", "sit")) {
    if (any("front", "zercher")) return "FrontSquat";
    if (any("goblet")) return "GobletSquat";
    if (any("hack")) return "HackSquat";
    if (any("smith")) return "SmithSquat";
    if (any("sumo")) return "SumoSquat";
    return "Squat";
  }

  // ── 코어
  if (t("side", "plank")) return "SidePlank";
  if (any("hollow")) return "HollowHold";
  if (t("v", "up") || any("jackknife", "v-up", "teaser") || t("v", "sit") || t("dragon", "flag") || t("boat")) return "VUp";
  if (any("bicycle")) return "BicycleCrunch";
  if ((any("crunch", "crunches") && any("cable", "machine", "kneeling")) || t("abdominal", "crunch")) return "CableCrunch";
  if (any("crunch", "crunches") || t("heel", "touch") || t("knee", "tuck") || t("criss", "cross") || t("roll", "up") || any("hundred") || t("knee", "to", "chest")) return "Crunch";
  if (t("flutter", "kick") || t("scissor", "kick")) return "HollowHold";
  if (t("windshield", "wiper") || t("hip", "flexion")) return "HangingLegRaise";
  if (t("sit", "up") || any("situp", "sit-up", "situps") || t("toe", "touch")) return "SitUp";
  if (any("twist", "twists") || t("torso", "rotation") || t("side", "bend")) return "RussianTwist";
  if (any("rollout", "rollouts", "wheel")) return "AbRollout";
  if (t("mountain", "climber") || t("mountain", "climbers")) return "MountainClimber";
  if (t("leg", "raise") || t("knee", "raise") || t("toes", "to", "bar") || (any("hanging") && any("raise", "raises"))) return "HangingLegRaise";
  if (t("anti", "rotation")) return "PallofPress";
  if (any("chop", "chopper", "woodchop", "woodchopper", "slam", "slams", "throw", "throws", "toss") || t("medicine", "ball") || t("cable", "lift")) return "WoodChopper";
  if (any("plank", "planks", "planche", "crawl", "inchworm", "handstand", "headstand", "saw") || t("l", "sit") || t("wall", "walk")) return "Plank";
  if (any("hang", "hangs")) return "DeadHang";

  // ── 이동·운반
  if (any("carry", "carries", "farmer", "walk", "walks", "march")) return "Walking";
  // 남은 막연한 프레스(케틀벨 사이드 프레스 등)는 머리 위로 미는 동작에 가장 가깝다.
  if (any("press")) return "Ohp";
  if (any("raise", "raises")) return "FrontRaise";

  return null;
}
