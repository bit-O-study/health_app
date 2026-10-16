# 전체 운동 영상 진행표

2026-10-07 카탈로그 ID 1,351종 기준. 명칭이 다른 동일 동작/기구는 신규 제작 전에 중복을 확인한다.

| 상태 | 종목 수 |
|---|---:|
| 라이트·다크 정확한 파일 검토 통과 | 111 |
| 공개된 기존 영상의 누끼 추가 검토 | 20 |
| 기존 렌더의 동작/품질 검토 필요 | 39 |
| 구형 영상만 있어 재제작 필요 | 7 |
| 영상 신규 제작 필요 | 1174 |

이번 지속 작업에서 굿모닝·크런치·피스톨 스쿼트·코삭 스쿼트·싯업·시시 스쿼트 6종의 누끼 양테마 영상을 로컬 앱에 반영했다. 이전 드래그 컬을 합하면 이번 누끼 재개 후 7종 개선이다. 새 종목을 7개 추가한 것은 아니다.

검토에는 원본/양테마 32프레임, 기구·신발 보존, 전체 디코딩, 모바일 Edge HTTP 재생·7.5초 탐색·반복, 파일 SHA 대조가 포함된다. 실기기·운영 배포 검증과 전문적인 생체역학 검증을 대체하지 않는다. 원본과 이전 공개 파일을 백업했다.

이번 배치 보류: 밴드 컬(밴드누락), 덤벨 풀오버(기존 보간 잔상), 인버티드 로우(원본 발지지 불명확). 새 박스 스쿼트 원본도 배경/고정위치 보정 대기다. 보류한 후보는 앱에 적용하지 않았다.

관련 앱 미디어 단위 테스트 4파일18개와 리뷰 검증4개, 대상ESLint, TypeScript 통과. 전체앱E2E·실기기·운영 배포는 이번 배치에서 수행하지 않았다.

전체 상세 목록: [all-exercises-progress.json](../tools/media/motion-refresh/all-exercises-progress.json). 재집계: node tools/media/audit-all-motion.mjs.

재개 기록: [EXERCISE-VIDEO-RESUME.md](EXERCISE-VIDEO-RESUME.md). 검토 근거: tools/media/imports/cutout-all-20261007-a 및 cutout-all-20261007-b.

신규 크로스바디 숄더 스트레치 추가: 고정 자세 8초/24fps/480×480 양테마, 각192프레임 동일성과 전체디코드 및 Edge 재생·탐색·반복 통과. 기존 영상 개선과 별개로 신규1종 추가(등록147/렌더146/시각검토105). 증거: tools/media/imports/all-exercises-20261007/cross-body-shoulder-stretch/.

스모 데드리프트 추가 후보는 원본 정수리 클리핑·바 연결 누락·보간 원판 소실/잔상으로 보류. 기계적 디코드와 Edge 재생 검증 통과만으로 공개하지 않음. 증거 tools/media/imports/cutout-all-20261007-a/sumo-deadlift-review.json. 모든 후보 처리 프로세스 종료.

2026-10-07 후속: band-lateral-raise 신규16자세 투명원본·양테마8초24fps 추가, ab-rollout 공식u2net으로 신발/바퀴 보존 개선 반영. 등록148/렌더147/시각검토106/양테마79. 신규필요1197, 기존누끼검토27, 동작검토41,구형재제작7. 양테마32프레임/전체decode/모바일Edge play·seek·loop 및 미디어단위4파일18개 통과. 소스·rig·영상 exactSHA 기록. chest-dip은 종아리누락/기구안쪽배경잔여로 보류. alias18후보중 정확동일기구/동작3개 추가영상검토중(아직연결없음).

2026-10-07 별칭 연결 추가: hammer-curl→hammer-curl-2(덤벨), ez-bar-curl→ez-bar-curl-2(바벨)의 동일동작/기구를 원본·현재MP4·rig·양테마32프레임·decode·Edge로 확인하여 exact 파일 복사와 aliasOf 추적정보로 연결. 신규영상2개 생성이 아니라 기존검증영상2개를 누락ID에 재사용한 것. 현재 등록150/렌더149/검토108/양테마81; 신규필요1195. 증거 imports/all-exercises-20261007/alias-validation/{review,adopted}.json. bench-dip 별칭은 아직미반영. 모든 작업프로세스 종료, 개발서버 유지.

2026-10-07 다음배치: band-triceps-pushdown 신규16자세 alpha보존 양테마영상 추가. 고정점/밴드/신발/팔동작32프레임,전체decode,Edge재생/7.5초탐색/loop 확인. 등록151/렌더150/검토109/양테마82, 신규필요1194. 원본/프롬프트/prepare/render/publish/해시증거 imports/all-exercises-20261007/band-triceps-pushdown/. bench-dip alias는 최저팔꿈치각도가대상90도안내와달라보류(alias-validation-bench/review.json). 저메모리색상마스크 low-row/machine-rear-delt 후보진행, 공개는최종시각검토후결정.

- 저메모리 배경마스크 배치 최종: low-row-machine 및 machine-rear-delt-fly는 누끼·기구·신발 보존 개선이나 minterpolate 전환팔/손잡이잔상으로 hold-motion. low-row1.25/5.25초 신규/기존공개원본 비교에서 원본영상에도잔상확인, source8키포즈는단일윤곽. 두후보미반영. seated-calf-raise는회색배경/인체색겹침으로마스크부적합. 증거 cutout-all-20261007-b/border-comparison.json. band-triceps-pushdown 대상ESLint와미디어4파일18테스트 통과. 전체목표는미완료로유지, 모든생성/검증프로세스종료. 다음은잔상종목원본포즈추가/렌더보정, 기존27누끼및41동작검토, 미제작1194 진행.

2026-10-07 보류2종 해결: lying-triceps-extension u2net+원본검은벤치복원/하단잔여12px이하제거 및 ez-bar-skull-crusher u2net 양테마 교체. sourceSHA유지,기존MP4백업,후보/공개SHA일치검증,root양테마32프레임확인,전체decode와Edge모바일play/7.5seek/loop통과. adoption-6.json/adoption-7.json 및각final-review근거. 등록151/렌더150/검토109 유지, 양테마84/기존누끼검토25/동작검토41/구형7/신규필요1194. 미디어4파일18개+리뷰4개=22개 및diffcheck통과. 실기기/운영/커밋/푸시없음. 모든생성프로세스종료;다음기존25종배경처리와41종동작및신규1194진행. low-row3보간설정과rear-delt16컷/2D리그는품질불충분근거보존/미반영.


2026-10-07 후속 검증 기록
- [완료] wall-calf-stretch 신규 양테마 정적 유지 영상과 calf-stretch 동일동작 ID 재사용. triceps-pushdown-2 누끼/기구·케이블 복원 양테마 교체. 원본과 이전 영상 백업 및 exact SHA 기록.
- [완료] calf 두 ID의 운동법에 잘못 들어간 스쿼트 안내를 벽 지지 종아리 유지 스트레칭으로 수정. methodSteps 회귀 2개 포함 미디어 단위 5파일20개, 대상 ESLint와 tsc --noEmit 및 git diff --check 통과.
- [완료] 신규 hold 각192프레임 동일/전체decode/모바일 Edge play·seek·loop, pushdown 양테마32프레임 root 검토 및 동일 재생 검사 통과. 근거 imports/all-exercises-20261007/wall-calf-stretch/ 및 adoption-8.json, B/cable-batch-review.json.
- [보류] seated-calf-raise/belt-squat/rope-pushdown/overhead 기구 소실, TRX-row 끈 사이 배경과 보간 번짐, sumo-squat 원본 배경 결함. 후보만 보존.
- [진행중] 전체1351종: 양테마87, 기존누끼24, 동작검토41, 구형재제작7, 신규1192. 등록153/렌더152/검토111. 다음 standing-cable-curl 후보와 나머지 제작 계속.
- [대기] 전체 목표/실기기/운영 배포 검증. 이번 변경 커밋·푸시 없음.

- 2026-10-07 배치 종료: standing-cable-curl 원본기구복원은 성공했지만 2.5초 손/바 이중잔상(root 확대검토 확인)으로 hold-motion. cable-rope-hammer-curl-2는 원본타워상단 잘림+분할기구소실로 보류. B/curl-batch-review.json. 신규 앱 반영 없음, 양테마87/기존누끼24/동작41/구형7/신규1192 유지. 리뷰 SHA 게이트4개 추가통과, 합계24개. 모든 후보 처리 프로세스 종료, 기존 개발서버 유지. 다음은 아직 시도하지 않은 케이블 운동(low-cable-fly, wide-grip-lat-pulldown 등)의 원본검토와 신규 운동 제작; 이미 기록한 소스/동작 보류는 단순 동일 재시도 대신 원본 재제작 필요. 전체 목표 active, 미완료.

- 2026-10-07 신규 band-front-raise 양테마 추가: 생성 alpha 원본16컷 중 어깨높이를 넘는13~16 제외, 1~12 상승/정점유지/역순하강. 모든 cell 원본보존, 양테마32frame 육안/전체decode/480x480 24fps 8초/최종 Edge mobile play·seek·loop 통과. 미디어4파일18개+SHA리뷰4개=22개 통과. 등록154/렌더153/검토112, 양테마88/기존누끼24/동작41/구형7/신규1191. 경미한 원본 몸통/실루엣 변화는 기록. 증거 imports/all-exercises-20261007/band-front-raise/ (prompt.txt, source-reference.json, 원본PNG, 재현prepare/render/publish, render-evidence, playback, published-evidence).
- 병렬4종 판정: low-cable-fly/wide-grip-lat-pulldown/cable-lateral-raise-2는 u2net 기구·케이블 소실로 보류; cable-front-raise는 기구복원 성공했으나2.5초 손/바/케이블 이중잔상으로 미반영. A 각review 및 B/raise-batch-review.json. 모든후보프로세스 종료, 기존개발서버 유지. 다음 미시도 케이블 운동(straight-arm-pulldown-2,cable-rear-delt-fly-2,face-pull-2,cable-upright-row,cable-glute-kickback,lat-pulldown) 및 신규 종목 제작. 전체목표 진행중; 실기기/운영배포/커밋/푸시 없음.

- 2026-10-07 체크포인트: 등록156/렌더155/검토114, 양테마91/기존누끼23/동작41/구형7/신규1189. rope-triceps-pushdown imagegen alpha-edit로 기구/로프 보존후 양테마교체(adoption-9.json). 원본JPG/이전MP4/spec백업, editedPNG rigSource SHA등록, custom renderer지정. RGB는완전동일아님(MAE5.92/255), 원본16자세시각비교/양테마32frame/전체decode/Edge통과.
- 기존skinned-pilot 미등록정확ID14종중 cross-body-hammer-curl/scaption 2종을 기존3D모델·동작으로 native480x480/24fps/8초192frames 직접재렌더. 앱정확배경 #fafafa/#09090b, 광학보간없음. 4영상32frame root검토·전체decode·Edge play/seek/loop 통과, sourcechain/의존성스냅샷SHA 검증, provenance JSON과16컷진단atlas 및spec등록. 증거 skinned-reuse-audit/native/*-review.json 및 publish-native.mjs. 파일68~114KB, 원1080/60보존. 작은다크덤벨대비/맨발마네킹스타일한계기록.
- 신규 band-external-rotation 생성+표적수정도 팔이길어지는잘못된동작이라 source-only보류. 원본/프롬프트보존. 대신 기존3D리그17각도 검사에서 고정팔꿈치/90도 유지가능; rig-feasibility.json/rig-kinematic-proof.json. 다음격리3D모션으로 제작하고 피부·밴드접촉시각검증필요.
- 가슴3종은 기존실패그대로 재현하여 미승인(motion-review-chest/). 남은누끼23종 실패색인 cutout-holds.json 23/23. 다음은 나머지3D미리보기12종 native통합검토와 장비소실후보alpha-edit,3D외회전구현. 이번미디어4파일18개+exactSHA리뷰4개=22개통과. 전체목표진행중, 실기기/배포/커밋/푸시없음. 모든배치작업종료,기존개발서버유지.

2026-10-07 추가 반영: 덤벨 컬·숄더프레스·레이즈 8종 native 480×480/24fps/8초 양테마 영상 추가(skinned-reuse-shoulders 3종, skinned-reuse-next 5종). 케이블 오버헤드 익스텐션 alpha-edit 배경 제거본 교체(adoption-10). 양테마 최종32프레임, 손·측면, 전체192프레임 디코딩, Edge 재생·탐색·반복 및 원본/의존성 SHA 검증. 등록164/렌더163/검토122, 양테마100/기존누끼22/동작41/구형7/신규1181. 미디어 테스트18개와 리뷰게이트4개 통과. 실제 기기·운영 배포·커밋·푸시 없음. 밴드 외회전은 관절수학 검증은 통과했으나 팔꿈치 피부변형으로 보류. 다음 4종(alternating-dumbbell-front-raise, wide-grip-barbell-curl, close-grip-barbell-curl, wide-grip-upright-row)은 skinned-reuse-final 격리 제작 중. 전체 목표 진행 중.

2026-10-07 최신: 양테마검증106/동작검토40/기존누끼21/신규1177/구형7(전체1351). 등록168/렌더167/검토127. 신규4종 alternating-dumbbell-front-raise,wide-grip-barbell-curl,close-grip-barbell-curl,wide-grip-upright-row native480/24/8초 추가, skinned-reuse-final 원본/의존성 SHA·양테마32frame·전체decode·Edge 검증. low-cable-fly alpha-edit 기구보존 누끼교체(adoption-11, RGB MAE11.46/255). zottman-curl-2는 동일기구/동작의 zottman-curl 검증파일로 교체하고 이전원본/spec/영상/검증백업(alias-zottman); 별도신규동작생성 아님. 대상ESLint 및 미디어18+리뷰게이트4 테스트 통과. 코어3종 dead-bug/bird-dog/reverse-crunch는 원본/현영상32frame+decode 검토 후 전환잔상/배경문제로 보류(motion-review-core). 외회전 피부보정2안은 관절수학통과하지만 팔꿈치함몰 지속으로 보류(rig/repair-review.json). 다음 dumbbell-standing-calf-raise 새3D/잘못된스쿼트설명 보정 병렬진행. 실기기/배포/커밋/푸시 없음. 전체목표 진행 중.

2026-10-07 카프 추가: dumbbell-standing-calf-raise 신규연속3D 양테마480/24/8초 반영(skinned-calf). 앞꿈치pivot 고정481샘플/발바닥접지변위/뒤꿈치상승/loop 수치와 feet0·210/side210 및 양테마32frame root검토, 전체decode/Edge재생·탐색·반복 통과. 원본모델·모션·studio·의존성SHA 검증. 등록169/렌더168/검토128, 양테마107/동작40/누끼21/신규1176/구형7(전체1351). 스쿼트형 methodSteps를 카프동작으로 교정하고 exactID guide/oneLiner 추가; 기존카테고리에는 calf가없어 분류값유지, 실제안내는 exactID우선. 회귀2건포함5파일20+리뷰4=24테스트통과, 별도 agent 인접14테스트/대상lint/전체tsc 통과. B straight-arm-pulldown-2 원본상단잘림, wide-grip-lat-pulldown 편집본기하변형은 보류(원본/비교보존). 기존하체4종 원본/MP4 decode·32frame 검사에서 low-bar 위치불명확, curtsy전환잔상, jump머리잘림·잔상, hip-adduction기구변형 기록(motion-review-lower). 다음 step-calf-raise 별도3D 제작중. 실기기/배포/커밋/푸시 없음, 전체목표 진행중.

2026-10-07 스텝/누끼 배치: step-calf-raise 신규3D 양테마 반영(skinned-step-calf), 발판관통검출 후 실제foot skin접지보정 및481샘플 충돌/heel drop검증, root 양테마32frame/feet0·210 확인. exactID methodSteps/guide/summary 스쿼트오류 수정, 회귀2건 및 인접16tests/대상lint/전체tsc 통과. band-biceps-curl alpha-edit v2 원본위치·밴드보존으로 교체(adoption-12, v1geometry실패보존, v2MAE9.84). conventional-deadlift는 guarded u2net16pose 기구보존 누끼제작 후 원본/양테마32frame 검토·full decode·Edge play/seek/loop통과, NASM source대조/6체크승인, 이전영상/spec백업 및 cutPNG16SHA provenance 추적(deadlift-cutout). 등록170/렌더169/검토130, 양테마110/동작39/누끼20/신규1175/구형7. 통합미디어+스텝회귀5파일20개 및리뷰게이트4개통과. 다음 single-leg-calf-raise 격리3D 제작중. 전체목표진행중, 실기기/배포/커밋/푸시없음.

2026-10-07 싱글 카프: single-leg-calf-raise 신규 연속3D 양테마480/24/8초를 로컬 앱에 반영(skinned-single-calf). 같은쪽 덤벨, 반대손 고정지지, 반대무릎 굽힘, 작업발 발판지지 구현. 양테마32frame 및 support/feet/side 확대 root 검토,481샘플 접촉/발판관통/자유발높이/loop 검증, 전체decode/Edge 재생·탐색·반복 및 source-chain SHA 검증. 앱 method/guide/summary를 영상과 같은 발판 버전으로 정정. 미디어+회귀5파일20개 및 리뷰게이트4개 통과, agent 인접18tests/대상lint/전체tsc 통과. 등록171/렌더170/검토131, 양테마111/동작39/누끼20/신규1174/구형7. 다음 standing-toe-raise 신규3D와 reverse-wrist-curl 기구보존 누끼 병렬 진행. overhead-cutout u2net은 바/팔소실 보류; cable-rear-delt-fly-2 alpha는 기구보존됐으나 전환 잔상으로 미반영, barbell-overhead-press alpha-edit 진행. 실기기/배포/커밋/푸시 없음. 전체1351종 목표 진행 중.
2026-10-07 재개 검증: 기존 standing-toe-raise 양테마 영상의 시각/해시/전체decode/Edge 재검증 완료. motion-caption 회귀가 검출한 자막 사양30개 누락을 동기화하여 공개134종 일치. 대상5파일39개·리뷰4개·대상ESLint·전체tsc 통과. reverse-wrist-curl adaptive 보간 후보2개 제작 및 decode/Edge 통과, 잔상·벤치 가장자리 손상으로 시각 보류/공개 미반영. 실파일 집계 양테마114/동작39/누끼20/신규1171/구형7(1351종), 이번 신규 승인0. 근거: skinned-standing-toe/native/standing-toe-raise-resume-verification.json 및 wrist-cutout/adaptive-review.json. 다음 리스트 컬 원본/연속 리그 재제작, 전체 목표 미완료.
2026-10-07 병렬 배치: 신규 arm-circle/backward-arm-circle2종 + reverse-wrist-curl 교체1종 양테마6영상 반영. 최종6영상 시각·decode·Edge·SHA 승인. 기존 wrist 원본과 영상 백업. 암서클 continuous 자막·방향별 가이드 보완,6파일41tests+review4tests/대상ESLint 통과. belt-squat/overhead 추가 후보는 잔상으로 보류,누끼복원원본 보존. 집계 양테마117/동작38/누끼20/신규1169/구형7, 전체미완료. 근거 imports/all-exercises-20261007/{skinned-new-resume,skinned-wrist-resume,cutout-resume}.
