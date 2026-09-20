# 운동별 연속 동작 영상 — 재개 기록

최종 갱신: 2026-09-09. 이 문서는 진행 중 작업의 인계 자료이며 완료 보고가 아니다.

## 사용자 승인과 목표

- 전체 카탈로그 1351종, 운동별 전용 영상 1개. 다른 운동 영상으로 대체하지 않는다.
- 최우선은 정확한 운동 방법: 기구 세팅, 손·발 위치, 그립, 관절과 동작 경로를 출처와 비교한다.
- 사용자가 승인한 회색 사람 캐릭터/청록색 반바지 스타일. 짧고 저용량. 예시: 8초, 24fps.
- 사용자는 제작·수정·검증을 일괄 승인했고 재확인 때문에 지연되는 것을 원하지 않는다. 일상적인 작업 동의를 다시 묻지 않는다.
- 운영체제/도구의 필수 권한 승인을 우회하거나 자동으로 누르지 않는다. 기존 승인된 명령을 우선한다.
- 세션이 종료되면 자동 재실행은 보장되지 않는다. 새 세션에서 이 파일을 읽고 다음 미완료 작업부터 재개한다.
- 기존 로그인/크래시 수정 및 다른 미커밋 변경을 보존한다. 현재 작업을 임의로 배포하지 않는다.

## 먼저 읽을 파일

1. docs/원칙.md
2. RULE.md
3. docs/DEVELOPMENT-ROADMAP.md (P1.4)
4. 이 문서와 tools/media/motion-guides/coverage.json, reviews.json, verification.json

git status를 새로 확인한다. 다른 작업의 변경을 지우지 않는다. bash.exe.stackdump는 무관한 미추적 파일.

## 현재 확인된 수치

- 새 연속 영상: 5종 렌더링. 시각 검토 통과는 dumbbell-shoulder-press, dumbbell-lateral-raise 2종.
- barbell-curl, lat-pulldown, hammer-curl-2는 보간 잔상/배경 문제로 보류 또는 거부. 완성 수에 넣지 않는다.
- 이전 ai-v2 사진 슬라이드 68종은 새 연속 영상 수에 포함하지 않는다. v2 검토 통과 16종은 별도.
- 실제 수치는 아래 명령으로 재확인한다. 1351종 완료 아님.

## 중요한 최신 발견과 바로 다음 작업

1. 16자세 레터럴 원본은 도구 표시 이미지에 없던 검은 배경 얼룩이 저장 JPG에 나타남.
   motion-inspect dumbbell-lateral-raise source로 확인. FFmpeg 보간만의 문제가 아니다.
   흰색 합성 후에도 얼룩이 밝게 남음을 직접 확인했다. PNG RGB를 유지하고 알파만 제거하도록 motion-register를 다시 수정한 상태이다.
   **removeAlpha 재등록 후 검은/흰색 얼룩 제거를 원본과 영상에서 직접 확인했다. 레터럴 16자세 최종 시각 검토 통과. 흰색 합성은 실패였으므로 되돌리지 말 것.**
2. 레터럴 재렌더링 및 검토 완료: 94619bytes,8초24fps. 다른 운동의 손·기구 잔상 검토와 보류 원본 재제작으로 진행한다.
3. 나머지 4종도 원본과 영상 비교. source 변경은 기존 hash 검토를 무효화하므로 재검토 필요.
4. 통과한 v3 영상의 화면/실기기 검증. 앱 코드 연결은 숄더프레스 1종 기준 구현됨.
5. 종목별 자료 조사 → 전용 원본 생성 → 원본 검토 → 렌더 → 중간 프레임 검토 → passed 기록 순으로 계속.
6. 단순히 파일이 재생되거나 용량이 작다는 이유로 운동 정확성을 통과 처리하지 않는다.

## 파일/명령

승인된 명령 접두사: node tools/media/manage-ai-guides.mjs

- motion-checkpoint URI_ENCODED_NOTE: 현재 수량과 다음 작업을 이 문서 마지막에 저장. 새 권한 요청을 줄이기 위해 진행 기록에 사용.
- motion-coverage: 등록/렌더/검토 수와 누락 목록 저장
- motion-list 20: 미등록 종목의 ID/기구 확인
- motion-register ID PNG_PATH URI_ENCODED_SPEC_JSON
- motion-build ID: 해당 종목 렌더/ffprobe/전체 decode/32프레임 contact sheet 생성
- motion-inspect ID source: 등록된 원본 JPG를 data URL로 출력
- motion-inspect ID: 최종 contact sheet를 data URL로 출력
- motion-review ID URI_ENCODED_REVIEW_JSON
- check-mobile: localhost:3110의 기존 demo-video-fits-phone E2E

PowerShell에서는 JSON 인수를 encodeURIComponent(JSON.stringify(spec)) 후 작은따옴표로 감싸야 한다.
등록/빌드/검토는 공유 JSON을 쓰므로 순차 실행하고 실행 중 세션을 끝까지 기다린다.
등록 spec: {prompt, equipment, sources:[https URL], panels?:8|16, cycle?:'reverse'|'full', cutout?:false}.
passed review: {status:"passed", checks:{exercise,equipment,setup,hands,feet,movement}, note}.
모든 체크에 구체적인 관찰을 쓰고 원본·영상 hash 일치 시에만 manifest에 공개한다.

도구: tools/media/manage-motion-guides.mjs
원본/명세/검토: tools/media/motion-guides/
영상: public/exercise-guides/ai-v3/
프레임/접촉시트: tools/media/motion-guides/ID/ (Git 제외)
기술 결과: verification.json. 현재 renderVersion 2: obmc/bidir/mb16/search32/vsbmc0.
v1은 aobmc/bidir/mb8/search64/vsbmc1. 버전 변경으로 렌더 캐시 구분.
8자세 4x2, 16자세 4x4. 480정사각, 8초24fps, H264 main/yuv420p/CRF28/무음/faststart.
cycle 은 8자세·16자세 모두 reverse/full 지원(2026-09-18 추가).
reverse = 원본이 전진 구간만 담고 왕복 재생, full = 원본 16칸이 한 주기 전체를 담고 되감지 않고 2회 재생.
전반부와 후반부가 다른 동작(점프·보행·좌우 교대·그립 전환)은 반드시 full 을 쓴다. 둘 다 40프레임/8초.
자체 생체역학 3D 리깅이 아닌 AI 이미지 보간이다.

## 2026-09-15 누끼(배경 제거) 방식 — 사용자 결정, 이후 모든 v3 기본값

- 사용자 결정: 운동모드 화면에 녹아들게(플랜핏처럼) **누끼 + 운동모드 배경색**. 라이트 #fafafa(bg-zinc-50), 다크 #09090b(dark:bg-zinc-950) + 옅은 윤곽광.
- `motion-build` 가 자동 처리: `tools/media/motion-cutout.py`(rembg birefnet-general)로 패널 누끼 → 8/16장 공통 영역 크롭 → 두 벌 렌더.
  출력 `ai-v3/ID.mp4` + `ai-v3/ID-dark.mp4`, 접촉시트 `contact-sheet.jpg` + `contact-sheet-dark.jpg`(`motion-inspect ID dark`).
- 파이썬 환경: `tools/media/.venv-cutout`(Git 제외). 없으면 `python -m venv tools/media/.venv-cutout` 후 `-m pip install -r tools/media/requirements-cutout.txt`.
- renderVersion 5. 리뷰는 라이트·다크 해시 둘 다 일치해야 공개(`guide-review.mjs`). 검토 시 **두 접촉시트 모두** 확인: 기구(케이블·바)가 누끼로 잘려 나가지 않았는지, 배경 잔여물, 가장자리 번짐.
- 누끼가 기구를 망가뜨리는 종목만 spec 에 `cutout:false`(예전 회색 여백 한 벌).
- 앱: `manifest-dark.json` 종목만 `darkUrl` → `MediaEmbed` 가 테마별 영상 + 박스 없이 표시.
- 기존 통과 101종 재렌더: `node tools/media/rebuild-cutout-guides.mjs`(중단 후 재실행하면 이어서). 목록·로그 `motion-guides/_cutout-rebuild/`. 재렌더 후 재검토 전까지 manifest 에서 빠진다.

## 2026-09-18 케이블 기구는 누끼 금지 — 재검토에서 확인

- 누끼(rembg)는 **도르래에서 손잡이로 이어지는 가는 케이블 선을 통째로 지운다.** 케이블 없이 손잡이만 공중에 뜬 영상이 된다.
  웨이트 스택 기둥도 프레임마다 흰 유령으로 변하거나 사라진다. cable-rope-hammer-curl-2 · face-pull-2 · cable-woodchopper 에서 직접 확인.
- 해결은 기존 방침 그대로 **spec 에 `cutout:false`**(예전 회색 여백 한 벌, 다크 영상 없음). 9/14 에 close-grip-lat-pulldown 등 6종에 이미 적용돼 있었다.
- 2026-09-18 에 `cutout:false` 를 추가한 종목(13):
  cable-rope-hammer-curl-2, face-pull-2, cable-woodchopper(재렌더 완료) /
  lat-pulldown, lat-pulldown-2, wide-grip-lat-pulldown, low-cable-fly, straight-arm-pulldown-2,
  rope-triceps-pushdown, triceps-pushdown-2, reverse-grip-pushdown, pallof-press-2, trx-row
  (뒤 10종은 원본에 케이블/스트랩이 보이는 것을 확인하고 재렌더 큐에 도달하기 전에 미리 적용 — 헛돌린 누끼 시간 절약).
- 선별 기준: **원본에 가는 케이블·스트랩 선이 보이면 cutout:false.** 케이블이 노출되지 않은 셀렉토라이즈 머신
  (hip-abduction-machine, hip-adduction-machine, hammer-strength-high-row 등)은 누끼로도 멀쩡하니 기본값 유지.
- `cutout:false` 로 재렌더하면 도구가 기존 `ID-dark.mp4` 를 지운다(manage-motion-guides.mjs). manifest-dark 에서 자동으로 빠진다.

## 2026-09-18 보간 잔상 — 8패널 원본이 주원인

- 재검토에서 불합격한 잔상 사례는 거의 전부 **8패널 원본**이거나 구간 이동거리가 큰 종목이다:
  kettlebell-press, decline-sit-up, farmer-s-carry, cable-woodchopper(모두 8패널),
  hip-adduction-machine, kettlebell-front-squat, hanging-leg-raise-2.
- 대응: 해당 종목은 **16패널로 재생성**하거나 빠른 구간의 포즈 간격을 좁힌다. 렌더 설정(renderVersion 5)은 건드리지 않는다.
- 별개 유형: **가는 수평 부재가 끊어지는 문제**. ez-bar-skull-crusher 의 벤치 앞다리,
  hanging-knee-raise 의 철봉이 점선처럼 끊긴다. 원본에서 해당 부재를 패널마다 고정하거나 굵게 만들어야 한다.

## 2026-09-18 8패널 → 16패널 재생성 (사용자 지시: "8패널 원본 전부")

작업 지시서: `tools/media/motion-guides/_repanel-16/plan.json` (프롬프트·출처·기구 전부 포함)
자동 등록·렌더 드라이버: `node tools/media/repanel-16.mjs <PNG 디렉터리>`

- 등록된 8패널 원본은 **총 28종**. 세 갈래로 나뉜다.
- **A군 20종 — 16패널 프롬프트 작성 완료, 이미지 생성만 남음.**
  plan.json 의 `groupA_convert`. 각 프롬프트는 통과본 dumbbell-shrug 의 16패널 서식을 따르고
  (4x4 2048x2048 · 고정 카메라 · 행 경계 리셋 금지 · 중앙 70% 안에 전신과 기구),
  기존 8패널 프롬프트의 출처 기반 자세 설명을 16단계로 다시 쪼갰다.
  `motion-register` 의 검증 규칙(프롬프트 길이·https 출처·카탈로그 기구 일치·panels16+cycle reverse)을 미리 통과시켜 둬서
  PNG 만 있으면 등록에서 튕기지 않는다.
- **B군 5종 → 2026-09-18 사용자 지시로 도구에 16패널 full-cycle 지원을 추가해 A군에 합류(총 25종).**
  dead-bug(좌우 교대), farmer-s-carry(보행), jump-squat(점프·착지), meadows-row-2(비대칭), zottman-curl-2(그립 전환)은
  `cycle:'full'` 로 등록하고, 프롬프트에 **16칸이 한 주기 전체**이며 cell16 이 cell1 로 이어져야 한다고 명시했다.
- **C군 3종 — 변환 무의미, 제외 권장.** hollow-body-hold · plate-pinch · stability-ball-plank 은 등척성 홀드라
  16칸이 전부 같은 자세다. 재등록하면 통과한 리뷰만 무효화된다.
- 🔴 **이 세션에서는 이미지를 만들 수 없다.** imagegen 은 Codex 세션의 도구이고,
  `motion-register` 는 `~/.codex/generated_images` 아래 PNG 만 받는다. 생성은 imagegen 이 있는 세션에서 해야 한다.
- 재등록하면 기존 원본 JPG·spec 을 덮어쓰므로 **해시 불일치로 기존 리뷰가 자동 비공개**된다.
  A군 20종의 현재 상태는 passed 9 / pending 7 / rejected 4 이고,
  passed 9종(behind-the-back-wrist-curl, dumbbell-shoulder-press, kettlebell-row, leg-press-2,
  low-bar-squat, reverse-wrist-curl, triceps-dip, trx-row, v-up-2)은 재렌더 후 재검토 전까지 manifest 에서 빠진다.
  즉 A군을 한꺼번에 등록하면 공개 수가 일시적으로 90 → 81 로 떨어진다.
- 덤으로 해결되는 것: A군에 있는 실사 스타일 원본 4종(cable-woodchopper, decline-sit-up,
  hanging-leg-raise-2, kettlebell-front-squat)은 새 프롬프트가 승인된 회색 캐릭터를 명시하므로 스타일 문제도 같이 정리된다.

## 2026-09-18 캐릭터 스타일이 다른 원본 6종

승인된 회색 캐릭터/청록 반바지가 아니라 **실사 사진 스타일**인 원본이 섞여 있다. 카탈로그 통일성 문제라 사용자 결정 필요:
cable-woodchopper, decline-sit-up, hanging-leg-raise-2, kettlebell-front-squat, farmer-s-carry, kettlebell-row.
이 중 kettlebell-row 만 렌더 품질에 문제가 없어 passed 로 두었다(스타일은 리뷰 note 에 기록).

## 재사용할 생성 이미지

생성 루트:
C:/Users/admin/.codex/generated_images/01a080f8-30ec-7612-abc2-7e538ac31959/

현재 등록 5종의 정확한 프롬프트/출처는 motion-guides/ID.json에 저장됨.
- barbell-curl: exec-8b0b89b5-8c99-4518-be3f-c9de15f47400.png
- dumbbell-lateral-raise 8자세: exec-b76719fd-85e0-4017-8894-2cdc549875b8.png
- dumbbell-lateral-raise 16자세(현재): exec-a5d2298a-4427-44c3-a80c-1edc42b612d7.png
- lat-pulldown: exec-a104e03f-f82f-4f2b-8861-bddd84029fc2.png
- dumbbell-shoulder-press: exec-a5944258-c24b-4b15-8a01-ac1f2386f1ae.png
- hammer-curl-2: exec-34858102-c6fa-4349-8c76-06c5b3fb0bb7.png

未등록/보류 원본:
- bench-press 최초 exec-5bfe6496-2925-450f-8bcd-cfcdf4cac784.png: 바가 목/얼굴 쪽처럼 보여 보류.
- bench-press 재생성 exec-11f0669b-6651-45a7-aef2-e4ddd18feb2e.png: 측면에서 바벨 기구와 양손 확인 곤란, 패널간 높이 리셋. 보류.
- barbell-bent-over-row 최초 exec-a301916a-39df-4139-afed-b9534503dfcb.png: 무릎/몸통 변동.
- row 재생성 exec-076bd5a3-9450-44e6-8540-90c5c56997cb.png: 행 경계 위치 변동, 기구 측면 불명확. 보류.
- reverse-barbell-curl exec-ea875076-6d14-47a2-9220-06f860a1b9ae.png: 상단 그립이 뒤집혀 보임, 행 경계 리셋. 보류.
- dumbbell-shrug exec-f8b31437-dd8c-426a-9792-aea51eb56711.png: 어깨 상승은 있지만 행 경계 위치/기구 변동. 검토 대기.
- barbell-shrug exec-33c46b8e-bf84-4c70-ac00-557dd2b86c0b.png: 행 경계 위치 변동. 검토 대기.

승인된 데드리프트 예시:
public/exercise-guides/previews/conventional-deadlift-smooth.mp4
8초24fps400x480,113793bytes. 도구 build-deadlift-motion-preview.mjs 및 ai-guides/deadlift-motion-preview.json 참고.
일반 v3 생성과 달리 최종 crop400:480:60:0이 있음. 아직 v3 카탈로그에 편입 안 됨.

## 운동 출처

- https://www.nasm.org/resource-center/exercise-library/barbell-bicep-curl
- https://www.acefitness.org/resources/everyone/exercise-library/26/lateral-raise/
- https://www.acefitness.org/resources/everyone/exercise-library/158/seated-lat-pulldown/
- https://www.acefitness.org/resources/everyone/exercise-library/45/seated-overhead-press/
- https://www.nasm.org/resource-center/exercise-library/barbell-bench-press
- https://www.acefitness.org/resources/everyone/exercise-library/12/bent-over-row/
- https://www.muscleandstrength.com/exercises/standing-hammer-curl.html
- https://www.muscleandstrength.com/exercises/reverse-barbell-curl.html
- https://www.puregym.com/exercises/back/shrugs/dumbbell-shrug/
- https://www.puregym.com/exercises/back/shrugs/barbell-shrug/

참조 사진을 복사하지 않고 설명을 연구해 원본 AI 캐릭터 제작. 저작권 무위험 보장이나 전문가 인증을 주장하지 않는다.

## 코드 및 검증 근거

- exercise-media.ts: v3 manifest + passed reviews 우선, 기구 일치 필터 유지.
- media-embed.tsx: v2/v3 정상 배속.
- exercise-media-equipment.test.ts: v3 연결·다른 기구 차단·거부 리뷰 제외 추가.
- 2026-09-09 대상 Vitest 2파일7개 통과, 변경 파일 ESLint·tsc --noEmit 통과.
- 보간 renderVersion2 JS 변경 후 ESLint 통과, 레터럴 ffprobe/전체 decode 통과.
- 최신 v3 화면 E2E/빌드/실기기는 아직 미검증. 전체 작업 완료로 표시 금지.
- 기존 v2 작업의 테스트/다른 코드 수정은 AI-EXERCISE-GUIDES.md와 로드맵에 기록.

## 환경 참고

기본 파일/패치 도구가 반복적으로 Windows apply deny-read ACLs 오류 발생.
필수 실행만 정해진 정책에 따라 escalation. 사용자 일괄 동의가 시스템 권한을 해제하지는 않는다.
기존 승인된 제작 명령을 우선해 불필요한 권한 창을 줄인다.
이미지 생성은 imagegen SKILL의 기본 내장 도구 사용. API/CLI 대체는 별도 승인 없이 사용하지 않는다.
메모/문서에는 토큰·비밀번호·.env 값을 복사하지 않는다.

## 최신 체크포인트

2026-09-20T02:11:58.064Z

등록 117 / 렌더 132 / 시각 검토 통과 82 / 대상 1351

2026-09-20: 누끼 재렌더 104종 전량 완료(failed 0). 재렌더로 해시가 무효화된 분량을 전부 재검토해 재검토 대기 0. 현재 공개 82(다크 65 + cutout:false 회색박스 17), pending 23, rejected 12. 누끼 파손 유형이 네 갈래로 정리됐다: (1) 케이블·스트랩은 굵기와 무관하게 무조건 지워짐 → cutout:false (총 16종 적용). (2) 누운 벤치는 몸에 가려 배경으로 판정됨 → cutout:false 로 lying-triceps-extension·ez-bar-skull-crusher·nordic-hamstring-curl 복구. (3) 가는 수평 부재 끊김은 굵기 문제 — hanging-knee-raise 철봉만 해당하고 스미스 레일·평행봉·랙 기둥은 멀쩡. (4) 빠른 구간 보간 뭉개짐은 누끼와 무관하며 대부분 8패널 원본이라 16패널 재생성으로만 해결된다. 원본 자체가 틀린 것도 둘 발견: pallof-press-2 는 16칸 전부 손이 가슴에 붙어 프레스 구간이 없고, reverse-grip-pushdown 은 완전 측면 카메라라 언더핸드 그립을 판별할 수 없다(Codex 세션은 passed 로 봤으나 사용자 결정으로 pending 유지). 다음: _repanel-16/plan.json 의 A군 25종 16패널 이미지 생성(이 세션 불가, imagegen 필요) → repanel-16.mjs 로 등록·렌더 → 재검토. 앱 화면 E2E·실기기 재생은 여전히 미실행.
