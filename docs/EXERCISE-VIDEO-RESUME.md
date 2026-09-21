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
등록 spec: {prompt, equipment, sources:[https URL], panels?:8|16, cycle?:reverse}.
passed review: {status:"passed", checks:{exercise,equipment,setup,hands,feet,movement}, note}.
모든 체크에 구체적인 관찰을 쓰고 원본·영상 hash 일치 시에만 manifest에 공개한다.

도구: tools/media/manage-motion-guides.mjs
원본/명세/검토: tools/media/motion-guides/
영상: public/exercise-guides/ai-v3/
프레임/접촉시트: tools/media/motion-guides/ID/ (Git 제외)
기술 결과: verification.json. 현재 renderVersion 2: obmc/bidir/mb16/search32/vsbmc0.
v1은 aobmc/bidir/mb8/search64/vsbmc1. 버전 변경으로 렌더 캐시 구분.
8자세 4x2, 16자세 4x4. 480정사각, 8초24fps, H264 main/yuv420p/CRF28/무음/faststart.
16자세는 reverse만 지원. 자체 생체역학 3D 리깅이 아닌 AI 이미지 보간이다.

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

2026-09-16T08:39:02.568Z

등록 135 / 렌더 134 / 시각 검토 통과 120 / 대상 1351

역순 진행 유지. 2026-09-16 추가 재개: 54 good-morning·55 sumo-deadlift·56 seated-calf-raise 신규 통과. 각각101550/114002/122556bytes, 480x480/8초24fps/무음H264, ffprobe·전체 디코딩·원본/32프레임 직접 검토. 누적120/1351.

원본의 흰 구분선이 정확한 등분 경계와 어긋나 잘림/흰 테두리가 생기는 문제를 수정. motion-panel-bounds.mjs가 좁은 흰 선을 찾아 프레임을 나누며, 회색/넓은 흰 배경은 기존 등분 유지. renderVersion4. 기존 통과 영상 일괄 재렌더하지 않음. 구분선 위치 회귀 테스트 최초1실패 후 탐색범위 수정, 최종2통과.

검증: Node test(guide-review/manage-motion-guides/motion-panel-bounds)3파일5개, Vitest exercise-media-equipment5개·video-resource2개, 총12개 통과. 변경 도구3파일 ESLint·전체tsc --noEmit·git diff --check 통과. 모바일 화면/실기기·전체E2E·커밋·배포·Heltch 복사 이번 회차 미실행.

다음 역순57 standing-calf-raise,58 seated-leg-curl,59 leg-extension은 Heltch 동일ID/-2 파일 존재(각 기구 재확인 후 건너뛰기). 다음 새 후보60 hack-squat,61 goblet-squat,62 front-squat. 누락 항목을 완료 처리하지 않음.

보류 유지: walking-lunge·step-up·russian-twist·mountain-climber 및 기존 rejected. walking-lunge51·step-up53은 이전2개 원본씩 실패했고 재제작 필요.

이번 최종 PNG 루트 C:/Users/admin/.codex/generated_images/01a0a91d-fcae-7ab0-ad2f-af38d3a9633e/: good-morning exec-bd53c56a-24d7-4939-a4a6-4531f3dd2ffa.png, sumo-deadlift exec-1bac8438-4085-4c71-b32b-fce3718f1502.png, seated-calf-raise exec-4da89e18-5219-4da7-8864-23f2d73686ef.png. 내장 imagegen 사용, 프롬프트/출처는 각 motion-guides/{id}.json.

굿모닝: 첫16컷을 보정 렌더로 통과. 8컷 exec-c2c456f3-da70-41b9-a99b-51059103a413.png는 머리 잔상,16컷 exec-b67f2f04-2c26-4581-98e6-ebbd2ee7abbe.png는 검은배경/손상으로 폐기. 스모8컷 exec-d4645746-e5b2-4ddb-9d50-9f4d31ce8869.png는 머리여백 부족으로 미등록. 카프 최초 exec-edf0ed6f-ae39-4bcb-92f3-42037498d01d.png는 지렛대구조 불명확으로 미등록.

이전 완료: crunch48·sit-up49 신규통과. 이전 Heltch복사:2026-09-15 통과15종·관련60파일 복사/해시확인, tools/media/imports/health-app-ui-2026-09-15/import.json, target manifest미변경. 이후 신규5종(crunch,sit-up,good-morning,sumo-deadlift,seated-calf-raise)은 아직Heltch미복사.
