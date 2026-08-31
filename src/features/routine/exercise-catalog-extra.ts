/**
 * 자동 생성 파일 — 편집 금지. (생성: scripts/gen-extra-catalog.mjs → scripts/split-extra-maps.mjs)
 * 확장 세트의 목록/검색용 데이터(운동법·부위·강도 제외).
 * ⚠ 크다 — 목록·검색 UI 에서만 쓴다. 부위 배지·칼로리만 필요하면
 * exercise-catalog-extra-maps.ts 쪽을 봐야 한다.
 */
import type { CatalogExercise } from "@/features/routine/exercise-catalog-labels";

export const EXTRA_EXERCISES: Record<string, CatalogExercise> = {
  "barbell-bench-press": {
    "id": "barbell-bench-press",
    "name": "바벨 벤치프레스",
    "target": "대흉근 · 삼두근·전면삼각근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "incline-barbell-bench-press": {
    "id": "incline-barbell-bench-press",
    "name": "인클라인 바벨 벤치프레스",
    "target": "대흉근 상부 · 삼두근·전면삼각근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "decline-barbell-bench-press": {
    "id": "decline-barbell-bench-press",
    "name": "디클라인 바벨 벤치프레스",
    "target": "대흉근 하부 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "dumbbell-bench-press": {
    "id": "dumbbell-bench-press",
    "name": "덤벨 벤치프레스",
    "target": "대흉근 · 삼두근·전면삼각근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "incline-dumbbell-bench-press": {
    "id": "incline-dumbbell-bench-press",
    "name": "인클라인 덤벨 벤치프레스",
    "target": "대흉근 상부 · 삼두근·전면삼각근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "decline-dumbbell-bench-press": {
    "id": "decline-dumbbell-bench-press",
    "name": "디클라인 덤벨 벤치프레스",
    "target": "대흉근 하부 · 삼두근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "dumbbell-fly": {
    "id": "dumbbell-fly",
    "name": "덤벨 플라이",
    "target": "대흉근 · 전면삼각근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "incline-dumbbell-fly": {
    "id": "incline-dumbbell-fly",
    "name": "인클라인 덤벨 플라이",
    "target": "대흉근 상부 · 전면삼각근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "low-cable-fly": {
    "id": "low-cable-fly",
    "name": "로우 케이블 플라이",
    "target": "대흉근 상부 · 전면삼각근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "smith-machine-bench-press": {
    "id": "smith-machine-bench-press",
    "name": "스미스 머신 벤치프레스",
    "target": "대흉근 · 삼두근·전면삼각근",
    "equipments": [
      {
        "equipment": "smith"
      }
    ]
  },
  "incline-push-up": {
    "id": "incline-push-up",
    "name": "인클라인 푸시업",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "decline-push-up": {
    "id": "decline-push-up",
    "name": "디클라인 푸시업",
    "target": "대흉근 상부 · 삼두근·전면삼각근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "chest-dip": {
    "id": "chest-dip",
    "name": "체스트 딥스",
    "target": "대흉근 하부 · 삼두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "svend-press": {
    "id": "svend-press",
    "name": "스벤드 프레스",
    "target": "대흉근 · 전면삼각근",
    "equipments": [
      {
        "equipment": "plate"
      }
    ]
  },
  "floor-press": {
    "id": "floor-press",
    "name": "플로어 프레스",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "conventional-deadlift": {
    "id": "conventional-deadlift",
    "name": "컨벤셔널 데드리프트",
    "target": "척추기립근·둔근 · 햄스트링·승모근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "barbell-bent-over-row": {
    "id": "barbell-bent-over-row",
    "name": "바벨 벤트오버 로우",
    "target": "광배근·능형근 · 후면삼각근·이두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "lat-pulldown-2": {
    "id": "lat-pulldown-2",
    "name": "랫 풀다운",
    "target": "광배근 · 이두근·능형근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "wide-grip-lat-pulldown": {
    "id": "wide-grip-lat-pulldown",
    "name": "와이드 그립 랫 풀다운",
    "target": "광배근 상부 · 능형근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "close-grip-lat-pulldown": {
    "id": "close-grip-lat-pulldown",
    "name": "클로즈 그립 랫 풀다운",
    "target": "광배근 하부 · 이두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "assisted-pull-up-2": {
    "id": "assisted-pull-up-2",
    "name": "어시스트 풀업",
    "target": "광배근 · 이두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "straight-arm-pulldown-2": {
    "id": "straight-arm-pulldown-2",
    "name": "스트레이트 암 풀다운",
    "target": "광배근 · 대원근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "machine-row": {
    "id": "machine-row",
    "name": "머신 로우",
    "target": "광배근·능형근 · 이두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "hammer-strength-high-row": {
    "id": "hammer-strength-high-row",
    "name": "하이 로우 머신",
    "target": "광배근 상부 · 능형근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "rack-pull": {
    "id": "rack-pull",
    "name": "랙풀",
    "target": "척추기립근·승모근 · 둔근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "back-extension": {
    "id": "back-extension",
    "name": "백 익스텐션",
    "target": "척추기립근 · 둔근·햄스트링",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "barbell-shrug": {
    "id": "barbell-shrug",
    "name": "바벨 슈러그",
    "target": "상부승모근 · 전완근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "dumbbell-shrug": {
    "id": "dumbbell-shrug",
    "name": "덤벨 슈러그",
    "target": "상부승모근 · 전완근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "meadows-row-2": {
    "id": "meadows-row-2",
    "name": "미도우즈 로우",
    "target": "광배근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "landmine"
      }
    ]
  },
  "seal-row": {
    "id": "seal-row",
    "name": "실 로우",
    "target": "능형근·광배근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "landmine-row": {
    "id": "landmine-row",
    "name": "랜드마인 로우",
    "target": "광배근·능형근 · 이두근",
    "equipments": [
      {
        "equipment": "landmine"
      }
    ]
  },
  "barbell-overhead-press": {
    "id": "barbell-overhead-press",
    "name": "바벨 오버헤드 프레스",
    "target": "전면·측면삼각근 · 삼두근·상부승모근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "military-press": {
    "id": "military-press",
    "name": "밀리터리 프레스",
    "target": "전면삼각근 · 삼두근·코어",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "dumbbell-shoulder-press": {
    "id": "dumbbell-shoulder-press",
    "name": "덤벨 숄더 프레스",
    "target": "전면·측면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "smith-machine-shoulder-press": {
    "id": "smith-machine-shoulder-press",
    "name": "스미스 머신 숄더 프레스",
    "target": "전면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "smith"
      }
    ]
  },
  "behind-the-neck-press": {
    "id": "behind-the-neck-press",
    "name": "비하인드 넥 프레스",
    "target": "측면·후면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "dumbbell-lateral-raise": {
    "id": "dumbbell-lateral-raise",
    "name": "덤벨 사이드 레터럴 레이즈",
    "target": "측면삼각근 · 상부승모근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "cable-lateral-raise-2": {
    "id": "cable-lateral-raise-2",
    "name": "케이블 레터럴 레이즈",
    "target": "측면삼각근 · 상부승모근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "machine-lateral-raise": {
    "id": "machine-lateral-raise",
    "name": "머신 레터럴 레이즈",
    "target": "측면삼각근 · 상부승모근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "dumbbell-front-raise": {
    "id": "dumbbell-front-raise",
    "name": "덤벨 프론트 레이즈",
    "target": "전면삼각근 · 상부승모근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "dumbbell-rear-delt-fly": {
    "id": "dumbbell-rear-delt-fly",
    "name": "덤벨 리어 델트 플라이",
    "target": "후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "cable-rear-delt-fly-2": {
    "id": "cable-rear-delt-fly-2",
    "name": "케이블 리어 델트 플라이",
    "target": "후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "face-pull-2": {
    "id": "face-pull-2",
    "name": "페이스 풀",
    "target": "후면삼각근·회전근개 · 능형근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "barbell-upright-row": {
    "id": "barbell-upright-row",
    "name": "바벨 업라이트 로우",
    "target": "측면삼각근·승모근 · 이두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "cable-upright-row": {
    "id": "cable-upright-row",
    "name": "케이블 업라이트 로우",
    "target": "측면삼각근·승모근 · 이두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "landmine-press": {
    "id": "landmine-press",
    "name": "랜드마인 프레스",
    "target": "전면삼각근 · 삼두근·상부가슴",
    "equipments": [
      {
        "equipment": "landmine"
      }
    ]
  },
  "plate-front-raise": {
    "id": "plate-front-raise",
    "name": "플레이트 프론트 레이즈",
    "target": "전면삼각근 · 상부승모근",
    "equipments": [
      {
        "equipment": "plate"
      }
    ]
  },
  "barbell-back-squat": {
    "id": "barbell-back-squat",
    "name": "바벨 백 스쿼트",
    "target": "대퇴사두·둔근 · 햄스트링·코어",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "high-bar-squat": {
    "id": "high-bar-squat",
    "name": "하이바 스쿼트",
    "target": "대퇴사두 · 둔근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "low-bar-squat": {
    "id": "low-bar-squat",
    "name": "로우바 스쿼트",
    "target": "둔근·햄스트링 · 대퇴사두",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "leg-press-2": {
    "id": "leg-press-2",
    "name": "레그 프레스",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "lying-leg-curl": {
    "id": "lying-leg-curl",
    "name": "라잉 레그 컬",
    "target": "햄스트링 · 비복근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "seated-leg-curl-2": {
    "id": "seated-leg-curl-2",
    "name": "시티드 레그 컬",
    "target": "햄스트링 · 비복근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "dumbbell-lunge": {
    "id": "dumbbell-lunge",
    "name": "덤벨 런지",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "barbell-hip-thrust": {
    "id": "barbell-hip-thrust",
    "name": "바벨 힙 쓰러스트",
    "target": "대둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "cable-glute-kickback": {
    "id": "cable-glute-kickback",
    "name": "케이블 글루트 킥백",
    "target": "대둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "hip-abduction-machine": {
    "id": "hip-abduction-machine",
    "name": "힙 어브덕션 머신",
    "target": "중둔근 · 대둔근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "hip-adduction-machine": {
    "id": "hip-adduction-machine",
    "name": "힙 어덕션 머신",
    "target": "내전근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "leg-press-calf-raise": {
    "id": "leg-press-calf-raise",
    "name": "레그 프레스 카프 레이즈",
    "target": "비복근 · 가자미근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "curtsy-lunge-2": {
    "id": "curtsy-lunge-2",
    "name": "컷시 런지",
    "target": "중둔근·대둔근 · 대퇴사두",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "nordic-hamstring-curl": {
    "id": "nordic-hamstring-curl",
    "name": "노르딕 햄스트링 컬",
    "target": "햄스트링 · 둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "glute-ham-raise": {
    "id": "glute-ham-raise",
    "name": "글루트 햄 레이즈",
    "target": "햄스트링·둔근 · 척추기립근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "jump-squat": {
    "id": "jump-squat",
    "name": "점프 스쿼트",
    "target": "대퇴사두·둔근 · 비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "barbell-curl": {
    "id": "barbell-curl",
    "name": "바벨 컬",
    "target": "이두근 · 전완근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "ez-bar-curl-2": {
    "id": "ez-bar-curl-2",
    "name": "EZ바 컬",
    "target": "이두근 · 전완근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "dumbbell-biceps-curl": {
    "id": "dumbbell-biceps-curl",
    "name": "덤벨 컬",
    "target": "이두근 · 전완근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "hammer-curl-2": {
    "id": "hammer-curl-2",
    "name": "해머 컬",
    "target": "이두근·상완근 · 전완근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "machine-preacher-curl": {
    "id": "machine-preacher-curl",
    "name": "머신 프리처 컬",
    "target": "이두근 · 전완근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "cable-rope-hammer-curl-2": {
    "id": "cable-rope-hammer-curl-2",
    "name": "케이블 로프 해머 컬",
    "target": "이두근·상완근 · 전완근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "spider-curl": {
    "id": "spider-curl",
    "name": "스파이더 컬",
    "target": "이두근 단두 · 전완근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "zottman-curl-2": {
    "id": "zottman-curl-2",
    "name": "졸트만 컬",
    "target": "이두근·전완근 · 상완근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "21s-barbell-curl": {
    "id": "21s-barbell-curl",
    "name": "21s 바벨 컬",
    "target": "이두근 · 전완근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "reverse-barbell-curl": {
    "id": "reverse-barbell-curl",
    "name": "리버스 바벨 컬",
    "target": "상완요골근·전완근 · 이두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "close-grip-bench-press-2": {
    "id": "close-grip-bench-press-2",
    "name": "클로즈 그립 벤치프레스",
    "target": "삼두근 · 대흉근·전면삼각근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "lying-triceps-extension": {
    "id": "lying-triceps-extension",
    "name": "스컬크러셔",
    "target": "삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "ez-bar-skull-crusher": {
    "id": "ez-bar-skull-crusher",
    "name": "EZ바 스컬크러셔",
    "target": "삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "dumbbell-overhead-extension": {
    "id": "dumbbell-overhead-extension",
    "name": "덤벨 오버헤드 익스텐션",
    "target": "삼두근 장두",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "triceps-pushdown-2": {
    "id": "triceps-pushdown-2",
    "name": "케이블 푸시다운",
    "target": "삼두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "rope-triceps-pushdown": {
    "id": "rope-triceps-pushdown",
    "name": "로프 푸시다운",
    "target": "삼두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "reverse-grip-pushdown": {
    "id": "reverse-grip-pushdown",
    "name": "리버스 그립 푸시다운",
    "target": "삼두근 내측두",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "bench-dip-2": {
    "id": "bench-dip-2",
    "name": "벤치 딥스",
    "target": "삼두근 · 전면삼각근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "triceps-dip": {
    "id": "triceps-dip",
    "name": "트라이셉스 딥스",
    "target": "삼두근 · 대흉근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "jm-press": {
    "id": "jm-press",
    "name": "JM 프레스",
    "target": "삼두근 · 대흉근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "machine-triceps-extension": {
    "id": "machine-triceps-extension",
    "name": "머신 트라이셉스 익스텐션",
    "target": "삼두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "cable-overhead-triceps-extension": {
    "id": "cable-overhead-triceps-extension",
    "name": "케이블 오버헤드 익스텐션",
    "target": "삼두근 장두",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "reverse-wrist-curl": {
    "id": "reverse-wrist-curl",
    "name": "리버스 리스트 컬",
    "target": "전완 신근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "behind-the-back-wrist-curl": {
    "id": "behind-the-back-wrist-curl",
    "name": "비하인드 백 리스트 컬",
    "target": "전완 굴근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "farmer-s-carry": {
    "id": "farmer-s-carry",
    "name": "파머스 캐리",
    "target": "전완근·승모근 · 코어",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "plate-pinch": {
    "id": "plate-pinch",
    "name": "플레이트 핀치",
    "target": "전완 굴근",
    "equipments": [
      {
        "equipment": "plate"
      }
    ]
  },
  "wrist-roller": {
    "id": "wrist-roller",
    "name": "리스트 롤러",
    "target": "전완 굴근·신근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "decline-sit-up": {
    "id": "decline-sit-up",
    "name": "디클라인 싯업",
    "target": "복직근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "hanging-leg-raise-2": {
    "id": "hanging-leg-raise-2",
    "name": "행잉 레그 레이즈",
    "target": "복직근 하부 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "hanging-knee-raise": {
    "id": "hanging-knee-raise",
    "name": "행잉 니 레이즈",
    "target": "복직근 하부 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "toes-to-bar-2": {
    "id": "toes-to-bar-2",
    "name": "토즈 투 바",
    "target": "복직근 · 광배근·고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "cable-woodchopper": {
    "id": "cable-woodchopper",
    "name": "케이블 우드 찹",
    "target": "복사근 · 복직근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "pallof-press-2": {
    "id": "pallof-press-2",
    "name": "팔로프 프레스",
    "target": "복사근·복횡근 · 복직근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "v-up-2": {
    "id": "v-up-2",
    "name": "V업",
    "target": "복직근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "hollow-body-hold": {
    "id": "hollow-body-hold",
    "name": "할로우 바디 홀드",
    "target": "복직근·복횡근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "dead-bug": {
    "id": "dead-bug",
    "name": "데드버그",
    "target": "복횡근·복직근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "bird-dog": {
    "id": "bird-dog",
    "name": "버드독",
    "target": "척추기립근·둔근 · 복횡근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "dragon-flag": {
    "id": "dragon-flag",
    "name": "드래곤 플래그",
    "target": "복직근 · 광배근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "captain-s-chair-leg-raise": {
    "id": "captain-s-chair-leg-raise",
    "name": "캡틴스 체어 레그 레이즈",
    "target": "복직근 하부 · 고관절굴근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "kettlebell-swing": {
    "id": "kettlebell-swing",
    "name": "케틀벨 스윙",
    "target": "둔근·햄스트링 · 코어·승모근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "kettlebell-goblet-squat": {
    "id": "kettlebell-goblet-squat",
    "name": "케틀벨 고블릿 스쿼트",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "kettlebell-clean": {
    "id": "kettlebell-clean",
    "name": "케틀벨 클린",
    "target": "둔근·햄스트링 · 승모근·전완근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "kettlebell-snatch": {
    "id": "kettlebell-snatch",
    "name": "케틀벨 스내치",
    "target": "둔근·삼각근 · 코어",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "turkish-get-up": {
    "id": "turkish-get-up",
    "name": "터키시 겟업",
    "target": "어깨·코어 · 둔근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "kettlebell-press": {
    "id": "kettlebell-press",
    "name": "케틀벨 프레스",
    "target": "전면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "kettlebell-windmill": {
    "id": "kettlebell-windmill",
    "name": "케틀벨 윈드밀",
    "target": "복사근·어깨 · 햄스트링",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "kettlebell-deadlift": {
    "id": "kettlebell-deadlift",
    "name": "케틀벨 데드리프트",
    "target": "둔근·햄스트링 · 척추기립근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "kettlebell-front-squat": {
    "id": "kettlebell-front-squat",
    "name": "케틀벨 프론트 스쿼트",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "kettlebell-row": {
    "id": "kettlebell-row",
    "name": "케틀벨 로우",
    "target": "광배근 · 이두근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "trx-row": {
    "id": "trx-row",
    "name": "TRX 로우",
    "target": "광배근·능형근 · 이두근",
    "equipments": [
      {
        "equipment": "trx"
      }
    ]
  },
  "trx-push-up": {
    "id": "trx-push-up",
    "name": "TRX 푸시업",
    "target": "대흉근 · 삼두근·코어",
    "equipments": [
      {
        "equipment": "trx"
      }
    ]
  },
  "trx-pike": {
    "id": "trx-pike",
    "name": "TRX 파이크",
    "target": "복직근 · 어깨",
    "equipments": [
      {
        "equipment": "trx"
      }
    ]
  },
  "trx-biceps-curl": {
    "id": "trx-biceps-curl",
    "name": "TRX 비셉스 컬",
    "target": "이두근 · 전완근",
    "equipments": [
      {
        "equipment": "trx"
      }
    ]
  },
  "trx-triceps-extension": {
    "id": "trx-triceps-extension",
    "name": "TRX 트라이셉스 익스텐션",
    "target": "삼두근 · 코어",
    "equipments": [
      {
        "equipment": "trx"
      }
    ]
  },
  "trx-lunge": {
    "id": "trx-lunge",
    "name": "TRX 런지",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "trx"
      }
    ]
  },
  "trx-hamstring-curl": {
    "id": "trx-hamstring-curl",
    "name": "TRX 햄스트링 컬",
    "target": "햄스트링 · 둔근",
    "equipments": [
      {
        "equipment": "trx"
      }
    ]
  },
  "trx-chest-press": {
    "id": "trx-chest-press",
    "name": "TRX 체스트 프레스",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "trx"
      }
    ]
  },
  "band-pull-apart": {
    "id": "band-pull-apart",
    "name": "밴드 풀어파트",
    "target": "후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "band-lateral-raise": {
    "id": "band-lateral-raise",
    "name": "밴드 레터럴 레이즈",
    "target": "측면삼각근 · 승모근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "band-biceps-curl": {
    "id": "band-biceps-curl",
    "name": "밴드 비셉스 컬",
    "target": "이두근 · 전완근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "band-triceps-pushdown": {
    "id": "band-triceps-pushdown",
    "name": "밴드 트라이셉스 푸시다운",
    "target": "삼두근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "band-face-pull": {
    "id": "band-face-pull",
    "name": "밴드 페이스 풀",
    "target": "후면삼각근·회전근개 · 능형근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "band-good-morning": {
    "id": "band-good-morning",
    "name": "밴드 굿모닝",
    "target": "척추기립근·햄스트링 · 둔근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "band-monster-walk": {
    "id": "band-monster-walk",
    "name": "밴드 몬스터 워크",
    "target": "중둔근 · 대둔근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "band-glute-bridge": {
    "id": "band-glute-bridge",
    "name": "밴드 글루트 브릿지",
    "target": "대둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "medicine-ball-slam": {
    "id": "medicine-ball-slam",
    "name": "메디신볼 슬램",
    "target": "복직근·광배근 · 어깨",
    "equipments": [
      {
        "equipment": "medicineball"
      }
    ]
  },
  "medicine-ball-chest-pass": {
    "id": "medicine-ball-chest-pass",
    "name": "메디신볼 체스트 패스",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "medicineball"
      }
    ]
  },
  "medicine-ball-russian-twist": {
    "id": "medicine-ball-russian-twist",
    "name": "메디신볼 러시안 트위스트",
    "target": "복사근 · 복직근",
    "equipments": [
      {
        "equipment": "medicineball"
      }
    ]
  },
  "wall-ball": {
    "id": "wall-ball",
    "name": "월 볼",
    "target": "대퇴사두·둔근 · 어깨",
    "equipments": [
      {
        "equipment": "medicineball"
      }
    ]
  },
  "battle-rope-wave": {
    "id": "battle-rope-wave",
    "name": "배틀로프 웨이브",
    "target": "어깨·전완근 · 코어",
    "equipments": [
      {
        "equipment": "battlerope"
      }
    ]
  },
  "sled-push": {
    "id": "sled-push",
    "name": "슬레드 푸시",
    "target": "대퇴사두·둔근 · 종아리",
    "equipments": [
      {
        "equipment": "sled"
      }
    ]
  },
  "sled-pull": {
    "id": "sled-pull",
    "name": "슬레드 풀",
    "target": "햄스트링·둔근 · 등",
    "equipments": [
      {
        "equipment": "sled"
      }
    ]
  },
  "bosu-squat": {
    "id": "bosu-squat",
    "name": "보수 스쿼트",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "bosu"
      }
    ]
  },
  "stability-ball-crunch": {
    "id": "stability-ball-crunch",
    "name": "짐볼 크런치",
    "target": "복직근 · 복사근",
    "equipments": [
      {
        "equipment": "ball"
      }
    ]
  },
  "stability-ball-hamstring-curl": {
    "id": "stability-ball-hamstring-curl",
    "name": "짐볼 햄스트링 컬",
    "target": "햄스트링 · 둔근",
    "equipments": [
      {
        "equipment": "ball"
      }
    ]
  },
  "stability-ball-plank": {
    "id": "stability-ball-plank",
    "name": "짐볼 플랭크",
    "target": "복직근·복횡근 · 어깨",
    "equipments": [
      {
        "equipment": "ball"
      }
    ]
  },
  "power-clean": {
    "id": "power-clean",
    "name": "파워 클린",
    "target": "둔근·햄스트링 · 승모근·삼각근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "hang-clean": {
    "id": "hang-clean",
    "name": "행 클린",
    "target": "둔근·햄스트링 · 승모근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "push-press": {
    "id": "push-press",
    "name": "푸시 프레스",
    "target": "전면삼각근·대퇴사두 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "snatch": {
    "id": "snatch",
    "name": "스내치",
    "target": "둔근·삼각근 · 햄스트링·승모근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "clean-and-jerk": {
    "id": "clean-and-jerk",
    "name": "클린 앤 저크",
    "target": "둔근·삼각근 · 햄스트링·삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "power-snatch": {
    "id": "power-snatch",
    "name": "파워 스내치",
    "target": "둔근·삼각근 · 승모근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "hang-snatch": {
    "id": "hang-snatch",
    "name": "행 스내치",
    "target": "둔근·삼각근 · 승모근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "squat-clean": {
    "id": "squat-clean",
    "name": "스쿼트 클린",
    "target": "둔근·대퇴사두 · 승모근·삼각근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "split-jerk": {
    "id": "split-jerk",
    "name": "스플릿 저크",
    "target": "전면삼각근·대퇴사두 · 삼두근·코어",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "push-jerk": {
    "id": "push-jerk",
    "name": "푸시 저크",
    "target": "전면삼각근·대퇴사두 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "clean-pull": {
    "id": "clean-pull",
    "name": "클린 풀",
    "target": "둔근·햄스트링 · 승모근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "snatch-pull": {
    "id": "snatch-pull",
    "name": "스내치 풀",
    "target": "둔근·햄스트링 · 승모근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "overhead-squat": {
    "id": "overhead-squat",
    "name": "오버헤드 스쿼트",
    "target": "대퇴사두·삼각근 · 코어·둔근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "muscle-snatch": {
    "id": "muscle-snatch",
    "name": "머슬 스내치",
    "target": "삼각근·둔근 · 승모근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "hang-power-clean": {
    "id": "hang-power-clean",
    "name": "행 파워 클린",
    "target": "둔근·승모근 · 햄스트링",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "clean-grip-deadlift": {
    "id": "clean-grip-deadlift",
    "name": "클린 그립 데드리프트",
    "target": "둔근·햄스트링 · 승모근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "snatch-grip-deadlift": {
    "id": "snatch-grip-deadlift",
    "name": "스내치 그립 데드리프트",
    "target": "둔근·햄스트링 · 승모근·광배근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "sots-press": {
    "id": "sots-press",
    "name": "소츠 프레스",
    "target": "삼각근 · 대퇴사두·코어",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "clean-and-press": {
    "id": "clean-and-press",
    "name": "클린 앤 프레스",
    "target": "둔근·삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "atlas-stone-lift": {
    "id": "atlas-stone-lift",
    "name": "아틀라스 스톤 리프트",
    "target": "둔근·척추기립근 · 이두근·광배근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "yoke-walk": {
    "id": "yoke-walk",
    "name": "요크 워크",
    "target": "척추기립근·코어 · 승모근·대퇴사두",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "log-press": {
    "id": "log-press",
    "name": "로그 프레스",
    "target": "전면삼각근 · 삼두근·대퇴사두",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "keg-toss": {
    "id": "keg-toss",
    "name": "케그 토스",
    "target": "둔근·삼각근 · 햄스트링",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "tire-flip": {
    "id": "tire-flip",
    "name": "타이어 플립",
    "target": "둔근·대퇴사두 · 광배근·이두근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "car-deadlift": {
    "id": "car-deadlift",
    "name": "카 데드리프트",
    "target": "둔근·햄스트링 · 승모근·전완근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "sandbag-carry": {
    "id": "sandbag-carry",
    "name": "샌드백 캐리",
    "target": "코어·승모근 · 전완근·둔근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "hercules-hold": {
    "id": "hercules-hold",
    "name": "허큘리스 홀드",
    "target": "전완근 · 승모근·삼각근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "axle-bar-deadlift": {
    "id": "axle-bar-deadlift",
    "name": "액슬 바 데드리프트",
    "target": "둔근·햄스트링 · 전완근·승모근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "trap-bar-deadlift": {
    "id": "trap-bar-deadlift",
    "name": "트랩바 데드리프트",
    "target": "둔근·대퇴사두 · 햄스트링·승모근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "continental-clean": {
    "id": "continental-clean",
    "name": "컨티넨탈 클린",
    "target": "둔근·승모근 · 이두근·전완근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "stone-over-bar": {
    "id": "stone-over-bar",
    "name": "스톤 오버 바",
    "target": "둔근·척추기립근 · 광배근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "box-jump": {
    "id": "box-jump",
    "name": "박스 점프",
    "target": "대퇴사두·둔근 · 비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "broad-jump": {
    "id": "broad-jump",
    "name": "브로드 점프",
    "target": "둔근·대퇴사두 · 햄스트링",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "jump-lunge": {
    "id": "jump-lunge",
    "name": "점프 런지",
    "target": "대퇴사두·둔근 · 비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "depth-jump": {
    "id": "depth-jump",
    "name": "뎁스 점프",
    "target": "대퇴사두·둔근 · 비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "burpee": {
    "id": "burpee",
    "name": "버피",
    "target": "대퇴사두·대흉근 · 코어·삼두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "box-jump-over": {
    "id": "box-jump-over",
    "name": "박스 점프 오버",
    "target": "대퇴사두·둔근 · 비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "clap-push-up": {
    "id": "clap-push-up",
    "name": "클랩 푸시업",
    "target": "대흉근 · 삼두근·전면삼각근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "plyometric-push-up": {
    "id": "plyometric-push-up",
    "name": "플라이오메트릭 푸시업",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "lateral-bound": {
    "id": "lateral-bound",
    "name": "라테럴 바운드",
    "target": "둔근·대퇴사두 · 중둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "skater-jump": {
    "id": "skater-jump",
    "name": "스케이터 점프",
    "target": "둔근·대퇴사두 · 중둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "tuck-jump": {
    "id": "tuck-jump",
    "name": "턱 점프",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "jump-rope": {
    "id": "jump-rope",
    "name": "점프 로프",
    "target": "비복근 · 어깨·전완근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "double-under": {
    "id": "double-under",
    "name": "더블 언더",
    "target": "비복근 · 어깨·전완근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "wall-climb": {
    "id": "wall-climb",
    "name": "월 클라임",
    "target": "어깨·코어 · 삼두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "handstand-push-up": {
    "id": "handstand-push-up",
    "name": "핸드스탠드 푸시업",
    "target": "전면삼각근 · 삼두근·코어",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "muscle-up": {
    "id": "muscle-up",
    "name": "머슬업",
    "target": "광배근·대흉근 · 이두근·삼두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "kipping-pull-up": {
    "id": "kipping-pull-up",
    "name": "키핑 풀업",
    "target": "광배근 · 코어·이두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "devil-press": {
    "id": "devil-press",
    "name": "데빌 프레스",
    "target": "둔근·삼각근 · 대흉근·코어",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "man-maker": {
    "id": "man-maker",
    "name": "맨메이커",
    "target": "대흉근·삼각근 · 광배근·코어",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "thruster": {
    "id": "thruster",
    "name": "쓰러스터",
    "target": "대퇴사두·삼각근 · 둔근·삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "american-kettlebell-swing": {
    "id": "american-kettlebell-swing",
    "name": "아메리칸 케틀벨 스윙",
    "target": "둔근·삼각근 · 햄스트링·코어",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "ghd-sit-up": {
    "id": "ghd-sit-up",
    "name": "GHD 싯업",
    "target": "복직근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "bear-crawl": {
    "id": "bear-crawl",
    "name": "베어 크롤",
    "target": "코어·어깨 · 대퇴사두",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "crab-walk": {
    "id": "crab-walk",
    "name": "크랩 워크",
    "target": "삼두근·둔근 · 코어",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "rowing-machine": {
    "id": "rowing-machine",
    "name": "로잉 머신",
    "target": "광배근·대퇴사두 · 둔근·이두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "assault-bike": {
    "id": "assault-bike",
    "name": "어썰트 바이크",
    "target": "대퇴사두·삼각근 · 햄스트링",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "ski-erg": {
    "id": "ski-erg",
    "name": "스키 에르그",
    "target": "광배근·삼두근 · 코어",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "treadmill-running": {
    "id": "treadmill-running",
    "name": "트레드밀 러닝",
    "target": "대퇴사두·비복근 · 햄스트링·둔근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "elliptical-trainer": {
    "id": "elliptical-trainer",
    "name": "일립티컬",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "stair-climber": {
    "id": "stair-climber",
    "name": "스테어 클라이머",
    "target": "둔근·대퇴사두 · 비복근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "dumbbell-external-rotation": {
    "id": "dumbbell-external-rotation",
    "name": "덤벨 익스터널 로테이션",
    "target": "극하근·소원근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "dumbbell-internal-rotation": {
    "id": "dumbbell-internal-rotation",
    "name": "덤벨 인터널 로테이션",
    "target": "견갑하근 · 대흉근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "cable-external-rotation": {
    "id": "cable-external-rotation",
    "name": "케이블 익스터널 로테이션",
    "target": "극하근·소원근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "empty-can-raise": {
    "id": "empty-can-raise",
    "name": "엠티 캔 레이즈",
    "target": "극상근 · 측면삼각근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "full-can-raise": {
    "id": "full-can-raise",
    "name": "풀 캔 레이즈",
    "target": "극상근 · 측면삼각근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "scaption": {
    "id": "scaption",
    "name": "스캡션",
    "target": "극상근·삼각근 · 전거근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "band-external-rotation": {
    "id": "band-external-rotation",
    "name": "밴드 익스터널 로테이션",
    "target": "극하근·소원근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "prone-cobra": {
    "id": "prone-cobra",
    "name": "프론 코브라",
    "target": "중하부승모근 · 능형근·후면삼각근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "wall-slide": {
    "id": "wall-slide",
    "name": "월 슬라이드",
    "target": "중하부승모근 · 전거근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "scapular-pull-up": {
    "id": "scapular-pull-up",
    "name": "스캐퓰러 풀업",
    "target": "하부승모근 · 광배근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "clamshell": {
    "id": "clamshell",
    "name": "클램쉘",
    "target": "중둔근 · 대둔근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "fire-hydrant": {
    "id": "fire-hydrant",
    "name": "파이어 하이드런트",
    "target": "중둔근 · 대둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "single-leg-glute-bridge": {
    "id": "single-leg-glute-bridge",
    "name": "싱글 레그 글루트 브릿지",
    "target": "둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "donkey-kick": {
    "id": "donkey-kick",
    "name": "도네키 킥",
    "target": "대둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "cat-cow": {
    "id": "cat-cow",
    "name": "캣 카우",
    "target": "척추기립근 · 복횡근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "child-s-pose": {
    "id": "child-s-pose",
    "name": "차일드 포즈",
    "target": "광배근 · 척추기립근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "calf-stretch": {
    "id": "calf-stretch",
    "name": "카프 스트레치",
    "target": "비복근 · 가자미근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "standing-hamstring-stretch": {
    "id": "standing-hamstring-stretch",
    "name": "스탠딩 햄스트링 스트레치",
    "target": "햄스트링 · 비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "figure-4-stretch": {
    "id": "figure-4-stretch",
    "name": "피겨4 스트레치",
    "target": "둔근 · 이상근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "cobra-stretch": {
    "id": "cobra-stretch",
    "name": "코브라 스트레치",
    "target": "복직근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "downward-dog": {
    "id": "downward-dog",
    "name": "다운독",
    "target": "햄스트링·어깨 · 비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "90-90-hip-stretch": {
    "id": "90-90-hip-stretch",
    "name": "90/90 힙 스트레치",
    "target": "둔근·이상근 · 고관절",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "foam-roller-it-band": {
    "id": "foam-roller-it-band",
    "name": "폼롤러 IT밴드 릴리즈",
    "target": "장경인대 · 대퇴근막장근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "foam-roller-thoracic": {
    "id": "foam-roller-thoracic",
    "name": "폼롤러 흉추 릴리즈",
    "target": "흉추기립근 · 능형근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "hammer-strength-iso-lateral-row": {
    "id": "hammer-strength-iso-lateral-row",
    "name": "해머 스트렝스 아이소레터럴 로우",
    "target": "광배근 · 능형근·이두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "hammer-strength-chest-press": {
    "id": "hammer-strength-chest-press",
    "name": "해머 스트렝스 체스트 프레스",
    "target": "대흉근 · 삼두근·전면삼각근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "hammer-strength-shoulder-press": {
    "id": "hammer-strength-shoulder-press",
    "name": "해머 스트렝스 숄더 프레스",
    "target": "전면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "hammer-strength-pulldown": {
    "id": "hammer-strength-pulldown",
    "name": "해머 스트렝스 풀다운",
    "target": "광배근 · 이두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "hammer-strength-leg-press": {
    "id": "hammer-strength-leg-press",
    "name": "해머 스트렝스 레그 프레스",
    "target": "대퇴사두 · 둔근·햄스트링",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "life-fitness-chest-press": {
    "id": "life-fitness-chest-press",
    "name": "라이프 피트니스 체스트 프레스",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "life-fitness-leg-extension": {
    "id": "life-fitness-leg-extension",
    "name": "라이프 피트니스 레그 익스텐션",
    "target": "대퇴사두",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "technogym-pectoral-machine": {
    "id": "technogym-pectoral-machine",
    "name": "테크노짐 펙토럴 머신",
    "target": "대흉근 · 전면삼각근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "matrix-seated-row": {
    "id": "matrix-seated-row",
    "name": "매트릭스 시티드 로우",
    "target": "광배근 · 능형근·이두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "cybex-leg-press": {
    "id": "cybex-leg-press",
    "name": "사이벡스 레그 프레스",
    "target": "대퇴사두 · 둔근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "pendulum-squat": {
    "id": "pendulum-squat",
    "name": "펜듈럼 스쿼트",
    "target": "대퇴사두 · 둔근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "v-squat-machine": {
    "id": "v-squat-machine",
    "name": "V-스쿼트 머신",
    "target": "대퇴사두 · 둔근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "glute-drive-machine": {
    "id": "glute-drive-machine",
    "name": "글루트 드라이브 머신",
    "target": "대둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "assisted-dip-machine": {
    "id": "assisted-dip-machine",
    "name": "어시스티드 딥 머신",
    "target": "삼두근 · 대흉근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "back-extension-machine": {
    "id": "back-extension-machine",
    "name": "백 익스텐션 머신",
    "target": "척추기립근 · 둔근·햄스트링",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "torso-rotation-machine": {
    "id": "torso-rotation-machine",
    "name": "토르소 로테이션 머신",
    "target": "복사근 · 복직근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "abdominal-crunch-machine": {
    "id": "abdominal-crunch-machine",
    "name": "앱도미널 크런치 머신",
    "target": "복직근 · 복사근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "smith-machine-hip-thrust": {
    "id": "smith-machine-hip-thrust",
    "name": "스미스 머신 힙 쓰러스트",
    "target": "둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "smith"
      }
    ]
  },
  "wide-grip-bench-press": {
    "id": "wide-grip-bench-press",
    "name": "와이드 그립 벤치프레스",
    "target": "대흉근 · 삼두근·전면삼각근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "close-grip-push-up": {
    "id": "close-grip-push-up",
    "name": "클로즈 그립 푸시업",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "wide-push-up": {
    "id": "wide-push-up",
    "name": "와이드 푸시업",
    "target": "대흉근 · 전면삼각근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "archer-push-up": {
    "id": "archer-push-up",
    "name": "아처 푸시업",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "spider-man-push-up": {
    "id": "spider-man-push-up",
    "name": "스파이더맨 푸시업",
    "target": "대흉근 · 코어·삼두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "high-cable-fly": {
    "id": "high-cable-fly",
    "name": "하이 케이블 플라이",
    "target": "대흉근 하부 · 전면삼각근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "single-arm-cable-crossover": {
    "id": "single-arm-cable-crossover",
    "name": "싱글 암 케이블 크로스오버",
    "target": "대흉근 · 전면삼각근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "smith-machine-incline-press": {
    "id": "smith-machine-incline-press",
    "name": "스미스 머신 인클라인 프레스",
    "target": "대흉근 상부 · 삼두근",
    "equipments": [
      {
        "equipment": "smith"
      }
    ]
  },
  "smith-machine-decline-press": {
    "id": "smith-machine-decline-press",
    "name": "스미스 머신 디클라인 프레스",
    "target": "대흉근 하부 · 삼두근",
    "equipments": [
      {
        "equipment": "smith"
      }
    ]
  },
  "incline-machine-chest-press": {
    "id": "incline-machine-chest-press",
    "name": "인클라인 머신 체스트 프레스",
    "target": "대흉근 상부 · 삼두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "single-arm-dumbbell-bench-press": {
    "id": "single-arm-dumbbell-bench-press",
    "name": "싱글 암 덤벨 벤치프레스",
    "target": "대흉근 · 코어·삼두근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "neutral-grip-dumbbell-press": {
    "id": "neutral-grip-dumbbell-press",
    "name": "뉴트럴 그립 덤벨 프레스",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "squeeze-press": {
    "id": "squeeze-press",
    "name": "스쿼즈 프레스",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "decline-dumbbell-fly": {
    "id": "decline-dumbbell-fly",
    "name": "디클라인 덤벨 플라이",
    "target": "대흉근 하부 · 전면삼각근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "wide-grip-barbell-row": {
    "id": "wide-grip-barbell-row",
    "name": "와이드 그립 바벨 로우",
    "target": "광배근·후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "underhand-barbell-row": {
    "id": "underhand-barbell-row",
    "name": "언더핸드 바벨 로우",
    "target": "광배근·이두근 · 능형근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "wide-grip-cable-row": {
    "id": "wide-grip-cable-row",
    "name": "와이드 그립 케이블 로우",
    "target": "광배근·후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "single-arm-cable-row": {
    "id": "single-arm-cable-row",
    "name": "싱글 암 케이블 로우",
    "target": "광배근 · 이두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "neutral-grip-lat-pulldown": {
    "id": "neutral-grip-lat-pulldown",
    "name": "뉴트럴 그립 랫 풀다운",
    "target": "광배근 · 이두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "behind-the-neck-pulldown": {
    "id": "behind-the-neck-pulldown",
    "name": "비하인드 넥 풀다운",
    "target": "광배근 상부 · 능형근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "single-arm-lat-pulldown": {
    "id": "single-arm-lat-pulldown",
    "name": "싱글 암 랫 풀다운",
    "target": "광배근 · 이두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "cable-pullover": {
    "id": "cable-pullover",
    "name": "케이블 풀오버",
    "target": "광배근 · 대원근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "machine-pullover": {
    "id": "machine-pullover",
    "name": "머신 풀오버",
    "target": "광배근 · 대원근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "incline-bench-dumbbell-row": {
    "id": "incline-bench-dumbbell-row",
    "name": "인클라인 벤치 덤벨 로우",
    "target": "능형근·광배근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "smith-machine-bent-over-row": {
    "id": "smith-machine-bent-over-row",
    "name": "스미스 머신 벤트오버 로우",
    "target": "광배근·능형근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "smith"
      }
    ]
  },
  "deficit-deadlift": {
    "id": "deficit-deadlift",
    "name": "데피싯 데드리프트",
    "target": "척추기립근·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "block-pull": {
    "id": "block-pull",
    "name": "블록 풀",
    "target": "척추기립근·승모근 · 둔근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "behind-the-back-shrug": {
    "id": "behind-the-back-shrug",
    "name": "비하인드 백 슈러그",
    "target": "상부승모근 · 전완근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "cable-shrug": {
    "id": "cable-shrug",
    "name": "케이블 슈러그",
    "target": "상부승모근 · 전완근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "single-arm-machine-row": {
    "id": "single-arm-machine-row",
    "name": "싱글 암 머신 로우",
    "target": "광배근 · 이두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "assisted-chin-up": {
    "id": "assisted-chin-up",
    "name": "어시스티드 친업",
    "target": "광배근·이두근 · 능형근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "close-neutral-grip-seated-row": {
    "id": "close-neutral-grip-seated-row",
    "name": "클로즈 뉴트럴 그립 시티드 로우",
    "target": "광배근 하부 · 이두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "single-arm-dumbbell-shoulder-press": {
    "id": "single-arm-dumbbell-shoulder-press",
    "name": "싱글 암 덤벨 숄더 프레스",
    "target": "전면삼각근 · 코어·삼두근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "seated-barbell-overhead-press": {
    "id": "seated-barbell-overhead-press",
    "name": "시티드 바벨 오버헤드 프레스",
    "target": "전면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "seated-dumbbell-shoulder-press": {
    "id": "seated-dumbbell-shoulder-press",
    "name": "시티드 덤벨 숄더 프레스",
    "target": "전면·측면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "leaning-cable-lateral-raise": {
    "id": "leaning-cable-lateral-raise",
    "name": "리닝 케이블 레터럴 레이즈",
    "target": "측면삼각근 · 상부승모근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "lying-side-lateral-raise": {
    "id": "lying-side-lateral-raise",
    "name": "라잉 사이드 레터럴 레이즈",
    "target": "측면삼각근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "cable-y-raise": {
    "id": "cable-y-raise",
    "name": "케이블 Y 레이즈",
    "target": "측면·후면삼각근 · 하부승모근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "incline-rear-delt-raise": {
    "id": "incline-rear-delt-raise",
    "name": "인클라인 리어 델트 레이즈",
    "target": "후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "seated-bent-over-lateral-raise": {
    "id": "seated-bent-over-lateral-raise",
    "name": "시티드 벤트오버 레터럴 레이즈",
    "target": "후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "kettlebell-bottoms-up-press": {
    "id": "kettlebell-bottoms-up-press",
    "name": "케틀벨 보텀업 프레스",
    "target": "전면삼각근 · 코어·전완근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "z-press": {
    "id": "z-press",
    "name": "Z 프레스",
    "target": "전면삼각근 · 코어·삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "bradford-press": {
    "id": "bradford-press",
    "name": "브래드포드 프레스",
    "target": "전면·측면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "cuban-press": {
    "id": "cuban-press",
    "name": "쿠반 프레스",
    "target": "후면삼각근·회전근개 · 승모근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "plate-around-the-world": {
    "id": "plate-around-the-world",
    "name": "플레이트 어라운드 더 월드",
    "target": "전면·측면삼각근 · 코어",
    "equipments": [
      {
        "equipment": "plate"
      }
    ]
  },
  "single-arm-cable-lateral-raise": {
    "id": "single-arm-cable-lateral-raise",
    "name": "싱글 암 케이블 레터럴 레이즈",
    "target": "측면삼각근 · 상부승모근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "dumbbell-push-press": {
    "id": "dumbbell-push-press",
    "name": "덤벨 푸시 프레스",
    "target": "전면삼각근·대퇴사두 · 삼두근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "wide-grip-barbell-curl": {
    "id": "wide-grip-barbell-curl",
    "name": "와이드 그립 바벨 컬",
    "target": "이두근 단두 · 전완근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "close-grip-barbell-curl": {
    "id": "close-grip-barbell-curl",
    "name": "클로즈 그립 바벨 컬",
    "target": "이두근 장두 · 전완근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "cable-ez-bar-curl": {
    "id": "cable-ez-bar-curl",
    "name": "케이블 EZ바 컬",
    "target": "이두근 · 전완근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "single-arm-cable-curl": {
    "id": "single-arm-cable-curl",
    "name": "싱글 암 케이블 컬",
    "target": "이두근 · 전완근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "high-cable-curl": {
    "id": "high-cable-curl",
    "name": "하이 케이블 컬",
    "target": "이두근 장두 · 전완근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "machine-biceps-curl": {
    "id": "machine-biceps-curl",
    "name": "머신 비셉스 컬",
    "target": "이두근 · 전완근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "cross-body-hammer-curl": {
    "id": "cross-body-hammer-curl",
    "name": "크로스 바디 해머 컬",
    "target": "이두근·상완근 · 전완근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "seated-dumbbell-curl": {
    "id": "seated-dumbbell-curl",
    "name": "시티드 덤벨 컬",
    "target": "이두근 · 전완근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "reverse-ez-bar-curl": {
    "id": "reverse-ez-bar-curl",
    "name": "리버스 EZ바 컬",
    "target": "상완요골근·전완근 · 이두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "cable-preacher-curl": {
    "id": "cable-preacher-curl",
    "name": "케이블 프리처 컬",
    "target": "이두근 단두 · 전완근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "close-grip-pushdown": {
    "id": "close-grip-pushdown",
    "name": "클로즈 그립 푸시다운",
    "target": "삼두근 내측두",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "single-arm-cable-pushdown": {
    "id": "single-arm-cable-pushdown",
    "name": "싱글 암 케이블 푸시다운",
    "target": "삼두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "v-bar-pushdown": {
    "id": "v-bar-pushdown",
    "name": "V바 푸시다운",
    "target": "삼두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "incline-dumbbell-triceps-extension": {
    "id": "incline-dumbbell-triceps-extension",
    "name": "인클라인 덤벨 트라이셉스 익스텐션",
    "target": "삼두근 장두",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "cable-lying-triceps-extension": {
    "id": "cable-lying-triceps-extension",
    "name": "케이블 라잉 트라이셉스 익스텐션",
    "target": "삼두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "tate-press": {
    "id": "tate-press",
    "name": "테이트 프레스",
    "target": "삼두근 · 대흉근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "close-grip-dumbbell-floor-press": {
    "id": "close-grip-dumbbell-floor-press",
    "name": "클로즈 그립 덤벨 플로어 프레스",
    "target": "삼두근 · 대흉근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "incline-cable-curl": {
    "id": "incline-cable-curl",
    "name": "인클라인 케이블 컬",
    "target": "이두근 장두 · 전완근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "band-overhead-triceps-extension": {
    "id": "band-overhead-triceps-extension",
    "name": "밴드 오버헤드 트라이셉스 익스텐션",
    "target": "삼두근 장두",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "barbell-wrist-curl": {
    "id": "barbell-wrist-curl",
    "name": "바벨 리스트 컬",
    "target": "전완 굴근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "pause-squat": {
    "id": "pause-squat",
    "name": "포즈 스쿼트",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "tempo-squat": {
    "id": "tempo-squat",
    "name": "템포 스쿼트",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "safety-bar-squat": {
    "id": "safety-bar-squat",
    "name": "세이프티 바 스쿼트",
    "target": "대퇴사두·둔근 · 척추기립근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "wide-stance-leg-press": {
    "id": "wide-stance-leg-press",
    "name": "와이드 스탠스 레그 프레스",
    "target": "둔근·내전근 · 대퇴사두",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "close-stance-leg-press": {
    "id": "close-stance-leg-press",
    "name": "클로즈 스탠스 레그 프레스",
    "target": "대퇴사두 · 둔근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "single-leg-leg-press-2": {
    "id": "single-leg-leg-press-2",
    "name": "싱글 레그 레그 프레스",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "single-leg-extension": {
    "id": "single-leg-extension",
    "name": "싱글 레그 익스텐션",
    "target": "대퇴사두",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "single-leg-curl": {
    "id": "single-leg-curl",
    "name": "싱글 레그 컬",
    "target": "햄스트링 · 비복근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "standing-single-leg-curl": {
    "id": "standing-single-leg-curl",
    "name": "스탠딩 싱글 레그 컬",
    "target": "햄스트링 · 비복근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "dumbbell-romanian-deadlift": {
    "id": "dumbbell-romanian-deadlift",
    "name": "덤벨 루마니안 데드리프트",
    "target": "햄스트링·둔근 · 척추기립근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "single-leg-romanian-deadlift": {
    "id": "single-leg-romanian-deadlift",
    "name": "싱글 레그 루마니안 데드리프트",
    "target": "햄스트링·둔근 · 코어",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "reverse-lunge": {
    "id": "reverse-lunge",
    "name": "리버스 런지",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "side-lunge": {
    "id": "side-lunge",
    "name": "사이드 런지",
    "target": "내전근·둔근 · 대퇴사두",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "dumbbell-step-down": {
    "id": "dumbbell-step-down",
    "name": "덤벨 스텝다운",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "split-squat": {
    "id": "split-squat",
    "name": "스플릿 스쿼트",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "landmine-squat": {
    "id": "landmine-squat",
    "name": "랜드마인 스쿼트",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "landmine"
      }
    ]
  },
  "single-leg-calf-raise": {
    "id": "single-leg-calf-raise",
    "name": "싱글 레그 카프 레이즈",
    "target": "비복근 · 가자미근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "decline-crunch": {
    "id": "decline-crunch",
    "name": "디클라인 크런치",
    "target": "복직근 상부 · 복사근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "low-to-high-cable-chop": {
    "id": "low-to-high-cable-chop",
    "name": "로우 투 하이 케이블 찹",
    "target": "복사근 · 복직근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "hanging-windshield-wiper": {
    "id": "hanging-windshield-wiper",
    "name": "행잉 윈드쉴드 와이퍼",
    "target": "복사근·복직근 · 광배근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "dumbbell-side-bend": {
    "id": "dumbbell-side-bend",
    "name": "덤벨 사이드 벤드",
    "target": "복사근 · 요방형근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "cable-side-bend": {
    "id": "cable-side-bend",
    "name": "케이블 사이드 벤드",
    "target": "복사근 · 요방형근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "toe-touch-crunch": {
    "id": "toe-touch-crunch",
    "name": "토 터치 크런치",
    "target": "복직근 상부",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "flutter-kick": {
    "id": "flutter-kick",
    "name": "플러터 킥",
    "target": "복직근 하부 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "scissor-kick": {
    "id": "scissor-kick",
    "name": "시저 킥",
    "target": "복직근 하부 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "hollow-rock": {
    "id": "hollow-rock",
    "name": "할로우 락",
    "target": "복직근·복횡근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "l-sit": {
    "id": "l-sit",
    "name": "L 싯",
    "target": "복직근 · 고관절굴근·삼두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "hanging-oblique-raise": {
    "id": "hanging-oblique-raise",
    "name": "행잉 오블리크 레이즈",
    "target": "복사근 · 복직근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "standing-cable-crunch": {
    "id": "standing-cable-crunch",
    "name": "스탠딩 케이블 크런치",
    "target": "복직근 · 복사근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "machine-hip-thrust": {
    "id": "machine-hip-thrust",
    "name": "머신 힙 쓰러스트",
    "target": "대둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "single-leg-hip-thrust": {
    "id": "single-leg-hip-thrust",
    "name": "싱글 레그 힙 쓰러스트",
    "target": "대둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "band-hip-thrust": {
    "id": "band-hip-thrust",
    "name": "밴드 힙 쓰러스트",
    "target": "대둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "frog-pump": {
    "id": "frog-pump",
    "name": "프로그 펌프",
    "target": "대둔근 · 내전근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "glute-bridge-march": {
    "id": "glute-bridge-march",
    "name": "글루트 브릿지 마치",
    "target": "대둔근 · 코어",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "cable-hip-extension": {
    "id": "cable-hip-extension",
    "name": "케이블 힙 익스텐션",
    "target": "대둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "kettlebell-sumo-deadlift": {
    "id": "kettlebell-sumo-deadlift",
    "name": "케틀벨 스모 데드리프트",
    "target": "둔근·내전근 · 햄스트링",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "dumbbell-deadlift": {
    "id": "dumbbell-deadlift",
    "name": "덤벨 데드리프트",
    "target": "둔근·햄스트링 · 척추기립근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "trap-bar-squat": {
    "id": "trap-bar-squat",
    "name": "트랩바 스쿼트",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "smith-machine-split-squat": {
    "id": "smith-machine-split-squat",
    "name": "스미스 머신 스플릿 스쿼트",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "smith"
      }
    ]
  },
  "kettlebell-lunge": {
    "id": "kettlebell-lunge",
    "name": "케틀벨 런지",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "step-up-with-knee-drive": {
    "id": "step-up-with-knee-drive",
    "name": "스텝업 윗 니 드라이브",
    "target": "대퇴사두·둔근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "side-lying-hip-abduction": {
    "id": "side-lying-hip-abduction",
    "name": "사이드 라잉 힙 어브덕션",
    "target": "중둔근 · 대둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "copenhagen-plank": {
    "id": "copenhagen-plank",
    "name": "코펜하겐 플랭크",
    "target": "내전근 · 코어",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "calf-press-machine": {
    "id": "calf-press-machine",
    "name": "카프 프레스 머신",
    "target": "비복근 · 가자미근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "single-leg-calf-press": {
    "id": "single-leg-calf-press",
    "name": "싱글 레그 카프 프레스",
    "target": "비복근 · 가자미근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "standing-toe-raise": {
    "id": "standing-toe-raise",
    "name": "스탠딩 토 레이즈",
    "target": "전경골근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "seated-toe-raise": {
    "id": "seated-toe-raise",
    "name": "시티드 토 레이즈",
    "target": "전경골근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "band-toe-raise": {
    "id": "band-toe-raise",
    "name": "밴드 토 레이즈",
    "target": "전경골근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "neck-extension": {
    "id": "neck-extension",
    "name": "넥 익스텐션",
    "target": "경판상근 · 승모근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "neck-flexion": {
    "id": "neck-flexion",
    "name": "넥 플렉션",
    "target": "흉쇄유돌근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "neck-lateral-flexion": {
    "id": "neck-lateral-flexion",
    "name": "넥 레터럴 플렉션",
    "target": "흉쇄유돌근 · 사각근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "neck-harness-extension": {
    "id": "neck-harness-extension",
    "name": "넥 하니스 익스텐션",
    "target": "경판상근 · 승모근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "plate-neck-extension": {
    "id": "plate-neck-extension",
    "name": "플레이트 넥 익스텐션",
    "target": "경판상근 · 승모근",
    "equipments": [
      {
        "equipment": "plate"
      }
    ]
  },
  "prone-y-raise": {
    "id": "prone-y-raise",
    "name": "프론 Y 레이즈",
    "target": "하부승모근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "prone-t-raise": {
    "id": "prone-t-raise",
    "name": "프론 T 레이즈",
    "target": "중부승모근 · 능형근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "prone-w-raise": {
    "id": "prone-w-raise",
    "name": "프론 W 레이즈",
    "target": "중하부승모근 · 능형근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "prone-l-raise": {
    "id": "prone-l-raise",
    "name": "프론 L 레이즈",
    "target": "극하근·소원근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "band-internal-rotation": {
    "id": "band-internal-rotation",
    "name": "밴드 인터널 로테이션",
    "target": "견갑하근 · 대흉근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "side-lying-external-rotation": {
    "id": "side-lying-external-rotation",
    "name": "사이드 라잉 익스터널 로테이션",
    "target": "극하근·소원근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "90-degree-external-rotation": {
    "id": "90-degree-external-rotation",
    "name": "90도 익스터널 로테이션",
    "target": "극하근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "standing-band-row": {
    "id": "standing-band-row",
    "name": "스탠딩 밴드 로우",
    "target": "능형근 · 중부승모근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "dead-hang": {
    "id": "dead-hang",
    "name": "데드 행",
    "target": "전완 굴근 · 광배근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "towel-pull-up": {
    "id": "towel-pull-up",
    "name": "타월 풀업",
    "target": "전완근·광배근 · 이두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "grip-crusher": {
    "id": "grip-crusher",
    "name": "그립 크러셔",
    "target": "전완 굴근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "cable-reverse-curl": {
    "id": "cable-reverse-curl",
    "name": "케이블 리버스 컬",
    "target": "상완요골근 · 이두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "wrist-extension-machine": {
    "id": "wrist-extension-machine",
    "name": "리스트 익스텐션 머신",
    "target": "전완 신근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "pinch-grip-deadlift": {
    "id": "pinch-grip-deadlift",
    "name": "핀치 그립 데드리프트",
    "target": "전완 굴근 · 승모근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "standing-cable-chest-press": {
    "id": "standing-cable-chest-press",
    "name": "스탠딩 케이블 체스트 프레스",
    "target": "대흉근 · 삼두근·코어",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "cable-incline-press": {
    "id": "cable-incline-press",
    "name": "케이블 인클라인 프레스",
    "target": "대흉근 상부 · 삼두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "cable-decline-press": {
    "id": "cable-decline-press",
    "name": "케이블 디클라인 프레스",
    "target": "대흉근 하부 · 삼두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "single-arm-cable-chest-press": {
    "id": "single-arm-cable-chest-press",
    "name": "싱글 암 케이블 체스트 프레스",
    "target": "대흉근 · 코어·삼두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "high-to-low-cable-chop": {
    "id": "high-to-low-cable-chop",
    "name": "하이 투 로우 케이블 찹",
    "target": "복사근 · 복직근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "standing-cable-reverse-fly": {
    "id": "standing-cable-reverse-fly",
    "name": "스탠딩 케이블 리버스 플라이",
    "target": "후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "single-arm-cable-front-raise": {
    "id": "single-arm-cable-front-raise",
    "name": "싱글 암 케이블 프론트 레이즈",
    "target": "전면삼각근 · 상부승모근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "behind-the-back-cable-shrug": {
    "id": "behind-the-back-cable-shrug",
    "name": "비하인드 백 케이블 슈러그",
    "target": "상부승모근 · 전완근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "wall-sit": {
    "id": "wall-sit",
    "name": "월 싯",
    "target": "대퇴사두 · 둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "plank-up-down": {
    "id": "plank-up-down",
    "name": "플랭크 업다운",
    "target": "복직근·복횡근 · 삼두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "side-plank-hip-raise": {
    "id": "side-plank-hip-raise",
    "name": "사이드 플랭크 힙 레이즈",
    "target": "복사근 · 중둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "rkc-plank": {
    "id": "rkc-plank",
    "name": "RKC 플랭크",
    "target": "복직근·복횡근 · 둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "superman": {
    "id": "superman",
    "name": "슈퍼맨",
    "target": "척추기립근 · 둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "reverse-hyperextension": {
    "id": "reverse-hyperextension",
    "name": "리버스 하이퍼익스텐션",
    "target": "둔근·척추기립근 · 햄스트링",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "45-degree-hyperextension": {
    "id": "45-degree-hyperextension",
    "name": "45도 하이퍼익스텐션",
    "target": "척추기립근 · 둔근·햄스트링",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "ghd-back-extension": {
    "id": "ghd-back-extension",
    "name": "GHD 백 익스텐션",
    "target": "척추기립근 · 둔근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "plank-shoulder-tap": {
    "id": "plank-shoulder-tap",
    "name": "플랭크 숄더 탭",
    "target": "복직근·복횡근 · 어깨",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "bear-plank": {
    "id": "bear-plank",
    "name": "베어 플랭크",
    "target": "복직근 · 어깨·대퇴사두",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "kettlebell-high-pull": {
    "id": "kettlebell-high-pull",
    "name": "케틀벨 하이 풀",
    "target": "측면삼각근·승모근 · 둔근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "kettlebell-clean-and-press": {
    "id": "kettlebell-clean-and-press",
    "name": "케틀벨 클린 앤 프레스",
    "target": "둔근·삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "double-kettlebell-front-squat": {
    "id": "double-kettlebell-front-squat",
    "name": "더블 케틀벨 프론트 스쿼트",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "kettlebell-seesaw-press": {
    "id": "kettlebell-seesaw-press",
    "name": "케틀벨 시소 프레스",
    "target": "전면삼각근 · 코어",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "single-arm-kettlebell-swing": {
    "id": "single-arm-kettlebell-swing",
    "name": "싱글 암 케틀벨 스윙",
    "target": "둔근·햄스트링 · 코어",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "kettlebell-renegade-row": {
    "id": "kettlebell-renegade-row",
    "name": "케틀벨 렌리게이드 로우",
    "target": "광배근·코어 · 후면삼각근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "kettlebell-halo": {
    "id": "kettlebell-halo",
    "name": "케틀벨 핼로",
    "target": "삼각근·회전근개 · 코어",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "kettlebell-figure-8": {
    "id": "kettlebell-figure-8",
    "name": "케틀벨 피겨 8",
    "target": "복사근·둔근 · 전완근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "band-chest-press": {
    "id": "band-chest-press",
    "name": "밴드 체스트 프레스",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "band-row": {
    "id": "band-row",
    "name": "밴드 로우",
    "target": "광배근·능형근 · 이두근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "band-pulldown": {
    "id": "band-pulldown",
    "name": "밴드 풀다운",
    "target": "광배근 · 이두근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "band-shoulder-press": {
    "id": "band-shoulder-press",
    "name": "밴드 숄더 프레스",
    "target": "전면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "band-squat": {
    "id": "band-squat",
    "name": "밴드 스쿼트",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "band-deadlift": {
    "id": "band-deadlift",
    "name": "밴드 데드리프트",
    "target": "둔근·햄스트링 · 척추기립근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "band-woodchopper": {
    "id": "band-woodchopper",
    "name": "밴드 우드찹",
    "target": "복사근 · 복직근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "band-pull-through": {
    "id": "band-pull-through",
    "name": "밴드 풀스루",
    "target": "둔근·햄스트링 · 척추기립근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "hammer-strength-decline-press": {
    "id": "hammer-strength-decline-press",
    "name": "해머 스트렝스 디클라인 프레스",
    "target": "대흉근 하부 · 삼두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "hammer-strength-iso-lateral-incline-press": {
    "id": "hammer-strength-iso-lateral-incline-press",
    "name": "해머 스트렝스 아이소레터럴 인클라인 프레스",
    "target": "대흉근 상부 · 삼두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "hammer-strength-low-row": {
    "id": "hammer-strength-low-row",
    "name": "해머 스트렝스 로우 로우",
    "target": "광배근 하부 · 이두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "life-fitness-shoulder-press": {
    "id": "life-fitness-shoulder-press",
    "name": "라이프 피트니스 숄더 프레스",
    "target": "전면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "life-fitness-leg-curl": {
    "id": "life-fitness-leg-curl",
    "name": "라이프 피트니스 레그 컬",
    "target": "햄스트링 · 비복근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "life-fitness-lat-pulldown": {
    "id": "life-fitness-lat-pulldown",
    "name": "라이프 피트니스 랫 풀다운",
    "target": "광배근 · 이두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "technogym-leg-press": {
    "id": "technogym-leg-press",
    "name": "테크노짐 레그 프레스",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "technogym-shoulder-press": {
    "id": "technogym-shoulder-press",
    "name": "테크노짐 숄더 프레스",
    "target": "전면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "matrix-leg-extension": {
    "id": "matrix-leg-extension",
    "name": "매트릭스 레그 익스텐션",
    "target": "대퇴사두",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "matrix-chest-press": {
    "id": "matrix-chest-press",
    "name": "매트릭스 체스트 프레스",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "cybex-arc-trainer": {
    "id": "cybex-arc-trainer",
    "name": "사이벡스 아크 트레이너",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "nautilus-leg-extension": {
    "id": "nautilus-leg-extension",
    "name": "너스 머신 레그 익스텐션",
    "target": "대퇴사두",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "precor-machine-row": {
    "id": "precor-machine-row",
    "name": "프리코 머신 로우",
    "target": "광배근·능형근 · 이두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "landmine-180": {
    "id": "landmine-180",
    "name": "랜드마인 180",
    "target": "복사근 · 어깨",
    "equipments": [
      {
        "equipment": "landmine"
      }
    ]
  },
  "landmine-deadlift": {
    "id": "landmine-deadlift",
    "name": "랜드마인 데드리프트",
    "target": "둔근·햄스트링 · 척추기립근",
    "equipments": [
      {
        "equipment": "landmine"
      }
    ]
  },
  "landmine-seesaw-press": {
    "id": "landmine-seesaw-press",
    "name": "랜드마인 시소 프레스",
    "target": "전면삼각근 · 코어·삼두근",
    "equipments": [
      {
        "equipment": "landmine"
      }
    ]
  },
  "landmine-lunge": {
    "id": "landmine-lunge",
    "name": "랜드마인 런지",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "landmine"
      }
    ]
  },
  "zombie-squat": {
    "id": "zombie-squat",
    "name": "좀비 스쿼트",
    "target": "대퇴사두 · 코어",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "spanish-squat": {
    "id": "spanish-squat",
    "name": "스파니쉬 스쿼트",
    "target": "대퇴사두",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "stability-ball-pike": {
    "id": "stability-ball-pike",
    "name": "짐볼 파이크",
    "target": "복직근 · 어깨",
    "equipments": [
      {
        "equipment": "ball"
      }
    ]
  },
  "stability-ball-rollout": {
    "id": "stability-ball-rollout",
    "name": "짐볼 롤아웃",
    "target": "복직근·복횡근 · 광배근",
    "equipments": [
      {
        "equipment": "ball"
      }
    ]
  },
  "slider-mountain-climber": {
    "id": "slider-mountain-climber",
    "name": "슬라이더 마운틴 클라이머",
    "target": "복직근 · 어깨",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "slider-hamstring-curl": {
    "id": "slider-hamstring-curl",
    "name": "슬라이더 햄스트링 컬",
    "target": "햄스트링 · 둔근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "slider-reverse-lunge": {
    "id": "slider-reverse-lunge",
    "name": "슬라이더 리버스 런지",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "bosu-push-up": {
    "id": "bosu-push-up",
    "name": "보수 푸시업",
    "target": "대흉근 · 삼두근·코어",
    "equipments": [
      {
        "equipment": "bosu"
      }
    ]
  },
  "bosu-plank": {
    "id": "bosu-plank",
    "name": "보수 플랭크",
    "target": "복직근·복횡근 · 어깨",
    "equipments": [
      {
        "equipment": "bosu"
      }
    ]
  },
  "medicine-ball-woodchop": {
    "id": "medicine-ball-woodchop",
    "name": "메디신볼 우드찹",
    "target": "복사근 · 복직근",
    "equipments": [
      {
        "equipment": "medicineball"
      }
    ]
  },
  "medicine-ball-v-up": {
    "id": "medicine-ball-v-up",
    "name": "메디신볼 V업",
    "target": "복직근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "medicineball"
      }
    ]
  },
  "board-press": {
    "id": "board-press",
    "name": "보드 프레스",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "pin-press": {
    "id": "pin-press",
    "name": "핀 프레스",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "spoto-press": {
    "id": "spoto-press",
    "name": "스포토 프레스",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "larsen-press": {
    "id": "larsen-press",
    "name": "라센 프레스",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "slingshot-bench-press": {
    "id": "slingshot-bench-press",
    "name": "슬링샷 벤치프레스",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "pin-squat": {
    "id": "pin-squat",
    "name": "핀 스쿼트",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "safety-bar-good-morning": {
    "id": "safety-bar-good-morning",
    "name": "안전바 굿모닝",
    "target": "척추기립근·햄스트링 · 둔근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "chain-bench-press": {
    "id": "chain-bench-press",
    "name": "체인 벤치프레스",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "banded-bench-press": {
    "id": "banded-bench-press",
    "name": "밴드 벤치프레스",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "close-grip-floor-press": {
    "id": "close-grip-floor-press",
    "name": "클로즈 그립 플로어 프레스",
    "target": "삼두근 · 대흉근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "planche": {
    "id": "planche",
    "name": "플란체",
    "target": "어깨·코어 · 대흉근·전완근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "planche-lean": {
    "id": "planche-lean",
    "name": "플란체 리닝",
    "target": "어깨 · 코어·전완근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "front-lever": {
    "id": "front-lever",
    "name": "프론트 레버",
    "target": "광배근·코어 · 후면삼각근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "back-lever": {
    "id": "back-lever",
    "name": "백 레버",
    "target": "광배근·대흉근 · 이두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "human-flag": {
    "id": "human-flag",
    "name": "휴먼 플래그",
    "target": "광배근·코어 · 어깨",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "handstand-hold": {
    "id": "handstand-hold",
    "name": "핸드스탠드 홀드",
    "target": "삼각근 · 코어·전완근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "pike-push-up": {
    "id": "pike-push-up",
    "name": "파이크 푸시업",
    "target": "전면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "korean-dip": {
    "id": "korean-dip",
    "name": "코리안 딥스",
    "target": "삼두근 · 대흉근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "archer-pull-up": {
    "id": "archer-pull-up",
    "name": "아처 풀업",
    "target": "광배근 · 이두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "commando-pull-up": {
    "id": "commando-pull-up",
    "name": "커맨도 풀업",
    "target": "광배근·이두근 · 능형근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "explosive-pull-up": {
    "id": "explosive-pull-up",
    "name": "익스플로시브 풀업",
    "target": "광배근 · 이두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "negative-pull-up": {
    "id": "negative-pull-up",
    "name": "네거티브 풀업",
    "target": "광배근 · 이두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "warrior-i-pose": {
    "id": "warrior-i-pose",
    "name": "워리어 1 포즈",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "warrior-ii-pose": {
    "id": "warrior-ii-pose",
    "name": "워리어 2 포즈",
    "target": "대퇴사두·둔근 · 어깨",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "warrior-iii-pose": {
    "id": "warrior-iii-pose",
    "name": "워리어 3 포즈",
    "target": "둔근·햄스트링 · 코어",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "tree-pose": {
    "id": "tree-pose",
    "name": "트리 포즈",
    "target": "둔근 · 발목안정근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "chair-pose": {
    "id": "chair-pose",
    "name": "체어 포즈",
    "target": "대퇴사두 · 둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "boat-pose": {
    "id": "boat-pose",
    "name": "보트 포즈",
    "target": "복직근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "bridge-pose": {
    "id": "bridge-pose",
    "name": "브릿지 포즈",
    "target": "둔근 · 햄스트링·척추기립근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "pigeon-pose": {
    "id": "pigeon-pose",
    "name": "비둘기 포즈",
    "target": "둔근·이상근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "upward-facing-dog": {
    "id": "upward-facing-dog",
    "name": "업워드 독",
    "target": "척추기립근 · 대흉근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "triangle-pose": {
    "id": "triangle-pose",
    "name": "트라이앵글 포즈",
    "target": "복사근 · 햄스트링",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "camel-pose": {
    "id": "camel-pose",
    "name": "캐멀 포즈",
    "target": "복직근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "pilates-hundred": {
    "id": "pilates-hundred",
    "name": "필라테스 헌드레드",
    "target": "복직근 · 복횡근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "pilates-roll-up": {
    "id": "pilates-roll-up",
    "name": "필라테스 롤업",
    "target": "복직근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "sprint": {
    "id": "sprint",
    "name": "스프린트",
    "target": "대퇴사두·둔근 · 햄스트링·비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "hill-sprint": {
    "id": "hill-sprint",
    "name": "힐 스프린트",
    "target": "둔근·대퇴사두 · 햄스트링·비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "shuttle-run": {
    "id": "shuttle-run",
    "name": "셔틀 런",
    "target": "대퇴사두·둔근 · 비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "high-knees": {
    "id": "high-knees",
    "name": "하이 니",
    "target": "고관절굴근 · 대퇴사두·코어",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "butt-kicks": {
    "id": "butt-kicks",
    "name": "버트 킥",
    "target": "햄스트링 · 비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "jumping-jack": {
    "id": "jumping-jack",
    "name": "점핑 잭",
    "target": "삼각근·둔근 · 비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "prowler-sprint": {
    "id": "prowler-sprint",
    "name": "프라울러 스프린트",
    "target": "대퇴사두·둔근 · 비복근",
    "equipments": [
      {
        "equipment": "sled"
      }
    ]
  },
  "sled-row": {
    "id": "sled-row",
    "name": "슬레드 로우",
    "target": "광배근 · 능형근·이두근",
    "equipments": [
      {
        "equipment": "sled"
      }
    ]
  },
  "battle-rope-slam": {
    "id": "battle-rope-slam",
    "name": "배틀로프 슬램",
    "target": "어깨·코어 · 광배근",
    "equipments": [
      {
        "equipment": "battlerope"
      }
    ]
  },
  "battle-rope-alternating-wave": {
    "id": "battle-rope-alternating-wave",
    "name": "배틀로프 얼터네이팅 웨이브",
    "target": "어깨 · 전완근·코어",
    "equipments": [
      {
        "equipment": "battlerope"
      }
    ]
  },
  "kettlebell-jump-squat": {
    "id": "kettlebell-jump-squat",
    "name": "케틀벨 점프 스쿼트",
    "target": "대퇴사두·둔근 · 비복근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "crab-reach": {
    "id": "crab-reach",
    "name": "크랩 리치",
    "target": "둔근·어깨 · 코어",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "scorpion-stretch": {
    "id": "scorpion-stretch",
    "name": "스콜피온 스트레치",
    "target": "복사근 · 척추기립근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "world-s-greatest-stretch": {
    "id": "world-s-greatest-stretch",
    "name": "월드 그레이티스트 스트레치",
    "target": "고관절굴근·흉추 · 햄스트링",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "inchworm": {
    "id": "inchworm",
    "name": "인치웜",
    "target": "햄스트링·코어 · 어깨",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "hip-circle": {
    "id": "hip-circle",
    "name": "힙 서클",
    "target": "고관절 · 둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "leg-swing": {
    "id": "leg-swing",
    "name": "레그 스윙",
    "target": "고관절굴근 · 햄스트링",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "arm-circle": {
    "id": "arm-circle",
    "name": "암 서클",
    "target": "삼각근 · 회전근개",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "thoracic-rotation": {
    "id": "thoracic-rotation",
    "name": "토라식 로테이션",
    "target": "흉추기립근 · 복사근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "supine-spinal-twist": {
    "id": "supine-spinal-twist",
    "name": "수파인 스파인 트위스트",
    "target": "복사근 · 둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "deep-squat-hold": {
    "id": "deep-squat-hold",
    "name": "디프 스쿼트 홀드",
    "target": "고관절·발목 · 대퇴사두",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "couch-stretch": {
    "id": "couch-stretch",
    "name": "카우치 스트레치",
    "target": "고관절굴근 · 대퇴사두",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "butterfly-stretch": {
    "id": "butterfly-stretch",
    "name": "버터플라이 스트레치",
    "target": "내전근 · 고관절",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "pause-bench-press": {
    "id": "pause-bench-press",
    "name": "포즈 벤치프레스",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "tempo-bench-press": {
    "id": "tempo-bench-press",
    "name": "템포 벤치프레스",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "pin-deadlift": {
    "id": "pin-deadlift",
    "name": "핀 데드리프트",
    "target": "척추기립근·둔근 · 승모근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "pause-deadlift": {
    "id": "pause-deadlift",
    "name": "포즈 데드리프트",
    "target": "둔근·햄스트링 · 승모근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "tempo-deadlift": {
    "id": "tempo-deadlift",
    "name": "템포 데드리프트",
    "target": "둔근·햄스트링 · 승모근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "dead-stop-bench-press": {
    "id": "dead-stop-bench-press",
    "name": "데드스탑 벤치프레스",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "decline-skull-crusher": {
    "id": "decline-skull-crusher",
    "name": "디클라인 스컬크러셔",
    "target": "삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "seated-overhead-barbell-extension": {
    "id": "seated-overhead-barbell-extension",
    "name": "시티드 오버헤드 바벨 익스텐션",
    "target": "삼두근 장두",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "cable-spider-curl": {
    "id": "cable-spider-curl",
    "name": "케이블 스파이더 컬",
    "target": "이두근 단두 · 전완근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "incline-hammer-curl": {
    "id": "incline-hammer-curl",
    "name": "인클라인 해머 컬",
    "target": "이두근·상완근 · 전완근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "chest-supported-t-bar-row": {
    "id": "chest-supported-t-bar-row",
    "name": "체스트 서포티드 T바 로우",
    "target": "능형근·광배근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "dead-stop-row": {
    "id": "dead-stop-row",
    "name": "데드스탑 로우",
    "target": "광배근·능형근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "feet-elevated-inverted-row": {
    "id": "feet-elevated-inverted-row",
    "name": "피트 엘리베이티드 인버티드 로우",
    "target": "광배근·능형근 · 이두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "wide-grip-inverted-row": {
    "id": "wide-grip-inverted-row",
    "name": "와이드 그립 인버티드 로우",
    "target": "능형근·후면삼각근 · 광배근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "close-grip-incline-press": {
    "id": "close-grip-incline-press",
    "name": "클로즈 그립 인클라인 프레스",
    "target": "대흉근 상부 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "reverse-grip-bench-press": {
    "id": "reverse-grip-bench-press",
    "name": "리버스 그립 벤치프레스",
    "target": "대흉근 상부 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "dumbbell-floor-press": {
    "id": "dumbbell-floor-press",
    "name": "덤벨 플로어 프레스",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "front-foot-elevated-split-squat": {
    "id": "front-foot-elevated-split-squat",
    "name": "프론트 풋 엘리베이티드 스플릿 스쿼트",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "deficit-reverse-lunge": {
    "id": "deficit-reverse-lunge",
    "name": "데피싯 리버스 런지",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "overhead-lunge": {
    "id": "overhead-lunge",
    "name": "오버헤드 런지",
    "target": "대퇴사두·둔근 · 어깨·코어",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "lateral-step-up": {
    "id": "lateral-step-up",
    "name": "사이드 스텝업",
    "target": "대퇴사두·중둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "crossover-step-up": {
    "id": "crossover-step-up",
    "name": "크로스오버 스텝업",
    "target": "중둔근·대둔근 · 대퇴사두",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "skater-squat": {
    "id": "skater-squat",
    "name": "스케이터 스쿼트",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "goblet-step-up": {
    "id": "goblet-step-up",
    "name": "고블릿 스텝업",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "b-stance-romanian-deadlift": {
    "id": "b-stance-romanian-deadlift",
    "name": "B 스탠스 루마니안 데드리프트",
    "target": "햄스트링·둔근 · 척추기립근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "b-stance-hip-thrust": {
    "id": "b-stance-hip-thrust",
    "name": "B 스탠스 힙 쓰러스트",
    "target": "대둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "kettlebell-single-leg-deadlift": {
    "id": "kettlebell-single-leg-deadlift",
    "name": "케틀벨 싱글 레그 데드리프트",
    "target": "햄스트링·둔근 · 코어",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "heel-elevated-squat": {
    "id": "heel-elevated-squat",
    "name": "힐 엘리베이티드 스쿼트",
    "target": "대퇴사두 · 둔근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "heel-elevated-goblet-squat": {
    "id": "heel-elevated-goblet-squat",
    "name": "힐 엘리베이티드 고블릿 스쿼트",
    "target": "대퇴사두 · 둔근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "prisoner-squat": {
    "id": "prisoner-squat",
    "name": "프리즈너 스쿼트",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "dumbbell-thruster": {
    "id": "dumbbell-thruster",
    "name": "덤벨 쓰러스터",
    "target": "대퇴사두·삼각근 · 둔근·삼두근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "kettlebell-thruster": {
    "id": "kettlebell-thruster",
    "name": "케틀벨 쓰러스터",
    "target": "대퇴사두·삼각근 · 둔근·삼두근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "decline-reverse-crunch": {
    "id": "decline-reverse-crunch",
    "name": "디클라인 리버스 크런치",
    "target": "복직근 하부 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "hanging-knee-raise-twist": {
    "id": "hanging-knee-raise-twist",
    "name": "행잉 니 레이즈 트위스트",
    "target": "복사근·복직근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "captain-s-chair-oblique-raise": {
    "id": "captain-s-chair-oblique-raise",
    "name": "캡틴스 체어 오블리크 레이즈",
    "target": "복사근 · 복직근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "cable-torso-twist": {
    "id": "cable-torso-twist",
    "name": "케이블 토르소 트위스트",
    "target": "복사근 · 복직근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "machine-oblique-crunch": {
    "id": "machine-oblique-crunch",
    "name": "머신 오블리크 크런치",
    "target": "복사근 · 복직근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "v-sit-hold": {
    "id": "v-sit-hold",
    "name": "V 싯 홀드",
    "target": "복직근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "jackknife-sit-up": {
    "id": "jackknife-sit-up",
    "name": "잭나이프 싯업",
    "target": "복직근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "side-medicine-ball-slam": {
    "id": "side-medicine-ball-slam",
    "name": "사이드 메디신볼 슬램",
    "target": "복사근 · 광배근",
    "equipments": [
      {
        "equipment": "medicineball"
      }
    ]
  },
  "decline-twisting-sit-up": {
    "id": "decline-twisting-sit-up",
    "name": "디클라인 트위스팅 싯업",
    "target": "복사근·복직근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "standing-ab-wheel-rollout": {
    "id": "standing-ab-wheel-rollout",
    "name": "스탠딩 앱 휠 롤아웃",
    "target": "복직근·복횡근 · 광배근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "single-arm-machine-chest-press": {
    "id": "single-arm-machine-chest-press",
    "name": "싱글 암 머신 체스트 프레스",
    "target": "대흉근 · 삼두근·코어",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "decline-cable-fly": {
    "id": "decline-cable-fly",
    "name": "디클라인 케이블 플라이",
    "target": "대흉근 하부 · 전면삼각근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "lying-cable-fly": {
    "id": "lying-cable-fly",
    "name": "라잉 케이블 플라이",
    "target": "대흉근 · 전면삼각근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "weighted-dip": {
    "id": "weighted-dip",
    "name": "위티드 딥스",
    "target": "대흉근 하부 · 삼두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "ring-dip": {
    "id": "ring-dip",
    "name": "링 딥스",
    "target": "대흉근 · 삼두근·코어",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "ring-push-up": {
    "id": "ring-push-up",
    "name": "링 푸시업",
    "target": "대흉근 · 삼두근·코어",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "staggered-push-up": {
    "id": "staggered-push-up",
    "name": "스태거드 푸시업",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "incline-squeeze-press": {
    "id": "incline-squeeze-press",
    "name": "인클라인 스쿼즈 프레스",
    "target": "대흉근 상부 · 삼두근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "wide-grip-incline-bench-press": {
    "id": "wide-grip-incline-bench-press",
    "name": "와이드 그립 인클라인 벤치프레스",
    "target": "대흉근 상부 · 전면삼각근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "reverse-grip-incline-press": {
    "id": "reverse-grip-incline-press",
    "name": "리버스 그립 인클라인 프레스",
    "target": "대흉근 상부 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "machine-decline-chest-press": {
    "id": "machine-decline-chest-press",
    "name": "머신 디클라인 체스트 프레스",
    "target": "대흉근 하부 · 삼두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "smith-machine-wide-grip-bench-press": {
    "id": "smith-machine-wide-grip-bench-press",
    "name": "스미스 머신 와이드 그립 벤치프레스",
    "target": "대흉근 · 전면삼각근",
    "equipments": [
      {
        "equipment": "smith"
      }
    ]
  },
  "close-grip-barbell-row": {
    "id": "close-grip-barbell-row",
    "name": "클로즈 그립 바벨 로우",
    "target": "광배근 하부 · 이두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "wide-grip-machine-row": {
    "id": "wide-grip-machine-row",
    "name": "와이드 그립 머신 로우",
    "target": "광배근·후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "neutral-grip-cable-row": {
    "id": "neutral-grip-cable-row",
    "name": "뉴트럴 그립 케이블 로우",
    "target": "광배근 · 이두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "v-bar-lat-pulldown": {
    "id": "v-bar-lat-pulldown",
    "name": "V바 랫 풀다운",
    "target": "광배근 · 이두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "kneeling-cable-face-pull": {
    "id": "kneeling-cable-face-pull",
    "name": "닐링 케이블 페이스 풀",
    "target": "후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "underhand-inverted-row": {
    "id": "underhand-inverted-row",
    "name": "언더핸드 인버티드 로우",
    "target": "광배근·이두근 · 능형근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "dumbbell-dead-stop-row": {
    "id": "dumbbell-dead-stop-row",
    "name": "덤벨 데드스탑 로우",
    "target": "광배근 · 능형근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "helms-row": {
    "id": "helms-row",
    "name": "헬름스 로우",
    "target": "능형근·광배근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "underhand-pendlay-row": {
    "id": "underhand-pendlay-row",
    "name": "언더핸드 펜들레이 로우",
    "target": "광배근·이두근 · 능형근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "trap-bar-row": {
    "id": "trap-bar-row",
    "name": "트랩바 로우",
    "target": "광배근·능형근 · 승모근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "seated-high-row-machine": {
    "id": "seated-high-row-machine",
    "name": "시티드 하이 로우 머신",
    "target": "광배근 상부 · 후면삼각근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "single-arm-straight-arm-pulldown": {
    "id": "single-arm-straight-arm-pulldown",
    "name": "싱글 암 스트레이트암 풀다운",
    "target": "광배근 · 대원근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "incline-dumbbell-pullover": {
    "id": "incline-dumbbell-pullover",
    "name": "인클라인 덤벨 풀오버",
    "target": "광배근 · 대흉근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "wide-grip-pendlay-row": {
    "id": "wide-grip-pendlay-row",
    "name": "와이드 그립 펜들레이 로우",
    "target": "광배근·후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "seated-cable-lateral-raise": {
    "id": "seated-cable-lateral-raise",
    "name": "시티드 케이블 레터럴 레이즈",
    "target": "측면삼각근 · 상부승모근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "incline-cable-lateral-raise": {
    "id": "incline-cable-lateral-raise",
    "name": "인클라인 케이블 레터럴 레이즈",
    "target": "측면삼각근 · 상부승모근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "machine-front-raise": {
    "id": "machine-front-raise",
    "name": "머신 프론트 레이즈",
    "target": "전면삼각근 · 상부승모근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "behind-the-back-cable-lateral-raise": {
    "id": "behind-the-back-cable-lateral-raise",
    "name": "비하인드 백 케이블 레터럴 레이즈",
    "target": "측면삼각근 · 상부승모근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "overhead-pin-press": {
    "id": "overhead-pin-press",
    "name": "오버헤드 핀 프레스",
    "target": "전면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "behind-the-neck-smith-press": {
    "id": "behind-the-neck-smith-press",
    "name": "비하인드 넥 스미스 프레스",
    "target": "측면·후면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "smith"
      }
    ]
  },
  "seated-smith-machine-shoulder-press": {
    "id": "seated-smith-machine-shoulder-press",
    "name": "시티드 스미스 머신 숄더 프레스",
    "target": "전면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "smith"
      }
    ]
  },
  "single-arm-landmine-press": {
    "id": "single-arm-landmine-press",
    "name": "싱글 암 랜드마인 프레스",
    "target": "전면삼각근 · 삼두근·코어",
    "equipments": [
      {
        "equipment": "landmine"
      }
    ]
  },
  "half-kneeling-landmine-press": {
    "id": "half-kneeling-landmine-press",
    "name": "하프 닐링 랜드마인 프레스",
    "target": "전면삼각근 · 코어",
    "equipments": [
      {
        "equipment": "landmine"
      }
    ]
  },
  "dumbbell-6-way-raise": {
    "id": "dumbbell-6-way-raise",
    "name": "덤벨 6-웨이 레이즈",
    "target": "전면·측면·후면삼각근 · 승모근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "barbell-high-pull": {
    "id": "barbell-high-pull",
    "name": "바벨 하이 풀",
    "target": "측면삼각근·승모근 · 둔근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "dumbbell-high-pull": {
    "id": "dumbbell-high-pull",
    "name": "덤벨 하이 풀",
    "target": "측면삼각근·승모근 · 둔근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "snatch-grip-high-pull": {
    "id": "snatch-grip-high-pull",
    "name": "스내치 그립 하이 풀",
    "target": "승모근·삼각근 · 둔근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "seated-dumbbell-lateral-raise": {
    "id": "seated-dumbbell-lateral-raise",
    "name": "시티드 덤벨 레터럴 레이즈",
    "target": "측면삼각근 · 상부승모근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "dumbbell-preacher-curl": {
    "id": "dumbbell-preacher-curl",
    "name": "덤벨 프리처 컬",
    "target": "이두근 단두 · 전완근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "single-arm-preacher-curl": {
    "id": "single-arm-preacher-curl",
    "name": "싱글 암 프리처 컬",
    "target": "이두근 단두 · 전완근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "ez-bar-preacher-curl": {
    "id": "ez-bar-preacher-curl",
    "name": "EZ바 프리처 컬",
    "target": "이두근 단두 · 전완근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "cable-rope-curl": {
    "id": "cable-rope-curl",
    "name": "케이블 로프 컬",
    "target": "이두근 · 전완근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "cable-drag-curl": {
    "id": "cable-drag-curl",
    "name": "케이블 드래그 컬",
    "target": "이두근 장두 · 전완근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "wide-grip-preacher-curl": {
    "id": "wide-grip-preacher-curl",
    "name": "와이드 그립 프리처 컬",
    "target": "이두근 단두 · 전완근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "reverse-preacher-curl": {
    "id": "reverse-preacher-curl",
    "name": "리버스 프리처 컬",
    "target": "상완요골근 · 이두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "machine-hammer-curl": {
    "id": "machine-hammer-curl",
    "name": "머신 해머 컬",
    "target": "이두근·상완근 · 전완근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "wide-grip-cable-curl": {
    "id": "wide-grip-cable-curl",
    "name": "와이드 그립 케이블 컬",
    "target": "이두근 단두 · 전완근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "close-grip-ez-bar-curl": {
    "id": "close-grip-ez-bar-curl",
    "name": "클로즈 그립 EZ바 컬",
    "target": "이두근 장두 · 전완근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "overhead-cable-curl": {
    "id": "overhead-cable-curl",
    "name": "오버헤드 케이블 컬",
    "target": "이두근 장두 · 전완근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "decline-cable-triceps-extension": {
    "id": "decline-cable-triceps-extension",
    "name": "디클라인 케이블 트라이셉스 익스텐션",
    "target": "삼두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "single-arm-overhead-dumbbell-extension": {
    "id": "single-arm-overhead-dumbbell-extension",
    "name": "싱글 암 오버헤드 덤벨 익스텐션",
    "target": "삼두근 장두",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "reverse-grip-triceps-extension": {
    "id": "reverse-grip-triceps-extension",
    "name": "리버스 그립 트라이셉스 익스텐션",
    "target": "삼두근 내측두",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "incline-cable-triceps-extension": {
    "id": "incline-cable-triceps-extension",
    "name": "인클라인 케이블 트라이셉스 익스텐션",
    "target": "삼두근 장두",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "weighted-bench-dip": {
    "id": "weighted-bench-dip",
    "name": "위티드 벤치 딥스",
    "target": "삼두근 · 전면삼각근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "machine-dip": {
    "id": "machine-dip",
    "name": "머신 딥",
    "target": "삼두근 · 대흉근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "single-arm-cable-overhead-extension": {
    "id": "single-arm-cable-overhead-extension",
    "name": "싱글 암 케이블 오버헤드 익스텐션",
    "target": "삼두근 장두",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "barbell-spider-curl": {
    "id": "barbell-spider-curl",
    "name": "바벨 스파이더 컬",
    "target": "이두근 단두 · 전완근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "kettlebell-biceps-curl": {
    "id": "kettlebell-biceps-curl",
    "name": "케틀벨 비셉스 컬",
    "target": "이두근 · 전완근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "pause-front-squat": {
    "id": "pause-front-squat",
    "name": "포즈 프론트 스쿼트",
    "target": "대퇴사두 · 코어·둔근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "tempo-front-squat": {
    "id": "tempo-front-squat",
    "name": "템포 프론트 스쿼트",
    "target": "대퇴사두 · 코어",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "wide-stance-squat": {
    "id": "wide-stance-squat",
    "name": "와이드 스탠스 스쿼트",
    "target": "둔근·내전근 · 대퇴사두",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "close-stance-squat": {
    "id": "close-stance-squat",
    "name": "클로즈 스탠스 스쿼트",
    "target": "대퇴사두 · 둔근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "jumping-split-squat": {
    "id": "jumping-split-squat",
    "name": "점핑 스플릿 스쿼트",
    "target": "대퇴사두·둔근 · 비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "smith-machine-reverse-lunge": {
    "id": "smith-machine-reverse-lunge",
    "name": "스미스 머신 리버스 런지",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "smith"
      }
    ]
  },
  "barbell-walking-lunge": {
    "id": "barbell-walking-lunge",
    "name": "바벨 워킹 런지",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "band-assisted-nordic-curl": {
    "id": "band-assisted-nordic-curl",
    "name": "밴드 어시스티드 노르딕 컬",
    "target": "햄스트링 · 둔근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "cable-leg-curl": {
    "id": "cable-leg-curl",
    "name": "케이블 레그 컬",
    "target": "햄스트링 · 비복근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "standing-cable-hip-adduction": {
    "id": "standing-cable-hip-adduction",
    "name": "스탠딩 케이블 힙 어덕션",
    "target": "내전근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "cossack-squat-2": {
    "id": "cossack-squat-2",
    "name": "코사크 스쿼트",
    "target": "내전근·둔근 · 대퇴사두",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "assisted-sissy-squat": {
    "id": "assisted-sissy-squat",
    "name": "어시스티드 시시 스쿼트",
    "target": "대퇴사두",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "dumbbell-squat": {
    "id": "dumbbell-squat",
    "name": "덤벨 스쿼트",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "barbell-split-squat": {
    "id": "barbell-split-squat",
    "name": "바벨 스플릿 스쿼트",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "single-leg-leg-press-calf-raise": {
    "id": "single-leg-leg-press-calf-raise",
    "name": "싱글 레그 레그프레스 카프 레이즈",
    "target": "비복근 · 가자미근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "dumbbell-standing-calf-raise": {
    "id": "dumbbell-standing-calf-raise",
    "name": "덤벨 스탠딩 카프 레이즈",
    "target": "비복근 · 가자미근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "dumbbell-jump-squat": {
    "id": "dumbbell-jump-squat",
    "name": "덤벨 점프 스쿼트",
    "target": "대퇴사두·둔근 · 비복근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "weighted-box-step-up": {
    "id": "weighted-box-step-up",
    "name": "위티드 박스 스텝업",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "reverse-nordic-curl": {
    "id": "reverse-nordic-curl",
    "name": "리버스 노르딕 컬",
    "target": "대퇴사두 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "single-leg-wall-sit": {
    "id": "single-leg-wall-sit",
    "name": "싱글 레그 월 싯",
    "target": "대퇴사두 · 둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "glute-kickback-machine": {
    "id": "glute-kickback-machine",
    "name": "글루트 킥백 머신",
    "target": "대둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "seated-good-morning": {
    "id": "seated-good-morning",
    "name": "시티드 굿모닝",
    "target": "척추기립근 · 둔근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "barbell-glute-bridge": {
    "id": "barbell-glute-bridge",
    "name": "바벨 글루트 브릿지",
    "target": "대둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "pause-hip-thrust": {
    "id": "pause-hip-thrust",
    "name": "포즈 힙 쓰러스트",
    "target": "대둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "kettlebell-goblet-lunge": {
    "id": "kettlebell-goblet-lunge",
    "name": "케틀벨 고블릿 런지",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "weighted-plank": {
    "id": "weighted-plank",
    "name": "위티드 플랭크",
    "target": "복직근·복횡근 · 어깨",
    "equipments": [
      {
        "equipment": "plate"
      }
    ]
  },
  "weighted-sit-up": {
    "id": "weighted-sit-up",
    "name": "위티드 싯업",
    "target": "복직근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "plate"
      }
    ]
  },
  "weighted-crunch": {
    "id": "weighted-crunch",
    "name": "위티드 크런치",
    "target": "복직근 상부 · 복사근",
    "equipments": [
      {
        "equipment": "plate"
      }
    ]
  },
  "decline-russian-twist": {
    "id": "decline-russian-twist",
    "name": "디클라인 러시안 트위스트",
    "target": "복사근 · 복직근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "kneeling-cable-oblique-crunch": {
    "id": "kneeling-cable-oblique-crunch",
    "name": "닐링 케이블 오블리크 크런치",
    "target": "복사근 · 복직근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "weighted-hanging-leg-raise": {
    "id": "weighted-hanging-leg-raise",
    "name": "위티드 행잉 레그 레이즈",
    "target": "복직근 하부 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "slider-body-saw": {
    "id": "slider-body-saw",
    "name": "슬라이더 바디 쏘",
    "target": "복직근·복횡근 · 어깨",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "body-saw": {
    "id": "body-saw",
    "name": "바디 쏘",
    "target": "복직근·복횡근 · 어깨",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "half-kneeling-pallof-press": {
    "id": "half-kneeling-pallof-press",
    "name": "하프 닐링 팔로프 프레스",
    "target": "복사근·복횡근 · 둔근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "horizontal-cable-chop": {
    "id": "horizontal-cable-chop",
    "name": "호리즌탈 케이블 찹",
    "target": "복사근 · 복직근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "medicine-ball-sit-up": {
    "id": "medicine-ball-sit-up",
    "name": "메디신볼 싯업",
    "target": "복직근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "medicineball"
      }
    ]
  },
  "weighted-dead-bug": {
    "id": "weighted-dead-bug",
    "name": "위티드 데드버그",
    "target": "복횡근·복직근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "lying-windshield-wiper": {
    "id": "lying-windshield-wiper",
    "name": "라잉 윈드쉴드 와이퍼",
    "target": "복사근·복직근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "stir-the-pot": {
    "id": "stir-the-pot",
    "name": "스터 더 팟",
    "target": "복직근·복횡근 · 어깨",
    "equipments": [
      {
        "equipment": "ball"
      }
    ]
  },
  "medicine-ball-toe-touch": {
    "id": "medicine-ball-toe-touch",
    "name": "메디신볼 토 터치",
    "target": "복직근 상부",
    "equipments": [
      {
        "equipment": "medicineball"
      }
    ]
  },
  "single-arm-cable-fly": {
    "id": "single-arm-cable-fly",
    "name": "싱글 암 케이블 플라이",
    "target": "대흉근 · 전면삼각근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "single-arm-low-cable-fly": {
    "id": "single-arm-low-cable-fly",
    "name": "싱글 암 로우 케이블 플라이",
    "target": "대흉근 상부 · 전면삼각근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "single-arm-high-cable-fly": {
    "id": "single-arm-high-cable-fly",
    "name": "싱글 암 하이 케이블 플라이",
    "target": "대흉근 하부 · 전면삼각근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "single-arm-cable-rear-delt-fly": {
    "id": "single-arm-cable-rear-delt-fly",
    "name": "싱글 암 케이블 리어 델트 플라이",
    "target": "후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "single-arm-cable-upright-row": {
    "id": "single-arm-cable-upright-row",
    "name": "싱글 암 케이블 업라이트 로우",
    "target": "측면삼각근 · 승모근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "single-arm-cable-triceps-kickback": {
    "id": "single-arm-cable-triceps-kickback",
    "name": "싱글 암 케이블 트라이셉스 킥백",
    "target": "삼두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "single-arm-cable-face-pull": {
    "id": "single-arm-cable-face-pull",
    "name": "싱글 암 케이블 페이스 풀",
    "target": "후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "single-arm-cable-shrug": {
    "id": "single-arm-cable-shrug",
    "name": "싱글 암 케이블 슈러그",
    "target": "상부승모근 · 전완근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "rope-cable-front-raise": {
    "id": "rope-cable-front-raise",
    "name": "로프 케이블 프론트 레이즈",
    "target": "전면삼각근 · 상부승모근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "rope-cable-upright-row": {
    "id": "rope-cable-upright-row",
    "name": "로프 케이블 업라이트 로우",
    "target": "측면삼각근 · 승모근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "cable-concentration-curl": {
    "id": "cable-concentration-curl",
    "name": "케이블 컨센트레이션 컬",
    "target": "이두근 · 전완근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "low-cable-lateral-raise": {
    "id": "low-cable-lateral-raise",
    "name": "로우 케이블 레터럴 레이즈",
    "target": "측면삼각근 · 상부승모근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "cable-21s-curl": {
    "id": "cable-21s-curl",
    "name": "케이블 21s 컬",
    "target": "이두근 · 전완근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "wide-grip-cable-pushdown": {
    "id": "wide-grip-cable-pushdown",
    "name": "와이드 그립 케이블 푸시다운",
    "target": "삼두근 외측두",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "cable-bar-incline-curl": {
    "id": "cable-bar-incline-curl",
    "name": "케이블 바 인클라인 컬",
    "target": "이두근 장두 · 전완근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "seated-single-arm-dumbbell-shoulder-press": {
    "id": "seated-single-arm-dumbbell-shoulder-press",
    "name": "시티드 싱글 암 덤벨 숄더 프레스",
    "target": "전면삼각근 · 코어·삼두근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "single-arm-dumbbell-front-raise": {
    "id": "single-arm-dumbbell-front-raise",
    "name": "싱글 암 덤벨 프론트 레이즈",
    "target": "전면삼각근 · 상부승모근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "single-arm-dumbbell-lateral-raise": {
    "id": "single-arm-dumbbell-lateral-raise",
    "name": "싱글 암 덤벨 레터럴 레이즈",
    "target": "측면삼각근 · 상부승모근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "alternating-dumbbell-curl": {
    "id": "alternating-dumbbell-curl",
    "name": "얼터네이팅 덤벨 컬",
    "target": "이두근 · 전완근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "alternating-dumbbell-shoulder-press": {
    "id": "alternating-dumbbell-shoulder-press",
    "name": "얼터네이팅 덤벨 숄더 프레스",
    "target": "전면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "alternating-dumbbell-front-raise": {
    "id": "alternating-dumbbell-front-raise",
    "name": "얼터네이팅 덤벨 프론트 레이즈",
    "target": "전면삼각근 · 상부승모근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "dumbbell-reverse-curl": {
    "id": "dumbbell-reverse-curl",
    "name": "덤벨 리버스 컬",
    "target": "상완요골근 · 이두근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "seated-dumbbell-shrug": {
    "id": "seated-dumbbell-shrug",
    "name": "시티드 덤벨 슈러그",
    "target": "상부승모근 · 전완근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "single-arm-incline-dumbbell-curl": {
    "id": "single-arm-incline-dumbbell-curl",
    "name": "싱글 암 인클라인 덤벨 컬",
    "target": "이두근 장두 · 전완근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "dumbbell-floor-fly": {
    "id": "dumbbell-floor-fly",
    "name": "덤벨 플로어 플라이",
    "target": "대흉근 · 전면삼각근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "cross-bench-dumbbell-pullover": {
    "id": "cross-bench-dumbbell-pullover",
    "name": "크로스 벤치 덤벨 풀오버",
    "target": "대흉근 · 광배근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "dumbbell-swing": {
    "id": "dumbbell-swing",
    "name": "덤벨 스윙",
    "target": "둔근·햄스트링 · 어깨·코어",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "dumbbell-snatch": {
    "id": "dumbbell-snatch",
    "name": "덤벨 스내치",
    "target": "둔근·삼각근 · 승모근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "dumbbell-clean": {
    "id": "dumbbell-clean",
    "name": "덤벨 클린",
    "target": "둔근·햄스트링 · 승모근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "dumbbell-clean-and-press": {
    "id": "dumbbell-clean-and-press",
    "name": "덤벨 클린 앤 프레스",
    "target": "둔근·삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "dumbbell-windmill": {
    "id": "dumbbell-windmill",
    "name": "덤벨 윈드밀",
    "target": "복사근·어깨 · 햄스트링",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "dumbbell-turkish-get-up": {
    "id": "dumbbell-turkish-get-up",
    "name": "덤벨 터키시 겟업",
    "target": "어깨·코어 · 둔근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "dumbbell-renegade-row": {
    "id": "dumbbell-renegade-row",
    "name": "덤벨 렌리게이드 로우",
    "target": "광배근·코어 · 후면삼각근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "dumbbell-pull-through": {
    "id": "dumbbell-pull-through",
    "name": "덤벨 풀 쓰루",
    "target": "둔근·햄스트링 · 척추기립근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "dumbbell-stiff-leg-deadlift": {
    "id": "dumbbell-stiff-leg-deadlift",
    "name": "덤벨 스티프 레그 데드리프트",
    "target": "햄스트링 · 둔근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "dumbbell-sumo-deadlift": {
    "id": "dumbbell-sumo-deadlift",
    "name": "덤벨 스모 데드리프트",
    "target": "둔근·내전근 · 햄스트링",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "dumbbell-hip-thrust": {
    "id": "dumbbell-hip-thrust",
    "name": "덤벨 힙 쓰러스트",
    "target": "대둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "dumbbell-glute-bridge": {
    "id": "dumbbell-glute-bridge",
    "name": "덤벨 글루트 브릿지",
    "target": "대둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "seated-dumbbell-calf-raise": {
    "id": "seated-dumbbell-calf-raise",
    "name": "시티드 덤벨 카프 레이즈",
    "target": "가자미근 · 비복근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "dumbbell-front-squat": {
    "id": "dumbbell-front-squat",
    "name": "덤벨 프론트 스쿼트",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "dumbbell-rear-delt-row": {
    "id": "dumbbell-rear-delt-row",
    "name": "덤벨 리어 델트 로우",
    "target": "후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "incline-dumbbell-y-raise": {
    "id": "incline-dumbbell-y-raise",
    "name": "인클라인 덤벨 Y 레이즈",
    "target": "하부승모근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "incline-dumbbell-t-raise": {
    "id": "incline-dumbbell-t-raise",
    "name": "인클라인 덤벨 T 레이즈",
    "target": "중부승모근 · 능형근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "prone-incline-dumbbell-shrug": {
    "id": "prone-incline-dumbbell-shrug",
    "name": "프론 인클라인 덤벨 슈러그",
    "target": "중하부승모근 · 능형근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "dumbbell-21s-curl": {
    "id": "dumbbell-21s-curl",
    "name": "덤벨 21s 컬",
    "target": "이두근 · 전완근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "wide-grip-upright-row": {
    "id": "wide-grip-upright-row",
    "name": "와이드 그립 업라이트 로우",
    "target": "측면삼각근 · 승모근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "close-grip-upright-row": {
    "id": "close-grip-upright-row",
    "name": "클로즈 그립 업라이트 로우",
    "target": "승모근·측면삼각근 · 이두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "deficit-pendlay-row": {
    "id": "deficit-pendlay-row",
    "name": "데피싯 펜들레이 로우",
    "target": "광배근·능형근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "barbell-hack-lift": {
    "id": "barbell-hack-lift",
    "name": "바벨 헥 리프트",
    "target": "대퇴사두·둔근 · 전완근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "jefferson-deadlift": {
    "id": "jefferson-deadlift",
    "name": "제퍼슨 데드리프트",
    "target": "둔근·대퇴사두 · 척추기립근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "snatch-grip-row": {
    "id": "snatch-grip-row",
    "name": "스내치 그립 로우",
    "target": "광배근·후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "barbell-front-raise": {
    "id": "barbell-front-raise",
    "name": "바벨 프론트 레이즈",
    "target": "전면삼각근 · 상부승모근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "barbell-reverse-wrist-curl": {
    "id": "barbell-reverse-wrist-curl",
    "name": "바벨 리버스 리스트 컬",
    "target": "전완 신근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "barbell-lunge": {
    "id": "barbell-lunge",
    "name": "바벨 런지",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "barbell-reverse-lunge": {
    "id": "barbell-reverse-lunge",
    "name": "바벨 리버스 런지",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "barbell-step-up": {
    "id": "barbell-step-up",
    "name": "바벨 스텝업",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "barbell-calf-raise": {
    "id": "barbell-calf-raise",
    "name": "바벨 카프 레이즈",
    "target": "비복근 · 가자미근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "zercher-squat": {
    "id": "zercher-squat",
    "name": "제르커 스쿼트",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "zercher-deadlift": {
    "id": "zercher-deadlift",
    "name": "제르커 데드리프트",
    "target": "둔근·햄스트링 · 코어·전완근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "zercher-carry": {
    "id": "zercher-carry",
    "name": "제르커 캐리",
    "target": "코어·전완근 · 승모근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "converging-chest-press-machine": {
    "id": "converging-chest-press-machine",
    "name": "컨버징 체스트 프레스 머신",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "converging-shoulder-press-machine": {
    "id": "converging-shoulder-press-machine",
    "name": "컨버징 숄더 프레스 머신",
    "target": "전면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "diverging-lat-pulldown": {
    "id": "diverging-lat-pulldown",
    "name": "다이버징 랫 풀다운",
    "target": "광배근 · 이두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "standing-leg-curl-machine": {
    "id": "standing-leg-curl-machine",
    "name": "스탠딩 레그 컬 머신",
    "target": "햄스트링 · 비복근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "lying-t-bar-row-machine": {
    "id": "lying-t-bar-row-machine",
    "name": "라잉 T바 로우 머신",
    "target": "광배근·능형근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "reverse-hack-squat": {
    "id": "reverse-hack-squat",
    "name": "리버스 핵 스쿼트",
    "target": "둔근·햄스트링 · 대퇴사두",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "incline-chest-fly-machine": {
    "id": "incline-chest-fly-machine",
    "name": "인클라인 펙 플라이 머신",
    "target": "대흉근 상부 · 전면삼각근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "decline-chest-fly-machine": {
    "id": "decline-chest-fly-machine",
    "name": "디클라인 펙 플라이 머신",
    "target": "대흉근 하부 · 전면삼각근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "seated-leg-press-machine": {
    "id": "seated-leg-press-machine",
    "name": "시티드 레그 프레스 머신",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "horizontal-calf-raise-machine": {
    "id": "horizontal-calf-raise-machine",
    "name": "호리즌탈 카프 레이즈 머신",
    "target": "비복근 · 가자미근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "single-leg-box-jump": {
    "id": "single-leg-box-jump",
    "name": "싱글 레그 박스 점프",
    "target": "대퇴사두·둔근 · 비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "single-leg-broad-jump": {
    "id": "single-leg-broad-jump",
    "name": "싱글 레그 브로드 점프",
    "target": "둔근·대퇴사두 · 햄스트링",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "burpee-box-jump-over": {
    "id": "burpee-box-jump-over",
    "name": "버피 박스 점프 오버",
    "target": "대퇴사두·대흉근 · 코어",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "burpee-pull-up": {
    "id": "burpee-pull-up",
    "name": "버피 풀업",
    "target": "광배근·대흉근 · 대퇴사두·코어",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "single-under": {
    "id": "single-under",
    "name": "싱글 언더",
    "target": "비복근 · 어깨·전완근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "lateral-box-shuffle": {
    "id": "lateral-box-shuffle",
    "name": "래터럴 박스 셔플",
    "target": "대퇴사두·둔근 · 비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "step-up-jump": {
    "id": "step-up-jump",
    "name": "스텝업 점프",
    "target": "대퇴사두·둔근 · 비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "kettlebell-clean-and-jerk": {
    "id": "kettlebell-clean-and-jerk",
    "name": "케틀벨 클린 앤 저크",
    "target": "둔근·삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "medicine-ball-backward-toss": {
    "id": "medicine-ball-backward-toss",
    "name": "메디신볼 백 토스",
    "target": "둔근·삼각근 · 코어",
    "equipments": [
      {
        "equipment": "medicineball"
      }
    ]
  },
  "medicine-ball-squat-to-press": {
    "id": "medicine-ball-squat-to-press",
    "name": "메디신볼 스쿼트 투 프레스",
    "target": "대퇴사두·삼각근 · 둔근",
    "equipments": [
      {
        "equipment": "medicineball"
      }
    ]
  },
  "power-step-up": {
    "id": "power-step-up",
    "name": "파워 스텝업",
    "target": "대퇴사두·둔근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "criss-cross-jump-rope": {
    "id": "criss-cross-jump-rope",
    "name": "크리스크로스 점프 로프",
    "target": "비복근 · 어깨",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "inchworm-push-up": {
    "id": "inchworm-push-up",
    "name": "인치웜 푸시업",
    "target": "대흉근·코어 · 어깨·햄스트링",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "sprawl": {
    "id": "sprawl",
    "name": "스프롤",
    "target": "코어·대퇴사두 · 어깨",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "star-jump": {
    "id": "star-jump",
    "name": "스타 점프",
    "target": "대퇴사두·삼각근 · 둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "neck-stretch": {
    "id": "neck-stretch",
    "name": "넥 스트레치",
    "target": "흉쇄유돌근 · 승모근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "cross-body-shoulder-stretch": {
    "id": "cross-body-shoulder-stretch",
    "name": "크로스바디 숄더 스트레치",
    "target": "후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "overhead-triceps-stretch": {
    "id": "overhead-triceps-stretch",
    "name": "오버헤드 트라이셉스 스트레치",
    "target": "삼두근 · 광배근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "doorway-chest-stretch": {
    "id": "doorway-chest-stretch",
    "name": "도어웨이 체스트 스트레치",
    "target": "대흉근 · 전면삼각근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "lat-stretch": {
    "id": "lat-stretch",
    "name": "래트 스트레치",
    "target": "광배근 · 대원근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "standing-quad-stretch": {
    "id": "standing-quad-stretch",
    "name": "스탠딩 쿼드 스트레치",
    "target": "대퇴사두 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "wall-calf-stretch": {
    "id": "wall-calf-stretch",
    "name": "월 카프 스트레치",
    "target": "비복근 · 가자미근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "kneeling-hip-flexor-stretch": {
    "id": "kneeling-hip-flexor-stretch",
    "name": "닐링 힙 플렉서 스트레치",
    "target": "고관절굴근 · 대퇴사두",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "seated-glute-stretch": {
    "id": "seated-glute-stretch",
    "name": "시티드 글루트 스트레치",
    "target": "둔근 · 이상근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "seated-spinal-twist": {
    "id": "seated-spinal-twist",
    "name": "시티드 스파인 트위스트",
    "target": "복사근 · 척추기립근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "thread-the-needle": {
    "id": "thread-the-needle",
    "name": "스레드 더 니들",
    "target": "흉추기립근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "wrist-flexor-stretch": {
    "id": "wrist-flexor-stretch",
    "name": "리스트 플렉서 스트레치",
    "target": "전완 굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "wrist-extensor-stretch": {
    "id": "wrist-extensor-stretch",
    "name": "리스트 익스텐서 스트레치",
    "target": "전완 신근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "ankle-mobility-drill": {
    "id": "ankle-mobility-drill",
    "name": "앵클 모빌리티 드릴",
    "target": "발목 · 비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "foam-roller-quad-release": {
    "id": "foam-roller-quad-release",
    "name": "폼롤러 쿼드 릴리즈",
    "target": "대퇴사두 · 장경인대",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "smith-machine-front-squat": {
    "id": "smith-machine-front-squat",
    "name": "스미스 머신 프론트 스쿼트",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "smith"
      }
    ]
  },
  "smith-machine-bulgarian-split-squat": {
    "id": "smith-machine-bulgarian-split-squat",
    "name": "스미스 머신 불가리안 스플릿 스쿼트",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "smith"
      }
    ]
  },
  "smith-machine-seated-calf-raise": {
    "id": "smith-machine-seated-calf-raise",
    "name": "스미스 머신 시티드 카프 레이즈",
    "target": "가자미근 · 비복근",
    "equipments": [
      {
        "equipment": "smith"
      }
    ]
  },
  "smith-machine-deadlift": {
    "id": "smith-machine-deadlift",
    "name": "스미스 머신 데드리프트",
    "target": "둔근·햄스트링 · 척추기립근",
    "equipments": [
      {
        "equipment": "smith"
      }
    ]
  },
  "smith-machine-romanian-deadlift": {
    "id": "smith-machine-romanian-deadlift",
    "name": "스미스 머신 루마니안 데드리프트",
    "target": "햄스트링·둔근 · 척추기립근",
    "equipments": [
      {
        "equipment": "smith"
      }
    ]
  },
  "smith-machine-good-morning": {
    "id": "smith-machine-good-morning",
    "name": "스미스 머신 굿모닝",
    "target": "척추기립근·햄스트링 · 둔근",
    "equipments": [
      {
        "equipment": "smith"
      }
    ]
  },
  "smith-machine-shrug": {
    "id": "smith-machine-shrug",
    "name": "스미스 머신 슈러그",
    "target": "상부승모근 · 전완근",
    "equipments": [
      {
        "equipment": "smith"
      }
    ]
  },
  "smith-machine-upright-row": {
    "id": "smith-machine-upright-row",
    "name": "스미스 머신 업라이트 로우",
    "target": "측면삼각근 · 승모근",
    "equipments": [
      {
        "equipment": "smith"
      }
    ]
  },
  "smith-machine-inverted-row": {
    "id": "smith-machine-inverted-row",
    "name": "스미스 머신 인버티드 로우",
    "target": "광배근·능형근 · 이두근",
    "equipments": [
      {
        "equipment": "smith"
      }
    ]
  },
  "smith-machine-close-grip-bench-press": {
    "id": "smith-machine-close-grip-bench-press",
    "name": "스미스 머신 클로즈 그립 벤치프레스",
    "target": "삼두근 · 대흉근",
    "equipments": [
      {
        "equipment": "smith"
      }
    ]
  },
  "smith-machine-box-squat": {
    "id": "smith-machine-box-squat",
    "name": "스미스 머신 박스 스쿼트",
    "target": "둔근·대퇴사두 · 햄스트링",
    "equipments": [
      {
        "equipment": "smith"
      }
    ]
  },
  "smith-machine-stiff-leg-deadlift": {
    "id": "smith-machine-stiff-leg-deadlift",
    "name": "스미스 머신 스티프 레그 데드리프트",
    "target": "햄스트링 · 둔근",
    "equipments": [
      {
        "equipment": "smith"
      }
    ]
  },
  "kettlebell-dead-clean": {
    "id": "kettlebell-dead-clean",
    "name": "케틀벨 데드 클린",
    "target": "둔근·햄스트링 · 승모근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "kettlebell-push-press": {
    "id": "kettlebell-push-press",
    "name": "케틀벨 푸시 프레스",
    "target": "전면삼각근·대퇴사두 · 삼두근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "kettlebell-jerk": {
    "id": "kettlebell-jerk",
    "name": "케틀벨 저크",
    "target": "삼각근·대퇴사두 · 삼두근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "double-kettlebell-clean": {
    "id": "double-kettlebell-clean",
    "name": "더블 케틀벨 클린",
    "target": "둔근·햄스트링 · 승모근·전완근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "double-kettlebell-press": {
    "id": "double-kettlebell-press",
    "name": "더블 케틀벨 프레스",
    "target": "전면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "double-kettlebell-snatch": {
    "id": "double-kettlebell-snatch",
    "name": "더블 케틀벨 스내치",
    "target": "둔근·삼각근 · 코어",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "kettlebell-seesaw-row": {
    "id": "kettlebell-seesaw-row",
    "name": "케틀벨 시소 로우",
    "target": "광배근 · 능형근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "kettlebell-sumo-squat": {
    "id": "kettlebell-sumo-squat",
    "name": "케틀벨 스모 스쿼트",
    "target": "내전근·둔근 · 대퇴사두",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "kettlebell-side-lunge": {
    "id": "kettlebell-side-lunge",
    "name": "케틀벨 사이드 런지",
    "target": "내전근·둔근 · 대퇴사두",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "kettlebell-overhead-squat": {
    "id": "kettlebell-overhead-squat",
    "name": "케틀벨 오버헤드 스쿼트",
    "target": "대퇴사두·삼각근 · 코어",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "kettlebell-overhead-carry": {
    "id": "kettlebell-overhead-carry",
    "name": "케틀벨 오버헤드 캐리",
    "target": "삼각근·코어 · 전완근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "kettlebell-rack-carry": {
    "id": "kettlebell-rack-carry",
    "name": "케틀벨 래크 캐리",
    "target": "코어·전완근 · 승모근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "kettlebell-clean-and-squat": {
    "id": "kettlebell-clean-and-squat",
    "name": "케틀벨 클린 앤 스쿼트",
    "target": "대퇴사두·둔근 · 승모근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "kettlebell-pullover": {
    "id": "kettlebell-pullover",
    "name": "케틀벨 풀오버",
    "target": "광배근 · 대흉근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "trx-pull-up": {
    "id": "trx-pull-up",
    "name": "TRX 풀업",
    "target": "광배근 · 이두근",
    "equipments": [
      {
        "equipment": "trx"
      }
    ]
  },
  "trx-y-fly": {
    "id": "trx-y-fly",
    "name": "TRX Y 플라이",
    "target": "하부승모근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "trx"
      }
    ]
  },
  "trx-t-fly": {
    "id": "trx-t-fly",
    "name": "TRX T 플라이",
    "target": "후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "trx"
      }
    ]
  },
  "trx-face-pull": {
    "id": "trx-face-pull",
    "name": "TRX 페이스 풀",
    "target": "후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "trx"
      }
    ]
  },
  "trx-single-leg-squat": {
    "id": "trx-single-leg-squat",
    "name": "TRX 싱글 레그 스쿼트",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "trx"
      }
    ]
  },
  "trx-squat": {
    "id": "trx-squat",
    "name": "TRX 스쿼트",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "trx"
      }
    ]
  },
  "trx-atomic-push-up": {
    "id": "trx-atomic-push-up",
    "name": "TRX 애토믹 푸시업",
    "target": "대흉근·복직근 · 삼두근",
    "equipments": [
      {
        "equipment": "trx"
      }
    ]
  },
  "trx-mountain-climber": {
    "id": "trx-mountain-climber",
    "name": "TRX 마운틴 클라이머",
    "target": "복직근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "trx"
      }
    ]
  },
  "trx-oblique-crunch": {
    "id": "trx-oblique-crunch",
    "name": "TRX 오블리크 크런치",
    "target": "복사근 · 복직근",
    "equipments": [
      {
        "equipment": "trx"
      }
    ]
  },
  "trx-side-plank": {
    "id": "trx-side-plank",
    "name": "TRX 사이드 플랭크",
    "target": "복사근 · 중둔근",
    "equipments": [
      {
        "equipment": "trx"
      }
    ]
  },
  "band-seated-row": {
    "id": "band-seated-row",
    "name": "밴드 시티드 로우",
    "target": "광배근·능형근 · 이두근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "band-hammer-curl": {
    "id": "band-hammer-curl",
    "name": "밴드 해머 컬",
    "target": "이두근·상완근 · 전완근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "band-rear-delt-fly": {
    "id": "band-rear-delt-fly",
    "name": "밴드 리어 델트 플라이",
    "target": "후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "band-front-raise": {
    "id": "band-front-raise",
    "name": "밴드 프론트 레이즈",
    "target": "전면삼각근 · 상부승모근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "band-upright-row": {
    "id": "band-upright-row",
    "name": "밴드 업라이트 로우",
    "target": "측면삼각근 · 승모근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "band-triceps-kickback": {
    "id": "band-triceps-kickback",
    "name": "밴드 트라이셉스 킥백",
    "target": "삼두근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "band-leg-curl": {
    "id": "band-leg-curl",
    "name": "밴드 레그 컬",
    "target": "햄스트링 · 비복근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "band-leg-extension": {
    "id": "band-leg-extension",
    "name": "밴드 레그 익스텐션",
    "target": "대퇴사두",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "band-clamshell": {
    "id": "band-clamshell",
    "name": "밴드 클램쉘",
    "target": "중둔근 · 대둔근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "band-standing-hip-abduction": {
    "id": "band-standing-hip-abduction",
    "name": "밴드 스탠딩 힙 어브덕션",
    "target": "중둔근 · 대둔근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "single-leg-deadlift": {
    "id": "single-leg-deadlift",
    "name": "싱글 레그 데드리프트",
    "target": "햄스트링·둔근 · 척추기립근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "single-leg-hack-squat": {
    "id": "single-leg-hack-squat",
    "name": "싱글 레그 핵 스쿼트",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "single-leg-glute-kickback-machine": {
    "id": "single-leg-glute-kickback-machine",
    "name": "싱글 레그 글루트 킥백 머신",
    "target": "대둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "single-leg-smith-calf-raise": {
    "id": "single-leg-smith-calf-raise",
    "name": "싱글 레그 스미스 카프 레이즈",
    "target": "비복근 · 가자미근",
    "equipments": [
      {
        "equipment": "smith"
      }
    ]
  },
  "kettlebell-step-up": {
    "id": "kettlebell-step-up",
    "name": "케틀벨 스텝업",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "kettlebell-reverse-lunge": {
    "id": "kettlebell-reverse-lunge",
    "name": "케틀벨 리버스 런지",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "trap-bar-romanian-deadlift": {
    "id": "trap-bar-romanian-deadlift",
    "name": "트랩바 루마니안 데드리프트",
    "target": "햄스트링·둔근 · 척추기립근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "trap-bar-shrug": {
    "id": "trap-bar-shrug",
    "name": "트랩바 슈러그",
    "target": "상부승모근 · 전완근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "trap-bar-calf-raise": {
    "id": "trap-bar-calf-raise",
    "name": "트랩바 카프 레이즈",
    "target": "비복근 · 가자미근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "hack-squat-calf-raise": {
    "id": "hack-squat-calf-raise",
    "name": "핵 스쿼트 카프 레이즈",
    "target": "비복근 · 가자미근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "weighted-sissy-squat": {
    "id": "weighted-sissy-squat",
    "name": "위티드 시시 스쿼트",
    "target": "대퇴사두",
    "equipments": [
      {
        "equipment": "plate"
      }
    ]
  },
  "band-glute-ham-raise": {
    "id": "band-glute-ham-raise",
    "name": "밴드 글루트 햄 레이즈",
    "target": "햄스트링·둔근 · 척추기립근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "weighted-nordic-curl": {
    "id": "weighted-nordic-curl",
    "name": "위티드 노르딕 컬",
    "target": "햄스트링 · 둔근",
    "equipments": [
      {
        "equipment": "plate"
      }
    ]
  },
  "weighted-back-extension": {
    "id": "weighted-back-extension",
    "name": "위티드 백 익스텐션",
    "target": "척추기립근 · 둔근·햄스트링",
    "equipments": [
      {
        "equipment": "plate"
      }
    ]
  },
  "weighted-45-degree-hyperextension": {
    "id": "weighted-45-degree-hyperextension",
    "name": "위티드 45도 하이퍼익스텐션",
    "target": "척추기립근 · 둔근",
    "equipments": [
      {
        "equipment": "plate"
      }
    ]
  },
  "standing-hip-abduction-machine": {
    "id": "standing-hip-abduction-machine",
    "name": "스탠딩 힙 어브덕션 머신",
    "target": "중둔근 · 대둔근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "multi-hip-machine-extension": {
    "id": "multi-hip-machine-extension",
    "name": "멀티 힙 머신 익스텐션",
    "target": "대둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "multi-hip-machine-flexion": {
    "id": "multi-hip-machine-flexion",
    "name": "멀티 힙 머신 플렉션",
    "target": "고관절굴근 · 대퇴사두",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "multi-hip-machine-abduction": {
    "id": "multi-hip-machine-abduction",
    "name": "멀티 힙 머신 어브덕션",
    "target": "중둔근 · 대둔근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "multi-hip-machine-adduction": {
    "id": "multi-hip-machine-adduction",
    "name": "멀티 힙 머신 어덕션",
    "target": "내전근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "dumbbell-wrist-extension": {
    "id": "dumbbell-wrist-extension",
    "name": "덤벨 리스트 익스텐션",
    "target": "전완 신근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "cable-wrist-curl": {
    "id": "cable-wrist-curl",
    "name": "케이블 리스트 컬",
    "target": "전완 굴근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "parallel-bar-hang": {
    "id": "parallel-bar-hang",
    "name": "패럴렐 바 행",
    "target": "전완 굴근 · 광배근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "towel-hang": {
    "id": "towel-hang",
    "name": "타월 행",
    "target": "전완 굴근 · 광배근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "fat-grip-deadlift": {
    "id": "fat-grip-deadlift",
    "name": "팻 그립 데드리프트",
    "target": "전완 굴근 · 둔근·승모근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "fat-grip-curl": {
    "id": "fat-grip-curl",
    "name": "팻 그립 컬",
    "target": "이두근·전완근 · 상완근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "wrist-rotation": {
    "id": "wrist-rotation",
    "name": "리스트 로테이션",
    "target": "회내근·회외근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "rice-bucket-training": {
    "id": "rice-bucket-training",
    "name": "라이스 버킷 트레이닝",
    "target": "전완 굴근·신근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "hand-gripper": {
    "id": "hand-gripper",
    "name": "핸드 그리퍼",
    "target": "전완 굴근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "plate-curl": {
    "id": "plate-curl",
    "name": "플레이트 컬",
    "target": "상완요골근·전완근 · 이두근",
    "equipments": [
      {
        "equipment": "plate"
      }
    ]
  },
  "lying-hamstring-stretch": {
    "id": "lying-hamstring-stretch",
    "name": "라잉 햄스트링 스트레치",
    "target": "햄스트링 · 비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "seated-hamstring-stretch": {
    "id": "seated-hamstring-stretch",
    "name": "시티드 햄스트링 스트레치",
    "target": "햄스트링 · 척추기립근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "standing-side-bend-stretch": {
    "id": "standing-side-bend-stretch",
    "name": "스탠딩 사이드 벤드 스트레치",
    "target": "복사근 · 광배근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "sphinx-stretch": {
    "id": "sphinx-stretch",
    "name": "스핑크스 스트레치",
    "target": "복직근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "sleeper-stretch": {
    "id": "sleeper-stretch",
    "name": "슬리퍼 스트레치",
    "target": "극하근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "corner-pec-stretch": {
    "id": "corner-pec-stretch",
    "name": "코너 펙 스트레치",
    "target": "대흉근 · 전면삼각근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "levator-scapulae-stretch": {
    "id": "levator-scapulae-stretch",
    "name": "레바터 스캐퓰러 스트레치",
    "target": "견갑거근 · 상부승모근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "upper-trap-stretch": {
    "id": "upper-trap-stretch",
    "name": "어퍼 트랩 스트레치",
    "target": "상부승모근 · 견갑거근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "frog-stretch": {
    "id": "frog-stretch",
    "name": "프로그 스트레치",
    "target": "내전근 · 고관절",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "eagle-pose": {
    "id": "eagle-pose",
    "name": "이글 포즈",
    "target": "후면삼각근·둔근 · 코어",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "low-lunge-stretch": {
    "id": "low-lunge-stretch",
    "name": "로우 런지 스트레치",
    "target": "고관절굴근 · 대퇴사두",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "high-lunge-stretch": {
    "id": "high-lunge-stretch",
    "name": "하이 런지 스트레치",
    "target": "고관절굴근 · 햄스트링",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "happy-baby-pose": {
    "id": "happy-baby-pose",
    "name": "해피 베이비 포즈",
    "target": "내전근·둔근 · 고관절",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "seated-forward-fold": {
    "id": "seated-forward-fold",
    "name": "시티드 포워드 폴드",
    "target": "햄스트링 · 척추기립근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "standing-forward-fold": {
    "id": "standing-forward-fold",
    "name": "스탠딩 포워드 폴드",
    "target": "햄스트링 · 척추기립근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "wide-leg-forward-fold": {
    "id": "wide-leg-forward-fold",
    "name": "와이드 레그 포워드 폴드",
    "target": "내전근·햄스트링 · 척추기립근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "lying-quad-stretch": {
    "id": "lying-quad-stretch",
    "name": "라잉 쿼드 스트레치",
    "target": "대퇴사두 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "it-band-stretch": {
    "id": "it-band-stretch",
    "name": "IT밴드 스트레치",
    "target": "장경인대 · 대퇴근막장근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "piriformis-stretch": {
    "id": "piriformis-stretch",
    "name": "피리포미스 스트레치",
    "target": "이상근 · 둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "foam-roller-calf-release": {
    "id": "foam-roller-calf-release",
    "name": "폼롤러 카프 릴리즈",
    "target": "비복근 · 가자미근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "foam-roller-glute-release": {
    "id": "foam-roller-glute-release",
    "name": "폼롤러 글루트 릴리즈",
    "target": "둔근 · 이상근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "foam-roller-hamstring-release": {
    "id": "foam-roller-hamstring-release",
    "name": "폼롤러 햄스트링 릴리즈",
    "target": "햄스트링 · 둔근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "foam-roller-lat-release": {
    "id": "foam-roller-lat-release",
    "name": "폼롤러 랫 릴리즈",
    "target": "광배근 · 대원근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "foam-roller-adductor-release": {
    "id": "foam-roller-adductor-release",
    "name": "폼롤러 어덕터 릴리즈",
    "target": "내전근 · 고관절",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "40-yard-dash": {
    "id": "40-yard-dash",
    "name": "40야드 대시",
    "target": "대퇴사두·둔근 · 햄스트링·비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "agility-ladder-drill": {
    "id": "agility-ladder-drill",
    "name": "어질리티 래더 드릴",
    "target": "비복근·대퇴사두 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "cone-drill": {
    "id": "cone-drill",
    "name": "콘 드릴",
    "target": "대퇴사두·둔근 · 비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "t-drill": {
    "id": "t-drill",
    "name": "T-드릴",
    "target": "대퇴사두·둔근 · 중둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "5-10-5-pro-agility": {
    "id": "5-10-5-pro-agility",
    "name": "5-10-5 프로 어질리티",
    "target": "대퇴사두·둔근 · 중둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "carioca": {
    "id": "carioca",
    "name": "카리오카",
    "target": "내전근·둔근 · 복사근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "backpedal": {
    "id": "backpedal",
    "name": "백페달",
    "target": "햄스트링·둔근 · 비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "vertical-jump": {
    "id": "vertical-jump",
    "name": "버티컬 점프",
    "target": "대퇴사두·둔근 · 비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "depth-drop": {
    "id": "depth-drop",
    "name": "뎁스 드롭",
    "target": "대퇴사두·둔근 · 비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "overhead-medicine-ball-throw": {
    "id": "overhead-medicine-ball-throw",
    "name": "오버헤드 메디신볼 쓰로우",
    "target": "어깨·코어 · 광배근",
    "equipments": [
      {
        "equipment": "medicineball"
      }
    ]
  },
  "rotational-medicine-ball-throw": {
    "id": "rotational-medicine-ball-throw",
    "name": "로테이셔널 메디신볼 쓰로우",
    "target": "복사근 · 둔근·어깨",
    "equipments": [
      {
        "equipment": "medicineball"
      }
    ]
  },
  "power-skip": {
    "id": "power-skip",
    "name": "파워 스킵",
    "target": "둔근·대퇴사두 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "resisted-sprint": {
    "id": "resisted-sprint",
    "name": "리지스티드 스프린트",
    "target": "둔근·대퇴사두 · 햄스트링",
    "equipments": [
      {
        "equipment": "sled"
      }
    ]
  },
  "hurdle-hop": {
    "id": "hurdle-hop",
    "name": "허들 홉",
    "target": "대퇴사두·둔근 · 비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "single-leg-hop": {
    "id": "single-leg-hop",
    "name": "싱글 레그 홉",
    "target": "대퇴사두·둔근 · 비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "pilates-side-kick": {
    "id": "pilates-side-kick",
    "name": "필라테스 사이드 킥",
    "target": "중둔근 · 대둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "pilates-leg-circle": {
    "id": "pilates-leg-circle",
    "name": "필라테스 레그 서클",
    "target": "고관절굴근 · 복직근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "pilates-teaser": {
    "id": "pilates-teaser",
    "name": "필라테스 티저",
    "target": "복직근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "pilates-swan": {
    "id": "pilates-swan",
    "name": "필라테스 스완",
    "target": "척추기립근 · 둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "pilates-single-leg-stretch": {
    "id": "pilates-single-leg-stretch",
    "name": "필라테스 싱글 레그 스트레치",
    "target": "복직근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "pilates-double-leg-stretch": {
    "id": "pilates-double-leg-stretch",
    "name": "필라테스 더블 레그 스트레치",
    "target": "복직근 · 복횡근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "pilates-criss-cross": {
    "id": "pilates-criss-cross",
    "name": "필라테스 크리스크로스",
    "target": "복사근 · 복직근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "barre-pli": {
    "id": "barre-pli",
    "name": "바레 플리에",
    "target": "대퇴사두·둔근 · 내전근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "barre-relev": {
    "id": "barre-relev",
    "name": "바레 렐레베",
    "target": "비복근 · 가자미근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "barre-arabesque": {
    "id": "barre-arabesque",
    "name": "바레 아라베스크",
    "target": "둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "cow-face-pose": {
    "id": "cow-face-pose",
    "name": "카우 페이스 포즈",
    "target": "후면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "dancer-pose": {
    "id": "dancer-pose",
    "name": "댄서 포즈",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "half-moon-pose": {
    "id": "half-moon-pose",
    "name": "하프 문 포즈",
    "target": "중둔근·코어 · 햄스트링",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "extended-side-angle-pose": {
    "id": "extended-side-angle-pose",
    "name": "익스텐디드 사이드 앵글 포즈",
    "target": "대퇴사두·복사근 · 내전근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "gate-pose": {
    "id": "gate-pose",
    "name": "게이트 포즈",
    "target": "복사근 · 내전근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "locust-pose": {
    "id": "locust-pose",
    "name": "로커스트 포즈",
    "target": "척추기립근 · 둔근·후면삼각근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "bow-pose": {
    "id": "bow-pose",
    "name": "보우 포즈",
    "target": "척추기립근 · 대퇴사두",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "fish-pose": {
    "id": "fish-pose",
    "name": "피쉬 포즈",
    "target": "척추기립근 · 흉쇄유돌근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "wheel-pose": {
    "id": "wheel-pose",
    "name": "휠 포즈",
    "target": "척추기립근·둔근 · 어깨",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "crow-pose": {
    "id": "crow-pose",
    "name": "크로우 포즈",
    "target": "코어·어깨 · 전완근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "side-crow": {
    "id": "side-crow",
    "name": "사이드 크로우",
    "target": "복사근·어깨 · 코어",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "headstand": {
    "id": "headstand",
    "name": "헤드스탠드",
    "target": "어깨·코어 · 승모근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "shoulder-stand": {
    "id": "shoulder-stand",
    "name": "숄더스탠드",
    "target": "코어 · 승모근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "plow-pose": {
    "id": "plow-pose",
    "name": "플라우 포즈",
    "target": "척추기립근 · 햄스트링",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "legs-up-the-wall-pose": {
    "id": "legs-up-the-wall-pose",
    "name": "레그 업 더 월 포즈",
    "target": "햄스트링 · 둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "reclined-spinal-twist": {
    "id": "reclined-spinal-twist",
    "name": "리클라인드 스파인 트위스트",
    "target": "복사근 · 둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "puppy-pose": {
    "id": "puppy-pose",
    "name": "퍼피 포즈",
    "target": "광배근 · 척추기립근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "lizard-pose": {
    "id": "lizard-pose",
    "name": "리저드 포즈",
    "target": "고관절굴근 · 내전근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "garland-pose": {
    "id": "garland-pose",
    "name": "가랜드 포즈",
    "target": "내전근·둔근 · 발목",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "reverse-warrior": {
    "id": "reverse-warrior",
    "name": "리버스 워리어",
    "target": "대퇴사두·복사근 · 둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "90-90-hip-transition": {
    "id": "90-90-hip-transition",
    "name": "90/90 힙 트랜지션",
    "target": "고관절 · 둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "hip-airplane": {
    "id": "hip-airplane",
    "name": "힙 에어플레인",
    "target": "둔근 · 코어",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "ankle-rock": {
    "id": "ankle-rock",
    "name": "앵클 락",
    "target": "발목 · 비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "wrist-mobility-circle": {
    "id": "wrist-mobility-circle",
    "name": "리스트 모빌리티 서클",
    "target": "전완근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "shoulder-dislocate": {
    "id": "shoulder-dislocate",
    "name": "숄더 디스로케이트",
    "target": "삼각근·회전근개 · 승모근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "stick-pass-through": {
    "id": "stick-pass-through",
    "name": "스틱 패스스루",
    "target": "삼각근 · 회전근개",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "thoracic-bridge": {
    "id": "thoracic-bridge",
    "name": "토라식 브릿지",
    "target": "흉추기립근 · 어깨",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "fire-hydrant-circle": {
    "id": "fire-hydrant-circle",
    "name": "파이어 하이드런트 서클",
    "target": "중둔근 · 대둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "spider-man-stretch": {
    "id": "spider-man-stretch",
    "name": "스파이더맨 스트레치",
    "target": "고관절굴근 · 내전근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "cossack-rock": {
    "id": "cossack-rock",
    "name": "코사크 록",
    "target": "내전근 · 둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "deep-lunge-with-twist": {
    "id": "deep-lunge-with-twist",
    "name": "딥 런지 위드 트위스트",
    "target": "고관절굴근·흉추 · 햄스트링",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "dynamic-calf-stretch": {
    "id": "dynamic-calf-stretch",
    "name": "다이나믹 카프 스트레치",
    "target": "비복근 · 가자미근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "lateral-leg-swing": {
    "id": "lateral-leg-swing",
    "name": "라테럴 레그 스윙",
    "target": "내전근·중둔근 · 고관절",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "backward-arm-circle": {
    "id": "backward-arm-circle",
    "name": "백워드 암 서클",
    "target": "삼각근 · 회전근개",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "neck-cars": {
    "id": "neck-cars",
    "name": "넥 CARs",
    "target": "경부근 · 승모근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "hand-release-push-up": {
    "id": "hand-release-push-up",
    "name": "핸드 릴리즈 푸시업",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "hindu-push-up": {
    "id": "hindu-push-up",
    "name": "힌두 푸시업",
    "target": "대흉근·어깨 · 삼두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "dive-bomber-push-up": {
    "id": "dive-bomber-push-up",
    "name": "다이브 바머 푸시업",
    "target": "대흉근·어깨 · 삼두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "pseudo-planche-push-up": {
    "id": "pseudo-planche-push-up",
    "name": "슈도 플란체 푸시업",
    "target": "대흉근·전면삼각근 · 코어",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "one-arm-push-up": {
    "id": "one-arm-push-up",
    "name": "원암 푸시업",
    "target": "대흉근 · 삼두근·코어",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "kneeling-push-up": {
    "id": "kneeling-push-up",
    "name": "닐링 푸시업",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "tempo-push-up": {
    "id": "tempo-push-up",
    "name": "템포 푸시업",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "straight-bar-dip": {
    "id": "straight-bar-dip",
    "name": "스트레이트 바 딥",
    "target": "삼두근 · 대흉근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "l-sit-pull-up": {
    "id": "l-sit-pull-up",
    "name": "L-싯 풀업",
    "target": "광배근·복직근 · 이두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "typewriter-pull-up": {
    "id": "typewriter-pull-up",
    "name": "타입라이터 풀업",
    "target": "광배근 · 이두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "close-grip-chin-up": {
    "id": "close-grip-chin-up",
    "name": "클로즈 그립 친업",
    "target": "광배근·이두근 · 능형근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "single-arm-inverted-row": {
    "id": "single-arm-inverted-row",
    "name": "싱글 암 인버티드 로우",
    "target": "광배근 · 이두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "scapular-push-up": {
    "id": "scapular-push-up",
    "name": "스캐퓰러 푸시업",
    "target": "전거근 · 능형근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "scapular-dip": {
    "id": "scapular-dip",
    "name": "스캐퓰러 딥",
    "target": "하부승모근 · 능형근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "wall-walk": {
    "id": "wall-walk",
    "name": "월 워크",
    "target": "어깨·코어 · 삼두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "freestanding-handstand": {
    "id": "freestanding-handstand",
    "name": "프리스탠딩 핸드스탠드",
    "target": "삼각근 · 코어·전완근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "shrimp-squat": {
    "id": "shrimp-squat",
    "name": "쉬림프 스쿼트",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "assisted-pistol-squat": {
    "id": "assisted-pistol-squat",
    "name": "어시스티드 피스톨 스쿼트",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "hanging-l-sit": {
    "id": "hanging-l-sit",
    "name": "행잉 L-싯",
    "target": "복직근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "active-hang": {
    "id": "active-hang",
    "name": "액티브 행",
    "target": "광배근·하부승모근 · 전완근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "glute-bridge-with-abduction": {
    "id": "glute-bridge-with-abduction",
    "name": "글루트 브릿지 어브덕션",
    "target": "대둔근·중둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "superman-pull": {
    "id": "superman-pull",
    "name": "슈퍼맨 풀",
    "target": "척추기립근·하부승모근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "reverse-snow-angel": {
    "id": "reverse-snow-angel",
    "name": "리버스 스노우 엔젤",
    "target": "중하부승모근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "no-money-exercise": {
    "id": "no-money-exercise",
    "name": "노 머니 익서사이즈",
    "target": "극하근·소원근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "squat-jack": {
    "id": "squat-jack",
    "name": "스쿼트 잭",
    "target": "대퇴사두·둔근 · 내전근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "plank-jack": {
    "id": "plank-jack",
    "name": "플랭크 잭",
    "target": "복직근 · 어깨",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "cross-body-mountain-climber": {
    "id": "cross-body-mountain-climber",
    "name": "크로스바디 마운틴 클라이머",
    "target": "복사근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "walking-push-up": {
    "id": "walking-push-up",
    "name": "워킹 푸시업",
    "target": "대흉근 · 어깨·코어",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "pulse-lunge": {
    "id": "pulse-lunge",
    "name": "펄스 런지",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "pulse-squat": {
    "id": "pulse-squat",
    "name": "펄스 스쿼트",
    "target": "대퇴사두·둔근 · 내전근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "duck-walk": {
    "id": "duck-walk",
    "name": "덕 워크",
    "target": "대퇴사두·둔근 · 종아리",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "backward-bear-crawl": {
    "id": "backward-bear-crawl",
    "name": "백워드 베어 크롤",
    "target": "어깨·코어 · 대퇴사두",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "lateral-crab-walk": {
    "id": "lateral-crab-walk",
    "name": "라테럴 크랩 워크",
    "target": "삼두근·둔근 · 코어",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "high-knee-skip": {
    "id": "high-knee-skip",
    "name": "하이 니 스킵",
    "target": "고관절굴근 · 대퇴사두",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "toe-tap": {
    "id": "toe-tap",
    "name": "토 탭",
    "target": "고관절굴근 · 비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "step-jack": {
    "id": "step-jack",
    "name": "스텝 잭",
    "target": "둔근·삼각근 · 비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "plank-toe-tap": {
    "id": "plank-toe-tap",
    "name": "플랭크 토 탭",
    "target": "복직근 · 어깨",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "side-plank-rotation": {
    "id": "side-plank-rotation",
    "name": "사이드 플랭크 로테이션",
    "target": "복사근 · 어깨",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "bird-dog-crunch": {
    "id": "bird-dog-crunch",
    "name": "버드독 크런치",
    "target": "복직근 · 둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "swimmer-exercise": {
    "id": "swimmer-exercise",
    "name": "스위머",
    "target": "척추기립근 · 둔근·후면삼각근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "neutral-grip-incline-dumbbell-press": {
    "id": "neutral-grip-incline-dumbbell-press",
    "name": "뉴트럴 그립 인클라인 덤벨 프레스",
    "target": "대흉근 상부 · 삼두근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "neutral-grip-decline-dumbbell-press": {
    "id": "neutral-grip-decline-dumbbell-press",
    "name": "뉴트럴 그립 디클라인 덤벨 프레스",
    "target": "대흉근 하부 · 삼두근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "swiss-bar-bench-press": {
    "id": "swiss-bar-bench-press",
    "name": "스위스바 벤치프레스",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "swiss-bar-overhead-press": {
    "id": "swiss-bar-overhead-press",
    "name": "스위스바 오버헤드 프레스",
    "target": "전면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "swiss-bar-close-grip-press": {
    "id": "swiss-bar-close-grip-press",
    "name": "스위스바 클로즈 그립 프레스",
    "target": "삼두근 · 대흉근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "incline-bench-cable-press": {
    "id": "incline-bench-cable-press",
    "name": "인클라인 벤치 케이블 프레스",
    "target": "대흉근 상부 · 삼두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "seated-cable-chest-press": {
    "id": "seated-cable-chest-press",
    "name": "시티드 케이블 체스트 프레스",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "decline-barbell-pullover": {
    "id": "decline-barbell-pullover",
    "name": "디클라인 바벨 풀오버",
    "target": "대흉근 · 광배근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "barbell-pullover": {
    "id": "barbell-pullover",
    "name": "바벨 풀오버",
    "target": "대흉근 · 광배근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "smith-machine-floor-press": {
    "id": "smith-machine-floor-press",
    "name": "스미스 머신 플로어 프레스",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "smith"
      }
    ]
  },
  "reverse-grip-dumbbell-press": {
    "id": "reverse-grip-dumbbell-press",
    "name": "리버스 그립 덤벨 프레스",
    "target": "대흉근 상부 · 삼두근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "wide-grip-dip": {
    "id": "wide-grip-dip",
    "name": "와이드 그립 딥스",
    "target": "대흉근 하부 · 삼두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "close-grip-dip": {
    "id": "close-grip-dip",
    "name": "클로즈 그립 딥스",
    "target": "삼두근 · 대흉근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "forward-lean-dip": {
    "id": "forward-lean-dip",
    "name": "포워드 린 딥스",
    "target": "대흉근 하부 · 삼두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "band-assisted-dip": {
    "id": "band-assisted-dip",
    "name": "밴드 어시스티드 딥스",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "chest-supported-dumbbell-row": {
    "id": "chest-supported-dumbbell-row",
    "name": "체스트 서포티드 덤벨 로우",
    "target": "능형근·광배근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "incline-bench-barbell-row": {
    "id": "incline-bench-barbell-row",
    "name": "인클라인 벤치 바벨 로우",
    "target": "능형근·광배근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "wide-grip-seated-row": {
    "id": "wide-grip-seated-row",
    "name": "와이드 그립 시티드 로우",
    "target": "광배근·후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "underhand-seated-cable-row": {
    "id": "underhand-seated-cable-row",
    "name": "언더핸드 시티드 케이블 로우",
    "target": "광배근·이두근 · 능형근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "kettlebell-bent-over-row": {
    "id": "kettlebell-bent-over-row",
    "name": "케틀벨 벤트오버 로우",
    "target": "광배근 · 능형근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "double-kettlebell-row": {
    "id": "double-kettlebell-row",
    "name": "더블 케틀벨 로우",
    "target": "광배근·능형근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "incline-cable-row": {
    "id": "incline-cable-row",
    "name": "인클라인 케이블 로우",
    "target": "광배근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "high-cable-row": {
    "id": "high-cable-row",
    "name": "하이 케이블 로우",
    "target": "광배근 상부 · 후면삼각근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "low-cable-row": {
    "id": "low-cable-row",
    "name": "로우 케이블 로우",
    "target": "광배근 하부 · 이두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "close-neutral-grip-lat-pulldown": {
    "id": "close-neutral-grip-lat-pulldown",
    "name": "클로즈 뉴트럴 랫 풀다운",
    "target": "광배근 하부 · 이두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "behind-the-neck-pull-up": {
    "id": "behind-the-neck-pull-up",
    "name": "비하인드 넥 풀업",
    "target": "광배근 상부 · 능형근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "medium-grip-pull-up": {
    "id": "medium-grip-pull-up",
    "name": "미디엄 그립 풀업",
    "target": "광배근 · 이두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "mixed-grip-pull-up": {
    "id": "mixed-grip-pull-up",
    "name": "믹스드 그립 풀업",
    "target": "광배근·이두근 · 능형근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "super-wide-grip-pulldown": {
    "id": "super-wide-grip-pulldown",
    "name": "슈퍼 와이드 그립 풀다운",
    "target": "광배근 상부 · 능형근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "seated-cable-face-pull": {
    "id": "seated-cable-face-pull",
    "name": "시티드 케이블 페이스 풀",
    "target": "후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "seated-behind-the-neck-press": {
    "id": "seated-behind-the-neck-press",
    "name": "시티드 비하인드 넥 프레스",
    "target": "측면·후면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "pin-shoulder-press": {
    "id": "pin-shoulder-press",
    "name": "핀 숄더 프레스",
    "target": "전면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "smith-machine-bradford-press": {
    "id": "smith-machine-bradford-press",
    "name": "스미스 머신 브래드포드 프레스",
    "target": "전면·측면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "smith"
      }
    ]
  },
  "seated-kettlebell-press": {
    "id": "seated-kettlebell-press",
    "name": "시티드 케틀벨 프레스",
    "target": "전면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "chest-supported-rear-delt-raise": {
    "id": "chest-supported-rear-delt-raise",
    "name": "체스트 서포티드 리어 델트 레이즈",
    "target": "후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "wide-cable-face-pull": {
    "id": "wide-cable-face-pull",
    "name": "와이드 케이블 페이스 풀",
    "target": "후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "decline-bench-rear-delt-raise": {
    "id": "decline-bench-rear-delt-raise",
    "name": "디클라인 벤치 리어 델트 레이즈",
    "target": "후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "plate-loaded-lateral-raise-machine": {
    "id": "plate-loaded-lateral-raise-machine",
    "name": "플레이트 로디드 레터럴 레이즈 머신",
    "target": "측면삼각근 · 상부승모근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "band-y-raise": {
    "id": "band-y-raise",
    "name": "밴드 Y 레이즈",
    "target": "하부승모근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "lying-cable-rear-delt-raise": {
    "id": "lying-cable-rear-delt-raise",
    "name": "라잉 케이블 리어 델트 레이즈",
    "target": "후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "behind-the-neck-push-press": {
    "id": "behind-the-neck-push-press",
    "name": "비하인드 넥 푸시 프레스",
    "target": "측면삼각근·대퇴사두 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "kettlebell-front-raise": {
    "id": "kettlebell-front-raise",
    "name": "케틀벨 프론트 레이즈",
    "target": "전면삼각근 · 상부승모근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "cable-internal-rotation": {
    "id": "cable-internal-rotation",
    "name": "케이블 인터널 로테이션",
    "target": "견갑하근 · 대흉근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "prone-band-pull-apart": {
    "id": "prone-band-pull-apart",
    "name": "프론 밴드 풀어파트",
    "target": "후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "kettlebell-lateral-raise": {
    "id": "kettlebell-lateral-raise",
    "name": "케틀벨 레터럴 레이즈",
    "target": "측면삼각근 · 상부승모근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "single-arm-machine-curl": {
    "id": "single-arm-machine-curl",
    "name": "싱글 암 머신 컬",
    "target": "이두근 · 전완근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "behind-the-back-cable-curl": {
    "id": "behind-the-back-cable-curl",
    "name": "비하인드 백 케이블 컬",
    "target": "이두근 장두 · 전완근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "pronated-dumbbell-curl": {
    "id": "pronated-dumbbell-curl",
    "name": "프로네이티드 덤벨 컬",
    "target": "상완요골근 · 이두근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "ez-bar-reverse-curl": {
    "id": "ez-bar-reverse-curl",
    "name": "EZ바 리버스 컬",
    "target": "상완요골근 · 이두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "kettlebell-hammer-curl": {
    "id": "kettlebell-hammer-curl",
    "name": "케틀벨 해머 컬",
    "target": "이두근·상완근 · 전완근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "incline-dumbbell-reverse-curl": {
    "id": "incline-dumbbell-reverse-curl",
    "name": "인클라인 덤벨 리버스 컬",
    "target": "상완요골근 · 이두근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "bar-cable-overhead-triceps-extension": {
    "id": "bar-cable-overhead-triceps-extension",
    "name": "바 케이블 오버헤드 트라이셉스 익스텐션",
    "target": "삼두근 장두",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "dumbbell-lying-triceps-extension": {
    "id": "dumbbell-lying-triceps-extension",
    "name": "덤벨 라잉 트라이셉스 익스텐션",
    "target": "삼두근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "single-arm-dumbbell-lying-extension": {
    "id": "single-arm-dumbbell-lying-extension",
    "name": "싱글 암 덤벨 라잉 익스텐션",
    "target": "삼두근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "cross-body-cable-extension": {
    "id": "cross-body-cable-extension",
    "name": "크로스보디 케이블 익스텐션",
    "target": "삼두근 외측두",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "machine-overhead-extension": {
    "id": "machine-overhead-extension",
    "name": "머신 오버헤드 익스텐션",
    "target": "삼두근 장두",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "feet-elevated-bench-dip": {
    "id": "feet-elevated-bench-dip",
    "name": "피트 엘리베이티드 벤치 딥스",
    "target": "삼두근 · 전면삼각근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "rope-overhead-triceps-extension": {
    "id": "rope-overhead-triceps-extension",
    "name": "로프 오버헤드 트라이셉스 익스텐션",
    "target": "삼두근 장두",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "decline-close-grip-bench-press": {
    "id": "decline-close-grip-bench-press",
    "name": "디클라인 클로즈 그립 벤치프레스",
    "target": "삼두근 · 대흉근 하부",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "incline-close-grip-bench-press": {
    "id": "incline-close-grip-bench-press",
    "name": "인클라인 클로즈 그립 벤치프레스",
    "target": "삼두근 · 대흉근 상부",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "1-5-rep-squat": {
    "id": "1-5-rep-squat",
    "name": "1.5 렙 스쿼트",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "1-5-rep-leg-press": {
    "id": "1-5-rep-leg-press",
    "name": "1.5 렙 레그 프레스",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "1-5-rep-lunge": {
    "id": "1-5-rep-lunge",
    "name": "1.5 렙 런지",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "pause-leg-extension": {
    "id": "pause-leg-extension",
    "name": "페이즈 레그 익스텐션",
    "target": "대퇴사두",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "pause-leg-curl": {
    "id": "pause-leg-curl",
    "name": "페이즈 레그 컬",
    "target": "햄스트링 · 비복근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "pause-calf-raise": {
    "id": "pause-calf-raise",
    "name": "페이즈 카프 레이즈",
    "target": "비복근 · 가자미근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "behind-the-back-deadlift": {
    "id": "behind-the-back-deadlift",
    "name": "비하인드 더 백 데드리프트",
    "target": "둔근·대퇴사두 · 척추기립근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "deficit-sumo-deadlift": {
    "id": "deficit-sumo-deadlift",
    "name": "데피싯 스모 데드리프트",
    "target": "둔근·내전근 · 햄스트링",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "full-rom-leg-press": {
    "id": "full-rom-leg-press",
    "name": "풀 ROM 레그 프레스",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "pause-bulgarian-split-squat": {
    "id": "pause-bulgarian-split-squat",
    "name": "페이즈 불가리안 스플릿 스쿼트",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "tempo-bulgarian-split-squat": {
    "id": "tempo-bulgarian-split-squat",
    "name": "템포 불가리안 스플릿 스쿼트",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "deficit-split-squat": {
    "id": "deficit-split-squat",
    "name": "데피싯 스플릿 스쿼트",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "pause-goblet-squat": {
    "id": "pause-goblet-squat",
    "name": "페이즈 고블릿 스쿼트",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "wide-stance-hack-squat": {
    "id": "wide-stance-hack-squat",
    "name": "와이드 핵 스쿼트",
    "target": "둔근·내전근 · 대퇴사두",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "close-stance-hack-squat": {
    "id": "close-stance-hack-squat",
    "name": "클로즈 핵 스쿼트",
    "target": "대퇴사두 · 둔근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "double-kettlebell-romanian-deadlift": {
    "id": "double-kettlebell-romanian-deadlift",
    "name": "더블 케틀벨 루마니안 데드리프트",
    "target": "햄스트링·둔근 · 척추기립근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "single-leg-glute-bridge-march": {
    "id": "single-leg-glute-bridge-march",
    "name": "싱글 레그 글루트 브릿지 마치",
    "target": "대둔근 · 코어",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "sissy-squat-machine": {
    "id": "sissy-squat-machine",
    "name": "시시 스쿼트 머신",
    "target": "대퇴사두",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "weighted-glute-ham-raise": {
    "id": "weighted-glute-ham-raise",
    "name": "위티드 글루트 햄 레이즈",
    "target": "햄스트링·둔근 · 척추기립근",
    "equipments": [
      {
        "equipment": "plate"
      }
    ]
  },
  "weighted-reverse-nordic-curl": {
    "id": "weighted-reverse-nordic-curl",
    "name": "위티드 리버스 노르딕 컬",
    "target": "대퇴사두 · 고관절굴근",
    "equipments": [
      {
        "equipment": "plate"
      }
    ]
  },
  "weighted-toes-to-bar": {
    "id": "weighted-toes-to-bar",
    "name": "위티드 토즈 투 바",
    "target": "복직근 · 광배근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "captain-s-chair-twisting-raise": {
    "id": "captain-s-chair-twisting-raise",
    "name": "캡틴스 체어 트위스팅 레이즈",
    "target": "복사근 · 복직근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "seated-cable-woodchop": {
    "id": "seated-cable-woodchop",
    "name": "시티드 케이블 우드찹",
    "target": "복사근 · 복직근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "weighted-decline-sit-up": {
    "id": "weighted-decline-sit-up",
    "name": "위티드 디클라인 싯업",
    "target": "복직근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "plate"
      }
    ]
  },
  "stability-ball-jackknife": {
    "id": "stability-ball-jackknife",
    "name": "스위스볼 잭나이프",
    "target": "복직근 · 어깨",
    "equipments": [
      {
        "equipment": "ball"
      }
    ]
  },
  "dragon-flag-negative": {
    "id": "dragon-flag-negative",
    "name": "드래곤 플래그 네거티브",
    "target": "복직근 · 광배근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "anti-rotation-hold": {
    "id": "anti-rotation-hold",
    "name": "안티 로테이션 홀드",
    "target": "복사근·복횡근 · 복직근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "side-plank-with-reach": {
    "id": "side-plank-with-reach",
    "name": "사이드 플랭크 위드 리치",
    "target": "복사근 · 어깨",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "plank-with-leg-lift": {
    "id": "plank-with-leg-lift",
    "name": "플랭크 위드 레그 리프트",
    "target": "복직근 · 둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "boat-to-low-boat": {
    "id": "boat-to-low-boat",
    "name": "보트 투 로우 보트",
    "target": "복직근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "suitcase-carry": {
    "id": "suitcase-carry",
    "name": "수트케이스 캐리",
    "target": "복사근·전완근 · 승모근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "overhead-barbell-carry": {
    "id": "overhead-barbell-carry",
    "name": "오버헤드 바벨 캐리",
    "target": "삼각근·코어 · 승모근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "double-kettlebell-front-rack-carry": {
    "id": "double-kettlebell-front-rack-carry",
    "name": "더블 케틀벨 프론트 랙 캐리",
    "target": "코어·전완근 · 승모근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "bottoms-up-kettlebell-carry": {
    "id": "bottoms-up-kettlebell-carry",
    "name": "보텀업 케틀벨 캐리",
    "target": "전완근·어깨 · 코어",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "trap-bar-carry": {
    "id": "trap-bar-carry",
    "name": "트랩바 캐리",
    "target": "전완근·승모근 · 코어",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "plate-pinch-carry": {
    "id": "plate-pinch-carry",
    "name": "플레이트 핀치 캐리",
    "target": "전완 굴근 · 승모근",
    "equipments": [
      {
        "equipment": "plate"
      }
    ]
  },
  "sandbag-shouldering": {
    "id": "sandbag-shouldering",
    "name": "샌드백 숄더링",
    "target": "둔근·척추기립근 · 광배근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "sandbag-clean": {
    "id": "sandbag-clean",
    "name": "샌드백 클린",
    "target": "둔근·햄스트링 · 승모근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "sandbag-squat": {
    "id": "sandbag-squat",
    "name": "샌드백 스쿼트",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "sandbag-lunge": {
    "id": "sandbag-lunge",
    "name": "샌드백 런지",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "eccentric-chin-up": {
    "id": "eccentric-chin-up",
    "name": "이센트릭 친업",
    "target": "광배근·이두근 · 능형근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "eccentric-bench-press": {
    "id": "eccentric-bench-press",
    "name": "이센트릭 벤치프레스",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "eccentric-squat": {
    "id": "eccentric-squat",
    "name": "이센트릭 스쿼트",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "eccentric-deadlift": {
    "id": "eccentric-deadlift",
    "name": "이센트릭 데드리프트",
    "target": "둔근·햄스트링 · 승모근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "eccentric-leg-curl": {
    "id": "eccentric-leg-curl",
    "name": "이센트릭 레그 컬",
    "target": "햄스트링 · 비복근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "partial-deadlift": {
    "id": "partial-deadlift",
    "name": "파셜 데드리프트",
    "target": "척추기립근·둔근 · 승모근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "partial-squat": {
    "id": "partial-squat",
    "name": "파셜 스쿼트",
    "target": "대퇴사두 · 둔근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "partial-lateral-raise": {
    "id": "partial-lateral-raise",
    "name": "파셜 레터럴 레이즈",
    "target": "측면삼각근 · 상부승모근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "partial-barbell-curl": {
    "id": "partial-barbell-curl",
    "name": "파셜 바벨 컬",
    "target": "이두근 · 전완근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "top-half-leg-extension": {
    "id": "top-half-leg-extension",
    "name": "톱 하프 레그 익스텐션",
    "target": "대퇴사두",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "bottom-half-squat": {
    "id": "bottom-half-squat",
    "name": "바텀 하프 스쿼트",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "isometric-bench-hold": {
    "id": "isometric-bench-hold",
    "name": "아이소메트릭 벤치 홀드",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "isometric-squat-hold": {
    "id": "isometric-squat-hold",
    "name": "아이소메트릭 스쿼트 홀드",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "isometric-deadlift-hold": {
    "id": "isometric-deadlift-hold",
    "name": "아이소메트릭 데드리프트 홀드",
    "target": "둔근·햄스트링 · 승모근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "isometric-curl-hold": {
    "id": "isometric-curl-hold",
    "name": "아이소메트릭 컬 홀드",
    "target": "이두근 · 전완근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "isometric-lateral-raise-hold": {
    "id": "isometric-lateral-raise-hold",
    "name": "아이소메트릭 레터럴 레이즈 홀드",
    "target": "측면삼각근 · 상부승모근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "isometric-pull-up-hold": {
    "id": "isometric-pull-up-hold",
    "name": "아이소메트릭 풀업 홀드",
    "target": "광배근 · 이두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "isometric-push-up-hold": {
    "id": "isometric-push-up-hold",
    "name": "아이소메트릭 푸시업 홀드",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "tempo-pull-up": {
    "id": "tempo-pull-up",
    "name": "템포 풀업",
    "target": "광배근 · 이두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "tempo-leg-press": {
    "id": "tempo-leg-press",
    "name": "템포 레그 프레스",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "tempo-row": {
    "id": "tempo-row",
    "name": "템포 로우",
    "target": "광배근·능형근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "tempo-overhead-press": {
    "id": "tempo-overhead-press",
    "name": "템포 오버헤드 프레스",
    "target": "전면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "tempo-curl": {
    "id": "tempo-curl",
    "name": "템포 컬",
    "target": "이두근 · 전완근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "tempo-lateral-raise": {
    "id": "tempo-lateral-raise",
    "name": "템포 레터럴 레이즈",
    "target": "측면삼각근 · 상부승모근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "eccentric-nordic-curl": {
    "id": "eccentric-nordic-curl",
    "name": "이센트릭 노르딕 컬",
    "target": "햄스트링 · 둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "eccentric-calf-raise": {
    "id": "eccentric-calf-raise",
    "name": "이센트릭 카프 레이즈",
    "target": "비복근 · 가자미근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "partial-leg-press": {
    "id": "partial-leg-press",
    "name": "파셜 레그 프레스",
    "target": "대퇴사두 · 둔근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "partial-pulldown": {
    "id": "partial-pulldown",
    "name": "파셜 풀다운",
    "target": "광배근 · 이두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "1-25-rep-bench-press": {
    "id": "1-25-rep-bench-press",
    "name": "1.25 렙 벤치프레스",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "1-5-rep-shoulder-press": {
    "id": "1-5-rep-shoulder-press",
    "name": "1.5 렙 숄더 프레스",
    "target": "전면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "single-arm-machine-shoulder-press": {
    "id": "single-arm-machine-shoulder-press",
    "name": "싱글 암 머신 숄더 프레스",
    "target": "전면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "single-arm-machine-lat-pulldown": {
    "id": "single-arm-machine-lat-pulldown",
    "name": "싱글 암 머신 랫 풀다운",
    "target": "광배근 · 이두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "single-arm-machine-rear-delt": {
    "id": "single-arm-machine-rear-delt",
    "name": "싱글 암 머신 리어 델트",
    "target": "후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "single-arm-pec-deck-fly": {
    "id": "single-arm-pec-deck-fly",
    "name": "싱글 암 펙덱 플라이",
    "target": "대흉근 · 전면삼각근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "single-arm-cable-pulldown": {
    "id": "single-arm-cable-pulldown",
    "name": "싱글 암 케이블 풀다운",
    "target": "광배근 · 이두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "single-arm-landmine-row": {
    "id": "single-arm-landmine-row",
    "name": "싱글 암 랜드마인 로우",
    "target": "광배근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "landmine"
      }
    ]
  },
  "single-arm-smith-row": {
    "id": "single-arm-smith-row",
    "name": "싱글 암 스미스 로우",
    "target": "광배근 · 능형근",
    "equipments": [
      {
        "equipment": "smith"
      }
    ]
  },
  "single-arm-dumbbell-skull-crusher": {
    "id": "single-arm-dumbbell-skull-crusher",
    "name": "싱글 암 덤벨 스컬크러셔",
    "target": "삼두근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "single-arm-cable-crunch": {
    "id": "single-arm-cable-crunch",
    "name": "싱글 암 케이블 크런치",
    "target": "복사근·복직근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "single-arm-kettlebell-clean": {
    "id": "single-arm-kettlebell-clean",
    "name": "싱글 암 케틀벨 클린",
    "target": "둔근·햄스트링 · 승모근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "single-arm-kettlebell-snatch": {
    "id": "single-arm-kettlebell-snatch",
    "name": "싱글 암 케틀벨 스내치",
    "target": "둔근·삼각근 · 코어",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "one-arm-pull-up": {
    "id": "one-arm-pull-up",
    "name": "원암 풀업",
    "target": "광배근 · 이두근·코어",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "single-leg-machine-hip-thrust": {
    "id": "single-leg-machine-hip-thrust",
    "name": "싱글 레그 머신 힙 쓰러스트",
    "target": "대둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "single-arm-dumbbell-floor-press": {
    "id": "single-arm-dumbbell-floor-press",
    "name": "싱글 암 덤벨 플로어 프레스",
    "target": "대흉근 · 삼두근·코어",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "single-arm-overhead-carry": {
    "id": "single-arm-overhead-carry",
    "name": "싱글 암 오버헤드 캐리",
    "target": "삼각근·코어 · 전완근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "single-arm-dumbbell-deadlift": {
    "id": "single-arm-dumbbell-deadlift",
    "name": "싱글 암 덤벨 데드리프트",
    "target": "둔근·햄스트링 · 척추기립근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "kneeling-single-arm-cable-row": {
    "id": "kneeling-single-arm-cable-row",
    "name": "닐링 싱글 암 케이블 로우",
    "target": "광배근 · 이두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "kneeling-single-arm-lat-pulldown": {
    "id": "kneeling-single-arm-lat-pulldown",
    "name": "닐링 싱글 암 랫 풀다운",
    "target": "광배근 · 이두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "barbell-single-leg-romanian-deadlift": {
    "id": "barbell-single-leg-romanian-deadlift",
    "name": "바벨 싱글 레그 루마니안 데드리프트",
    "target": "햄스트링·둔근 · 코어",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "kneeling-single-arm-cable-curl": {
    "id": "kneeling-single-arm-cable-curl",
    "name": "닐링 싱글 암 케이블 컬",
    "target": "이두근 · 전완근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "continuous-box-jump": {
    "id": "continuous-box-jump",
    "name": "컨티뉴어스 박스 점프",
    "target": "대퇴사두·둔근 · 비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "continuous-broad-jump": {
    "id": "continuous-broad-jump",
    "name": "컨티뉴어스 브로드 점프",
    "target": "둔근·대퇴사두 · 햄스트링",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "triple-under": {
    "id": "triple-under",
    "name": "트리플 언더",
    "target": "비복근 · 어깨",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "burpee-broad-jump": {
    "id": "burpee-broad-jump",
    "name": "버피 브로드 점프",
    "target": "대퇴사두·대흉근 · 코어",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "ladder-in-and-out": {
    "id": "ladder-in-and-out",
    "name": "라더 인앤아웃",
    "target": "비복근·대퇴사두 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "ladder-icky-shuffle": {
    "id": "ladder-icky-shuffle",
    "name": "라더 아이키 셔플",
    "target": "대퇴사두·둔근 · 내전근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "cone-weave": {
    "id": "cone-weave",
    "name": "콘 위브",
    "target": "대퇴사두·둔근 · 중둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "box-drill": {
    "id": "box-drill",
    "name": "박스 드릴",
    "target": "대퇴사두·둔근 · 중둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "star-drill": {
    "id": "star-drill",
    "name": "스타 드릴",
    "target": "대퇴사두·둔근 · 중둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "backward-sled-drag": {
    "id": "backward-sled-drag",
    "name": "백워드 슬레드 드래그",
    "target": "대퇴사두 · 둔근·비복근",
    "equipments": [
      {
        "equipment": "sled"
      }
    ]
  },
  "lateral-sled-drag": {
    "id": "lateral-sled-drag",
    "name": "라테럴 슬레드 드래그",
    "target": "중둔근·내전근 · 대퇴사두",
    "equipments": [
      {
        "equipment": "sled"
      }
    ]
  },
  "battle-rope-in-and-out": {
    "id": "battle-rope-in-and-out",
    "name": "배틀로프 인앤아웃",
    "target": "어깨 · 코어·전완근",
    "equipments": [
      {
        "equipment": "battlerope"
      }
    ]
  },
  "battle-rope-side-to-side": {
    "id": "battle-rope-side-to-side",
    "name": "배틀로프 사이드 투 사이드",
    "target": "어깨·복사근 · 전완근",
    "equipments": [
      {
        "equipment": "battlerope"
      }
    ]
  },
  "battle-rope-jumping-slam": {
    "id": "battle-rope-jumping-slam",
    "name": "배틀로프 점프 슬램",
    "target": "어깨·대퇴사두 · 코어",
    "equipments": [
      {
        "equipment": "battlerope"
      }
    ]
  },
  "rope-climb": {
    "id": "rope-climb",
    "name": "로프 클라임",
    "target": "광배근·이두근 · 전완근·코어",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "pegboard-climb": {
    "id": "pegboard-climb",
    "name": "페그보드 클라임",
    "target": "광배근·전완근 · 이두근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "tire-jump-in-and-out": {
    "id": "tire-jump-in-and-out",
    "name": "타이어 점프 인앤아웃",
    "target": "대퇴사두·둔근 · 비복근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "side-wall-ball": {
    "id": "side-wall-ball",
    "name": "사이드 월 볼",
    "target": "복사근·대퇴사두 · 어깨",
    "equipments": [
      {
        "equipment": "medicineball"
      }
    ]
  },
  "dead-ball-over-shoulder-toss": {
    "id": "dead-ball-over-shoulder-toss",
    "name": "데드볼 오버 숄더 토스",
    "target": "둔근·척추기립근 · 어깨",
    "equipments": [
      {
        "equipment": "medicineball"
      }
    ]
  },
  "sandbag-carry-interval": {
    "id": "sandbag-carry-interval",
    "name": "샌드백 캐리 인터벌",
    "target": "코어·승모근 · 전완근·둔근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "aqua-jogging": {
    "id": "aqua-jogging",
    "name": "아쿠아 조깅",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "pool-walking": {
    "id": "pool-walking",
    "name": "풀 워킹",
    "target": "대퇴사두 · 둔근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "water-aerobics": {
    "id": "water-aerobics",
    "name": "워터 에어로빅",
    "target": "전신 · 코어",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "backward-monster-walk": {
    "id": "backward-monster-walk",
    "name": "백워드 몬스터 워크",
    "target": "중둔근 · 대둔근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "band-lateral-walk": {
    "id": "band-lateral-walk",
    "name": "밴드 라테럴 워크",
    "target": "중둔근 · 대둔근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "band-x-walk": {
    "id": "band-x-walk",
    "name": "밴드 X 워크",
    "target": "중둔근 · 내전근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "glute-activation-bridge": {
    "id": "glute-activation-bridge",
    "name": "글루트 액티베이션 브릿지",
    "target": "둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "seated-band-abduction": {
    "id": "seated-band-abduction",
    "name": "시티드 밴드 어브덕션",
    "target": "중둔근 · 대둔근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "seated-band-pull-apart": {
    "id": "seated-band-pull-apart",
    "name": "시티드 밴드 풀어파트",
    "target": "후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "band-overhead-squat": {
    "id": "band-overhead-squat",
    "name": "밴드 오버헤드 스쿼트",
    "target": "대퇴사두·삼각근 · 코어",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "lacrosse-ball-glute-release": {
    "id": "lacrosse-ball-glute-release",
    "name": "라크로스볼 글루트 릴리즈",
    "target": "둔근 · 이상근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "lacrosse-ball-foot-release": {
    "id": "lacrosse-ball-foot-release",
    "name": "라크로스볼 풋 릴리즈",
    "target": "족저근막 · 발내재근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "lacrosse-ball-pec-release": {
    "id": "lacrosse-ball-pec-release",
    "name": "라크로스볼 페크 릴리즈",
    "target": "대흉근 · 소흉근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "neck-isometric-hold": {
    "id": "neck-isometric-hold",
    "name": "넥 아이소메트릭 홀드",
    "target": "경부근 · 승모근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "band-ankle-dorsiflexion": {
    "id": "band-ankle-dorsiflexion",
    "name": "밴드 앵클 도르시플렉션",
    "target": "전경골근",
    "equipments": [
      {
        "equipment": "band"
      }
    ]
  },
  "shoulder-flexion-stretch": {
    "id": "shoulder-flexion-stretch",
    "name": "숄더 플렉션 스트레치",
    "target": "삼각근 · 광배근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "shoulder-extension-stretch": {
    "id": "shoulder-extension-stretch",
    "name": "숄더 익스텐션 스트레치",
    "target": "전면삼각근 · 대흉근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "seated-thoracic-rotation": {
    "id": "seated-thoracic-rotation",
    "name": "시티드 흉추 로테이션",
    "target": "흉추기립근 · 복사근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "neck-retraction": {
    "id": "neck-retraction",
    "name": "넥 리트랙션",
    "target": "경부심부굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "chin-tuck": {
    "id": "chin-tuck",
    "name": "친 턱",
    "target": "경부심부굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "prayer-stretch": {
    "id": "prayer-stretch",
    "name": "프레이어 스트레치",
    "target": "전완 굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "reverse-prayer-stretch": {
    "id": "reverse-prayer-stretch",
    "name": "리버스 프레이어 스트레치",
    "target": "전완 신근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "finger-extension-stretch": {
    "id": "finger-extension-stretch",
    "name": "핑거 익스텐션 스트레치",
    "target": "전완 굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "dynamic-hip-flexor-stretch": {
    "id": "dynamic-hip-flexor-stretch",
    "name": "다이나믹 힙 플렉서 스트레치",
    "target": "고관절굴근 · 대퇴사두",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "dynamic-hamstring-stretch": {
    "id": "dynamic-hamstring-stretch",
    "name": "다이나믹 햄스트링 스트레치",
    "target": "햄스트링 · 비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "dynamic-glute-stretch": {
    "id": "dynamic-glute-stretch",
    "name": "다이나믹 글루트 스트레치",
    "target": "둔근 · 이상근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "ankle-circle": {
    "id": "ankle-circle",
    "name": "앵클 서클",
    "target": "발목 · 비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "foot-arch-doming": {
    "id": "foot-arch-doming",
    "name": "풋 아치 도밍",
    "target": "발내재근 · 전경골근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "big-toe-extension": {
    "id": "big-toe-extension",
    "name": "빅 토 익스텐션",
    "target": "무지신근 · 발내재근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "spinal-wave": {
    "id": "spinal-wave",
    "name": "스파인 와브",
    "target": "척추기립근 · 복직근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "d-handle-cable-row": {
    "id": "d-handle-cable-row",
    "name": "D핸들 케이블 로우",
    "target": "광배근 · 이두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "rope-cable-row": {
    "id": "rope-cable-row",
    "name": "로프 케이블 로우",
    "target": "광배근·후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "wide-bar-cable-row": {
    "id": "wide-bar-cable-row",
    "name": "와이드 바 케이블 로우",
    "target": "광배근·후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "single-rope-cable-curl": {
    "id": "single-rope-cable-curl",
    "name": "싱글 로프 케이블 컬",
    "target": "이두근 · 전완근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "ez-bar-cable-pushdown": {
    "id": "ez-bar-cable-pushdown",
    "name": "EZ바 케이블 푸시다운",
    "target": "삼두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "rope-cable-kickback": {
    "id": "rope-cable-kickback",
    "name": "로프 케이블 킥백",
    "target": "삼두근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "reverse-grip-ez-pushdown": {
    "id": "reverse-grip-ez-pushdown",
    "name": "리버스 그립 EZ 푸시다운",
    "target": "삼두근 내측두",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "straight-bar-face-pull": {
    "id": "straight-bar-face-pull",
    "name": "스트레이트 바 페이스 풀",
    "target": "후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "front-cable-shrug": {
    "id": "front-cable-shrug",
    "name": "프론트 케이블 슈러그",
    "target": "상부승모근 · 전완근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "straight-bar-cable-pullover": {
    "id": "straight-bar-cable-pullover",
    "name": "스트레이트 바 케이블 풀오버",
    "target": "광배근 · 대원근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "cable-rear-delt-row": {
    "id": "cable-rear-delt-row",
    "name": "케이블 리어 델트 로우",
    "target": "후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "wide-grip-cable-upright-row": {
    "id": "wide-grip-cable-upright-row",
    "name": "와이드 그립 케이블 업라이트 로우",
    "target": "측면삼각근 · 승모근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "cross-body-cable-raise": {
    "id": "cross-body-cable-raise",
    "name": "크로스보디 케이블 레이즈",
    "target": "전면삼각근 · 측면삼각근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "cable-deadlift": {
    "id": "cable-deadlift",
    "name": "케이블 데드리프트",
    "target": "둔근·햄스트링 · 척추기립근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "ankle-strap-cable-hip-abduction": {
    "id": "ankle-strap-cable-hip-abduction",
    "name": "앵클 스트랩 케이블 힙 어브덕션",
    "target": "중둔근 · 대둔근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "cable-hip-flexion": {
    "id": "cable-hip-flexion",
    "name": "케이블 힙 플렉션",
    "target": "고관절굴근 · 대퇴사두",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "cable-knee-raise": {
    "id": "cable-knee-raise",
    "name": "케이블 니 레이즈",
    "target": "복직근 하부 · 고관절굴근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "cable-lift": {
    "id": "cable-lift",
    "name": "케이블 리프트",
    "target": "복사근 · 복직근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "cable-twist": {
    "id": "cable-twist",
    "name": "케이블 트위스트",
    "target": "복사근 · 복직근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "cable-pull-apart": {
    "id": "cable-pull-apart",
    "name": "케이블 풀 어파트",
    "target": "후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "cable"
      }
    ]
  },
  "dumbbell-z-press": {
    "id": "dumbbell-z-press",
    "name": "덤벨 Z 프레스",
    "target": "전면삼각근 · 코어·삼두근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "dumbbell-seesaw-press": {
    "id": "dumbbell-seesaw-press",
    "name": "덤벨 시소 프레스",
    "target": "전면삼각근 · 코어",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "seated-arnold-press": {
    "id": "seated-arnold-press",
    "name": "시티드 아놀드 프레스",
    "target": "전면·측면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "alternating-incline-dumbbell-curl": {
    "id": "alternating-incline-dumbbell-curl",
    "name": "얼터네이팅 인클라인 덤벨 컬",
    "target": "이두근 장두 · 전완근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "wide-dumbbell-curl": {
    "id": "wide-dumbbell-curl",
    "name": "와이드 덤벨 컬",
    "target": "이두근 단두 · 전완근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "dumbbell-skull-crusher": {
    "id": "dumbbell-skull-crusher",
    "name": "덤벨 스컬크러셔",
    "target": "삼두근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "dumbbell-jm-press": {
    "id": "dumbbell-jm-press",
    "name": "덤벨 JM 프레스",
    "target": "삼두근 · 대흉근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "dumbbell-pullover-to-press": {
    "id": "dumbbell-pullover-to-press",
    "name": "덤벨 풀오버 투 프레스",
    "target": "대흉근 · 광배근·삼두근",
    "equipments": [
      {
        "equipment": "dumbbell"
      }
    ]
  },
  "cheat-curl": {
    "id": "cheat-curl",
    "name": "치트 컬",
    "target": "이두근 · 전완근·척추기립근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "barbell-7s-curl": {
    "id": "barbell-7s-curl",
    "name": "바벨 7s 컬",
    "target": "이두근 · 전완근",
    "equipments": [
      {
        "equipment": "barbell"
      }
    ]
  },
  "kettlebell-side-press": {
    "id": "kettlebell-side-press",
    "name": "케틀벨 사이드 프레스",
    "target": "전면삼각근·복사근 · 삼두근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "kettlebell-bent-press": {
    "id": "kettlebell-bent-press",
    "name": "케틀벨 벤트 프레스",
    "target": "복사근·어깨 · 햄스트링",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "kettlebell-triceps-extension": {
    "id": "kettlebell-triceps-extension",
    "name": "케틀벨 트라이셉스 익스텐션",
    "target": "삼두근 장두",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "kettlebell-concentration-curl": {
    "id": "kettlebell-concentration-curl",
    "name": "케틀벨 컨센트레이션 컬",
    "target": "이두근 · 전완근",
    "equipments": [
      {
        "equipment": "kettlebell"
      }
    ]
  },
  "mace-360": {
    "id": "mace-360",
    "name": "메이스 360",
    "target": "어깨·코어 · 전완근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "mace-10-to-2": {
    "id": "mace-10-to-2",
    "name": "메이스 10 투 2",
    "target": "어깨·코어 · 전완근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "clubbell-swing": {
    "id": "clubbell-swing",
    "name": "클럽벨 스윙",
    "target": "어깨·전완근 · 코어",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "slam-ball-squat": {
    "id": "slam-ball-squat",
    "name": "슬램볼 스쿼트",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "medicineball"
      }
    ]
  },
  "log-carry": {
    "id": "log-carry",
    "name": "통나무 캐리",
    "target": "코어·승모근 · 전완근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "keg-carry": {
    "id": "keg-carry",
    "name": "케그 캐리",
    "target": "코어·둔근 · 전완근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "converging-incline-press-machine": {
    "id": "converging-incline-press-machine",
    "name": "컨버징 인클라인 프레스 머신",
    "target": "대흉근 상부 · 삼두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "converging-decline-press-machine": {
    "id": "converging-decline-press-machine",
    "name": "컨버징 디클라인 프레스 머신",
    "target": "대흉근 하부 · 삼두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "iso-lateral-incline-row": {
    "id": "iso-lateral-incline-row",
    "name": "아이소레터럴 인클라인 로우",
    "target": "광배근 · 후면삼각근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "iso-lateral-front-pulldown": {
    "id": "iso-lateral-front-pulldown",
    "name": "아이소레터럴 프론트 풀다운",
    "target": "광배근 · 이두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "iso-lateral-shoulder-press": {
    "id": "iso-lateral-shoulder-press",
    "name": "아이소레터럴 숄더 프레스",
    "target": "전면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "iso-lateral-leg-press": {
    "id": "iso-lateral-leg-press",
    "name": "아이소레터럴 레그 프레스",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "iso-lateral-low-row": {
    "id": "iso-lateral-low-row",
    "name": "아이소레터럴 로우 로우",
    "target": "광배근 하부 · 이두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "iso-lateral-high-row": {
    "id": "iso-lateral-high-row",
    "name": "아이소레터럴 하이 로우",
    "target": "광배근 상부 · 후면삼각근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "pendulum-leg-press": {
    "id": "pendulum-leg-press",
    "name": "펜듈럼 레그 프레스",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "belt-squat-machine": {
    "id": "belt-squat-machine",
    "name": "벨트 스쿼트 머신",
    "target": "대퇴사두·둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "glute-ham-developer-machine": {
    "id": "glute-ham-developer-machine",
    "name": "글루트 햄 디벨로퍼 머신",
    "target": "햄스트링·둔근 · 척추기립근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "horizontal-back-extension-machine": {
    "id": "horizontal-back-extension-machine",
    "name": "호리즌탈 백 익스텐션 머신",
    "target": "척추기립근 · 둔근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "plate-loaded-seated-calf": {
    "id": "plate-loaded-seated-calf",
    "name": "플레이트 로디드 시티드 카프",
    "target": "가자미근 · 비복근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "kneeling-leg-curl-machine": {
    "id": "kneeling-leg-curl-machine",
    "name": "닐링 레그 컬 머신",
    "target": "햄스트링 · 비복근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "converging-row-machine": {
    "id": "converging-row-machine",
    "name": "컨버징 로우 머신",
    "target": "광배근·능형근 · 이두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "plate-loaded-preacher-curl": {
    "id": "plate-loaded-preacher-curl",
    "name": "플레이트 로디드 프리처 컬",
    "target": "이두근 단두 · 전완근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "machine-lying-triceps-extension": {
    "id": "machine-lying-triceps-extension",
    "name": "머신 라잉 트라이셉스 익스텐션",
    "target": "삼두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "vertical-chest-press-machine": {
    "id": "vertical-chest-press-machine",
    "name": "버티컬 체스트 프레스 머신",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "low-pulley-row-machine": {
    "id": "low-pulley-row-machine",
    "name": "로우 풀리 로우 머신",
    "target": "광배근 하부 · 이두근",
    "equipments": [
      {
        "equipment": "machine"
      }
    ]
  },
  "elevated-pike-push-up": {
    "id": "elevated-pike-push-up",
    "name": "엘리베이티드 파이크 푸시업",
    "target": "전면삼각근 · 삼두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "fingertip-push-up": {
    "id": "fingertip-push-up",
    "name": "핑거팁 푸시업",
    "target": "대흉근 · 전완근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "knuckle-push-up": {
    "id": "knuckle-push-up",
    "name": "너클 푸시업",
    "target": "대흉근 · 전완근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "typewriter-push-up": {
    "id": "typewriter-push-up",
    "name": "타입라이터 푸시업",
    "target": "대흉근 · 삼두근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "slider-push-up": {
    "id": "slider-push-up",
    "name": "슬라이더 푸시업",
    "target": "대흉근 · 삼두근·코어",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "slider-fly": {
    "id": "slider-fly",
    "name": "슬라이더 플라이",
    "target": "대흉근 · 코어",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "slider-knee-tuck": {
    "id": "slider-knee-tuck",
    "name": "슬라이더 니 턱",
    "target": "복직근 · 어깨",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "ring-muscle-up": {
    "id": "ring-muscle-up",
    "name": "링 머슬업",
    "target": "광배근·대흉근 · 이두근·삼두근",
    "equipments": [
      {
        "equipment": "trx"
      }
    ]
  },
  "ring-row": {
    "id": "ring-row",
    "name": "링 로우",
    "target": "광배근·능형근 · 이두근",
    "equipments": [
      {
        "equipment": "trx"
      }
    ]
  },
  "ring-pull-up": {
    "id": "ring-pull-up",
    "name": "링 풀업",
    "target": "광배근 · 이두근",
    "equipments": [
      {
        "equipment": "trx"
      }
    ]
  },
  "ring-face-pull": {
    "id": "ring-face-pull",
    "name": "링 페이스 풀",
    "target": "후면삼각근 · 능형근",
    "equipments": [
      {
        "equipment": "trx"
      }
    ]
  },
  "ring-triceps-extension": {
    "id": "ring-triceps-extension",
    "name": "링 트라이셉스 익스텐션",
    "target": "삼두근 · 코어",
    "equipments": [
      {
        "equipment": "trx"
      }
    ]
  },
  "ring-biceps-curl": {
    "id": "ring-biceps-curl",
    "name": "링 비셉스 컬",
    "target": "이두근 · 전완근",
    "equipments": [
      {
        "equipment": "trx"
      }
    ]
  },
  "single-leg-box-squat": {
    "id": "single-leg-box-squat",
    "name": "싱글 레그 박스 스쿼트",
    "target": "대퇴사두·둔근 · 코어",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "wall-sit-march": {
    "id": "wall-sit-march",
    "name": "월 싯 마치",
    "target": "대퇴사두 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "step-calf-raise": {
    "id": "step-calf-raise",
    "name": "스텝 카프 레이즈",
    "target": "비복근 · 가자미근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "lying-leg-raise": {
    "id": "lying-leg-raise",
    "name": "라잉 레그 레이즈",
    "target": "복직근 하부 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "heel-touch": {
    "id": "heel-touch",
    "name": "힐 터치",
    "target": "복사근 · 복직근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "dead-bug-extension": {
    "id": "dead-bug-extension",
    "name": "데드버그 익스텐션",
    "target": "복횡근·복직근 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "quadruped-hip-extension": {
    "id": "quadruped-hip-extension",
    "name": "쿼드러페드 힙 익스텐션",
    "target": "대둔근 · 햄스트링",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "knee-to-chest-stretch": {
    "id": "knee-to-chest-stretch",
    "name": "니 투 체스트 스트레치",
    "target": "둔근 · 척추기립근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "double-knee-to-chest": {
    "id": "double-knee-to-chest",
    "name": "더블 니 투 체스트",
    "target": "척추기립근 · 둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "lying-glute-stretch": {
    "id": "lying-glute-stretch",
    "name": "라잉 글루트 스트레치",
    "target": "둔근 · 이상근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "standing-it-band-stretch": {
    "id": "standing-it-band-stretch",
    "name": "스탠딩 IT밴드 스트레치",
    "target": "장경인대 · 대퇴근막장근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "straddle-stretch": {
    "id": "straddle-stretch",
    "name": "스트래들 스트레치",
    "target": "내전근·햄스트링 · 고관절",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "side-split-stretch": {
    "id": "side-split-stretch",
    "name": "사이드 스플릿 스트레치",
    "target": "내전근 · 햄스트링",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "front-split-stretch": {
    "id": "front-split-stretch",
    "name": "프론트 스플릿 스트레치",
    "target": "고관절굴근·햄스트링 · 둔근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "step-calf-stretch": {
    "id": "step-calf-stretch",
    "name": "스텝 카프 스트레치",
    "target": "비복근 · 가자미근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "scalene-neck-stretch": {
    "id": "scalene-neck-stretch",
    "name": "스케일렌 넥 스트레치",
    "target": "사각근 · 흉쇄유돌근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "pec-minor-stretch": {
    "id": "pec-minor-stretch",
    "name": "펙 마이너 스트레치",
    "target": "소흉근 · 대흉근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "biceps-stretch": {
    "id": "biceps-stretch",
    "name": "바이셉스 스트레치",
    "target": "이두근 · 전면삼각근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "finger-stretch": {
    "id": "finger-stretch",
    "name": "핑거 스트레치",
    "target": "전완 굴근·신근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "standing-back-extension-stretch": {
    "id": "standing-back-extension-stretch",
    "name": "스탠딩 백 익스텐션 스트레치",
    "target": "척추기립근 · 복직근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "side-reaching-child-s-pose": {
    "id": "side-reaching-child-s-pose",
    "name": "사이드 리칭 차일드 포즈",
    "target": "광배근 · 척추기립근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "seated-side-stretch": {
    "id": "seated-side-stretch",
    "name": "시티드 사이드 스트레치",
    "target": "복사근 · 광배근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "kneeling-hamstring-stretch": {
    "id": "kneeling-hamstring-stretch",
    "name": "닐링 햄스트링 스트레치",
    "target": "햄스트링 · 비복근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "side-lying-quad-stretch": {
    "id": "side-lying-quad-stretch",
    "name": "사이드 라잉 쿼드 스트레치",
    "target": "대퇴사두 · 고관절굴근",
    "equipments": [
      {
        "equipment": "bodyweight"
      }
    ]
  },
  "foam-roller-tfl-release": {
    "id": "foam-roller-tfl-release",
    "name": "폼롤러 TFL 릴리즈",
    "target": "대퇴근막장근 · 장경인대",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "foam-roller-pec-release": {
    "id": "foam-roller-pec-release",
    "name": "폼롤러 펙 릴리즈",
    "target": "대흉근 · 소흉근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  },
  "foam-roller-erector-release": {
    "id": "foam-roller-erector-release",
    "name": "폼롤러 척추기립근 릴리즈",
    "target": "척추기립근 · 요방형근",
    "equipments": [
      {
        "equipment": "other"
      }
    ]
  }
};
