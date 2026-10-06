# 운동별 연속 동작 영상 — 재개 기록

## 2026-10-06 누끼·표시 크기 후속 검증
- 최종 대상 ESLint·tsc --noEmit 통과. SSR 크기 검사는 테마 하이드레이션 대신 라이트 영상 src를 명시해 검증하며 전체 앱 E2E 재실행은 아님.
- 내장 imagegen background-extraction 및 수정1회로 체스트딥 투명 후보2개 생성. 1254×1254 실제 알파 확인. 머리/어깨 가장자리·기구 안쪽 잔여가 남아 rejected, 앱 미반영. 후보/리뷰: tools/media/imports/chest-dip-cutout-20261006/.
- 크기 수정은 기존 작업본에 유지. 실제 MediaEmbed SSR·실제 Tailwind·Edge 검사: 폭320px 높이320→192px, 폭390/768px 높이384→192px. 가로 넘침 없음. 크기 상한50%이며 좁은 화면에서 실제 높이는 너비에 따라 다름. tools/testing/verify-media-compact.cjs, test-results/media-compact-resume/.
- 누끼 캐시 테스트1개 통과. 실제 자산 SHA 대조: 등록146/렌더145/검토통과104/전체1351. 새 공개 승인0, 기존 영상 보존.
- 로컬 기본 추론은 여유6.7GiB로 10GB 기준 미달. 다음: 충분한 메모리에서 기본 모델의 별도 체스트딥 후보 제작 또는 원본 재제작 후 기구/가장자리/보간 재검토. 운영 배포·실기기는 미검증.


## 2026-10-06 운동모드 크기 조정·누끼 재개 환경
- 운동모드 MediaEmbed compact: 높이 상한 min(23dvh,12rem), 전신 비율 유지. mobile-edge 320/390/768px 및 시각 검증 통과.
- Python: C:/git/Bit-O/video-tools/python312/python.exe, 기존 requirements-cutout.txt(rembg2.0.84) 복원. test_motion_cutout.py 1개 통과. 시스템 Python 설정 변경 없음.
- 기존 coverage 기록은 등록146/렌더145/검토104/전체1351. 이 수치는 기존 파일 집계이며 이번 신규 승인 수가 아님.
- 체스트딥/컨벤셔널 데드리프트 원본과 pending 사유 재확인: 목/몸통 보간 잔상 보류 유지. 프런트레이즈는 이미 승인된 rig 수정본이므로 자동 덮어쓰지 않음.
- 새 누끼 후보 실행 승인 후 메모리 가드에서 중단(여유 약5.3GiB, 기준10GB). 검증 서버 종료 후 약7.3GiB로 증가했으나 기준 미달 재확인. 새 영상/후보 공개 없음. 다음은 여유 메모리 확보 후 chest-dip-review-20261006 별도 후보 생성과 라이트/다크 기구 보존·잔상 검토.


## 2026-09-30 커밋/푸시 요청 — 검증 및 스테이징
- 영상 작업460파일 스테이징. 단위2723개, 스키마82개, 린트 오류0/경고42, TypeScript 통과. E2E 로컬3190에서 page 생성 timeout 및 DB ENOTFOUND로 1실패/367미실행. 사용자가 E2E/빌드 미통과 상태의 커밋·푸시를 명시적으로 승인함. 프로덕션 next build --webpack은 컴파일 후 기존 src/app/icon-192.png/route.ts의 contentType export 타입 오류로 실패. 빌드 전 독립 tsc는 통과했으나 전체 빌드 검증은 미통과.
- .gitattributes는 렌더 원본 바이트 보존. 스테이징 입력SHA72건 일치. .env 계열은 원본 프로젝트에서 검증용으로 복사했으며 gitignored; 포함 금지. 임시 scripts/의 CommonJS 린트 설명 추가는 로컬에만 존재.

## 2026-09-30 3D 바벨 어깨4종 추가 — 현재 미리보기 25종
- 바벨 슈러그(`barbell-shrug`), 바벨 프런트레이즈(`barbell-front-raise`), 바벨 업라이트로우(`barbell-upright-row`), 와이드 그립 업라이트로우(`wide-grip-upright-row`) 추가. **25종/50파일 미리보기**, 정식 앱 교체 전.
- `studio-batch-6.mjs` / `exercise-motion-6.mjs`: 슈러그 견갑대 상승, 프런트레이즈 어깨 굴곡, 업라이트로우 양손 간격을 고정하는 두 관절 해법. 와이드 시작점이 팔 길이를 초과한 초기 후보 오류를 수정한 뒤 렌더. 출처와 구현 차이는 `batch-6-sources.json`.
- 4개 프로세스 병렬 최대10분4초, 양 테마1080x1080/60fps/8초480프레임. 실행 PID/시간 `batch-6.json`. 주요 정면/측면/손 자세와 압축된 양 테마 시트 확인. 기존 배치1~5의 입력과 영상40개 SHA 보존.
- 481개 자세의 팔 길이/발 고정/전완 회전 연속성/그립 간격/중앙 봉 간격과 종목별 동작 검사11개, 기존49개 포함 **60개 통과**. 대상6파일 ESLint 및 TypeScript 통과. 초기 미리보기는 와이드 범위 오류로 실패 후 수정했고, 최종 렌더는 모두 성공.
- 새8영상 전체480프레임 decode/SHA 확인, 로컬390px Chromium 탐색/8초 이상 반복/가로넘침 검사 통과. 프레임 드롭은 `batch-6-verification.json`에 기록하며 무드롭 보장은 아님. 갤러리25종 및 이전 비교→신규 모드 전환 검사 `batch-6-gallery.json`. 검토 SHA와 한계 `batch-6-reviews.json`.
- 보기: http://127.0.0.1:3189/exercise-guides/skinned-pilot/batch.html . 기본 선택 바벨 슈러그. queue `skinnedPreviews:25`, 기존2D quality-hold 및 정식 앱 미제작1199종 유지. **다음: 후속 운동 제작, 앱 경로/자막/캐시 통합, Android 실기기 검증.** 앱 반영/배포/커밋/푸시 없음. 종료 후 상주 생성 작업 없음.

## 2026-09-30 3D 바벨 4종 추가 — 현재 미리보기 21종
- 기본 바벨 컬(`barbell-curl`), 리버스 바벨 컬(`reverse-barbell-curl`), 와이드 그립 바벨 컬(`wide-grip-barbell-curl`), 클로즈 그립 바벨 컬(`close-grip-barbell-curl`) 추가. **21종/42파일 미리보기**, 정식 앱 교체 전.
- `studio-batch-5.mjs` / `exercise-motion-5.mjs`: 단일 바벨과 양손 접촉, 종목별 고정 그립 폭, 리버스 회내 그립. 초기 하단 자세의 반바지 관통을 수정한 뒤 렌더. 중앙 봉과 몸통/의복 간격을 481개 자세에서 검사했으며 전신 충돌 검증은 아님. 출처와 적용 차이는 `batch-5-sources.json`.
- 4개 프로세스 병렬 렌더, 최대 약 10분24초. 라이트/다크 각 1080x1080, 60fps, 8초/480프레임. 실행 기록 `batch-5.json`. 정면/손/측면 자세 및 압축된 양 테마 접촉 시트 검토. 기존 배치1~4의 원본/영상 SHA 보존 확인.
- 새 자세 검사10개와 기존39개 총 **49개 통과**, 대상 ESLint와 TypeScript 통과. 새 영상8개 전체480프레임 decode 및 SHA 검증. 모바일 Chromium 390px에서 탐색/반복/오류/가로 넘침 검사 통과. 드롭 프레임은 `batch-5-verification.json`에 기록하며 무드롭 보장은 아님.
- 갤러리21종, 이전 비교→새 영상 전환과 모드 복구/비교 버튼 숨김 검증(`batch-5-gallery.json`). 기본 선택 바벨 컬. 검토 SHA와 한계 `batch-5-reviews.json`, queue `skinnedPreviews:21`.
- 보기: http://127.0.0.1:3189/exercise-guides/skinned-pilot/batch.html . 기존 2D quality-hold 및 정식 앱 미제작1199종 유지. **다음: 후속 운동 제작, 앱 경로/자막/캐시 통합, Android 실기기 검증.** 커밋/푸시/배포 없음. 종료 후 상주 생성 작업 없음.

## 2026-09-30 3D 후속 4종 — 현재 미리보기 17종

- 사용자 계속 영상 제작 지시로 조트만컬(`zottman-curl`), 와이드 덤벨컬(`wide-dumbbell-curl`), 스캡션(`scaption`), 얼터네이팅 프런트레이즈(`alternating-dumbbell-front-raise`) 추가. **3D 미리보기17종/34파일**, 정식 앱 교체 수 아님.
- `exercise-motion-4.mjs` + `studio-batch-4.mjs`: 조트만 상승→최고점 회내→회내 하강→바닥 회외의 분리된 시간 구간, 회전 분기점에서 전완 피부가 튀지 않게 연속 회전량 적용. 와이드컬 어깨 외회전/바깥 컬 경로, 스캡션 정면면에서35도 전방/엄지 위, 프런트 좌우 교대. 기존13종 원본/영상 보존. 출처/변형은 `batch-4-sources.json`.
- `render-skinned-batch-4.mjs`: 실제4개 병렬 약9분42초, 인코더당2스레드. 양 테마1080x1080/60fps/8초480프레임. 실행시간/PID `batch-4.json`. 정면 주요 자세·손 확대·스캡션 측면·인코딩된 양 테마 시트 검토. 3D 모델 미리보기이며 실제 촬영/근육 시뮬레이션은 아님.
- 모든481개 자세(루프 끝 포함)에서 팔 길이·발 고정·전완 회전/손잡이 연속성 검사. 종목별 그립 전환/경로 포함 새8개 + 기존31개 **39개 통과**. 대상6파일 ESLint·TypeScript 통과. 최초 ESLint 프로세스 생성이 runner spawn_ready 오류로 실패하여 재실행 후 통과.
- 새8영상 전체 decode 각480프레임/1080px60fps 및 원본/영상SHA 확인. 390px Chromium 5시점 탐색·8초 이상 재생·반복·가로 넘침 통과. 드롭 수는 `batch-4-verification.json` 기록, 무드롭 보장 아님. 시각 검토 결과와 정확한 SHA는 `batch-4-reviews.json`.
- 갤러리17종, 기존 영상 비교에서 신규 종목 선택 시 모드 복귀·이전 버튼 숨김·HTTP/페이지 오류 없음 검증(`batch-4-gallery.json`). 보기: http://127.0.0.1:3189/exercise-guides/skinned-pilot/batch.html . 기본 선택 조트만컬.
- queue `skinnedPreviews:17` 및 신규4종 증거 연결. 기존2D quality-hold 유지, 정식 앱 미제작1199종 수 유지. **다음: 후속3D 운동 제작, 앱 경로/자막 시점/캐시 통합, Android 실기기 검증.** 앱 교체/배포·커밋·푸시 없음. 종료 후 상주 생성 작업 없음.

## 2026-09-30 3D 어깨 4종 추가 — 현재 미리보기 13종

- 사용자 추가 지시로 덤벨 숄더프레스(`dumbbell-shoulder-press`), 얼터네이팅 숄더프레스(`alternating-dumbbell-shoulder-press`), 싱글암 프런트레이즈(`single-arm-dumbbell-front-raise`), 싱글암 레터럴레이즈(`single-arm-dumbbell-lateral-raise`) 추가. **3D 미리보기 총13종/26파일**, 정식 앱 교체 수 아님.
- `studio-batch-3.mjs` + `exercise-motion-3.mjs`: 양팔 동시/교대 프레스, 한팔 앞/옆 상승 구분. 프레스 쇄골/어깨 연계, 레이즈 어깨 이하 높이와 작은 팔꿈치 굽힘, 한팔 종목의 반대 손 이완/덤벨 숨김. 기존9종 원본/영상 보존. 출처 `batch-3-sources.json`.
- `render-skinned-batch-3.mjs`: 실제4프로세스 병렬, 약9분14초. 양 테마1080x1080/60fps/8초480프레임. 실행 기록 `batch-3.json`. 정면 시작/중간/최고점, 측면·손 확대와 인코딩된 양 테마 프레임 시트 검토. 덤벨 간격/손 접촉/화면 잘림 확인. 실제 촬영이 아닌 3D 모델 미리보기.
- 새 동작9개 + 기존22개 총31개 검사 통과. 새8파일 전체 decode 각480프레임, 원본/결과 SHA 확인, 390px Chromium 5시점 탐색·8초 이상 재생·루프·가로 넘침 검사 통과. 프레임 드롭 수는 `batch-3-verification.json`에 별도 기록하며 무드롭 보장 아님. 대상6파일 ESLint·TypeScript 통과. `batch-3-reviews.json`에 정확한 파일별 검토 SHA 연결.
- 갤러리13종 선택, 숄더프레스 이전 영상 비교, 신규 종목의 이전 버튼 숨김 및 모드 전환, HTTP/페이지 오류 없음 확인(`batch-3-gallery.json`). 보기: http://127.0.0.1:3189/exercise-guides/skinned-pilot/batch.html . 기본 선택은 새 덤벨 숄더프레스.
- queue `skinnedPreviews:13`, 이번4종 증거 연결. 기존2D quality-hold 유지, 정식 앱 미제작1199종 수 유지. **다음: 후속3D 종목 제작, 앱 경로/자막 시점/캐시 통합, Android 실기기 검증.** 커밋/푸시/배포 없음. 종료 후 상주 생성 작업 없음.

## 2026-09-30 3D 신규 4종 추가 — 현재 미리보기 9종

- 사용자 계속 추가 지시로 얼터네이팅 덤벨컬(`alternating-dumbbell-curl`), 크로스바디 해머컬(`cross-body-hammer-curl`), 덤벨 리버스컬(`dumbbell-reverse-curl`), 싱글암 덤벨 숄더프레스(`single-arm-dumbbell-shoulder-press`) 제작. 3D 미리보기 총9종/18파일. 신규4종은 기존 앱 미제작 종목이며 아직 앱 경로에 게시하지 않았으므로 정식 미제작1199종 수는 유지.
- `studio-batch-2.mjs`와 `exercise-motion-2.mjs`에서 교대 타이밍·몸 앞 교차 경로·회내 그립·한팔 프레스/어깨 연계 구현. 프레스 반대 손 덤벨 제거 및 손 이완, 머리 위까지 담는 고정 구도. 기존5종 렌더 원본 변경 없음. 자세 출처/변형 설명은 `skinned-3d/batch-2-sources.json`.
- `render-skinned-batch-2.mjs`: 4개 프로세스 병렬, 인코더당2스레드, 약9분51초. 각 운동 라이트/다크 1080x1080, 60fps, 8초480프레임. 실행 PID/시간은 `batch-2.json`, 원본/결과 SHA는 종목별 candidate.json.
- 시각 확인: 정면 주요 자세, 교차컬 좌우 최고점/측면, 프레스 시작/최고점/손 확대, 인코딩된 양 테마 프레임 시트. 덤벨/몸 간격과 팔 연결·화면 잘림 확인. 실제 사람 촬영이나 근육 물리 시뮬레이션은 아님.
- 검증: 새 동작9개 + 기존13개 총22개 Node 검사 통과. 새8파일 전체 decode 각480프레임 및 1080px/60fps/원본·영상 SHA 확인. 390px Chromium 탐색5시점·8초 이상 재생·루프·가로 넘침 검사 통과. 동시 브라우저 재생 중 2~4프레임 드롭 기록(무드롭 보장 아님). ESLint 대상6파일·TypeScript 통과. 기록 `batch-2-verification.json`, `batch-2-reviews.json`.
- 갤러리9종, 기존 종목 이전영상 비교, 신규 종목은 이전영상 버튼 숨김 및 이전 모드에서 새 종목 선택 시 다크로 전환. HTTP/페이지 오류 없이 확인(`batch-2-gallery.json`). 보기: http://127.0.0.1:3189/exercise-guides/skinned-pilot/batch.html .
- queue `skinnedPreviews:9` 및 신규4종별 검토 파일/SHA 연결. 기존2D quality-hold 유지. **다음: 후속 3D 종목 제작, 앱 경로/자막 타이밍/캐시 통합과 Android 실기기 검증.** 이번 결과는 미리보기 검토본이며 정식 앱 교체/배포 완료가 아님. 커밋/푸시 없음. 종료 후 상주 생성 작업 없음.

## 2026-09-30 3D 후속 4종 제작·검증

- 사용자가 2차 샘플 후 계속 제작 지시. 덤벨컬(`dumbbell-biceps-curl`), 해머컬(`hammer-curl-2`), 프런트레이즈(`dumbbell-front-raise`), 덤벨슈러그(`dumbbell-shrug`)를 새 3D 방식으로 추가. **3D 미리보기 총5종/10파일**(레터럴 포함), 정식 앱 교체 수가 아님.
- `studio-batch.mjs` + `exercise-motion.mjs`: 골격의 목표 방향으로 동작 구성. 컬/해머는 상완 고정·팔꿈치 굽힘 및 서로 다른 그립, 프런트는 앞쪽 상승, 슈러그는 팔 방향 유지·쇄골/어깨 상승. 전완 회전 분산, 손목/덤벨 방향 유지. 기존 레터럴 studio.mjs와 결과 해시 보존.
- `render-skinned-batch.mjs`: 실제4개 동시 프로세스, 각 인코더2스레드. 06:05:21~06:14:52 UTC, 약9분31초(양 테마1080px60fps). 각8초480프레임. `batch.json`에 PID/경과 기록. renderer는 `render-skinned-exercise.mjs`, 출처는 `batch-sources.json`.
- 시각 검토: 각 운동 시작/중간/최고점·손 확대·측면, 실제 인코딩된 라이트/다크4프레임 시트. 덤벨컬 수평 손잡이/손바닥 위, 해머 중립, 프런트 어깨 이하 높이, 슈러그 어깨 상승과 팔 고정 확인. `.verify-shots/skinned-3d/{id}/`.
- 신선한 검증: `skinned-batch.test.mjs` 9개 통과. 모든8파일 전체 decode 각480프레임/1080px/60fps 및 원본3파일/영상SHA 일치. 390px Chromium 5시점 탐색·8초 이상 재생·루프·가로 넘침·이전영상 전환 통과. 대상 ESLint·TypeScript·diff --check 통과. `batch-verification.json`, `batch-reviews.json`은 미리보기 검토 기록이며 정식 passed 등록이 아님.
- 보기: http://127.0.0.1:3189/exercise-guides/skinned-pilot/batch.html . 종목5개 선택, 양 테마/이전 영상 비교. 기존 index.html에서도 연결.
- queue에 종목별 `skinnedPreview` 및 SHA 연결. 기존 rejected 2D 게시 hold는 유지. **다음 작업: 3D 후속 종목 제작과 앱 연결/타이밍/캐시 통합, Android 실기기 검증.** 사용자 계속 제작 지시가 있으므로 새 3D 종목 제작에 재확인을 요구하지 않는다. 기존 2D 대량 제작으로 되돌아가지 말 것. 앱 manifest/정식 영상·커밋·푸시·배포 미변경.

## 2026-09-30 3D 2차 재제작 (현재 시범)

- 사용자 요청: 1차 샘플보다 퀄리티 있게 다시 제작. 최신 파일 `public/exercise-guides/skinned-pilot/lateral-raise-v2.mp4`, `lateral-raise-v2-dark.mp4`, 두 파일 모두 1080x1080/60fps/8초/480프레임. 이전 파일 보존, 비교 페이지에서 전환 가능.
- `prepare-skinned-human.mjs`: CC0 체형 자료 추가, 몸통/어깨/상완 형태 교정, 고정 토폴로지 Catmull-Clark 1회 세분화(53,514정점·107,024삼각형). 원본/적용 계수/라이선스/해시는 `skinned-3d/provenance.json`. 이전 CJS 준비 스크립트 대체.
- `skinned-3d/studio.mjs`: 별도 바지 메시/밑단, 손가락 굽힘·엄지 접촉·손목 정렬, 모서리를 다듬은 덤벨과 금속 손잡이, 환경광/조명 수정. 쇄골·어깨의 회전과 팔 상승을 연결하고 최고점 팔꿈치 높이·고정된 작은 팔꿈치 굽힘·천천히 내리기를 적용. 실제 사람 촬영/근육 물리 시뮬레이션이 아니라 가중치 기반 3D 애니메이션임.
- 정면 시작/중간/최고점, 양 테마, 손/어깨 확대, 측면/뒷면 검사 이미지 `.verify-shots/skinned-3d/`. 손가락/손잡이 접촉과 관절 피부 연결을 확인. 전신 가만히 서 있는 운동이므로 몸통을 임의로 크게 흔들지 않음.
- 신선한 검증: `node --test tools/media/skinned-pose.test.mjs` 4개 통과(팔 길이 유지·발 위치 유지·최고점 팔꿈치/손목 높이·0/480 자세 동일). 양 테마 전체 decode 480프레임, 원본/영상 SHA 일치, 390px Chromium 5시점 탐색·루프·비교 전환·가로 넘침 검사 통과. `verify-skinned-pilot.mjs`, `verification-v2.json`, `pilot-v2*-result.json`.
- 대상 ESLint·TypeScript 통과. 앱 manifest/정식 영상 교체·배포·커밋·푸시 미실행, Android 실기기 미검증. **quality-hold 유지: 대량 제작 재개나 동적8종 재승인으로 간주하지 않는다.**
- 참고한 자세 출처: https://www.acefitness.org/continuing-education/certified/september-2025/8951/a-pro-s-guide-to-muscle-mechanics-the-shoulders/ . 에셋/모프 형식: https://static.makehumancommunity.org/assets/creatingassets/maketarget/targets.html .
- 보기: http://127.0.0.1:3189/exercise-guides/skinned-pilot/ . 다음 작업은 이 2차 결과의 동작/외형에 대한 남은 피드백 및 앱·실기기 검증. 1차 `scene.mjs`나 이전 2D 대량 제작으로 되돌아가지 말 것.

## 2026-09-30 사용자 품질 반려 — 현재 우선 작업

- 사용자가 상체 근육 떨림과 팔만 움직이는 부자연스러움을 지적. 아래 13종 반영 기록은 과거 기술 검사 기록이며 최종 품질 승인이 아님. 동적 8종을 refresh queue/ledger에서 rework로 변경.
- quality-hold.json 활성화: 기존 2D 동작 대량 반영 중지. 아직 앱 경로에 남은 2D 파일은 미배포 브랜치 상태이며 교체 완료로 간주하지 않는다.
- [진행중] MakeHuman CC0 메시·163관절·가중치로 연결된 피부 3D 레터럴 레이즈 시범 제작. 출처/해시 skinned-3d/provenance.json.
- [대기] 손 그립·덤벨 접촉·어깨와 상체 변형 검토, 양 테마·앱·실기기 검증. 성공한 한 종목 이전에는 일괄 제작 재개 금지.
- 3D 1차 작업본: `public/exercise-guides/skinned-pilot/lateral-raise.mp4`, 900px/60fps/8초. 시작/중간/최고점 이미지 확인, FFmpeg 전체 decode 통과. 손목 정렬·손가락 굽힘·덤벨 연결, 쇄골/어깨/상완 연계와 연속 피부 가중치 적용. 실제 근육 시뮬레이션이나 최종 사실감 검증을 완료한 것은 아님. 그립/신체 외형 추가 교정 필요.
- 로컬 보기: http://127.0.0.1:3189/exercise-guides/skinned-pilot/ . 앱 manifest 미반영. 기존 게시 스크립트 3경로의 hold 거부 확인. TypeScript·대상 ESLint 통과, diff 공백 오류 없음. 모바일 Chromium 390px에서 5시점 탐색·루프·가로 넘침 검사 통과(playback.json). 새 시범을 passed로 자동 등록하지 않는다.


## 2026-09-30 다음 팔 운동 4종 개선 완료

- 이번 추가: dumbbell-biceps-curl, hammer-curl-2, dumbbell-front-raise, triceps-kickback. `render-arms-batch.mjs`로 4개 독립 작업 동시 실행, 각 인코더 2스레드. 렌더만 약56초, 원본 생성·관절 정렬·수정·검증 시간은 별도. 실행 기록 `motion-refresh/arms-batch.json`.
- 브랜치 개선 누적13/152종, 기존139종 및 미제작1199종 남음. v3 등록146/렌더145/검토104 유지. 킥백 다크 신규 추가로 전체 검사 파일242개. 커밋/푸시/배포 없음.
- `render-arm-rig.mjs`와 `motion-refresh/arm-rigs.json`: 고정 몸통, 컬/킥백 팔꿈치 회전, 프런트 레이즈 어깨 회전. 원본마다 크기·관절·가림 순서를 별도로 지정. 고정 부품 방식이라 길이 변형이나 시간 보간 잔상이 없지만 2D 투영·회전과 구형 관절 연결의 한계는 남음. 3D 회내/견갑 운동을 재현한다고 주장하지 않음.
- 킥백 최초 원본의 상완이 몸통보다 지나치게 높아 image_gen으로 상완을 몸통 옆에 평행하게 수정한 뒤 렌더. 초기 후보는 미반영.
- 원본4개: `tools/media/motion-refresh/{운동ID}-atlas.png`, 최종 앱 검토 원본은 `tools/media/motion-guides/{운동ID}-rig.png`. built-in image_gen 프롬프트는 `arms-generation.json`, 킥백 수정 프롬프트는 `kickback-correction.json`.
- 양 테마8파일: 720x720/60fps/8초/480프레임 전체 decode 통과. Chromium 전체 루프 오류 없음, SHA 일치. `arms-decode.json`, `arms-playback.json`, `.verify-shots/motion-refresh/arms-batch.png`의 5시점 양 테마 검토. 해시가 없는 시각 검토는 게시 전 거부되고 앱 파일이 그대로 유지되는 것도 확인.
- `publish-parallel-refresh.mjs arms`는 4개 ID·양 테마·원본 SHA·검토 SHA·decode/재생 SHA를 확인 후 반영. `node tools/media/manage-ai-guides.mjs motion-coverage` 및 `build-motion-specs.mjs`로 공개 목록/캐시 버전 갱신. 관리 모듈을 직접 실행하면 명령이 처리되지 않으므로 manage-ai-guides 진입점을 사용할 것.
- 대상 Vitest3파일36개, review gate4개, 대상 ESLint, tsc --noEmit 통과. 390px 모바일 비교 페이지에서 이번4종×2테마 이전/수정 영상 로드 및 가로 넘침 없음. `arms-gallery-verification.json`, `.verify-shots/motion-refresh/arms-gallery-mobile.png`. Android 실기기/전체E2E 대기.
- 보기: http://127.0.0.1:3189/exercise-guides/refresh-candidates/?exercise=dumbbell-biceps-curl . 목록13종. 킥백 이전 다크는 없어서 비교 영역은 이전 라이트를 표시하고 안내.
- 다음: queue.json에 남은 기존139종에서 다음4종 선택, 종목별 출처·원본·관절 경로 검토 후 제작. 현재 배치는 완료됐으며 종료 후 상주 생성 작업은 없음. 기존 개선 완료 후 미제작1199종을 진행.

## 2026-09-30 4종 동시 렌더링 및 반영

- 사용자 지시: 계속 4개씩 병렬 제작. `render-refresh-batch.mjs`는 독립 Node 작업 4개를 실제 동시 실행하며 각 FFmpeg 인코더는 스레드 2개 사용. 실행 PID/시각/소요 시간은 `tools/media/motion-refresh/parallel-batch.json`. 초기 4종 렌더 약 46초(원본 생성·재검토 시간 제외).
- 이번 반영: dumbbell-shoulder-press, barbell-shrug, side-plank, hollow-hold. 기존 개선 5종 포함 누적 9/152종, 남은 기존 143종, 미제작 1199종. 전체 작업 미완료. v3 등록146/렌더145/검토통과104.
- 바벨 슈러그 초기 공간 변형 후보는 반바지 왜곡으로 폐기. 새 원본에서 몸통과 팔·바벨을 분리하고 전체 팔·바벨만 9px 이동해 재렌더·재검증 후 반영. 관절 연결은 단순화한 2D 구형 관절 표현이며 실제 견갑 운동 모델은 아님.
- 사이드 플랭크와 할로우 홀드는 새 회색/청록 원본의 등척성 자세를 유지. 일반 반복 운동을 정지 화면으로 바꾼 것이 아님. 숄더프레스는 고정 팔 길이의 2D 관절 회전.
- 원본 및 최종 프롬프트: `tools/media/motion-refresh/hold-generation.json`, `barbell-atlas-generation.json`, `shoulder-press-atlas-generation.json` (built-in image_gen 사용). 원본 PNG는 같은 폴더와 canonical motion-guides/*-rig.png에 보관.
- `publish-parallel-refresh.mjs`는 원본 부품 SHA, 명시적 시각 검토, 영상 SHA, 전체 디코딩 결과, 실제 브라우저 검사 SHA를 모두 확인한 뒤 반영. 이전에 거부된 hollow-hold는 새 원본과 영상으로 재검토하여 공개 포함. 기존 원본 JPG는 이전 참조 기록, 추가 rigSource SHA는 실제 새 원본을 검증.
- 최신 8파일: 전체 디코딩 480프레임/720x720/60fps/8초 통과. Chromium 반복 재생 오류 없음, dropped 0~2/1222~1227. 5시점 양 테마 접촉시트와 새 원본 확인. `parallel-decode.json`, `parallel-playback.json`, `.verify-shots/motion-refresh/parallel-batch.png`.
- 대상 Vitest 3파일36개, review gate4개, 대상 ESLint 및 tsc --noEmit 통과. 숄더프레스 캐시 버전 URL 변경에 맞춰 기존 기대값 갱신. 전체 E2E/Android 실기기/커밋/푸시/배포 미실행.
- 비교 페이지: http://127.0.0.1:3189/exercise-guides/refresh-candidates/ . 기존 다크가 없던 두 종목은 이전 라이트 영상을 비교용으로 표시하고 안내. 실제 신규 다크는 별도로 생성됨.
- 비교 페이지 모바일 Chromium 390px에서 4종×2테마 이전/수정 영상 모두 로드, 가로 넘침 없음. `gallery-verification.json`, `.verify-shots/motion-refresh/gallery-mobile.png` 기록.
- 다음: `queue.json`의 남은 기존 143종을 운동별 원본·관절 구성에 맞춰 다음 4종으로 선정. 현재 배치 스크립트는 위 4종에 명시적으로 한정되어 있으며 전체 큐를 무검토 자동 게시하지 않음. 기존 개선 완료 후 미제작 운동 진행. 종료 후 자동 계속 실행하는 상주 작업은 없음.

## 2026-09-30 parallel processing checkpoint

- Inventory: 152 existing exercises / 239 files decoded, zero decode failures; 1199 unrendered. Overall refresh is incomplete.
- Five exercises applied to branch: lateral raise, hollow body hold, plate pinch, stability ball plank, dumbbell shrug. No commit, push or deployment.
- Audit uses four independent FFmpeg workers with SHA cache reuse. This does not mean every renderer generates four exercises concurrently. Shoulder press encoding uses two internal FFmpeg threads.
- Shoulder press atlas candidate: latest 85-degree motion rendered in both themes; not published. Source and generation prompt: tools/media/motion-refresh/shoulder-press-atlas.png and shoulder-press-atlas-generation.json.
- Fresh browser verification: both 720px / 8 seconds, loops without media errors; dropped 1/1226 and 2/1227. Inspected five moments per theme in .verify-shots/motion-refresh/shoulder-candidate.png. Physical device and full movement review remain pending.
- Fresh guide-review tests: 4 passed, including atlas source hash gating. Prior targeted Vitest: 36 passed. Run fresh lint/typecheck after final changes.
- Next: fully decode and review shoulder press, pin source/video hashes before publication. Continue existing refresh before unrendered exercises. Queue: tools/media/motion-refresh/queue.json.

최종 갱신: 2026-09-09. 이 문서는 진행 중 작업의 인계 자료이며 완료 보고가 아니다.


## 2026-09-30 레터럴 레이즈 부드러움/비율 수정 샘플

- 작업 브랜치: `feat/exercise-video-smooth`, 독립 worktree `C:/git/Bit-O/health-video-smooth`.
- 사용자 요청: 끊김 개선 샘플 1종 → 색 번짐과 최고점 팔 길이 변화도 수정.
- 초기 16자세 재보간(60fps)은 원본 자세별 신체 비율 차이와 optical-flow 번짐이 남아 최종 방식으로 채택하지 않음.
- 현재 샘플: 기존 최고점 외형을 고정 몸통/팔 레이어로 분리, 팔 수평 길이를 0.82배로 고정하고 어깨 축만 회전. cosine 주기 8초/480프레임으로 시작·끝 속도 연결. 프레임 색 혼합/optical-flow 없음.
- `tools/media/render-rigid-motion-sample.mjs`: 로컬 비교 서버 3189와 FFMPEG_PATH 필요. Playwright canvas → FFmpeg H.264 Main/yuv420p/CRF18/faststart. 720px는 480px 원본 확대이므로 실제 세부 묘사 증가 아님.
- 미리보기: `public/exercise-guides/smooth-sample/index.html`, 라이트/다크 MP4. 2026-09-30 사용자 최종 승인 후 ai-v3 라이트/다크 자산으로 승격, review/verification 해시 갱신. 기존24fps 영상은 smooth-sample/before[-dark].mp4로 보존하여 재생성 입력/비교 기준을 유지.
- 한계: 2D 회전 시안으로 견갑·어깨의 3D 변형을 재현하지 않음. 사용자가 이 샘플의 시각 결과를 승인함. 전체 카탈로그에 동일 관절 회전을 적용하지 않으며 실기기 검증은 대기.
- 최종 수정 샘플 검증: 라이트/다크 전체 decode 각각 480프레임/8초/60fps/720x720 통과. Chromium 두 테마 반복 재생 오류 없음, 390px 가로 넘침 없음. 시작/중간/최고점 및 경계 contact sheet 확인. 대상 ESLint, tsc --noEmit 통과. 최종 헤드리스 dropped 10/515(라이트), 3/515(다크), 기기별 무끊김 보장 아님. 용량 150683B/248660B.
- 파일 교체 도중 브라우저의 이전 Range 요청으로 임시 서버가 종료되어 범위 검증/Cache-Control:no-store 보완 후 재시작, 최종 재생 검사 재통과. FFprobe는 Windows application control 차단으로 실행 불가, 승인된 FFmpeg 전체 decode로 대체.

- 앱 반영 검증: 관련 Vitest 3파일34개, review gate3개, 대상 ESLint/tsc 통과. 버전 URL 양 테마 Chromium8초 반복 정상. 재렌더 통합2개는 FFmpeg PATH/FFprobe 정책 환경 문제로 미통과. 수정본 자동 덮어쓰기 방지 확인, coverage146/145/103/1351 유지. 캐시 쿼리 버전 지원 및 smooth 자막 사양(최고점4초) 반영. 미커밋·미배포.

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

2026-09-25T14:37:01.494Z

등록 146 / 렌더 145 / 시각 검토 통과 103 / 대상 1351

2026-09-25 사용자 요청으로 영상 작업 Git 정리. 새 후보 tools/public 재생성 폴더 Git 제외, 바이너리 로컬 보존, 프롬프트·스크립트·리뷰·검증31파일 커밋 대상. 단위210파일2359개·스키마72개·전체린트0오류41경고·tsc 통과. 전체 E2E localhost:3000/mobile-chromium 319개 중26개 통과 확인 후 사용자 e2e안해도되니까 그냥 커밋 지시로 중단. 나머지 E2E·실기기 미검증, 중단 실행 테스트 계정 자동정리 완료는 확인 못함. 영상 품질 보류는 유지: 리스트컬 시작그립/발변동, 로우바 바접촉/전경. 공개103 유지. 새 영상 재개 경로와 로컬 자산 정책은 imports/exercise-video-20260925/README.md.
