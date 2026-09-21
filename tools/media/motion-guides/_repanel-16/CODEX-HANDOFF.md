# Codex 인계 — 운동 영상 16패널 재생성

작성: 2026-09-21 KST. 아래 내용을 읽고 기존 작업을 이어서 진행하세요.

## 작업 위치와 먼저 읽을 파일

- 저장소: `D:\git\heltch\health_app`. 명령은 이 디렉터리에서 실행합니다.
- `AGENTS.md` → `docs/원칙.md` → `RULE.md` → `docs/DEVELOPMENT-ROADMAP.md`의 P1.4 → `docs/EXERCISE-VIDEO-RESUME.md` 순으로 확인합니다.
- 이 문서 옆 `plan.json`과 현재 `git status --short`를 확인합니다. 다른 세션의 변경을 되돌리지 마세요.
- 사용자는 운동별 제작·수정·검증을 이미 승인했습니다. 통상적인 작업 동의를 다시 묻지 말고 진행하되, 도구·OS 권한은 준수합니다.

## 목표와 현재 상태

8패널 원본에서 발생하는 동작 간격·보간 문제를 운동별 16패널 원본으로 개선합니다. 회색 인체 캐릭터와 청록 반바지를 사용하고, 손·발·기구·운동 경로의 정확성을 우선합니다. 다른 운동 영상으로 대체하지 않습니다.

직전 확인치는 등록 117 / 렌더 132 / 검토 통과 82 / 전체 대상 1351입니다. 재개 시 실제 파일과 리뷰로 다시 확인하세요. 숫자가 같아도 개별 운동의 승인 여부는 따로 확인합니다.

`plan.json`은 다른 세션에서 갱신되었습니다. `cable-woodchopper`는 `groupA_convert`에서 `done_regenerated`로 이동했습니다. **이 표시는 원본 재생성 완료이지, 시각 검토 통과가 아닙니다. 우드초퍼는 여전히 pending입니다.** `done_regenerated`에 남은 옛 프롬프트를 현재 명세 위에 덮어쓰지 마세요. 실제 최신 명세는 `tools/media/motion-guides/cable-woodchopper.json`입니다.

## 바로 이어갈 작업: cable-woodchopper

현재 채택본은 후보 6입니다. 기구 쪽 골반 바깥에서 출발하도록 수정했지만, 중간 손·머리 잔상과 불균일한 자세 간격이 남아 있습니다. 특히 8→9번째 원본 자세 부근과 초기 머리 방향 전환을 확인하세요. 16패널이라는 이유만으로 통과시키지 않습니다.

- 원본 PNG: `tools/media/imports/woodchopper-16-20260920/candidate-6.png`
- 등록 원본/정확한 편집 프롬프트: `tools/media/motion-guides/cable-woodchopper.jpg`, 같은 이름의 `.json`
- 영상: `public/exercise-guides/ai-v3/cable-woodchopper.mp4`
- 최종 32프레임 시트: `tools/media/motion-guides/cable-woodchopper/contact-sheet.jpg`
- 백업·명세·재생 증거: `tools/media/imports/woodchopper-16-20260920/`
- 설정: `panels:16`, `cycle:"reverse"`, `cutout:false`. 케이블 보존을 위해 배경 제거를 다시 켜지 않습니다.
- 영상 규격: 480×480, 8초, 24fps, 282968바이트. 전체 디코딩 통과.
- 현재 영상 SHA256: `28871e7d7a11c53fe4b79552e42f1f7eb4c14a2e3f1b0dcebb92d1905159b3ff`

후보 7은 자세 간격 개선이 부족했고, 후보 8은 시작 자세·마지막 케이블 연결 문제가 있어 미채택했습니다. 같은 지시로 반복 생성하기 전에 원본의 잘못된 구간을 구체적으로 확인하세요. 디코딩·재생 성공은 운동 정확성이나 시각 품질 통과의 근거가 아닙니다.

참고 출처:

- https://www.strengthlog.com/cable-machine-wood-chop-low-to-high/
- https://cdn.muscleandstrength.com/exercises/low-wood-chop.html

## 재생 검사에서 해결된 것과 남은 것

`tools/media/verify-woodchopper-20260920.mjs`가 현재 영상 전용 검사입니다. MP4 직접 탐색 방식 대신 loopback HTML video 페이지, HTTP Range 응답, 단계 로그와 일부 대기 제한을 적용한 뒤 정상 종료했습니다. 이전 정체의 단일 원인을 확정한 것은 아닙니다.

Pixel 7 에뮬레이션의 모바일 Chromium에서 재생과 7.5초 탐색이 통과했습니다. 증거 `tools/media/imports/woodchopper-16-20260920/playback.json`은 영상 해시를 포함합니다. 새 렌더 후 반드시 다시 실행하세요. 이 검사는 앱 화면 E2E나 물리 Android 실기기 검사가 아닙니다. 둘 다 미완료입니다.

## 제작·검토 순서와 명령

1. 기존 원본·명세·영상을 보관하고 실제 상태를 확인합니다.
2. `imagegen` 스킬을 읽고 내장 이미지 도구로 생성·수정합니다. 이번 세션에서는 내장 도구를 사용했습니다. API/CLI 전환은 별도 승인 없이 하지 않습니다.
3. 원본 16칸을 먼저 검토합니다. 행 경계에서 자세가 초기화되지 않는지, 기구·손발·케이블이 보존되는지 확인합니다.
4. 등록·렌더는 순차 실행하고, 새 최종 프레임과 재생을 검증한 후 해시를 기준으로 리뷰합니다.

```powershell
node tools/media/manage-ai-guides.mjs motion-coverage
node tools/media/manage-ai-guides.mjs motion-inspect cable-woodchopper source
node tools/media/manage-ai-guides.mjs motion-build cable-woodchopper
node tools/media/manage-ai-guides.mjs motion-inspect cable-woodchopper
node tools/media/verify-woodchopper-20260920.mjs
node --test tools/media/guide-review.test.mjs
```

`motion-inspect`는 이미지 data URL을 출력합니다. 원본과 최종 시트를 실제로 열어 보세요. `motion-build`는 현재 등록 원본으로 렌더할 뿐, 새 이미지를 생성하지 않습니다.

등록 명령 형식: `node tools/media/manage-ai-guides.mjs motion-register ID PNG_PATH URI_ENCODED_SPEC_JSON`.
명세는 실제 프롬프트, `equipment`, HTTPS `sources`, `panels`, `cycle`, 필요한 `cutout:false`를 포함합니다. JSON은 `encodeURIComponent(JSON.stringify(spec))`로 인코딩합니다. `motion-register`는 사용자 프로필의 `.codex/generated_images` 아래 PNG만 받습니다. 생성물을 프로젝트에도 보관하세요.

리뷰 명령 형식: `node tools/media/manage-ai-guides.mjs motion-review ID URI_ENCODED_REVIEW_JSON`.
`passed`는 `checks.exercise/equipment/setup/hands/feet/movement`에 실제 관찰 근거가 필요합니다. 누끼 영상은 라이트·다크 양쪽을 검사합니다. 재등록·재렌더로 해시가 바뀌면 이전 리뷰는 재사용할 수 없습니다.

## 나머지 plan.json 작업

우드초퍼 수정·검토 후 `groupA_convert`의 실제 미완료 항목을 진행합니다. 목록과 현재 등록 명세가 일치하는지 먼저 비교하세요. `groupC_skip_isometric`의 홀드 3종은 불필요하게 재등록하지 않습니다.

`reverse`는 한 방향 동작을 원본에 담고 되감아 복귀합니다. `full`은 원본 16칸이 한 주기 전체이며 16→1이 이어져야 합니다. 좌우 교대·보행·점프·그립 전환을 임의로 reverse로 바꾸지 마세요.

배치 드라이버: `node tools/media/repanel-16.mjs <생성PNG디렉터리>`.
파일명은 `<운동ID>.png`입니다. 현재 `groupA_convert`에 있고 PNG가 존재하는 항목을 등록·렌더하며, 기존 파일과 리뷰 해시에 영향을 줍니다. 원하는 이번 대상만 있는 폴더를 사용하고, 이미 완료한 종목을 무심코 다시 등록하지 마세요. 우드초퍼는 현재 이 목록에서 빠져 있어 별도 명령으로 다룹니다.

### 이미지 생성 지시 — A군 24종 (이 인계의 본 작업)

대상은 `plan.json` 의 `groupA_convert` **24종**. 각 항목의 `prompt` 를 **한 글자도 고치지 말고 그대로** imagegen 에 넣는다.
프롬프트는 통과본 `dumbbell-shrug` 의 16패널 서식을 따르고, 기존 8패널 프롬프트의 출처 기반 자세 설명을 16단계로 다시 쪼갠 것이다.
`equipment`·`sources`·`panels`·`cycle` 은 드라이버가 `plan.json` 에서 읽어 넣으므로 **PNG 만 만들면 된다.**

- **규격**: 2048×2048, 4열×4행 16칸(프롬프트에 이미 명시). 칸마다 동작이 조금씩 진행하고 **행 경계에서 리셋되면 안 된다.**
- **저장 위치·이름**: `~/.codex/generated_images/<이번-배치-폴더>/<운동ID>.png`.
  파일명이 곧 운동 ID다. `motion-register` 는 그 경로 아래 PNG 만 받는다.
- **이번 배치만 담긴 폴더를 쓴다.** `repanel-16.mjs` 는 폴더 안에서 `groupA_convert` 의 ID 와 이름이 맞는 PNG 를 **전부** 등록·렌더한다.
- 한 번에 다 만들 필요 없다. 만든 만큼 넣고 `node tools/media/repanel-16.mjs <폴더>` 를 다시 돌리면 이어서 처리된다(PNG 없는 종목은 조용히 건너뛴다).

**cycle 은 프롬프트에 이미 반영돼 있으니 임의로 바꾸지 않는다.**

- `reverse` 19종 — 16칸이 전진 구간만 담고 되감아 복귀:
  behind-the-back-wrist-curl, behind-the-neck-press, bird-dog, curtsy-lunge-2, decline-sit-up,
  dumbbell-front-raise, dumbbell-shoulder-press, glute-ham-raise, hanging-leg-raise-2,
  kettlebell-front-squat, kettlebell-press, kettlebell-row, leg-press-2, low-bar-squat,
  reverse-wrist-curl, triceps-dip, trx-row, v-up-2, wrist-roller
- `full` 5종 — 16칸이 **한 주기 전체**이고 cell16 이 cell1 로 이어져야 한다:
  dead-bug(좌우 교대), farmer-s-carry(보행), jump-squat(점프·착지), meadows-row-2(비대칭), zottman-curl-2(그립 전환).
  전반부와 후반부가 다른 동작이라 reverse 로 바꾸면 동작 자체가 틀린다.

**등록 전에 원본 16칸을 먼저 본다.** 여기서 거르면 종목당 10~30분짜리 렌더를 통째로 아낀다(`cutout:false` 종목은 50~60초):

1. 행 경계(4→5, 8→9, 12→13)에서 자세·카메라·스케일이 리셋되지 않았는지
2. 기구(케이블·바·스트랩·벤치)가 16칸 전부에 살아 있는지
3. 승인된 **회색 인체 캐릭터 / 청록 반바지**인지 — 실사 사진 스타일이면 버리고 다시 만든다
4. 전신과 기구가 중앙 70% 안에 들어오는지
5. 빠른 구간의 자세 간격이 균등한지 (간격이 튀면 보간 잔상이 그대로 남는다 — 8패널을 버린 이유가 이것이다)

**부작용(정상)**: 등록은 기존 8패널 원본 JPG 와 spec 을 덮어쓰므로 **해시 불일치로 기존 리뷰가 자동 비공개**된다.
24종 중 지금 공개 중인 6종이 빠져 **공개 82 → 76 으로 일시 하락**한다:
`behind-the-back-wrist-curl`, `dumbbell-shoulder-press`, `kettlebell-row`, `leg-press-2`, `triceps-dip`, `trx-row`.
재검토를 통과하면 돌아온다.

**손대지 말 것**

- `cable-woodchopper` — 이미 16패널로 재등록됨. `done_regenerated` 에 있고 `groupA_convert` 에는 없다.
  이 배치 폴더에 PNG 를 넣지 마라(넣으면 옛 프롬프트로 덮어쓰고 `cutout:false` 가 날아간다).
- `groupC_skip_isometric` 3종(`hollow-body-hold`, `plate-pinch`, `stability-ball-plank`) — 등척성 홀드라
  16칸이 전부 같은 자세다. 재등록하면 통과한 리뷰만 무효화된다.

**렌더가 끝나도 공개가 아니다.** 라이트/다크 접촉시트를 실제로 열어 보고 `motion-review` 로 기록해야 manifest 에 올라간다.
장시간 배치를 돌릴 때는 노트북 덮개를 열어 둔다 — `keep-awake.ps1` 은 유휴 절전만 막고 덮개 닫기는 못 막는다(9/19 에 23시간 정체한 원인).

## 환경과 검증 기록

- Windows 도구에서 `apply deny-read ACLs` 오류가 반복되었습니다. 필요한 명령만 정책에 따라 escalation하고, 권한 제한을 우회하지 않습니다.
- 기본 누끼 모델의 메모리 부족 이력이 있습니다. 동시 대형 추론을 피하고 로우바 스쿼트의 별도 기록을 확인하세요. `u2netp` 비교본은 승인된 대체본으로 취급하지 않습니다.
- `pallof-press-2`는 프레스 구간 부재, `reverse-grip-pushdown`은 언더핸드 그립 판별 문제로 pending입니다. 이전 통과 기록만 보고 되살리지 마세요.
- 직전 통과: 리뷰 테스트 3개, 재생 검사 스크립트 ESLint, `tsc --noEmit`, `git diff --check`.
- 전체 커밋 전 게이트와 앱 UI·Android 실기기는 완료하지 않았습니다. 임의 배포·커밋을 진행하지 마세요.
- `resume-woodchopper-20260920.mjs`는 옛 후보로 되돌리는 임시 스크립트여서 삭제했습니다. 재사용하지 않습니다.
- 작업 후 로드맵과 `EXERCISE-VIDEO-RESUME.md`를 실제 증거로 갱신하고, 남은 문제를 정확히 기록합니다.

이 인계문은 문서 작성 시점의 기록입니다. 후속 변경이 있으면 현재 명세·영상 해시·리뷰를 우선합니다.
