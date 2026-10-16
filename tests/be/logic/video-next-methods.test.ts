import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { methodSteps } from "@/features/routine/exercise-methods";
import { guideFor } from "@/features/workout-timer/exercise-guides";

describe("continuous video instructions match the exact equipment and movement", () => {
  it("quadruped hip extension supports both hands and extends one leg back", () => {
    const text=methodSteps("quadruped-hip-extension", "bodyweight").join(" ");
    for(const word of ["양손", "무릎", "척추", "한쪽 다리", "뒤로", "반대쪽"]) expect(text).toContain(word);
    expect(guideFor("quadruped-hip-extension").setup).toContain("네발기기");
  });
  it("cable-spider-curl instructions match equipment and supported source", () => {
    const text=methodSteps("cable-spider-curl", "cable").join(" ");
    for(const word of ["45도","낮은 풀리","가슴","언더핸드","상완","수직"]) expect(text).toContain(word);
    expect(guideFor("cable-spider-curl").setup).toContain("벤치");
  });
  it("smith-machine-wide-grip-bench-press instructions match equipment and supported source", () => {
    const text=methodSteps("smith-machine-wide-grip-bench-press", "smith").join(" ");
    for(const word of ["평벤치","어깨너비보다 넓게","2.5","두 배","잠그지","레일"]) expect(text).toContain(word);
    expect(guideFor("smith-machine-wide-grip-bench-press").setup).toContain("벤치");
  });
  it("smith close grip bench press keeps tucked elbows and avoids locking out", () => {
    const text=methodSteps("smith-machine-close-grip-bench-press", "smith").join(" ");
    for(const word of ["평벤치", "오버핸드", "좁게", "몸 옆", "닿기 직전", "잠그지", "레일"]) expect(text).toContain(word);
    expect(guideFor("smith-machine-close-grip-bench-press").setup).toContain("스미스");
  });
  it("seated smith shoulder press starts at the upper chest and follows the rails", () => {
    const text=methodSteps("seated-smith-machine-shoulder-press", "smith").join(" ");
    for(const word of ["등받이", "상부 가슴", "오버핸드", "머리 위", "레일"]) expect(text).toContain(word);
    expect(guideFor("seated-smith-machine-shoulder-press").setup).toContain("등받이");
  });
  it("barbell spider curl keeps the chest supported and upper arms hanging vertically", () => {
    const text=methodSteps("barbell-spider-curl", "barbell").join(" ");
    for(const word of ["45도", "가슴", "언더핸드", "상완", "수직", "천천히"]) expect(text).toContain(word);
    expect(guideFor("barbell-spider-curl").setup).toContain("바벨");
  });
  it("half kneeling hip flexor stretch advances the pelvis with hips facing forward", () => {
    const text=methodSteps("kneeling-hip-flexor-stretch", "bodyweight").join(" ");
    for(const word of ["한쪽 무릎", "골반", "정면", "앞으로", "반대쪽"]) expect(text).toContain(word);
    expect(guideFor("kneeling-hip-flexor-stretch").cues.join(" ")).toContain("골반");
  });

  it("half kneeling hamstring stretch extends the front leg and hinges with a straight back", () => {
    const text=methodSteps("kneeling-hamstring-stretch", "bodyweight").join(" ");
    for(const word of ["한쪽 무릎", "앞다리", "뒤꿈치", "발끝", "등을 곧게", "반대쪽"]) expect(text).toContain(word);
    expect(guideFor("kneeling-hamstring-stretch").setup).toContain("무릎");
  });

  it("kettlebell extension grips both handle sides and lowers behind the head", () => {
    const text=methodSteps("kettlebell-triceps-extension", "kettlebell").join(" ");
    for(const word of ["한 개", "양손", "손잡이", "머리 위", "머리 뒤", "몸통"]) expect(text).toContain(word);
    expect(guideFor("kettlebell-triceps-extension").setup).toContain("케틀벨");
  });

  it("smith incline press follows guide rails toward the upper chest", () => {
    const text=methodSteps("smith-machine-incline-press", "smith").join(" ");
    for(const word of ["30", "45", "벤치", "오버핸드", "상부 가슴", "레일"]) expect(text).toContain(word);
    expect(guideFor("smith-machine-incline-press").setup).toContain("스미스");
  });
  it("prone quad stretch holds one ankle while keeping the pelvis down", () => {
    const text=methodSteps("lying-quad-stretch", "bodyweight").join(" ");
    for(const word of ["엎드", "발목", "뒤꿈치", "골반", "반대쪽"]) expect(text).toContain(word);
    expect(guideFor("lying-quad-stretch").cues.join(" ")).toContain("골반");
  });

  it("incline close grip press uses shoulder width and controlled sternum contact", () => {
    const text=methodSteps("incline-close-grip-bench-press", "barbell").join(" ");
    for(const word of ["인클라인", "어깨너비", "엄지", "흉골", "가볍게", "직선"]) expect(text).toContain(word);
    expect(guideFor("incline-close-grip-bench-press").cues.join(" ")).toContain("반동");
  });
  it("incline cable extension starts above the head and lowers behind it", () => {
    const text=methodSteps("incline-cable-triceps-extension", "cable").join(" ");
    for(const word of ["30도", "낮은 풀리", "등지고", "직선바", "머리 뒤", "상완"]) expect(text).toContain(word);
    expect(guideFor("incline-cable-triceps-extension").setup).toContain("오버핸드");
  });
  it("cobra raises the chest with palms supporting and pelvis grounded", () => {
    const text=methodSteps("cobra-stretch", "bodyweight").join(" ");
    for(const word of ["손바닥", "손가락", "골반", "발등", "가슴", "천천히"]) expect(text).toContain(word);
    expect(guideFor("cobra-stretch").cues.join(" ")).toContain("어깨");
  });

  it("lying cable extension puts a flat bench in front of a low pulley", () => {
    const text=methodSteps("cable-lying-triceps-extension", "cable").join(" ");
    for(const word of ["평벤치", "낮은 풀리", "머리", "직선바", "오버핸드", "상완"]) expect(text).toContain(word);
  });

  it("reverse incline press uses a wide underhand grip and avoids chest contact", () => {
    const text=methodSteps("reverse-grip-incline-press", "barbell").join(" ");
    for(const word of ["30도", "언더핸드", "넓게", "상부 가슴", "닿기 전", "잠그지"]) expect(text).toContain(word);
  });
  it("cross body cable extension uses opposing high cables and diagonal pressing", () => {
    const text=methodSteps("cross-body-cable-extension", "cable").join(" ");
    for(const word of ["양쪽", "높은 풀리", "반대쪽", "가슴 앞", "대각선", "상완"]) expect(text).toContain(word);
  });
  it("sphinx stretch supports parallel forearms beneath the shoulders", () => {
    const text=methodSteps("sphinx-stretch", "bodyweight").join(" ");
    for(const word of ["엎드", "팔꿈치", "어깨 아래", "전완", "평행", "가슴"]) expect(text).toContain(word);
  });

  it("close barbell floor press stops at the floor with a narrow grip", () => {
    const text=methodSteps("close-grip-floor-press", "barbell").join(" ");
    for(const word of ["바닥", "좁게", "바벨", "팔꿈치", "천천히"]) expect(text).toContain(word);
  });
  it("single cable overhead extension faces away and fixes the upper arm", () => {
    const text=methodSteps("single-arm-cable-overhead-extension", "cable").join(" ");
    for(const word of ["낮은 풀리", "한 손", "등지고", "머리 위", "상완", "잠그지"]) expect(text).toContain(word);
  });
  it("wall slide uses little-finger edges on the wall", () => {
    const text=methodSteps("wall-slide", "bodyweight").join(" ");
    for(const word of ["벽", "마주", "새끼손가락", "손날", "미끄러", "천천히"]) expect(text).toContain(word);
  });

  it("neck CARs uses a slow pain-free circle with a still torso", () => {
    const text=methodSteps("neck-cars", "bodyweight").join(" ");
    for(const word of ["몸통", "통증 없는", "천천히", "원", "어깨"]) expect(text).toContain(word);
  });

  it("barbell push press starts at front shoulders and drives with the legs", () => {
    const text=methodSteps("push-press", "barbell").join(" ");
    for(const word of ["어깨 앞", "오버핸드", "얕게", "하체", "머리 위", "천천히"]) expect(text).toContain(word);
  });
  it("straight bar overhead extension faces away from a low pulley", () => {
    const text=methodSteps("bar-cable-overhead-triceps-extension", "cable").join(" ");
    for(const word of ["낮은 풀리", "등지고", "직선바", "오버핸드", "머리 뒤", "상완"]) expect(text).toContain(word);
  });

  it("single cable kickback uses a low pulley and opposite knee support", () => {
    const text=methodSteps("single-arm-cable-triceps-kickback", "cable").join(" ");
    for(const word of ["낮은 풀리", "한 손", "반대 손", "무릎", "상완", "뒤로"]) expect(text).toContain(word);
  });

  it("dumbbell push press uses a shallow dip then leg drive", () => {
    const text=methodSteps("dumbbell-push-press", "dumbbell").join(" ");
    for(const word of ["손바닥", "앞", "무릎", "얕게", "머리 위", "천천히"]) expect(text).toContain(word);
  });
  it("high lunge stretch lifts the rear heel and reaches both arms up", () => {
    const text=methodSteps("high-lunge-stretch", "bodyweight").join(" ");
    for(const word of ["뒤꿈치", "앞 무릎", "발목", "양팔", "골반"]) expect(text).toContain(word);
  });

  it("dynamic hamstring hinges with a staggered stance and reaches toward the foot", () => {
    const text=methodSteps("dynamic-hamstring-stretch", "bodyweight").join(" ");
    for(const word of ["한 발", "앞", "고관절", "발끝", "천천히"]) expect(text).toContain(word);
  });

  it("floor fly holds elbow bend while opening and closing the arms", () => {
    const text=methodSteps("dumbbell-floor-fly", "dumbbell").join(" ");
    for(const word of ["바닥", "서로 마주", "팔꿈치 각도", "벌", "모은다"]) expect(text).toContain(word);
  });
  it("wide pushdown uses a wide overhand long straight bar", () => {
    const text=methodSteps("wide-grip-cable-pushdown", "cable").join(" ");
    for(const word of ["높은 풀리", "긴 직선바", "넓게", "오버핸드", "상완"]) expect(text).toContain(word);
  });

  it("dynamic calf stretch rocks with rear knee straight and heel planted", () => {
    const text=methodSteps("dynamic-calf-stretch", "bodyweight").join(" ");
    for(const word of ["벽", "뒤 무릎", "뒤꿈치", "앞뒤", "천천히"]) expect(text).toContain(word);
  });

  it("close floor press uses palms facing together and tucked upper arms", () => {
    const text=methodSteps("close-grip-dumbbell-floor-press", "dumbbell").join(" ");
    for(const word of ["바닥", "서로 마주", "몸통 가까이", "상완", "멈춘다"]) expect(text).toContain(word);
  });
  it("close pushdown uses a narrow overhand straight bar grip", () => {
    const text=methodSteps("close-grip-pushdown", "cable").join(" ");
    for(const word of ["높은 풀리", "직선바", "좁게", "오버핸드", "상완"]) expect(text).toContain(word);
  });

  it("reverse EZ pushdown uses an underhand grip on bent handles", () => {
    const steps=methodSteps("reverse-grip-ez-pushdown", "cable").join(" ");
    for(const word of ["높은 풀리", "EZ바", "언더핸드", "굽은 손잡이", "상완"]) expect(steps).toContain(word);
  });
  it("pec minor stretch joins the hands behind the back then reaches backward", () => {
    const steps=methodSteps("pec-minor-stretch", "bodyweight").join(" ");
    for(const word of ["등 뒤", "양손", "뒤로", "가슴", "유지"]) expect(steps).toContain(word);
    expect(steps).not.toContain("밀어 올");
  });

  it("single arm floor press supports the free palm on the floor", () => {
    const steps=methodSteps("single-arm-dumbbell-floor-press", "dumbbell").join(" ");
    for(const word of ["한 손", "오버핸드", "반대 팔", "손바닥", "바닥", "무릎", "상완"]) expect(steps).toContain(word);
  });

  it("upper trap stretch sits with planted feet and combines lateral then forward neck bend", () => {
    const steps=methodSteps("upper-trap-stretch", "bodyweight").join(" ");
    for(const word of ["의자", "양발", "귀", "어깨", "턱", "가슴"]) expect(steps).toContain(word);
    expect(steps).not.toContain("손으로 당");
  });

  it("floor press uses the floor stop and bent knees without a bench", () => {
    const steps=methodSteps("dumbbell-floor-press", "dumbbell").join(" ");
    for(const word of ["바닥", "무릎", "양발", "오버핸드", "상완", "멈춘다"]) expect(steps).toContain(word);
    expect(steps).not.toContain("벤치");
  });
  it("EZ cable pushdown uses overhand angled grips on a high pulley", () => {
    const steps=methodSteps("ez-bar-cable-pushdown", "cable").join(" ");
    for(const word of ["높은 풀리", "EZ바", "오버핸드", "굽은 손잡이", "상완"]) expect(steps).toContain(word);
  });

  it("single arm pushdown uses one overhand D handle on a high pulley", () => {
    const steps = methodSteps("single-arm-cable-pushdown", "cable").join(" ");
    for (const word of ["높은 풀리", "한 손", "D핸들", "오버핸드", "반대쪽"]) expect(steps).toContain(word);
  });
  it("wrist extensor stretch bends a palm down wrist with opposite hand support", () => {
    const steps = methodSteps("wrist-extensor-stretch", "bodyweight").join(" ");
    for (const word of ["손바닥이 아래", "팔꿈치를 편", "반대 손", "손등"]) expect(steps).toContain(word);
  });

  it("V bar pushdown grips angled handles attached to a high pulley", () => {
    const steps = methodSteps("v-bar-pushdown", "cable").join(" ");
    expect(steps).toContain("높은 풀리");
    expect(steps).toContain("V바");
    expect(steps).toContain("경사진 손잡이");
    expect(steps).toContain("아래로");
    expect(steps).toContain("팔꿈치");
  });

  it("underhand barbell row uses supination and draws toward lower abdomen", () => {
    const steps = methodSteps("underhand-barbell-row", "barbell").join(" ");
    expect(steps).toContain("언더핸드");
    expect(steps).toContain("골반");
    expect(steps).toContain("하복부");
    expect(steps).toContain("상체 각도");
  });

  it("wrist flexor stretch keeps the working elbow straight and palm up", () => {
    const steps = methodSteps("wrist-flexor-stretch", "bodyweight").join(" ");
    expect(steps).toContain("팔꿈치를 편");
    expect(steps).toContain("손바닥이 위");
    expect(steps).toContain("반대 손");
    expect(steps).toContain("부드럽게");
  });

  it("wide barbell row maintains a sixty degree torso and pulls toward upper abdomen", () => {
    const steps = methodSteps("wide-grip-barbell-row", "barbell").join(" ");
    expect(steps).toContain("넓은 오버핸드");
    expect(steps).toContain("60도");
    expect(steps).toContain("상복부");
    expect(steps).toContain("상체 각도");
  });

  it("generic cable triceps pushdown uses a high pulley and overhand straight bar", () => {
    const steps = methodSteps("triceps-pushdown", "cable").join(" ");
    expect(steps).toContain("높은 풀리");
    expect(steps).toContain("직선바");
    expect(steps).toContain("오버핸드");
    expect(steps).toContain("아래로");
    expect(methodSteps("triceps-pushdown", "machine").join(" ")).toContain("시트");
  });

  it("behind neck press starts behind the head and excludes knee drive", () => {
    const steps = methodSteps("behind-the-neck-press", "barbell").join(" ");
    expect(steps).toContain("목 뒤");
    expect(steps).toContain("오버핸드");
    expect(steps).toContain("무릎 반동 없이");
    expect(steps).toContain("머리 위");
  });

  it("cable bar incline curl faces one low pulley on a thirty degree bench", () => {
    const steps = methodSteps("cable-bar-incline-curl", "cable").join(" ");
    expect(steps).toContain("30도");
    expect(steps).toContain("앞쪽");
    expect(steps).toContain("직선바");
    expect(steps).toContain("턱 방향");
    expect(steps).toContain("언더핸드");
  });

  it("wide incline bench uses a wide overhand grip with supported back and feet", () => {
    const steps = methodSteps("wide-grip-incline-bench-press", "barbell").join(" ");
    expect(steps).toContain("45도");
    expect(steps).toContain("어깨보다 넓게");
    expect(steps).toContain("오버핸드");
    expect(steps).toContain("흉골");
    expect(steps).toContain("발");
  });

  it("finger extension flattens fingers on a table without wrist extension", () => {
    const steps = methodSteps("finger-extension-stretch", "bodyweight").join(" ");
    expect(steps).toContain("탁자");
    expect(steps).toContain("손바닥이 아래");
    expect(steps).toContain("손가락을 평평하게");
    expect(steps).not.toContain("팔꿈치만 펴");
  });

  it("incline cable curl uses an inclined backrest and two underhand D handles", () => {
    const steps = methodSteps("incline-cable-curl", "cable").join(" ");
    expect(steps).toContain("45도");
    expect(steps).toContain("등받이");
    expect(steps).toContain("D핸들");
    expect(steps).toContain("손바닥이 위");
    expect(steps).toContain("상완");
  });

  it("reverse grip bench uses an underhand grip and lowers to the lower chest", () => {
    const steps = methodSteps("reverse-grip-bench-press", "barbell").join(" ");
    expect(steps).toContain("언더핸드");
    expect(steps).toContain("아랫가슴");
    expect(steps).toContain("엄지");
  });
  it("lateral leg swing faces the wall and swings across the front of the body", () => {
    const steps = methodSteps("lateral-leg-swing", "bodyweight").join(" ");
    expect(steps).toContain("벽을 마주");
    expect(steps).toContain("몸 앞");
    expect(steps).toContain("좌우로");
    expect(steps).toContain("반대쪽");
  });

  it("standing barbell press starts in front of the shoulders and uses no leg drive", () => {
    const steps = methodSteps("barbell-overhead-press", "barbell").join(" ");
    expect(steps).toContain("서서");
    expect(steps).toContain("어깨 앞");
    expect(steps).toContain("다리 반동 없이");
    expect(steps).toContain("머리 위");
  });

  it("leg swing supports one foot and moves the other leg forward and back", () => {
    const steps = methodSteps("leg-swing", "bodyweight").join(" ");
    expect(steps).toContain("벽");
    expect(steps).toContain("앞뒤로");
    expect(steps).toContain("반대쪽");
    expect(steps).not.toContain("고관절을 뒤로");
  });

  it("flat dumbbell fly keeps elbows softly bent while opening and closing arms", () => {
    const steps = methodSteps("dumbbell-fly", "dumbbell").join(" ");
    expect(steps).toContain("서로 마주");
    expect(steps).toContain("팔꿈치 각도를 유지");
    expect(steps).toContain("양옆으로");
    expect(steps).toContain("모은다");
    expect(steps).not.toContain("밀어 올리");
  });

  it("kettlebell concentration curls one bell with the upper arm supported", () => {
    const steps = methodSteps("kettlebell-concentration-curl", "kettlebell").join(" ");
    expect(steps).toContain("한 손");
    expect(steps).toContain("손바닥이 위");
    expect(steps).toContain("무릎 안쪽");
    expect(steps).toContain("반대쪽");
  });
  it("step calf stretch keeps forefeet on the step while lowering heels", () => {
    const steps = methodSteps("step-calf-stretch", "bodyweight").join(" ");
    expect(steps).toContain("앞부분");
    expect(steps).toContain("스텝");
    expect(steps).toContain("뒤꿈치를 아래");
    expect(steps).not.toContain("최대한 높이");
  });

  it("flat dumbbell bench uses palms toward feet and a supported torso", () => {
    const steps = methodSteps("dumbbell-bench-press", "dumbbell").join(" ");
    expect(steps).toContain("평평한 벤치");
    expect(steps).toContain("손바닥이 발 쪽");
    expect(steps).toContain("가슴 위");
  });

  it("Larsen press holds feet off the floor with extended legs", () => {
    const steps = methodSteps("larsen-press", "barbell").join(" ");
    expect(steps).toContain("다리를 앞으로");
    expect(steps).toContain("공중");
    expect(steps).toContain("가슴");
  });
  it("seated cable concentration uses a low pulley bar and knee support", () => {
    const steps = methodSteps("cable-concentration-curl", "cable").join(" ");
    expect(steps).toContain("앉아");
    expect(steps).toContain("무릎 안쪽");
    expect(steps).toContain("직선 바");
    expect(steps).not.toContain("옆구리");
  });
  it("standing quad stretch uses support and holds the same-side ankle", () => {
    const steps = methodSteps("standing-quad-stretch", "bodyweight").join(" ");
    expect(steps).toContain("벽");
    expect(steps).toContain("발목");
    expect(steps).toContain("같은 쪽 손");
    expect(steps).toContain("반대쪽");
  });

  it("tempo bench specifies three seconds down, one second on chest and one second up", () => {
    const steps = methodSteps("tempo-bench-press", "barbell").join(" ");
    expect(steps).toContain("3초");
    expect(steps).toContain("가슴에");
    expect(steps).toContain("1초 멈춘");
    expect(steps).toContain("1초에 걸쳐");
  });

  it("paused bench holds the bar on the chest for one second without bouncing", () => {
    const steps = methodSteps("pause-bench-press", "barbell").join(" ");
    expect(steps).toContain("가슴에");
    expect(steps).toContain("1초");
    expect(steps).toContain("튕기지");
  });

  it("wide bench uses a wider grip and lowers to the chest", () => {
    const steps = methodSteps("wide-grip-bench-press", "barbell").join(" ");
    expect(steps).toContain("어깨너비보다 넓게");
    expect(steps).toContain("가슴");
    expect(steps).toContain("벤치");
  });
  it("Spoto pauses above the chest without touching it", () => {
    const steps = methodSteps("spoto-press", "barbell").join(" ");
    expect(steps).toContain("가슴 위");
    expect(steps).toContain("닿지 않");
    expect(steps).toContain("1초");
  });
  it("machine biceps supports upper arms instead of pinning elbows to the sides", () => {
    const steps = methodSteps("machine-biceps-curl", "machine").join(" ");
    expect(steps).toContain("패드");
    expect(steps).toContain("손바닥이 위");
    expect(steps).not.toContain("옆구리");
  });
  it("doorway supports the forearm and advances the body", () => {
    const steps = methodSteps("doorway-chest-stretch", "bodyweight").join(" ");
    expect(steps).toContain("전완");
    expect(steps).toContain("문틀");
    expect(steps).toContain("앞으로");
    expect(steps).not.toContain("밀어 올리");
  });
  it("hip circles keep both feet grounded and rotate the pelvis both directions", () => {
    const steps = methodSteps("hip-circle", "bodyweight").join(" ");
    expect(steps).toContain("양발");
    expect(steps).toContain("골반");
    expect(steps).toContain("원");
    expect(steps).toContain("반대 방향");
  });
  it("single arm machine curl supports one working upper arm and keeps the other lever still", () => {
    const steps = methodSteps("single-arm-machine-curl", "machine").join(" ");
    expect(steps).toContain("경사 패드");
    expect(steps).toContain("한쪽");
    expect(steps).toContain("손바닥이 위");
    expect(steps).toContain("반대쪽");
  });
  it("machine hammer uses neutral handles with upper arms supported", () => {
    const steps = methodSteps("machine-hammer-curl", "machine").join(" ");
    expect(steps).toContain("경사 패드");
    expect(steps).toContain("서로 마주");
    expect(steps).not.toContain("옆구리");
  });
  it("corner pec stretch fixes palms on two walls and advances the chest", () => {
    const steps = methodSteps("corner-pec-stretch", "bodyweight").join(" ");
    expect(steps).toContain("양쪽 벽");
    expect(steps).toContain("앞으로");
    expect(steps).not.toContain("밀어 올리");
  });
  it("plate loaded preacher supports upper arms and curls the weighted levers", () => {
    const steps = methodSteps("plate-loaded-preacher-curl", "machine").join(" ");
    expect(steps).toContain("원판");
    expect(steps).toContain("경사 패드");
    expect(steps).toContain("레버");
    expect(steps).not.toContain("옆구리");
  });
  it("barbell JM press lowers toward the chin while upper arms and elbows move", () => {
    const steps = methodSteps("jm-press", "barbell").join(" ");
    expect(steps).toContain("턱");
    expect(steps).toContain("상완");
    expect(steps).toContain("팔꿈치");
    expect(steps).not.toContain("어깨는 움직이지 않는다");
  });
  it("barbell Z press starts on the floor with a bar in front of the chest", () => {
    const steps = methodSteps("z-press", "barbell").join(" ");
    expect(steps).toContain("바닥에 앉아");
    expect(steps).toContain("가슴 앞");
    expect(steps).toContain("머리 위");
  });
  it("tempo curl specifies one second up and three seconds down", () => {
    const steps = methodSteps("tempo-curl", "dumbbell").join(" ");
    expect(steps).toContain("1초");
    expect(steps).toContain("3초");
    expect(steps).toContain("손바닥이 위");
  });
  it("cable preacher combines a low pulley straight bar with upper arm pad support", () => {
    const steps = methodSteps("cable-preacher-curl", "cable").join(" ");
    expect(steps).toContain("로우 풀리");
    expect(steps).toContain("경사 패드");
    expect(steps).toContain("직선 바");
    expect(steps).not.toContain("옆구리");
  });
  it("dumbbell Z press sits on the floor with legs extended and no backrest", () => {
    const steps = methodSteps("dumbbell-z-press", "dumbbell").join(" ");
    expect(steps).toContain("바닥에 앉아");
    expect(steps).toContain("다리를 앞으로");
    expect(steps).toContain("머리 위");
    expect(guideFor("dumbbell-z-press").setup).toContain("등받이 없이");
  });
  it("wide preacher uses a wider underhand grip with both upper arms supported", () => {
    const steps = methodSteps("wide-grip-preacher-curl", "barbell").join(" ");
    expect(steps).toContain("어깨너비보다 넓게");
    expect(steps).toContain("경사 패드");
    expect(steps).toContain("손바닥이 위");
  });
  it("wall lat stretch keeps both palms supported while hinging", () => {
    const steps = methodSteps("lat-stretch", "bodyweight").join(" ");
    expect(steps).toContain("양손");
    expect(steps).toContain("벽");
    expect(steps).toContain("고관절");
  });
  it("standing cable curl uses a supinated short straight bar", () => {
    expect(methodSteps("standing-cable-curl", "cable")[0]).toContain("손바닥이 위");
    expect(guideFor("standing-cable-curl").setup).toContain("짧은 직선 바");
  });
  it("dumbbell side bend holds one weight and bends toward it", () => {
    const steps = methodSteps("dumbbell-side-bend", "dumbbell").join(" ");
    expect(steps).toContain("한 손");
    expect(steps).toContain("덤벨을 든 쪽");
    expect(steps).toContain("골반");
  });
  it("biceps stretch fixes the palm to a wall while turning the torso away", () => {
    const steps = methodSteps("biceps-stretch", "bodyweight").join(" ");
    expect(steps).toContain("손바닥");
    expect(steps).toContain("벽");
    expect(steps).toContain("몸통");
    expect(steps).toContain("반대쪽");
  });
  it("barbell pullover starts over the chest and arcs behind the head with fixed elbow bend", () => {
    const steps = methodSteps("barbell-pullover", "barbell");
    expect(steps[0]).toContain("가슴 위");
    expect(steps[1]).toContain("머리 뒤");
    expect(steps[1]).toContain("팔꿈치 각도");
    expect(steps[2]).toContain("가슴 위");
  });
  it("reverse preacher uses an overhand straight bar with supported upper arms", () => {
    const steps = methodSteps("reverse-preacher-curl", "barbell").join(" ");
    expect(steps).toContain("오버핸드");
    expect(steps).toContain("경사 패드");
    expect(steps).toContain("직선 바벨");
  });
  it("EZ preacher names the bent bar, underhand grip and supporting pad", () => {
    const steps = methodSteps("ez-bar-preacher-curl", "barbell").join(" ");
    expect(steps).toContain("EZ바");
    expect(steps).toContain("경사 패드");
    expect(steps).toContain("손바닥이 위");
    expect(steps).not.toContain("옆구리");
  });
  it("single arm preacher supports the upper arm on the pad, not the waist", () => {
    const steps = methodSteps("single-arm-preacher-curl", "dumbbell").join(" ");
    expect(steps).toContain("한 손");
    expect(steps).toContain("경사 패드");
    expect(steps).toContain("손바닥이 위");
    expect(steps).not.toContain("옆구리");
  });
  it("dumbbell JM press moves the upper arms and elbows together", () => {
    const steps = methodSteps("dumbbell-jm-press", "dumbbell").join(" ");
    expect(steps).toContain("중립그립");
    expect(steps).toContain("상완");
    expect(steps).not.toContain("어깨는 움직이지 않는다");
    expect(guideFor("dumbbell-jm-press").cues.join(" ")).toContain("몸통 아래");
  });
  it("single arm lying extension supports the working upper arm with the opposite hand", () => {
    const steps = methodSteps("single-arm-dumbbell-lying-extension", "dumbbell").join(" ");
    expect(steps).toContain("반대 손");
    expect(steps).toContain("머리 옆");
    expect(guideFor("single-arm-dumbbell-lying-extension").setup).toContain("중립그립");
  });
  it("ankle mobility moves the knee toward the wall with the heel grounded", () => {
    const steps = methodSteps("ankle-mobility-drill", "bodyweight").join(" ");
    expect(steps).toContain("벽");
    expect(steps).toContain("뒤꿈치");
    expect(steps).toContain("무릎");
    expect(steps).not.toContain("발끝을 든다");
  });
  it("seated leg curl source flexes knees against the ankle roller", () => {
    const steps = methodSteps("seated-leg-curl-2", "machine").join(" ");
    expect(steps).toContain("롤러");
    expect(steps).toContain("무릎을 굽혀");
    expect(steps).not.toContain("일어선다");
  });
  it("close grip bench uses a comfortable shoulder width grip", () => {
    expect(methodSteps("close-grip-bench-press", "barbell").join(" ")).toContain("어깨너비 정도");
    expect(guideFor("close-grip-bench-press").setup).toContain("오버핸드");
  });
  it("cossack alias describes wide lateral squat with the opposite leg straight", () => {
    const steps = methodSteps("cossack-squat-2", "bodyweight").join(" ");
    expect(steps).toContain("넓게");
    expect(steps).toContain("반대쪽 다리");
    expect(steps).toContain("발끝");
  });
  it("seated overhead barbell extension keeps the upper arms fixed above the head", () => {
    const steps = methodSteps("seated-overhead-barbell-extension", "barbell").join(" ");
    expect(steps).toContain("등받이");
    expect(steps).toContain("머리 뒤");
    expect(steps).toContain("상완");
    expect(guideFor("seated-overhead-barbell-extension").setup).toContain("오버핸드");
  });
  it("standing hamstring stretch supports the bent back knee with both hands", () => {
    const steps = methodSteps("standing-hamstring-stretch", "bodyweight").join(" ");
    expect(steps).toContain("뒤꿈치");
    expect(steps).toContain("뒷다리");
    expect(steps).toContain("양손");
    expect(steps).toContain("고관절");
  });
  it("seated barbell press names the backrest, overhand grip and overhead destination", () => {
    const steps = methodSteps("seated-barbell-overhead-press", "barbell").join(" ");
    expect(steps).toContain("등받이");
    expect(steps).toContain("오버핸드");
    expect(steps).toContain("머리 위");
  });
  it("dumbbell preacher curl supports both upper arms on a sloped pad", () => {
    const steps = methodSteps("dumbbell-preacher-curl", "dumbbell").join(" ");
    expect(steps).toContain("경사 패드");
    expect(steps).toContain("양팔");
    expect(steps).toContain("손바닥이 위");
    expect(steps).not.toContain("옆구리");
  });
  it("standing IT band stretch crosses the left leg behind and bends to the right", () => {
    const steps = methodSteps("standing-it-band-stretch", "bodyweight").join(" ");
    expect(steps).toContain("왼다리를 오른다리 뒤");
    expect(steps).toContain("왼팔");
    expect(steps).toContain("오른쪽");
  });
  it("seated band pull apart opens the arms sideways at shoulder height", () => {
    const steps = methodSteps("seated-band-pull-apart", "band").join(" ");
    expect(steps).toContain("앉아");
    expect(steps).toContain("어깨 높이");
    expect(steps).toContain("옆으로 벌려");
    expect(guideFor("seated-band-pull-apart").setup).toContain("손바닥이 아래");
  });
  it("seated glute stretch supports one ankle over the opposite knee before hinging", () => {
    const steps = methodSteps("seated-glute-stretch", "bodyweight").join(" ");
    expect(steps).toContain("발목을 반대쪽 무릎");
    expect(steps).toContain("고관절");
    expect(guideFor("seated-glute-stretch").beginnerTips.join(" ")).toContain("누르지");
  });
  it("single arm bench press keeps the empty arm pointing at the ceiling", () => {
    const steps = methodSteps("single-arm-dumbbell-bench-press", "dumbbell").join(" ");
    expect(steps).toContain("한 손");
    expect(steps).toContain("빈팔");
    expect(steps).toContain("천장");
    expect(guideFor("single-arm-dumbbell-bench-press").setup).toContain("평벤치");
  });
  it("behind the back cable curl holds the upper arm behind the torso", () => {
    const steps = methodSteps("behind-the-back-cable-curl", "cable").join(" ");
    expect(steps).toContain("뒤쪽");
    expect(steps).toContain("상완을 몸통 뒤");
    expect(guideFor("behind-the-back-cable-curl").setup).toContain("앞뒤");
  });
  it("reverse grip press describes palms toward shoulders and slower lowering", () => {
    const steps = methodSteps("reverse-grip-dumbbell-press", "dumbbell");
    expect(steps[0]).toContain("손바닥이 어깨 쪽");
    expect(steps[1]).toContain("밀어 올린 뒤 더 천천히");
  });
  it("seated hamstring stretch hinges over one straight leg with a grounded heel", () => {
    const steps = methodSteps("seated-hamstring-stretch", "bodyweight").join(" ");
    expect(steps).toContain("뒤꿈치");
    expect(steps).toContain("한쪽 다리");
    expect(steps).toContain("고관절");
    expect(guideFor("seated-hamstring-stretch").setup).toContain("의자 앞쪽");
  });
  it.each(["dumbbell-reverse-curl", "pronated-dumbbell-curl"])("%s explicitly describes an overhand standing curl", (id) => {
    expect(methodSteps(id, "dumbbell").join(" ")).toContain("오버핸드");
    expect(guideFor(id).setup).toContain("서서");
  });
  it("dumbbell wrist extension matches the supported reverse wrist curl", () => {
    expect(methodSteps("dumbbell-wrist-extension", "dumbbell")).toEqual(methodSteps("reverse-wrist-curl", "dumbbell"));
    expect(guideFor("dumbbell-wrist-extension").setup).toContain("허벅지");
  });
  it("flat neutral press keeps opposing palms and presses upward from the chest", () => {
    const steps = methodSteps("neutral-grip-dumbbell-press", "dumbbell");
    expect(steps[0]).toContain("평벤치");
    expect(steps[0]).toContain("서로 마주");
    expect(steps[1]).toContain("밀어 올린다");
    expect(steps[2]).toContain("가슴 옆");
  });
  it("single rope curl uses one neutral grip with an unmoving upper arm", () => {
    const steps = methodSteps("single-rope-cable-curl", "cable").join(" ");
    expect(steps).toContain("한 손");
    expect(steps).toContain("로프");
    expect(steps).toContain("상완을 고정");
    expect(guideFor("single-rope-cable-curl").setup).toContain("중립");
  });
  it("kettlebell biceps curl uses supinated grips rather than hammer grips", () => {
    const steps = methodSteps("kettlebell-biceps-curl", "kettlebell").join(" ");
    expect(steps).toContain("손바닥이 앞");
    expect(steps).toContain("케틀벨을 하나씩");
    expect(guideFor("kettlebell-biceps-curl").cues.join(" ")).toContain("상완");
  });
  it("levator stretch looks toward the same-side armpit without hand traction", () => {
    const steps = methodSteps("levator-scapulae-stretch", "bodyweight").join(" ");
    expect(steps).toContain("왼쪽");
    expect(steps).toContain("겨드랑이");
    expect(steps).toContain("숙여");
    expect(guideFor("levator-scapulae-stretch").beginnerTips.join(" ")).toContain("손으로");
  });
  it("lying dumbbell triceps extension uses a flat bench, neutral grips and fixed upper arms", () => {
    const steps = methodSteps("dumbbell-lying-triceps-extension", "dumbbell").join(" ");
    expect(steps).toContain("평벤치");
    expect(steps).toContain("서로 마주");
    expect(steps).toContain("상완을 고정");
    expect(guideFor("dumbbell-lying-triceps-extension").setup).toContain("발바닥");
  });
  it("the reversed EZ curl name preserves its exact movement and equipment", () => {
    expect(methodSteps("ez-bar-reverse-curl", "barbell")).toEqual(methodSteps("reverse-ez-bar-curl", "barbell"));
    expect(guideFor("ez-bar-reverse-curl").setup).toContain("오버핸드");
  });
  it("Cuban press rows before rotation and pressing, then reverses the sequence", () => {
    const steps = methodSteps("cuban-press", "dumbbell");
    expect(steps[1]).toMatch(/당겨.*회전.*머리 위/);
    expect(steps[2]).toContain("역순");
    expect(guideFor("cuban-press").setup).toContain("덤벨");
  });
  it("band hammer curl anchors the band under shoes and keeps neutral grips", () => {
    const steps = methodSteps("band-hammer-curl", "band").join(" ");
    expect(steps).toContain("운동화");
    expect(steps).toContain("밟고");
    expect(steps).toContain("서로 마주");
    expect(guideFor("band-hammer-curl").cues.join(" ")).toContain("상완");
  });
  it("reverse prayer stretches the wrists with backs of hands together in front", () => {
    const steps = methodSteps("reverse-prayer-stretch", "bodyweight").join(" ");
    expect(steps).toContain("손등");
    expect(steps).toContain("손가락을 아래");
    expect(steps).toContain("가슴 쪽으로");
    expect(steps).not.toContain("등 뒤");
  });
  it("standing dumbbell external rotation fixes elevated upper arms and bends elbows ninety degrees", () => {
    const steps = methodSteps("dumbbell-external-rotation", "dumbbell").join(" ");
    expect(steps).toContain("어깨 높이");
    expect(steps).toContain("90도");
    expect(steps).toContain("위로 회전");
    expect(guideFor("dumbbell-external-rotation").setup).toContain("서서");
  });
  it("prayer stretch keeps palms together as hands lower and elbows open", () => {
    const steps = methodSteps("prayer-stretch", "bodyweight").join(" ");
    expect(steps).toContain("손바닥");
    expect(steps).toContain("손을 천천히 내려");
    expect(steps).toContain("팔꿈치를 옆으로");
    expect(guideFor("prayer-stretch").cues.join(" ")).toContain("손바닥");
  });
  it("rear delt row uses the seated hinge and flared elbows", () => {
    const steps = methodSteps("dumbbell-rear-delt-row", "dumbbell").join(" ");
    expect(steps).toContain("벤치에 앉아");
    expect(steps).toContain("팔꿈치를 옆으로");
    expect(guideFor("dumbbell-rear-delt-row").setup).toContain("손바닥이 뒤");
  });
  it("scalene stretch tilts right before rotating left with opposite shoulder support", () => {
    const steps = methodSteps("scalene-neck-stretch", "bodyweight");
    expect(steps[0]).toContain("오른손을 왼쪽 어깨");
    expect(steps[1]).toContain("오른쪽으로 기울인 뒤 얼굴을 왼쪽");
    expect(steps[2]).toContain("반대쪽");
  });
  it("tempo lateral raise specifies its two-one-three cadence", () => {
    const steps = methodSteps("tempo-lateral-raise", "dumbbell");
    expect(steps[1]).toContain("2초");
    expect(steps[1]).toContain("1초");
    expect(steps[1]).toContain("3초");
    expect(steps[1]).toContain("어깨 높이");
  });
  it("high cable curl keeps upper arms horizontal and pulls toward the head", () => {
    const steps = methodSteps("high-cable-curl", "cable").join(" ");
    expect(steps).toContain("높은 풀리");
    expect(steps).toContain("상완을 수평으로 고정");
    expect(steps).toContain("머리 쪽");
    expect(guideFor("high-cable-curl").beginnerTips.join(" ")).toContain("약간 굽힌");
  });
  it("seated side stretch anchors the hips and reaches overhead before bending sideways", () => {
    const steps = methodSteps("seated-side-stretch", "bodyweight").join(" ");
    expect(steps).toContain("앉아");
    expect(steps).toContain("머리 위");
    expect(steps).toContain("옆으로");
    expect(steps).toContain("반대쪽");
    expect(guideFor("seated-side-stretch").cues.join(" ")).toContain("엉덩이");
  });
  it("incline reverse curl uses a backrest and overhand dumbbell grip", () => {
    const steps = methodSteps("incline-dumbbell-reverse-curl", "dumbbell").join(" ");
    expect(steps).toContain("등받이");
    expect(steps).toContain("손등");
    expect(guideFor("incline-dumbbell-reverse-curl").setup).toContain("오버핸드");
  });
  it("isometric curl holds a bent elbow instead of repeating curls", () => {
    const steps = methodSteps("isometric-curl-hold", "dumbbell").join(" ");
    expect(steps).toContain("90도");
    expect(steps).toContain("움직이지");
    expect(steps).not.toContain("완전히 편다");
    expect(guideFor("isometric-curl-hold").cues.join(" ")).toContain("호흡");
  });
  it("single-arm incline curl supports the back and moves one supinated arm", () => {
    const steps = methodSteps("single-arm-incline-dumbbell-curl", "dumbbell").join(" ");
    expect(steps).toContain("등받이");
    expect(steps).toContain("한 팔");
    expect(steps).toContain("반대쪽");
    expect(guideFor("single-arm-incline-dumbbell-curl").cues.join(" ")).toContain("상완");
  });
  it("partial barbell curl stops at forearm horizontal instead of full curl height", () => {
    const steps = methodSteps("partial-barbell-curl", "barbell").join(" ");
    expect(steps).toContain("전완이 바닥과 평행");
    expect(steps).toContain("하단");
    expect(guideFor("partial-barbell-curl").setup).toContain("바벨");
  });
  it("neck isometric hold presses the forehead without moving the head", () => {
    const steps = methodSteps("neck-isometric-hold", "bodyweight").join(" ");
    expect(steps).toContain("이마");
    expect(steps).toContain("움직이지");
    expect(steps).not.toContain("가동범위");
    expect(guideFor("neck-isometric-hold").cues.join(" ")).toContain("호흡");
  });
  it("standing back extension supports the lower back and extends instead of hinging forward", () => {
    const steps = methodSteps("standing-back-extension-stretch", "bodyweight").join(" ");
    expect(steps).toContain("허리 아래");
    expect(steps).toContain("뒤로");
    expect(steps).not.toContain("고관절을 뒤로");
    expect(guideFor("standing-back-extension-stretch").setup).toContain("손");
  });
  it("incline hammer curl supports the back and preserves the neutral grip", () => {
    const steps = methodSteps("incline-hammer-curl", "dumbbell").join(" ");
    expect(steps).toContain("등받이");
    expect(steps).toContain("서로 마주");
    expect(guideFor("incline-hammer-curl").setup).toContain("발바닥");
    expect(guideFor("incline-hammer-curl").cues.join(" ")).toContain("상완");
  });
  it("kettlebell hammer curl uses two bells and keeps the neutral grip", () => {
    const steps = methodSteps("kettlebell-hammer-curl", "kettlebell").join(" ");
    expect(steps).toContain("케틀벨을 하나씩");
    expect(steps).toContain("서로 마주");
    expect(guideFor("kettlebell-hammer-curl").cues.join(" ")).toContain("손목");
    expect(guideFor("kettlebell-hammer-curl").setup).not.toContain("덤벨");
  });
  it("seated rear delt raise hinges forward on the bench and opens the arms sideways", () => {
    const steps = methodSteps("seated-bent-over-lateral-raise", "dumbbell").join(" ");
    expect(steps).toContain("벤치에 앉아");
    expect(steps).toContain("앞으로");
    expect(steps).toContain("옆으로");
    expect(guideFor("seated-bent-over-lateral-raise").cues.join(" ")).toContain("상체");
  });
  it("fat grip curl describes the thick sleeve rather than a standard handle", () => {
    const steps = methodSteps("fat-grip-curl", "dumbbell").join(" ");
    expect(steps).toContain("두꺼운 그립");
    expect(steps).toContain("상완");
    expect(guideFor("fat-grip-curl").setup).toContain("슬리브");
  });
  it("shoulder extension moves one arm backward with a stable torso", () => {
    const steps = methodSteps("shoulder-extension-stretch", "bodyweight").join(" ");
    expect(steps).toContain("한 팔");
    expect(steps).toContain("반대쪽");
    expect(steps).toContain("뒤로");
    expect(guideFor("shoulder-extension-stretch").setup).toContain("맞잡지");
    expect(guideFor("shoulder-extension-stretch").cues.join(" ")).toContain("몸통");
  });
  it("seated Arnold press rotates palms from facing the torso to facing forward", () => {
    const steps = methodSteps("seated-arnold-press", "dumbbell").join(" ");
    expect(steps).toContain("벤치에 앉아");
    expect(steps).toContain("손바닥");
    expect(steps).toContain("몸쪽");
    expect(steps).toContain("정면");
    expect(guideFor("seated-arnold-press").cues.join(" ")).toContain("회전");
  });
  it("thoracic rotation keeps the pelvis forward while the upper body turns", () => {
    const steps = methodSteps("thoracic-rotation", "bodyweight").join(" ");
    expect(steps).toContain("골반");
    expect(steps).toContain("몸통");
    expect(steps).toContain("반대쪽");
    expect(guideFor("thoracic-rotation").setup).toContain("팔꿈치");
  });
  it("seated shoulder press starts with supported feet and presses overhead", () => {
    const steps = methodSteps("seated-dumbbell-shoulder-press", "dumbbell");
    expect(steps[0]).toContain("벤치에 앉아");
    expect(steps[1]).toContain("머리 위");
    expect(steps[2]).toContain("내린다");
    expect(guideFor("seated-dumbbell-shoulder-press").setup).toContain("발바닥");
  });
  it("shoulder flexion stretch leads with the thumb and raises one arm forward", () => {
    const steps = methodSteps("shoulder-flexion-stretch", "bodyweight").join(" ");
    expect(steps).toContain("엄지");
    expect(steps).toContain("앞으로");
    expect(steps).toContain("반대쪽");
    expect(guideFor("shoulder-flexion-stretch").cues.join(" ")).toContain("몸통");
  });
  it("reverse EZ curl uses the angled overhand grip and fixed upper arms", () => {
    const steps = methodSteps("reverse-ez-bar-curl", "barbell").join(" ");
    expect(steps).toContain("EZ바");
    expect(steps).toContain("오버핸드");
    expect(steps).toContain("상완");
    expect(guideFor("reverse-ez-bar-curl").setup).toContain("경사");
  });
  it("seated lateral raise keeps the feet supported and raises bent arms sideways", () => {
    const steps = methodSteps("seated-dumbbell-lateral-raise", "dumbbell").join(" ");
    expect(steps).toContain("벤치에 앉아");
    expect(steps).toContain("옆으로");
    expect(steps).toContain("어깨 높이");
    expect(guideFor("seated-dumbbell-lateral-raise").setup).toContain("발바닥");
  });
  it("finger stretch opens and spreads relaxed fingers while keeping the wrist still", () => {
    const steps = methodSteps("finger-stretch", "bodyweight").join(" ");
    expect(steps).toContain("가볍게 굽힌");
    expect(steps).toContain("손가락");
    expect(steps).toContain("벌린다");
    expect(guideFor("finger-stretch").cues.join(" ")).toContain("손목을 고정");
  });
  it("plate curl holds one plate with both hands and keeps upper arms still", () => {
    const steps = methodSteps("plate-curl", "plate").join(" ");
    expect(steps).toContain("원판의 양옆");
    expect(steps).toContain("양손");
    expect(guideFor("plate-curl").cues.join(" ")).toContain("상완");
    expect(guideFor("plate-curl").setup).not.toContain("덤벨");
  });
  it("cable drag curl moves the elbows back rather than fixing them at the sides", () => {
    const steps = methodSteps("cable-drag-curl", "cable").join(" ");
    expect(steps).toContain("팔꿈치를 뒤로");
    expect(steps).toContain("몸 가까이");
    expect(steps).not.toContain("옆구리에 고정");
    expect(guideFor("cable-drag-curl").cues.join(" ")).toContain("수직");
  });
  it("six-way raise names outward, forward, overhead and the reverse path", () => {
    const steps = methodSteps("dumbbell-6-way-raise", "dumbbell");
    expect(steps[1]).toContain("옆으로");
    expect(steps[1]).toContain("앞으로");
    expect(steps[1]).toContain("머리 위");
    expect(steps[2]).toContain("옆으로 벌린");
    expect(guideFor("dumbbell-6-way-raise").cues.join(" ")).toContain("역순");
  });
  it("cable wrist curl supports forearms and moves only the wrists", () => {
    const steps = methodSteps("cable-wrist-curl", "cable").join(" ");
    expect(steps).toContain("전완을 허벅지");
    expect(steps).toContain("손목만");
    expect(steps).toContain("손바닥이 위");
    expect(guideFor("cable-wrist-curl").setup).toContain("직선바");
  });
  it("neutral incline press uses facing palms with back support", () => {
    const steps = methodSteps("neutral-grip-incline-dumbbell-press", "dumbbell").join(" ");
    expect(steps).toContain("등받이");
    expect(steps).toContain("서로 마주");
    expect(steps).toContain("어깨 옆");
    expect(guideFor("neutral-grip-incline-dumbbell-press").setup).toContain("발바닥");
  });
  it("wide cable curl describes a wide underhand straight-bar grip", () => {
    const steps = methodSteps("wide-grip-cable-curl", "cable").join(" ");
    expect(steps).toContain("어깨보다 넓게");
    expect(steps).toContain("직선바");
    expect(steps).toContain("손바닥이 위");
    expect(guideFor("wide-grip-cable-curl").setup).toContain("낮은 풀리");
  });
  it("ankle rocking alternates forefoot and heel lifts in a seated position", () => {
    const steps = methodSteps("ankle-rock", "bodyweight").join(" ");
    expect(steps).toContain("앉아");
    expect(steps).toContain("앞발");
    expect(steps).toContain("뒤꿈치");
    expect(guideFor("ankle-rock").cues.join(" ")).toContain("번갈아");
  });
  it("incline triceps extension fixes upper arms and lowers two dumbbells behind the head", () => {
    const steps = methodSteps("incline-dumbbell-triceps-extension", "dumbbell").join(" ");
    expect(steps).toContain("등받이");
    expect(steps).toContain("머리 뒤");
    expect(steps).toContain("상완");
    expect(guideFor("incline-dumbbell-triceps-extension").setup).toContain("서로 마주");
  });
  it("rope cable curl keeps two rope ends in a neutral grip", () => {
    const steps = methodSteps("cable-rope-curl", "cable").join(" ");
    expect(steps).toContain("로프");
    expect(steps).toContain("서로 마주");
    expect(guideFor("cable-rope-curl").setup).toContain("낮은 풀리");
  });
  it("seated toe tapping reaches forward and alternates after returning", () => {
    const steps = methodSteps("toe-tap", "bodyweight").join(" ");
    expect(steps).toContain("앉아");
    expect(steps).toContain("발끝");
    expect(steps).toContain("반대발");
    expect(guideFor("toe-tap").cues.join(" ")).toContain("골반");
  });
  it("seesaw press raises one arm while lowering the other simultaneously", () => {
    const steps = methodSteps("dumbbell-seesaw-press", "dumbbell");
    expect(steps[0]).toContain("한 팔");
    expect(steps[1]).toContain("동시에");
    expect(steps[2]).toContain("방향을 바꿔");
    expect(guideFor("dumbbell-seesaw-press").cues.join(" ")).toContain("반대 방향");
  });
  it("single cable curl uses one handle and keeps the opposite arm still", () => {
    const steps = methodSteps("single-arm-cable-curl", "cable").join(" ");
    expect(steps).toContain("D핸들");
    expect(steps).toContain("반대팔");
    expect(steps).toContain("반대쪽");
    expect(guideFor("single-arm-cable-curl").setup).toContain("한 손");
  });
  it("foot doming raises the arch without curling toes or lifting the heel", () => {
    const steps = methodSteps("foot-arch-doming", "bodyweight").join(" ");
    expect(steps).toContain("아치");
    expect(steps).toContain("발가락을 구부리지");
    expect(guideFor("foot-arch-doming").cues.join(" ")).toContain("뒤꿈치");
  });
  it("seated one-arm press supports the body and presses only the working hand", () => {
    const steps = methodSteps("seated-single-arm-dumbbell-shoulder-press", "dumbbell").join(" ");
    expect(steps).toContain("한 손");
    expect(steps).toContain("머리 위");
    expect(steps).toContain("반대쪽");
    expect(guideFor("seated-single-arm-dumbbell-shoulder-press").setup).toContain("벤치");
  });
  it("cable EZ curl uses an underhand angled attachment on a low pulley", () => {
    const steps = methodSteps("cable-ez-bar-curl", "cable").join(" ");
    expect(steps).toContain("낮은 풀리");
    expect(steps).toContain("EZ바");
    expect(steps).toContain("손바닥이 위");
    expect(guideFor("cable-ez-bar-curl").setup).toContain("경사");
  });
  it("partial lateral raise specifies the lower range instead of shoulder height", () => {
    const steps = methodSteps("partial-lateral-raise", "dumbbell").join(" ");
    expect(steps).toContain("45도");
    expect(steps).toContain("하단");
    expect(steps).not.toContain("측면삼각근 높이");
    expect(guideFor("partial-lateral-raise").setup).toContain("하단");
  });
  it("big toe extension lifts the toe actively with the other toes grounded", () => {
    const steps = methodSteps("big-toe-extension", "bodyweight").join(" ");
    expect(steps).toContain("엄지발가락");
    expect(steps).toContain("나머지 발가락");
    expect(steps).not.toContain("팔꿈치");
    expect(guideFor("big-toe-extension").cues.join(" ")).toContain("뒤꿈치");
  });
  it("lateral raise hold describes static shoulder-height holding", () => {
    const steps = methodSteps("isometric-lateral-raise-hold", "dumbbell");
    expect(steps[0]).toContain("어깨 높이");
    expect(steps[1]).toContain("유지");
    expect(steps[2]).not.toContain("내린다");
    expect(guideFor("isometric-lateral-raise-hold").cues.join(" ")).toContain("호흡");
  });
  it("reverse cable curl sets the low pulley and an overhand straight-bar grip", () => {
    const steps = methodSteps("cable-reverse-curl", "cable").join(" ");
    expect(steps).toContain("낮은 풀리");
    expect(steps).toContain("오버핸드");
    expect(guideFor("cable-reverse-curl").setup).toContain("직선바");
  });
  it("seated shrug raises shoulders while keeping elbow angle fixed", () => {
    const steps = methodSteps("seated-dumbbell-shrug", "dumbbell").join(" ");
    expect(steps).toContain("벤치에 앉아");
    expect(steps).toContain("어깨만");
    expect(steps).not.toContain("상부승모근 높이");
    expect(guideFor("seated-dumbbell-shrug").cues.join(" ")).toContain("돌리지");
  });
  it("seated thoracic rotation crosses arms while keeping pelvis and feet still", () => {
    const steps = methodSteps("seated-thoracic-rotation", "bodyweight").join(" ");
    expect(steps).toContain("교차");
    expect(steps).toContain("골반");
    expect(steps).toContain("반대쪽");
    expect(guideFor("seated-thoracic-rotation").cues.join(" ")).toContain("머리");
  });
  it("close EZ curl uses inner angled grips and an unlocked bottom", () => {
    const steps = methodSteps("close-grip-ez-bar-curl", "barbell").join(" ");
    expect(steps).toContain("EZ바");
    expect(steps).toContain("좁게");
    expect(steps).toContain("살짝 굽힌");
    expect(steps).not.toContain("완전히 편다");
    expect(guideFor("close-grip-ez-bar-curl").setup).toContain("안쪽 경사");
  });
  it("alternating incline curl finishes one arm before switching with back support", () => {
    const steps = methodSteps("alternating-incline-dumbbell-curl", "dumbbell").join(" ");
    expect(steps).toContain("등받이");
    expect(steps).toContain("반대팔");
    expect(steps).toContain("번갈아");
    expect(guideFor("alternating-incline-dumbbell-curl").cues.join(" ")).toContain("상완");
  });
  it("seated dumbbell curl uses the bench and stable upper arms", () => {
    const steps = methodSteps("seated-dumbbell-curl", "dumbbell").join(" ");
    expect(steps).toContain("벤치에 앉아");
    expect(steps).toContain("상완");
    expect(guideFor("seated-dumbbell-curl").setup).toContain("발바닥");
  });
  it("standing side bend moves the torso sideways without twisting and trains both sides", () => {
    const steps = methodSteps("standing-side-bend-stretch", "bodyweight").join(" ");
    expect(steps).toContain("몸통");
    expect(steps).toContain("옆으로");
    expect(steps).toContain("반대쪽");
    expect(guideFor("standing-side-bend-stretch").cues.join(" ")).toContain("비틀지");
  });
  it("single-arm overhead extension fixes the upper arm and describes the dumbbell behind the head", () => {
    const steps = methodSteps("single-arm-overhead-dumbbell-extension", "dumbbell").join(" ");
    expect(steps).toContain("한 손");
    expect(steps).toContain("머리 뒤");
    expect(steps).toContain("반대쪽");
    expect(guideFor("single-arm-overhead-dumbbell-extension").cues.join(" ")).toContain("상완");
  });
  it("wrist mobility circles hold the forearms still and reverse direction without weights", () => {
    const steps = methodSteps("wrist-mobility-circle", "bodyweight").join(" ");
    expect(steps).toContain("전완을 고정");
    expect(steps).toContain("반대 방향");
    expect(steps).not.toContain("덤벨");
    expect(guideFor("wrist-mobility-circle").cues.join(" ")).toContain("원");
  });
  it("smith shrug uses the machine bar and keeps elbows straight", () => {
    const steps = methodSteps("smith-machine-shrug", "smith").join(" ");
    expect(steps).toContain("안전받침");
    expect(steps).toContain("팔꿈치를 편");
    expect(steps).not.toContain("상부승모근 높이");
    expect(guideFor("smith-machine-shrug").setup).toContain("스미스");
  });
  it("neck extension moves the head upward with a fixed torso instead of extending elbows", () => {
    const steps = methodSteps("neck-extension", "bodyweight").join(" ");
    expect(steps).toContain("위쪽");
    expect(steps).not.toContain("팔꿈치");
    expect(guideFor("neck-extension").cues.join(" ")).toContain("몸통");
  });
  it("behind-the-back shrug keeps the bar behind the body and elbows straight", () => {
    const steps = methodSteps("behind-the-back-shrug", "barbell").join(" ");
    expect(steps).toContain("몸 뒤");
    expect(steps).toContain("팔꿈치를 편");
    expect(steps).not.toContain("상부승모근 높이");
    expect(guideFor("behind-the-back-shrug").setup).toContain("몸 뒤");
  });
  it("neck retraction slides the head back without tilting", () => {
    expect(methodSteps("neck-retraction", "bodyweight").join(" ")).toContain("뒤로");
    expect(guideFor("neck-retraction").cues.join(" ")).toContain("기울이지");
  });
  it("wrist rotation supports the forearms and alternates palm directions with straight wrists", () => {
    const steps = methodSteps("wrist-rotation", "dumbbell").join(" ");
    expect(steps).toContain("전완을 허벅지");
    expect(steps).toContain("손목을 곧게");
    expect(steps).toContain("위와 아래");
    expect(guideFor("wrist-rotation").setup).toContain("덤벨");
  });
  for (const [id, direction] of [["barbell-wrist-curl", "위"], ["barbell-reverse-wrist-curl", "아래"]]) {
    it(`${id} uses supported forearms and the correct barbell grip`, () => {
      const steps = methodSteps(id, "barbell").join(" ");
      expect(steps).toContain(`손바닥이 ${direction}`);
      expect(steps).toContain("전완을 허벅지");
      expect(steps).not.toContain("손목은 중립을 유지");
      expect(guideFor(id).setup).toContain("바벨");
      expect(guideFor(id).setup).toContain(`손바닥이 ${direction}`);
    });
  }
  it("trap bar shrug raises shoulders with straight arms inside the hex frame", () => {
    const steps = methodSteps("trap-bar-shrug", "barbell").join(" ");
    expect(steps).toContain("트랩바 안");
    expect(steps).toContain("팔꿈치를 편");
    expect(steps).not.toContain("승모근 높이");
    expect(guideFor("trap-bar-shrug").setup).toContain("중립 그립");
  });
  it("neck flexion moves the chin down with a fixed torso", () => {
    expect(methodSteps("neck-flexion", "bodyweight").join(" ")).toContain("턱");
    expect(guideFor("neck-flexion").cues.join(" ")).toContain("몸통");
  });
  it("lateral neck flexion brings the ear toward the shoulder without lifting the shoulder", () => {
    const steps = methodSteps("neck-lateral-flexion", "bodyweight").join(" ");
    expect(steps).toContain("귀");
    expect(steps).not.toMatch(/흉쇄유돌근 높이|팔꿈치/);
    expect(guideFor("neck-lateral-flexion").cues.join(" ")).toContain("어깨를 올리지");
  });
});
