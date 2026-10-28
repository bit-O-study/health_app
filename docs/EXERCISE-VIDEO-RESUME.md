# 운동별 연속 동작 영상 — 재개 기록

## 2026-10-28 운동모드 런닝 보정

사용자 후속 요청에 따라 런닝 동작을 보정했다. 발 회수 높이와 앞으로 뻗는 폭을 줄이고 착지 구간을 완화했으며, 팔 진폭 감소·팔꿈치 굽힘 변화·손목 정렬·손가락 자세를 적용했다. 원본 및 검수 기록: tools/media/imports/running-20261028. 최종 정면 사선/측면 각각 8장 시트 검토, 481포즈 루프오차0, 팔꿈치85.49–95.32도, 전체240프레임 테두리/alpha 검사, 3인코딩 decode 및 브라우저 재생·탐색·반복 통과. 기존 검토 파일의 SHA를 확인한 뒤 running.mp4 / running-dark.mp4 / running-alpha.webm을 교체하고 앱 URL v=20261028 적용. 절차적 캐릭터 시연이며 실측 모션 캡처·실기기·운영 반영 검증은 남아 있다. 이번 요청의 업로드 대상은 dev다.

## 2026-10-16 Git 저장

사용자 요청으로 health-video-publish의 누적 검토 영상·연결 코드·제작 입력·검수 기록을 video/publish-20261014 브랜치에 커밋·푸시한다. MP4 변경438개(219종 양테마), 원본 SHA1564개 일치, 전체 단위3429개 통과/선택1개 제외. 전체 린트·E2E의 기존 실패와 실기기 미검증은 로드맵에 기록되어 있다. 미제작/보류 운동은 계속 미완료이며 main/dev 병합과 운영 배포는 별도다. 기존 health-video-smooth 원본 작업본은 변경하지 않는다.

## 2026-10-14 재개 12차: 신규 3종 검수·등록 완료

- [완료] smith-machine-wide-grip-bench-press / cable-spider-curl / quadruped-hip-extension 양테마6영상 로컬등록. public304→307/양테마285→288. 부모 최종양32시트와 손/발/무릎/가슴/의복/레일/풀리/스택/측면 확대검토,481표본·전체decode·Edge재생/탐색/loop·SHA 통과. 세 publisher 각각exit0, 6필드 사전검사 확인.
- Smith wide: M&S 원문 평벤치/어깨보다넓은그립/가슴약1인치간격/상단잠금금지/하강시간상승의2배. 그립7.4world 대 어깨폭4.038, 하단triangle+.25400002/가슴+.25522141(키1.8m 가정 약1.0304인치, 스케일한계기록), 비가슴+.48664158/머리+1.34402. 손목8.2267–22.278도/팔꿈치8–135.3888도. 발·좌면·그립·loop0, 바XZ/슬리브4.9e-15/frame+.135739. 상단시작0–.4/하강.4–4.8/하단4.8–5.2/상승5.2–7.4/상단7.4–8, continuous 단일 timing.
- Cable spider: BreakingMuscle 저풀리변형/45도가슴지지/회외직선바/상완수직고정/팔꿈치5–120도. 3풀리low-row기구, 481 cableLength오차7.1e-15/tangent2.44e-15/connector3.33e-16. stack0→6.139865/상승역행0/하단여유.17/상단3.860135. cableBody+1.11119/cloth+3.85691/pad+1.61362/frame+.708028, barMachine+.566995/benchMachine+.864075/bodyMachine+.698329. 양손·가슴·발·풀리·스택확대검토, smooth. 일반도식기구 및 softfinish 한계기록 보존.
- Quadruped: PureFormPhysio Daniel Sivertson PDF p5 Figure3 원문/원본이미지 부모검토. 양손/LEFT무릎지지·지지발들기·RIGHT다리만뒤로신전(버드독과구별). 손끝관통 수정후 heel+.02565/중수골palm+.04807/손끝+.01649~.06544, palm normalY−.98064/팔꿈치내각172.55도. 양무릎시작+.020/지지무릎전구간+.020/작동무릎최소+.01575. 전체피부바닥+.01575/의복+.53486/손팔-몸의복+.45993/허리353ray전부hit+.08281/gusset+.07274, 피부다리분리+.33946. 의복중앙연결포함분리지표0은 실제피부충돌아님을 별도 leg-separation에 기록. heel좌표±1.67109,-7.725729,5.291209 기록, 곡면전체접촉주장없음. 고정지지/loop0, smooth. publisher의 이전운동 note를 게시전교정.
- [완료] 설명/가이드 신규2회귀실패→177통과, quadruped1실패→178통과. 최종6파일225tests, 공유ESLint 및 설명수정후 전체tsc88912 exit0. 3등록/6영상SHA통과, 출처195건감사 errors0.
- [완료] live audit 전체1351: 양테마288/동작34/누끼19/신규1003/레거시7. 기존보류8종 보존, 신규보류없음. 세작업자완료, 영상자동생성없음.
- [대기] 나머지신규/보류수정 및 운영배포/실기기. 전체미완료. 이번health커밋/푸시/배포없음.

## 2026-10-14 재개 11차: 신규 3종 검수·등록 완료

- [완료] kneeling-hip-flexor-stretch / barbell-spider-curl / smith-machine-close-grip-bench-press 양테마6영상 로컬등록. public301→304/양테마282→285. 부모 최종양32시트 및 손/발/뒤발등/측면/가슴지지/의복/레일슬리브 확대검토,481표본·전체decode·Edge재생/탐색/loop·SHA 통과. 세 publisher 각각exit0, 등록 전6필드검사 확인.
- Half kneeling hip flexor: NHS 원문 한쪽무릎런지/골반·무릎정면/몸통수직/골반전진. 골반 +1.11197, 뒤고관절0→15도, stretch2/3/2/1. 뒤무릎 +.00146~.035/뒤발목등+.03346/앞sole+.020, gusset+.07101/허리353ray+.07737/양손몸의복+1.50209. 발·뒤무릎drift6.8e-15/loop0. 최종측면/허리/발등 시각검토, 곡면전체면접촉 아님 등 후보한계기록 보존.
- Barbell spider: BreakingMuscle 원문 약45도벤치가슴지지/머리목패드밖/언더핸드/상완수직고정. 팔꿈치5→120도, 수직오차2.22e-16, 회외normal .9507. 초기 바-프레임−.22560 발견후 지지대배치수정(ROM/카메라유지), 최종481 bodyBar+.903456/skinPad+.012/clothPad+.27157/bodyFrame+.55003/barFrame+.83506/plateFrame+4.14487/feet0. smooth, 일반도식벤치/softfinish 한계기록. 초기25표본 preflight 거부 후 최종481로 재통과.
- Smith close grip: M&S 원문 평벤치/좁은오버핸드/팔꿈치몸옆/가슴거의닿기/잠금금지. 그립3.0world(약30cm), 팔꿈치143.99→8도, 전구간손목최대25.33084도. shaft triangle+.03500003/시작가슴+.03530860/비가슴+.89204/머리+1.7130. 발·좌면·그립·loop0, 바XZ/슬리브오차3.6e-15. 최종레일높이/슬리브/가슴/손목확대검토, smooth.
- [보류] seated-smith-machine-shoulder-press: StrengthLog 상부가슴시작 변형에서 손목96.68도. 손목대안은 팔꿈치등뒤/턱접근 문제로 미채택, ROM축소없이 HOLD. skinned-seated-smith-press-20261014/held-review.json 및 HOLD.json 증거SHA보존, finalize/publisher 첫줄차단. 보류총8종, 공개등록없음. 실제완료3종은 위 대체운동포함.
- [완료] 설명/가이드 회귀 최초3실패→174통과, 대체운동1실패→175통과. 최종6파일222tests, 공유ESLint통과. 대체설명수정후 전체tsc17874 exit0. 3등록/6영상SHA통과, 출처192건감사 errors0. 첫단일등록검사는 specs생성전 mismatch였으며 build-motion-specs후 통과, 최종전체3등록 재통과.
- [완료] live audit 전체1351: 양테마285/동작34/누끼19/신규1006/레거시7. 세작업자완료, 영상자동생성없음.
- [대기] 나머지신규/보류수정 및 운영배포/실기기. 전체미완료. 이번health커밋/푸시/배포없음.

## 2026-10-14 재개 10차: 신규 3종 검수·등록 완료

- [완료] smith-machine-incline-press / kettlebell-triceps-extension / kneeling-hamstring-stretch 양테마6영상 로컬등록. public298→301/양테마279→282. 부모 최종양32시트 및 손/발/가슴/손목/레일슬리브/머리주변/측면/의복확대검토,481표본·전체decode·Edge재생/탐색/loop·SHA 통과. 세 publisher 각각exit0.
- Smith incline: 수평30도벤치/어깨폭오버핸드/상부가슴접촉/수직레일. 고정손방향에서 중간손목50.06도발생하여 연속손방향보정후25.9775도통과(바경로/접촉/그립/시작끝각유지). 최종팔꿈치8–151.8173도,shaft triangle+.001/nonchest+.44494/head+1.3171,bodyRail+3.7868/bodyFrame+2.3944/barFrame+.13574,레일슬리브오차3.55e-15/상단여유+.75/basefloor0. 발/좌면/그립/loop drift0, equipment key smith검증.
- Kettlebell extension: 한개벨양쪽horns양손파지,상단시작내림→펴기 continuous. 부모초기검토에서과도하게긴손잡이발견,본문직경2.7/전체높이3.54 비율1.311로형상보정후재렌더(원문제품280/210참고,정밀복제품아님). 최종481 bodyHandle+1.10498/allSkinFrame+.133307/skinBell+.0765269/cloth+4.95527/손간+2.29121,고정·loop0. 팔꿈치9.96165–90도 softfinish/일반도식핸들비율한계기록.
- Kneeling hamstring: Physitrack 원문 앞다리직선/발끝위/등곧게힌지,15→45도·stretch2/3/2/1. 사타구니피부노출·의복자기접힘을연결gusset표면/골반가중치/법선보정으로해소(ROM·카메라동일),부모동일확대재검토. 최종481 앞뒤꿈치/뒤무릎+.020,전체피부바닥+.01699(뒤발목),손몸/의복분리+1.50209,허리353ray전부hit gap+.07814/gusset solid Z-ray+.06847. gusset footprint밖miss162–237/pose 한계명시. 하체drift7.1e-15/loop0.
- [보류] lying-quad-stretch: 손발목양방향관통0/0·머리gap+.03373로보정했으나 무릎gap1.055world(약10.5cm)잔존. 무릎낮추면발/둔부관통재발,ROM155→160유지. held-review/SHA 및finalize/publisher차단보존,7번째보류. 대체kneelinghamstring채택하여실제3종완료.
- [완료] 4종설명/가이드 의미회귀 수정전4실패→171tests통과. 최종6파일218tests,공유/자막ESLint,대체설명수정후전체tsc79798 exit0. 3등록·6영상해시/출처189건감사errors0. 이전reverse incline 및incline close의review limitations45도잔재를실제30도로교정(finalize·격리review·공유note),영상/provenance불변·해시재확인.
- [완료] live audit 전체1351: 양테마282/동작34/누끼19/신규1009/레거시7. 기존보류포함7종보존,작업자완료,상주자동생성없음.
- [대기] 나머지신규/보류수정 및운영배포·실기기. 전체미완료,이번health커밋/푸시/배포없음.

## 2026-10-14 재개 9차: 신규 3종 검수·등록 완료

- [완료] incline-close-grip-bench-press / incline-cable-triceps-extension / cobra-stretch 양테마6영상 로컬등록. public295→298/양테마276→279. 부모 최종양32시트·손/중간손목/가슴/발/측면·등받이지지·허리앞/반대손 확대검토,481표본·decode·Edge재생/탐색/loop·SHA 통과. 세 publisher 각각exit0. 기존별칭 중복등록없음.
- incline close grip: 수평30도벤치(원문각도미지정,구현선택),어깨폭오버핸드/흉골아래가슴접촉. 최종shaft triangle+.001/nonchest+.91359/head+2.29434, palm-feet dot≥.991445, seat/feet/grip/loop drift0. 중간손목40.1817도검사실패본을rejected-wrist-max에보존하고 손그립방향보정후34.7803도통과. 바하단접촉/상단8도유지, 최종팔꿈치하단124.247/전구간최대130.427도. 벤치backUp=(0,.5,-sqrt(3)/2)수평30도 provenance기록.
- incline cable: 원문30도/낮은풀리등지고등지지/어깨폭직선바/상단시작 continuous. 케이블등받이−.02338은기계후방배치로,옷좌면−.00202는좌면.003낮춰해결(ROM유지). 최종481 skinBench수치0/clothBench+.0009812/cableBench+.348059/cableBody+1.03229, 발gap2.62e-7/fixed·loop0. 실제수평30도오차3.55e-15, 팔꿈치5→95도/전완수평아래5도,끝5도한계보존.
- cobra: IMSA 원문 골반/발등바닥·손지지·가슴전상방상승. 낮은코브라 spine10→55도, 팔꿈치내각35.24→85.98도(완전신전형아님). 손고정,근위손바닥+.0227/손끝+.0283~.0537,발등+.014995/발가락+.014374,팔몸+.20077,허리353ray×481전부hit gap+.098538. 하체/손/loop drift≈0,곡면손바닥전체접촉아님한계보존. stretch2/3/2/1.
- [완료] 설명/가이드 수정전 의미회귀3실패→수정후167tests. 최종6파일214tests, 공유/자막ESLint, 공유설명수정후전체tsc69173 exit0. 3등록·6영상해시 및 출처186건감사 errors0 통과.
- [완료] live audit 전체1351: 양테마279/동작34/누끼19/신규1012/레거시7. 기존보류6종보존,세작업자완료,상주자동생성없음.
- [대기] 나머지신규/보류수정 및운영배포·실기기. 전체미완료, 이번health커밋/푸시/배포없음.

## 2026-10-14 재개 8차: 신규 3종 검수·등록 완료

- [완료] reverse-grip-incline-press / sphinx-stretch / cable-lying-triceps-extension 양테마6영상 로컬등록. public292→295/양테마273→276. 부모 최종양32시트·손/가슴/발·전완/앞골반/허리·측면 접촉확대검토,481표본·decode·Edge재생/탐색/loop·SHA 통과. 세 publisher 각각exit0.
- reverse incline: 원문30도벤치/넓은언더핸드/윗가슴비접촉/잠그지않는끝각. grip6.8/shoulder4.038, elbow8–134.2304도, shaft삼각형+.035/가슴+.037597/머리+1.3385, 손바닥머리방향dot≥.9999999999. 발/좌면/그립/loop drift0.
- sphinx: IMSA 원문 전완평행·엎드린다리·가벼운상체신전. spine15→35도, skinmat+.0096767/cloth+.0111763/앞골반cloth+.0652337, 허리353ray×481전부hit gap+.0996773. 상단팔꿈치가어깨보다약5.5cm앞·발등전체대신발가락윗면접촉·전완소량이동 한계기록. stretch2/3/2/1.
- cable lying: 평벤치·머리쪽낮은풀리·오버핸드바·상완고정90→5도. 후두패드를좁혀목관통수정, 좌면.007낮춰접촉침범해소(ROM불변). 최종481 skinBench수치0/clothBench+.007/barBench+3.29254/cableBench+1.21178, bodyBar+1.10659/cableBody+1.06581, 발gap2.62e-7/fixed·loop0. 5도softfinish·중립머리지지등원문차이한계보존.
- [보류] cross-body-cable-extension: ROM115→5유지에도 D외곽−.09769/shaft−.08257/cable−.02488/cloth−.07336 예비표본 충돌잔존. 최초481·최신25표본SHA와held-review.json 보존, finalize/publisher HELD차단. 출처GIF403, 임의그립변형없음. 대체 cable lying 채택하여 실제완료3종충족. 보류총6종.
- [완료] 최종6파일211tests, 공유/자막ESLint, 대체설명수정후전체tsc38470 exit0. 3등록·6영상해시 및 출처183건감사 errors0 통과.
- [완료] live audit 전체1351: 양테마276/동작34/누끼19/신규1015/레거시7. 세작업자완료, 상주자동생성없음.
- [대기] 나머지신규/보류수정 및운영배포·실기기. 전체미완료, 이번health커밋/푸시/배포없음.

## 2026-10-14 재개 7차: 신규 3종 검수·등록 완료

- [완료] close-grip-floor-press / single-arm-cable-overhead-extension / wall-slide 양테마6영상 로컬등록. 실제신규3종 public289→292/양테마270→273. 부모 최종양32시트·손/팔꿈치/발/측면/어깨/벽손날/전면해부 확대검토,481표본·decode·Edge재생/탐색/loop·SHA 통과. 세 publisher 각각exit0.
- close floor barbell: 그립4.9/상완벌림10.33도·하단팔꿈치109.20→상단5도, 하단수직전완offset8.9e-16/상완바닥gap0. 손목최대27.01/shaft신체삼각형+.94497/원판바닥+2.8946. 등skin gap.05116/끝5도 등한계출처기록보존.
- single cable overhead: 원문대로상단시작→내림→올림 continuous. 손잡이외곽손목관통−.117 발견후 그립축에맞춘D면으로교정, ROM90→5유지. 최종481 전체손피부-D외곽+.0865043/cableBody+.780659/clothCable+2.36480, 반대팔/몸통/발drift0. 상단손바닥앞Z+.974112.
- wall slide: OUH p33 손날접촉변형. 전완벽겹침을 팔꿈치굽힘방향보정으로해소, 손목궤적/어깨ROM유지. 최종481 전체피부/의복-벽 및littlefinger gap+.02, hand/body X/Z분리gap+.7718/waist+.0420, 발/몸/루프drift0. 부모전면확대에서가슴윤곽연속확인.
- [완료] 최종6파일207tests, 공유및자막ESLint, 공유설명수정후전체tsc52713 exit0. 3등록·6영상해시/출처180건 errors0 통과.
- [완료] live audit 전체1351: 양테마273/동작34/누끼19/신규1018/레거시7. 기존보류5종보존. 세작업자완료,상주자동생성없음.
- [대기] 나머지신규/기존보류수정 및운영배포·실기기. 전체미완료, 이번health커밋/푸시/배포없음.

## 2026-10-14 재개 6차: 신규 3종 검수·등록 완료

- [완료] push-press / bar-cable-overhead-triceps-extension / neck-cars 양테마6영상 로컬등록. 이번 실제완료3종, public286→289/양테마267→270. 부모 최종양32시트와 각 손/어깨/목/좌면/발/측면/허리 확대검토,481표본·decode·Edge재생/탐색/loop·SHA 통과.
- push-press: 실제팔길이에맞춰그립6.5/상단높이보정, 최종팔꿈치5–150.58도/손목1.46–58.15도, 바몸통삼각형최소+.005/머리+.08671. 원문넓은그립선택형, 5도softfinish한계기록. 기존36도끝각영상 rejected-top-rom 보존. 최종 root 양32/rack0/hand0,156/side90/waist90 확인.
- bar cable overhead: native팔꿈치회전면교정으로톱니돌출해결, ROM90→5도유지. 시작손바닥Y+.950702, bodyBar1.106588/cableBody.387185/clothCable1.954695 양수. 겨드랑이접힘과5도끝각한계기록.
- neck CARs: 앉은몸통고정1방향8초continuous원. 굴곡25/신전20/회전±35/측굴±20, 발/몸통/골반drift0. 좌면gap+.00849993/머리어깨+.23618. frame408 neckedge비율.07146 미세접힘 한계와확대증거보존, root 추가시각검토통과.
- [완료] 최종6파일204tests, 공유/자막ESLint, 전체tsc33657 exit0. 3등록·6영상해시 및 출처177건감사 errors0. 첫push publisher는 hands검토필드누락으로중단; 해당실제검토기록추가후 source/영상/복사해시재확인·등록단계만재개하여exit0, 중복없음확인.
- [완료] live audit 전체1351: 양테마270/동작34/누끼19/신규1021/레거시7. 기존보류5종보존. 세작업자완료,상주자동생성없음.
- [대기] 나머지신규/기존보류수정 및 운영배포·실기기. 전체운동제작미완료, 이번health커밋/푸시/배포없음.

## 2026-10-14 재개 5차: 덤벨 푸시 프레스 반영, 2후보 보류

- [완료] dumbbell-push-press 양테마2영상 등록. 부모 양32·hand156/side90/waist90확대검토,481표본·decode·Edge재생/탐색/loop·SHA통과. 딥.8–1.5/하체드라이브1.5–1.9/팔프레스1.9–2.6/머리위2.6–4/복귀4–7초,단일continuous. 팔끝2.86도soft끝각 등 원문과차이기록.
- [보류] high-lunge-stretch: 후면둔부구형돌출이 underlying skin에도존재. 골반/요추정렬과hipweight보정으로미해결. skinned-high-lunge-20261014/held-review.json 및finalize/publisher HELD차단. 남은MP4미승인본,게시금지.
- [보류] single-arm-cable-triceps-kickback: 지지손피부+shorts6137ray에서최소+.01190/근위손바닥+.06625로보정했으나 중간phase120/360 D손잡이-의복gap−.05311잔존. 추가dense481 exit0에서46/481음수·frame131최저−.08505 확정(피부+.01270). ROM유지한기하수정후에도미해결,held-review.json 및finalize/publisher HELD차단,최종MP4없음.
- [완료] public286/양테마267,동작34/누끼19/신규1024/레거시7(전체1351). 6파일201tests/최신1등록2해시/출처감사173건errors0 통과. 공유3종설명후전체tsc54279 exit0,공유및최종자막ESLint통과, diffcheck통과.
- [대기] 나머지신규 및기존보류수정,운영배포/실기기. 전체미완료,이번health커밋/푸시/배포없음. 이번3작업자및진단세션종료,상주자동생성없음.


## 2026-10-14 재개 4차: 신규 3종 반영

- [완료] dumbbell-floor-fly / wide-grip-cable-pushdown / dynamic-hamstring-stretch 양테마6영상 등록. 부모 양32시트 및 손/측면/발/후면허리 확대 검토,481표본·양decode·Edge재생/탐색/loop·SHA 검증 통과.
- floor fly 팔꿈치30도 전구간유지/상완바닥gap9.65e-12/덤벨바닥+.37162. widepush grip/shoulder1.21394, 실제elbow118.581→4.964도, 원문lockout대비soft끝각 한계기록. dynamic hamstring 앞무릎180도/뒤153.385도/중립발·척추/힌지0→55도 continuous4초왕복2회. 허리 기존bin근사−.000747 경고를보존하고 실제피부삼각형ray353개×481전부hit/최소gap+.086307 검증,부모확대피부관통없음.
- [완료] public285/양테마266,동작34/누끼19/신규1025/레거시7(전체1351). 6파일198tests/최신3등록6해시/출처173건감사 통과. 공유3종설명후 전체tsc89260 exit0,공유ESLint94776 exit0,최종자막ESLint/diffcheck 통과.
- [대기] 나머지 신규 및 보류결함 수정, 운영배포·실기기. 전체미완료,이번health커밋/푸시/배포없음. 이번3작업자와렌더프로세스종료,자동생성없음.


## 2026-10-14 재개 3차: 신규 3종 반영

- [완료] close-grip-dumbbell-floor-press / close-grip-pushdown / dynamic-calf-stretch 양테마6영상 등록. 부모 양32시트·손/측면/발 최대전진 확대 검토,481표본·decode·Edge재생/탐색/loop·SHA 검증 통과.
- close floor: 중립 손바닥 안쪽 .9982, 하단상완벌림10.366도(기존44.43도), 바닥접촉. close pushdown: grip/shoulder .663, 실제119.52→10.98도; 좁은전완기하 softfinish 및 출처1초유지 대비.4초 차이 기록(충돌회피ROM축소아님). dynamic calf:4초왕복2회 continuous, 뒤무릎180도/양손벽+.00905/양발sole0, 원본 heel곡률+.01042 고정 한계기록.
- [완료] public282/양테마263, 동작34/누끼19/신규1028/레거시7(총1351). 최신3등록6해시/출처170건감사/6파일195tests 통과. 공유설명후 전체tsc28481 exit0, 공유ESLint99653 exit0, 자막ESLint 및diffcheck 통과.
- [대기] 나머지 신규 및 보류결함 수정. 전체 미완료, health 운영배포/실기기/커밋/푸시 없음. 이번3작업자종료,자동생성프로세스없음.
- 별도 사용자 요청: 메모 APK는 MeetingMinutes main d61dcce로 GitHub에 업로드 완료. health영상 커밋과 무관.


## 2026-10-14 재개 2차: 신규 2종 반영, 소흉근 후보 보류

- [완료] single-arm-dumbbell-floor-press / reverse-grip-ez-pushdown 양테마4영상 등록. 부모 양32시트·손/빈손 바닥 지지 확대 검토 후 채택. 481표본·전체 decode·Edge 재생/탐색/loop·출처와 해시 검증 통과. 한팔 프레스는 빈손바닥 gap .003375/전신고정, EZ 언더핸드는 해부학적 손바닥 투영 +.86163(기존 오버핸드 -.86163) 확인.
- [완료] 등록279/양테마검토260, 동작34/누끼19/신규1031/레거시7. 6파일192tests, 최신2등록4해시, 출처167건감사, 대상ESLint 통과. 공유3종 설명 수정 후 전체tsc78791 exit0.
- [보류] pec-minor-stretch: 부모 full/side/hand210 검토에서 팔꿈치 삼각 돌출 확인. 양방향 접촉 검사에서 손가락/반대쪽 전완 내부 표본 631/874개 확인(이전 단방향 양수 gap은 통과 근거 아님). skinned-pec-minor-20261014/held-review.json에 증거 보존, finalize/publisher HELD 차단. 최종 렌더·게시 없음. 다음에는 실제 팔꿈치 skin weight와 맞잡는 손의 형태를 수정한 뒤 양방향 충돌 검증 필요.
- 이번 재개로 신규5종/양테마10영상 추가(274→279). 전체1351종 미완료. 운영배포/실기기/커밋/푸시 없음. 이번 작업자 모두 종료, 자동 생성 프로세스 없음.


## 2026-10-14 재개 1차: 신규 3종 반영

- 덤벨 플로어 프레스 / EZ바 케이블 푸시다운 / 상부 승모근 스트레칭 양테마6영상 등록. 부모 양32시트·손/측면/목/발 확대 검토 후 게시. 481표본·접촉/해부·decode·Edge·SHA 검증. floor는 수직전완/후면상완바닥접촉 우선, 하단실제109.2도 vs 출처약90도 차이 기록. upper-trap 측굴후전굴순서와 actual20.24/9.86도 확인.
- public277/양테마258, 동작34/누끼19/신규1033/레거시7(전체1351 미완료).
- 6파일189tests,3등록6해시,출처165건감사,대상ESLint/diffcheck 통과. 공유설명후 전체tsc62680 exit0.
- 다음 미제작3종 선정·제작 계속. 운영배포/실기기/커밋/푸시 없음.


## 2026-10-14 영상 제작 재개

사용자가 메모 작업 배포 후 영상 제작 재개를 요청했다. 이전 중단 지시는 해제. EZ바 케이블 푸시다운 양테마를 root 양32시트/손확대 검토 후 등록해 public275. 출처·동작·해시/스펙 확인 통과. 덤벨 플로어 프레스와 상부 승모근 스트레칭 후보 제작·검수 중. 공유3종 설명/guide/요약 및142 semantic tests, 대상ESLint, 전체tsc62680 exit0 통과. 전체1351 완료 아님.


## 2026-10-14 사용자 요청으로 영상 제작 일시 중단

진행 중이던 마지막 후보까지 등록 후 신규 제작을 중단했다. 메모 프로젝트 입력 문제·채팅 이슈·APK 작업으로 전환.

- 마지막 5개: v-bar-pushdown, wrist-flexor-stretch, underhand-barbell-row, single-arm-cable-pushdown, wrist-extensor-stretch.
- public 274종, 양테마 검토 완료 255종. 전체 1351종 완료 아님: 신규 1036, 동작 재검토 34, 누끼 재검토 19, 레거시 재제작 7.
- 전체 6파일 186테스트, TypeScript, ESLint, diff 검사 통과. 마지막5종/10MP4 해시·스펙 검사 및 출처162건 감사 통과.
- forward-fold topology 및 behind-neck press 후보는 보류 유지. 새 영상 작업은 사용자 재개 요청 전 시작하지 않는다.


- 2026-10-14 연속23차: 공개269/양테마250,동작34/누끼19/신규1041/구형7(전체1351). wide-grip-barbell-row/triceps-pushdown 신규2종4영상,부모양32+손/허리확대검토·481/decode/Edge/SHA 통과. row의복손조각은팔bone영향제외후재검토(garmentArmWeightCount0/waist+.01303),반려본보존. 기존highwaist8종필터정상확인. 푸시다운은일반ID새렌더이며-2복사아님. 6파일182tests·2등록4해시·출처메타157종통과,269전체tsc24601 exit0(underhand설명추가전),135semantic시점ESLint/diffcheck통과. 누적신규87종174영상+별칭7항목+기존교체5종. 다음 underhand-barbell-row/V바푸시다운/손목굴근스트레칭 제작,underhand방법guide포함semantic136통과. 전체미완료/배포·실기기·커밋·푸시없음.

- 2026-10-14 재개 확인: audit 공개267/양테마248 유지. 공유 wide-grip-barbell-row/wrist-flexor-stretch 방법·guide 교정까지 semantic135/ESLint/diffcheck 통과. row 부모프리뷰의 전면허리 노출은 highwaist로수정했으나 최종양32/waist210에서 손에청록의복조각 발견해 게시보류, 작업자손팔boneweight제외후재렌더중. new_motion의NHS사진다운로드 권한대기턴을interrupt/followup복구, 확보본문으로 wrist-flexor 제작재개(다운로드우회없음). wrist도무응답턴복구, triceps-pushdown finalize작성전상태에서재개. 전체미완료.

- 2026-10-12 연속22차 중간: 공개267/양테마248, 동작34/누끼19/신규1043/구형7. cable-bar-incline-curl 신규(30도전방단일풀리·직선바·언더핸드) 부모 양32/hand210/side210 검토 후등록,481/decode/Edge/SHA 통과. 6파일180tests·최신1등록2MP4해시 통과. 누적신규85종170영상+별칭7항목+기존교체5종. behind-neck-repair/HOLD.json: 초기손목98.95도,후속30.16도이하로줄였지만 어깨메쉬단절로미승인/공유원본보존. 해당 worker는 wide-grip-barbell-row 신규로이동. triceps-pushdown 신규제작 및 wrist-flexor-stretch 준비중. 부모 behind-neck/푸시다운 방법·guide교정 유지;푸시다운머신방법은보존. 전체미완료.

- 연속21차 후속 진행: cable-bar-incline-curl 및 behind-the-neck-press 방법/guide/oneLiner 교정, semantic132 통과(아직 영상 미등록). standing-forward-fold-topology-20261012/review.json: 독립의복20718삼각형 재설계/원래ROM 유지했으나 정점 뒤골반 피부2곳 관통해 보류. 원본 보존, 최종481·decode·Edge 미실행. 해당 worker는 wrist-flexor-stretch 신규로 이동. 기존 triceps-pushdown-2의16시트 손바닥 방향이 overhand prompt와 달라 triceps-pushdown 자동별칭도 보류, 신규제작 검토 예정.

- 2026-10-12 연속21차: 공개266/양테마247, 동작34/누끼19/신규1044/구형7(전체1351). lateral-leg-swing / reverse-grip-bench-press / finger-extension-stretch / wide-grip-incline-bench-press / incline-cable-curl 신규5종10영상, barbell-overhead-press 기존보류 연속3D 교체. 부모 양32시트 및 손/측면 확대 검토,481/decode/Edge/SHA 통과. 관련6파일177tests·최근4등록8해시·출처메타154종·ESLint·전체tsc27006 exit0·diffcheck 통과. 이번누적 신규84종168영상+정확별칭7항목+기존교체5종(신규렌더4종8영상/재사용1종). 다음 cable-bar-incline-curl 30도전방단일바 변형 신규, behind-the-neck-press 기존결함 수정, standing-forward-fold 별도의복 topology 재검토 중. 전체미완료. 배포·실기기·커밋·푸시 없음.

- 2026-10-12 연속20차: 공개260/양테마241, 동작35/누끼19/신규1049/구형7. kettlebell-concentration-curl / step-calf-stretch / leg-swing 신규3종6영상, dumbbell-bench-press / dumbbell-fly 기존보류영상 연속3D 교체. 부모 모든양32시트·DB손확대 검토,481/decode/Edge/SHA 통과. 교체 old4파일+old-records 독점백업/현재및백업SHA guard. 6파일171tests·최근5등록10해시·최신ESLint 통과,259전체tsc5995 exit0. 이번누적 신규79종158영상+별칭7항목+기존교체4종(신규렌더3종6영상/재사용1종). 다음 standing barbell-overhead-press 교체후보완료/부모미검토, incline-cable-curl 전완간섭수정 및 lateral-leg-swing 제작중. forward-fold 의복결함 보류유지,전체미완료. 배포·실기기·커밋·푸시 없음.

- 2026-10-12 연속19차: 공개255/양테마236, 동작37/누끼19/신규1052/구형7. tempo-bench-press / larsen-press / cable-concentration-curl / standing-quad-stretch 신규4종8영상. 부모 양32시트 및 cable상완/quad손발목 확대 확인, 481/decode/Edge/SHA 통과. 템포3:1:1 continuous, Larsen양발공중 smooth, cable양손회외무릎지지 smooth, quad발목잡은채당김완화 stretch. 6파일166tests·4등록/8해시 통과. 전체tsc37940(251) exit0, 최신ESLint18211 결과대기. 252시점JSON provenance연결140종 출처목록/해시일치 검사통과. 누적신규76종152영상+별칭7항목+기존교체2종(교체중신규생성1종2영상). 다음 기존 dumbbell-bench-press 결함교체/케틀벨컨센트레이션/스텝종아리 제작중. 전체미완료 및 forward-fold보류유지. 배포·실기기·커밋·푸시 없음.

- 2026-10-12 연속18차: 공개251/양테마232, 동작37/누끼19/신규1056/구형7. wide-grip-bench-press / spoto-press / doorway-chest-stretch / hip-circle / pause-bench-press 신규5종10영상, machine-biceps-curl 정확재사용 별칭 및 machine-preacher-curl 보류영상 교체. 교체는 이전 JPG/spec/양MP4/review/verification exclusive백업 및 기존SHA 확인 후 공개plate-loaded 연속3D 재사용. 부모 모든양시트 검토, 481/decode/Edge/SHA 근거 확인. 6파일162tests·최근7등록/14해시 통과. 공개250 ESLint 통과, tsc가 발견한 5개 oneLiner undefined 수정 후 tsc37940 재검사중. 이번 누적 신규72종144영상+정확별칭7항목+기존교체2종(standing-cable 신규2영상, machine-preacher 기존영상재사용). 전체미완료, tempo-bench 후보완료/케이블컨센트레이션·서서대퇴사두 제작중, forward-fold보류유지. 배포·실기기·커밋·푸시 없음.

- 2026-10-12 연속17차: 공개244/양테마225, 동작38/누끼19/신규1062/구형7. plate-loaded-preacher-curl / jm-press / corner-pec-stretch / machine-hammer-curl / single-arm-machine-curl 신규5종10영상. 부모 양시트·코너허리확대 재검토, 481/decode/Edge/SHA 통과. 코너 의복 단차 해결 후 반영. cable-preacher/plate-loaded 출처 URL 치환 오류는 oldSHA guard로 spec/provenance/review/verification 동시 정정, 영상 불변. hammer도 게시 전 정정. 6파일156tests·6등록/12MP4해시 통과. 공개239 당시 ESLint95439/전체tsc9266 exit0 확인. 이번 누적 신규67종134영상+정확별칭6항목+교체1종2영상. 다음 wide-grip-bench-press/spoto-press/doorway-chest-stretch/hip-circle 및 machine-preacher 교체/machine-biceps 별칭 후보 검토 중. standing-forward-fold 의복 결함 보류 유지. 전체 미완료, 배포·실기기·커밋·푸시 없음.

- 2026-10-12 연속16차: 공개239/양테마220,동작38/누끼19/신규1067/구형7. cable-preacher-curl / dumbbell-z-press / z-press / tempo-curl 신규(각 skinned-{cable-preacher,dumbbell-z-press,barbell-z-press,tempo-curl}-20261012). 부모양시트·기구/바닥접지·481/decode/Edge/SHA통과,템포컬1초상승3초하강2회continuous.6파일151tests·최신2등록/4해시일치. ESLint95439/전체tsc9266 결과대기.이번누적신규62종124영상+별칭6항목+교체1종2영상. corner-pec-stretch 부모확대에서허리/의복중앙단차발견해게시보류후worker진단중(shoulder-210.png),generic프레스설명도미수정.다음plate-loaded-preacher-curl/jm-press/doorway-chest-stretch 제작중. 전체미완료/배포·실기기·커밋·푸시없음.

- 2026-10-12 연속15차: 공개235/양테마216,동작38/누끼19/신규1071/구형7. wide-grip-preacher-curl / lat-stretch 신규(격리 skinned-wide-preacher-20261012/skinned-lat-stretch-20261012). 부모양시트·출처/기구·481/decode/Edge/SHA확인. 와이드바어깨비1.314·상완패드지지,광배벽지지양손고정·45도고관절접힘.6파일147tests·2등록/4해시통과.233까지ESLint17116/전체tsc16461 exit0확인.이번누적신규58종116영상+별칭6항목+교체1종2영상. 다음 cable-preacher-curl/dumbbell-z-press/corner-pec-stretch 격리제작중,forward-fold결함보류유지.전체미완료/배포·실기기·커밋·푸시없음.

- 2026-10-12 연속14차: 공개233/양테마214,동작38/누끼19/신규1073/구형7. dumbbell-side-bend 최종양시트/빈손확대검토후반영(skinned-dumbbell-side-bend-20261012). 측굴20도·골반고정·의복gap+.02423·빈손머리gap+.07279,초기팔꿈치피부결함은rejected-low-freehand보존.6파일145tests·1등록/2해시통과. ESLint17116/전체tsc16461 결과대기.누적신규56종112영상+별칭6항목+교체1종2영상. 다음wide-grip-preacher-curl/lat-stretch/dumbbell-z-press 격리제작중. 전체미완료,배포·실기기·커밋·푸시없음.

- 2026-10-12 연속13차: 공개232/양테마213,동작38/누끼19/신규1074/구형7. biceps-stretch 신규 및 standing-cable-curl 기존8포즈→연속3D/다크테마 교체. skinned-biceps-stretch-20261012 및 skinned-standing-cable-replace-20261012. 교체구본JPG/spec/light와review/verification은 backup-before-continuous-3d에SHA확인·exclusive백업완료. 부모양시트/손·풀리·스택확대,481표본·decode/Edge/SHA통과.6파일145tests·2등록/4해시통과. dumbbell-side-bend 설명/guide/semantic test 선반영,영상은아직후보제작중이며미게시. 다음wide-grip-preacher-curl/lat-stretch제작중. 이번누적신규55종110영상+별칭6항목+구형교체1종2영상,등록수는61증가. 전체미완료/배포·실기기·커밋·푸시없음.

- 2026-10-12 연속12차: 공개231/양테마211,동작38/누끼20/신규1075/구형7. 이번 요청 시작171 이후 신규54종108영상+정확별칭6항목,총60항목추가. ez-bar-preacher-curl / reverse-preacher-curl / barbell-pullover 신규, skinned-{ez-preacher,reverse-preacher,barbell-pullover}-20261012. 부모양시트·손확대·그립/기구·출처확인,publisher/481/decode/Edge/SHA통과. EZ회외굴곡과직선바회내 구분,풀오버팔꿈치8도고정·어깨82도호이동.6파일142tests·최신2등록/4해시통과.229까지ESLint22431/전체tsc23230 exit0확인. standing-forward-fold는깊은접힘 의복돌출결함으로보류(격리skinned-forward-fold-20261012 증거보존,전체범위에서제외하지않음). 다음 standing-cable-curl 구본SHA검증/백업교체후보, dumbbell-side-bend, biceps-stretch 제작중. 전체미완료/배포·실기기·커밋·푸시없음.

- 2026-10-12 연속11차: 공개228/양테마208,동작38/누끼20/신규1078/구형7. 이번 요청 신규51종102영상+정확별칭6항목,총57항목추가. single-arm-dumbbell-lying-extension / ankle-mobility-drill / single-arm-preacher-curl / dumbbell-jm-press 신규. 각각 skinned-{single-lying-triceps,ankle-mobility,single-preacher,dumbbell-jm-press}-20261012. 부모양테마32시트확인,481표본·decode·Edge·SHA guard 통과. 한팔삼두 지지손 표면충돌 수정 후5대표포즈 ray/triangle 침투0,발목앞발접지·벽gap양수,프리처한팔지지,JM상완이동 검증. 6파일139tests·4등록/8해시·diffcheck통과. 224까지 ESLint95773/전체tsc7769 exit0 확인. 현재 ez-bar-preacher-curl/barbell-pullover/standing-forward-fold 제작중. 전체미완료/배포·실기기·커밋·푸시없음.

- 2026-10-12 연속10차: 공개224/양테마204, 동작38/누끼20/신규1082/구형7(전체1351). 이번 요청 시작171 이후 신규47종94영상+정확별칭6항목, 총53항목 추가. 직전215 이후 seated-band-pull-apart, dumbbell-preacher-curl, seated-barbell-overhead-press, standing-it-band-stretch, seated-overhead-barbell-extension, standing-hamstring-stretch 신규; seated-leg-curl/close-grip-bench-press/cossack-squat-2 별칭 연결. 양테마 시트·출처·재생·해시 확인, 별칭 legacy16-reverse 원본 타이밍 보존. 레그컬 원본 스쿼트 오기 및 별칭 벤치/코사크 설명 수정. 최신 6파일135tests·5등록/10해시 통과. ESLint 세션95773/전체tsc7769 결과 확인 필요. 다음 후보 single-arm-dumbbell-lying-extension 및 ankle-mobility-drill 완성/부모 검토 대기, wrist=single-arm-preacher-curl,cutout=dumbbell-jm-press,new_motion=standing-forward-fold 제작. 전체 미완료, 운영배포/실기기/커밋/푸시 없음.

- 2026-10-08 연속9차: 공개215/양테마195,동작38/누끼20/신규1091/구형7. 이번 신규41종82영상+정확별칭3항목,총44항목추가. single-arm-dumbbell-bench-press / behind-the-back-cable-curl / seated-glute-stretch 추가. skinned-{flat-single-press,behind-cable,seated-glute}-20261008. 빈팔천장고정단측프레스, 뒤풀리/상완뒤고정/앞뒤스탠스컬, 발목반대무릎지지15도hip hinge 출처일치 확인. 부모양시트·접촉확대·481/decode/Edge/SHA guard 통과,3등록/사양/6해시일치,6파일126tests통과. 이전212까지ESLint/전체tsc통과 확인. 현재 seated-band-pull-apart / dumbbell-preacher-curl / standing-it-band-stretch 격리제작중. 전체미완료,운영배포/실기기/커밋/푸시없음.

- 2026-10-08 연속8차: 공개212/양테마192,동작38/누끼20/신규1094/구형7. 이번 신규38종76영상+정확별칭3항목(기존양MP4재사용),총41항목추가. neutral-grip-dumbbell-press / single-rope-cable-curl / reverse-grip-dumbbell-press / seated-hamstring-stretch 신규, pronated-dumbbell-curl←dumbbell-reverse-curl 및 dumbbell-wrist-extension←reverse-wrist-curl 별칭연결. 격리 skinned-{flat-neutral-press,single-rope,flat-reverse-press,seated-hamstring}-20261008,alias-{pronated-dumbbell,dumbbell-wrist}-20261008. 부모양32시트·손확대·출처/기구/동작확인,decode/Edge/SHA guard 통과. 별칭원본그대로controlled,reversepress더느린하강continuous,hamstring전체481좌면gap+.005582이상·뒤꿈치/고관절고정·척추상대회전0. 원본덤벨reverse설명도오버핸드명시수정.6등록/사양/12해시일치,6파일123tests통과. 현재 single-arm-dumbbell-bench-press 후보완료(부모미검토),behind-the-back-cable-curl 및 seated-glute-stretch 제작중. 전체미완료/운영배포·실기기·커밋·푸시없음.

- 2026-10-08 연속7차: 공개206/양테마186,동작38/누끼20/신규1100/구형7. 이번 신규34종68영상+정확별칭1항목,총35항목추가. dumbbell-lying-triceps-extension / levator-scapulae-stretch / kettlebell-biceps-curl 추가. skinned-{lying-triceps,levator,kettlebell-biceps}-20261008 최종양테마·출처·481표본·접촉·decode·Edge·SHA검증. flat bench 머리받침/등/발접촉, levator 손보조없이왼기울임→같은쪽회전/전굴, 케틀벨회외컬 수직매달림 확인.3등록/사양/6해시일치,6파일116tests통과. 이전203까지113tests/ESLint/전체tsc통과 확인(99136 exit0). 현재 neutral-grip-dumbbell-press(하단깊이/등판접촉보정),single-rope-cable-curl,seated-hamstring-stretch(의자앞쪽착석/뒤꿈치접지) 제작중. 전체미완료,운영배포/실기기/커밋/푸시없음.

- 2026-10-08 연속6차: 공개203/양테마183, 동작38/누끼20/신규1103/구형7(전체1351). 이번 신규31종62영상+정확별칭1항목(기존양MP4재사용), 총32항목 추가. cuban-press / band-hammer-curl / reverse-prayer-stretch 신규, ez-bar-reverse-curl은 reverse-ez-bar-curl의 정확동작/기구 별칭으로 aliasOf 및 originFiles SHA 기록. 격리 skinned-{cuban-press,band-hammer,reverse-prayer}-20261008 및 alias-ez-reverse-20261008. 부모 양테마32시트/손확대 승인·publisher guard 통과. 4등록/사양/8MP4해시일치,6파일113tests·ESLint 통과. 전체tsc 실행중(세션99136). 앞선 공개199까지 전체tsc통과. 다음 cutout=dumbbell-lying-triceps-extension, wrist=kettlebell-biceps-curl, new_motion=levator-scapulae-stretch 연속 격리 제작. 공유 게시 root만 순차, 미검토후보3개까지 작업자 자율연속선정. 전체미완료/운영배포·실기기·커밋·푸시 없음.

- 2026-10-08 연속5차: 이번 28종56영상, 공개199/양테마179. 직전191 이후 dumbbell-6-way-raise / cable-drag-curl / dumbbell-rear-delt-row / scalene-neck-stretch / tempo-lateral-raise / high-cable-curl / dumbbell-external-rotation / prayer-stretch 추가. 격리 skinned-{sixway,drag-cable,rear-delt-row,scalene,tempo-lateral,high-cable,external-rotation,prayer}-20261008. 부모 양테마32시트/접촉확대 확인, 각481표본·decode·Edge·SHA guard 게시통과. tempo 2초상승/1초정지/3초하강 continuous, 6way smooth 3단계 설명에 전체경로 포함, scalene 오른기울임→왼회전 stretch, external 서서90/90변형, prayer 손목신전48.26→83.83도/손하강·팔꿈치바깥/손피부간격+.00122616. 공개197 단계 6파일107tests·ESLint·전체tsc 및 최신6등록/12해시 통과, 신규2종 포함 후속검증 진행중. 현재 cutout=cuban-press, wrist=band-hammer-curl, new_motion=reverse-prayer-stretch 격리 제작. 전체 미완료, 운영배포/실기기/커밋/푸시 없음.

- 2026-10-08 연속4차체크포인트: 이번20종40영상,공개191/양테마171,동작38/누끼20/신규1115/구형7. neutral-grip-incline-dumbbell-press / wide-grip-cable-curl / ankle-rock / cable-wrist-curl 추가4종8영상 반영. 격리 skinned-{incline-neutral-press,wide-cable,ankle-rock,wrist-cable}-20261008. 부모양32frame/확대/decode/Edge/SHA승인,4등록/양manifest/8해시일치. 중립인클라인하단어깨높이·깊은가슴접촉생략명시,wide그립어깨1.364배,ankle481skin좌우높이차0·지지점작은rolling slip기록,손목30도신전→25도굴곡/전완지지gap+.01912.6파일101tests·대상ESLint·전체tsc통과. 현재 dumbbell-6-way-raise 후보완료(부모양시트확인,설명/게시미실행;skinned-sixway-20261008,smooth단일키,초기빠른후보보존/구면+cos변경),cutout=dumbbell-rear-delt-row앉은변형,wrist=cable-drag-curl,new_motion=scalene-neck-stretch오른손왼어깨접촉검증중. 전체미완료/계속진행,실기기·운영배포·커밋·푸시없음.

- 2026-10-08 연속제작3차체크포인트: 이번총16종32영상,공개187/양테마167,동작38/누끼20/신규1119/구형7(1351). 직전159이후 foot-arch-doming / seated-single-arm-dumbbell-shoulder-press / cable-ez-bar-curl / dumbbell-seesaw-press / single-arm-cable-curl / toe-tap / incline-dumbbell-triceps-extension / cable-rope-curl 추가. 격리 skinned-{foot-doming,seated-single-press,cable-ez,seesaw-press,single-cable,toe-tap,incline-triceps,rope-cable}-20261008에 출처/재현/481표본/양32frame확대/decode/Edge/SHA/published근거. 부모최종시각승인·최신8등록/양manifest/16MP4SHA일치. 설명/가이드/요약·timing반영,6파일97tests·ESLint·전체tsc통과. 현재 neutral-grip-incline-dumbbell-press(하단어깨높이시범,깊은가슴접촉생략),wide-grip-cable-curl,ankle-rock 후보완료/부모미검토미게시. 다음 cutout=dumbbell-6-way-raise(smooth기존3칸자막으로6단계대응,새sixway불필요전달),wrist=cable-wrist-curl,new_motion=scalene-neck-stretch 제작중. 전체미완료/연속진행,실기기·운영배포·커밋·푸시없음.

- 2026-10-08 연속제작 2차체크포인트: 이번합계8종16영상 추가, 공개179/양테마159,동작38/누끼20/신규1127/구형7(1351). 후속5종 seated-dumbbell-shrug / isometric-lateral-raise-hold / big-toe-extension / cable-reverse-curl / partial-lateral-raise 반영. 격리 skinned-{seated-shrug,lateral-hold,big-toe,cable-reverse,partial-lateral}-20261008에 출처/검증/게시근거. 홀드양192decodedframe동일,엄지30도능동들기·발접지고정,케이블481표본링/풀리/스택연결및이론길이drift0(렌더분할오차.000853world기록),partial하단12→45도. 부모양32frame/확대승인,5종설명·가이드·요약+타이밍반영. 최신6파일89tests·대상ESLint·전체tsc통과,첫배치리뷰4통과유효. 현재 cutout=seated-single-arm-dumbbell-shoulder-press, wrist=cable-ez-bar-curl, new_motion=foot-arch-doming 격리제작중. 끝나는슬롯에다음운동계속배정,전체미완료. 실기기/운영배포/커밋/푸시없음.

- 2026-10-08 사용자 전체 완료까지 연속 진행: 1차 alternating-incline-dumbbell-curl / close-grip-ez-bar-curl / seated-thoracic-rotation 양테마6영상 반영. 공개174/양테마154, 동작38/누끼20/신규1132/구형7(1351) audit. 격리 skinned-{incline-alternating,close-ez-curl,seated-rotation}-20261008: 481표본·양32frame·확대검토·decode·Edge·SHA 검증. 교대컬 alternating4초 타이밍 신규지원, 좁은EZ하단팔꿈치잠그지않음, 교차팔회전 손/반대전완간격수정. 설명/가이드/요약3종 수정, 6파일84+리뷰4=88tests·대상ESLint·전체tsc 통과. 후속 seated-dumbbell-shrug 양테마 반영(공개175, 후속회귀진행중). 현재 cutout=isometric-lateral-raise-hold, wrist=cable-reverse-curl, new_motion=big-toe-extension 진행 중. 완료 슬롯은 다음 종목 계속 배정. 전체 미완료, 실기기/운영배포/커밋/푸시 없음.

- 2026-10-08 계속 요청(rpthrgownj): incline-dumbbell-reverse-curl / isometric-curl-hold / seated-side-stretch 신규3종 양테마6영상 로컬 반영. 공개171/양테마151, 동작검토38/누끼20/신규1135/구형7(총1351). 격리 imports/all-exercises-20261007/skinned-{incline-reverse,isometric-curl,seated-side}-20261008에 원본/출처/재현/481표본/decode/Edge/SHA/게시증거. 인클라인45도회내/고정상완, 홀드양팔90도·lossless각192decodedframe동일·관절drift0, seatedside오른팔머리위좌굴12도·발골반고정. 옆구리 좌면skin+cloth 침범/팔edge접촉보정 후 좌면gap+.0085~.0096world/팔edge최소+.7407. 중간apply_patch도구1001초무응답으로변경미적용·실행정지, agent중단복구후격리contact-edit.cjs로실제적용및정상렌더. 부모최종양테마32frame·손/측면/좌면확대승인,3등록/양manifest/6MP4SHA일치.3종설명/가이드/요약·smooth/hold/stretch자막회귀,6파일80tests+리뷰4tests·ESLint·전체tsc --noEmit --incremental false 통과. 시범ROM/유지기간과출처처방차이provenance기록. 전체미완료, 다음미제작3종씩계속. 이번생성프로세스종료/상주자동작업없음. 실기기/운영배포/커밋/푸시없음.

- 2026-10-08 계속 요청 후속: single-arm-incline-dumbbell-curl / partial-barbell-curl / neck-isometric-hold 신규3종 양테마6영상 로컬 반영. 공개168/양테마148, 동작검토38/누끼20/신규1138/구형7(총1351). imports/all-exercises-20261007/skinned-{incline-single,partial-barbell,neck-isometric}-20261008에 원본·출처·재현·481표본·decode·Edge·SHA·게시증거. 단측인클라인은45도등받이·왼손덤벨1개회외·반대손정지, 파셜바벨은하단→전완수평(팔꿈치10–82도) 기본형, 목은왼손이마접촉정적hold(관절drift0/손머리표본gap+.032world/PNG4시점동일). 부모 최종양테마32frame·손/측면 확대검토,3등록/양manifest/6MP4SHA대조 통과.3종설명/가이드/요약 수정, smooth2종/hold1종 자막회귀,6파일77tests+리뷰4tests·ESLint·전체tsc --noEmit --incremental false 통과. 파셜은21s전체시퀀스가아닌하단부분 독립시범; 인클라인45도선택근거와 목8초시범/힘검증불가 한계provenance기록. 전체미완료, 다음미제작3종씩선정. 이번생성프로세스종료/상주자동작업없음. 실기기/운영배포/커밋/푸시없음.

- 2026-10-08 3개씩 추가 후속: incline-hammer-curl / kettlebell-hammer-curl / standing-back-extension-stretch 신규3종 양테마6영상 로컬 반영. 공개165/양테마145, 동작검토38/누끼20/신규1141/구형7(총1351). 격리 imports/all-exercises-20261007/skinned-{incline-hammer,kettlebell-hammer,back-extension}-20261008에 원본·출처·481표본·decode·Edge·SHA·게시증거. 인클라인45도 등받이/지지기둥/중립그립, 케틀벨중립그립·앞방향무게중심/12–94도팔꿈치 검증. 허리신전12도·허리아래수평양손, 초기손뜸·손가락의복겹침 보정 후 피부+shorts 표본최소gap+.027world와 손바닥normal오차8e-16 확인, 정확triangle충돌증명은아님. 부모 양테마32frame·손/측후면 확대승인 및 cutout손방향2차검토.3종 설명/가이드/요약 수정, smooth2종/stretch1종 자막회귀.6파일74tests+리뷰4tests·ESLint·전체tsc --noEmit --incremental false 통과, 최종3등록/양manifest/6MP4SHA일치. 케틀벨8초시범은출처3-2-0-2처방템포와다름을기록. 전체미완료; 다음미제작3종씩계속선정. 이번생성프로세스종료/상주자동작업없음. 실제기기/운영배포/커밋/푸시없음.

- 2026-10-08 계속 요청: 병렬3작업으로 seated-bent-over-lateral-raise / fat-grip-curl / shoulder-extension-stretch 신규3종 양테마6영상 로컬 반영. 공개162/양테마142, 동작검토38/누끼20/신규1144/구형7(총1351). 격리 imports/all-exercises-20261007/skinned-{seated-rear,fat-grip-curl,shoulder-extension}-20261008 폴더에 원본·출처·재현·481표본·시각·decode·Edge재생·SHA·게시증거. 부모 양테마32frame 및 손/측후면 확대검토,3등록 중복없음/양manifest/6MP4 SHA 일치. seated rear 몸통앞기울임·발/좌면접촉·덤벨바닥간격, fat grip 일반슬리브반경1.67배·양팔회외·고정상완, shoulder extension CUH 한팔뒤로35도 active 기본형(초기 OUH 양팔외회전 피부결함 후보는 미승인) 검증.3종 설명/가이드/요약 수정, smooth2종·stretch1종 자막 회귀 추가.6파일71tests+리뷰4tests, ESLint·전체tsc --noEmit --incremental false·diffcheck 통과. 어깨신전35도/3초유지는 시범선택이며 출처 처방값 아님을 provenance 기록. 전체미완료, 다음 미제작 신규ID 및 기존보류 개선 이어가기. 이번 생성프로세스 종료/상주자동작업없음. 실제기기/운영배포/커밋/푸시 없음.

- 2026-10-07 계속 추가: 신규5종(seated-dumbbell-shoulder-press, shoulder-flexion-stretch, reverse-ez-bar-curl, seated-arnold-press, thoracic-rotation) 양테마10영상 로컬 반영. 공개159/양테마139, 동작검토38/누끼20/신규1147/구형7(총1351). 격리 skinned-seated-press/shoulder-flexion-next/reverse-ez-next/seated-arnold/thoracic-rotation-next에 원본·출처·재현·채택증거. 부모 양테마32frame·손/측후면확대 검토,481표본·decode·mobile Edge play/seek/loop·입력/deps/영상 SHA 통과. EZ바 하단 허벅지 간섭 및 Arnold 시작 얼굴 간격 보정.5종 method/guide/summary와 smooth .4/3.8/4.2/7.6 자막 사양 일치.6파일68tests+리뷰4tests·ESLint·전체tsc --noEmit --incremental false·diffcheck 통과. 흉추회전8초시범은 출처10초유지 처방과 다름을 provenance명시. 전체미완료, 이번 생성프로세스 종료/상주자동작업없음. 배포/실기기/커밋/푸시 없음. 사용자 트레이너 앱 중복 질문은 별도 health_app 읽기확인: 같은 trainer ID와 /trainer 경로이며 기존 앱추가 별도명 바로가기 때문. health_app에는 이미 통일 수정 있음; 운영반영 미확인, 영상작업트리 launcher 수정하지 않음.

- 2026-10-07 후속 계속 요청: 3작업 병렬 후 완료슬롯 연속배정으로 신규5종(seated-dumbbell-curl, standing-side-bend-stretch, plate-curl, finger-stretch, seated-dumbbell-lateral-raise) 양테마10영상 로컬 반영. 공개154/양테마134, 동작검토38/누끼20/신규1152/구형7(총1351). 부모10영상32frame 및 손/양손/손바닥/측면/후면확대검토,481표본·기구간격·decode·mobile Edge 재생/탐색/loop·SHA 통과. 격리 imports/all-exercises-20261007/skinned-{seated-curl,side-bend-next,plate-curl-next,finger-stretch-next,seated-lateral}/native에 증거.5종 method/guide/summary 정확동작 정정; plate publisher 중복timing 제거하고 공개spec 실제phase회귀 추가. 6파일63tests+리뷰4tests·대상ESLint·전체tsc --noEmit --incremental false·diffcheck 통과. 최종5등록/10MP4 SHA/양manifest 대조 통과. 옆굴곡 3초시범유지와 NHS2초차이 및 손가락 가볍게굽힘 완화형을 provenance명시. 모든이번생성프로세스 종료, 상주자동작업없음. 다음 신규 미제작 및 기존보류 개선을3작업으로 이어갈 수 있음. 전체미완료, 배포/실기기/커밋/푸시없음.

- 2026-10-07 영상전용·3작업 연속 배치: 신규12종(바벨손목컬2, 트랩바/등뒤/스미스슈러그3, 목굴곡/측굴/리트랙션/신전4, 덤벨손목회전, 손목서클, 싱글암오버헤드덤벨익스텐션) 양테마24영상 로컬 반영. 공개149종/양테마129, 동작검토38/누끼20/신규1157/구형7(총1351). 부모 최종24개32frame·손/목/측면확대검토,481표본·전체decode·mobile Edge play/seek/loop·SHA 검증. imports/all-exercises-20261007/skinned-{wrist-next,mobility-next,strength-next,neck-retraction-next,behind-shrug,neck-extension-next,smith-shrug,wrist-third,wrist-circle-next,single-triceps}/native 증거.12종 method/guide/summary 정정, 자막 stretch·controlled 추가 및 continuous 적용. controlled-timing-evidence.json은5종 실제3.2/3.68/7.68초 경계와 영상SHA 보존 기록.6파일57tests+리뷰4tests/대상ESLint/diffcheck통과, 전체tsc --noEmit --incremental false 통과. 전체미완료; 다음 미제작 신규3D 및 기존 보류누끼 개선을 사용자 허용한3작업으로 계속. 운영배포/실기기/커밋/푸시 없음. 이번 생성·검사작업 종료, 상주자동생성 없음.

- 2026-10-07 사용자 여러개 동시 요청 배치: arm-circle/backward-arm-circle 신규 연속3D2종과 reverse-wrist-curl 재제작 양테마6영상 반영. 부모 최종6개32frame + wrist hand0/210·side210 확인,481표본/decode/Edge/source-chain SHA 통과. 리스트 컬 이전JPG/spec/영상/리뷰/검증은 skinned-wrist-resume/backup-before-continuous-3d 보존. 암서클 continuous 자막·앞/뒤 설명 및 리스트컬 exact guide/summary 추가, 실패회귀 후 최종6파일41tests+리뷰4tests/대상ESLint 통과. 공개137종 자막 동기화. belt-squat 누끼 장비복원·overhead4px보간 후보는 원판/레버/바 잔상으로 보류(cutout-resume). 양테마117/동작38/누끼20/신규1169/구형7(1351). 다음 기존 컷아웃 기구 별도 추적 또는 신규연속3D 계속. 전체미완료, 실기기/배포/커밋/푸시 없음. 같은 턴 추가 인바디 확인은 health_app에서 별도 수행: 실제NVIDIA 사진 판독 실패 재현, 기기연결0이라 MLKit미검증.

- 2026-10-07 재개 검증: 이미 반영된 standing-toe-raise 양테마32프레임/발·손지지 확대 재검토, source-chain·공개파일 SHA·전체decode·mobile Edge play/seek/loop 재검증 통과(`skinned-standing-toe/native/standing-toe-raise-resume-verification.json`). 신규 제작 수로 중복 집계하지 않음. 회귀 검사에서 자막 사양 30개 누락 발견, build-motion-specs로 공개134종 사양/렌더버전 동기화. 대상5파일39tests 및 리뷰게이트4tests, 대상ESLint 통과. 시스템 Node의 ERR_REQUIRE_ESM은 기존 Node24 실행파일 사용으로 해결. wrist static-bench 후보를 aobmc/8px/vsbmc 보간으로 추가 렌더했으나 손·덤벨 잔상과 벤치 상단 손상이 남아 보류, 공개파일 유지. 양테마192frames decode/Edge는 통과하지만 시각승인 아님(`wrist-cutout/adaptive-review.json`). 실파일 재집계 양테마114/동작39/누끼20/신규1171/구형7, 전체1351 목표는 미완료. 다음은 reverse-wrist-curl 고정 원본/연속 리그 재제작. 실기기/배포/커밋/푸시 없음.

- 2026-10-07 싱글 카프: single-leg-calf-raise 신규 연속3D 양테마480/24/8초를 로컬 앱에 반영(skinned-single-calf). 같은쪽 덤벨, 반대손 고정지지, 반대무릎 굽힘, 작업발 발판지지 구현. 양테마32frame 및 support/feet/side 확대 root 검토,481샘플 접촉/발판관통/자유발높이/loop 검증, 전체decode/Edge 재생·탐색·반복 및 source-chain SHA 검증. 앱 method/guide/summary를 영상과 같은 발판 버전으로 정정. 미디어+회귀5파일20개 및 리뷰게이트4개 통과, agent 인접18tests/대상lint/전체tsc 통과. 등록171/렌더170/검토131, 양테마111/동작39/누끼20/신규1174/구형7. 다음 standing-toe-raise 신규3D와 reverse-wrist-curl 기구보존 누끼 병렬 진행. overhead-cutout u2net은 바/팔소실 보류; cable-rear-delt-fly-2 alpha는 기구보존됐으나 전환 잔상으로 미반영, barbell-overhead-press alpha-edit 진행. 실기기/배포/커밋/푸시 없음. 전체1351종 목표 진행 중.

- 2026-10-07 스텝/누끼 배치: step-calf-raise 신규3D 양테마 반영(skinned-step-calf), 발판관통검출 후 실제foot skin접지보정 및481샘플 충돌/heel drop검증, root 양테마32frame/feet0·210 확인. exactID methodSteps/guide/summary 스쿼트오류 수정, 회귀2건 및 인접16tests/대상lint/전체tsc 통과. band-biceps-curl alpha-edit v2 원본위치·밴드보존으로 교체(adoption-12, v1geometry실패보존, v2MAE9.84). conventional-deadlift는 guarded u2net16pose 기구보존 누끼제작 후 원본/양테마32frame 검토·full decode·Edge play/seek/loop통과, NASM source대조/6체크승인, 이전영상/spec백업 및 cutPNG16SHA provenance 추적(deadlift-cutout). 등록170/렌더169/검토130, 양테마110/동작39/누끼20/신규1175/구형7. 통합미디어+스텝회귀5파일20개 및리뷰게이트4개통과. 다음 single-leg-calf-raise 격리3D 제작중. 전체목표진행중, 실기기/배포/커밋/푸시없음.

- 2026-10-07 카프 추가: dumbbell-standing-calf-raise 신규연속3D 양테마480/24/8초 반영(skinned-calf). 앞꿈치pivot 고정481샘플/발바닥접지변위/뒤꿈치상승/loop 수치와 feet0·210/side210 및 양테마32frame root검토, 전체decode/Edge재생·탐색·반복 통과. 원본모델·모션·studio·의존성SHA 검증. 등록169/렌더168/검토128, 양테마107/동작40/누끼21/신규1176/구형7(전체1351). 스쿼트형 methodSteps를 카프동작으로 교정하고 exactID guide/oneLiner 추가; 기존카테고리에는 calf가없어 분류값유지, 실제안내는 exactID우선. 회귀2건포함5파일20+리뷰4=24테스트통과, 별도 agent 인접14테스트/대상lint/전체tsc 통과. B straight-arm-pulldown-2 원본상단잘림, wide-grip-lat-pulldown 편집본기하변형은 보류(원본/비교보존). 기존하체4종 원본/MP4 decode·32frame 검사에서 low-bar 위치불명확, curtsy전환잔상, jump머리잘림·잔상, hip-adduction기구변형 기록(motion-review-lower). 다음 step-calf-raise 별도3D 제작중. 실기기/배포/커밋/푸시 없음, 전체목표 진행중.

- 2026-10-07 최신: 양테마검증106/동작검토40/기존누끼21/신규1177/구형7(전체1351). 등록168/렌더167/검토127. 신규4종 alternating-dumbbell-front-raise,wide-grip-barbell-curl,close-grip-barbell-curl,wide-grip-upright-row native480/24/8초 추가, skinned-reuse-final 원본/의존성 SHA·양테마32frame·전체decode·Edge 검증. low-cable-fly alpha-edit 기구보존 누끼교체(adoption-11, RGB MAE11.46/255). zottman-curl-2는 동일기구/동작의 zottman-curl 검증파일로 교체하고 이전원본/spec/영상/검증백업(alias-zottman); 별도신규동작생성 아님. 대상ESLint 및 미디어18+리뷰게이트4 테스트 통과. 코어3종 dead-bug/bird-dog/reverse-crunch는 원본/현영상32frame+decode 검토 후 전환잔상/배경문제로 보류(motion-review-core). 외회전 피부보정2안은 관절수학통과하지만 팔꿈치함몰 지속으로 보류(rig/repair-review.json). 다음 dumbbell-standing-calf-raise 새3D/잘못된스쿼트설명 보정 병렬진행. 실기기/배포/커밋/푸시 없음. 전체목표 진행 중.

- 최신 체크포인트: 2026-10-07 추가 반영: 덤벨 컬·숄더프레스·레이즈 8종 native 480×480/24fps/8초 양테마 영상 추가(skinned-reuse-shoulders 3종, skinned-reuse-next 5종). 케이블 오버헤드 익스텐션 alpha-edit 배경 제거본 교체(adoption-10). 양테마 최종32프레임, 손·측면, 전체192프레임 디코딩, Edge 재생·탐색·반복 및 원본/의존성 SHA 검증. 등록164/렌더163/검토122, 양테마100/기존누끼22/동작41/구형7/신규1181. 미디어 테스트18개와 리뷰게이트4개 통과. 실제 기기·운영 배포·커밋·푸시 없음. 밴드 외회전은 관절수학 검증은 통과했으나 팔꿈치 피부변형으로 보류. 다음 4종(alternating-dumbbell-front-raise, wide-grip-barbell-curl, close-grip-barbell-curl, wide-grip-upright-row)은 skinned-reuse-final 격리 제작 중. 전체 목표 진행 중.

## 2026-10-07 전체1351종 지속 제작 — 진행 중
- 2026-10-07 체크포인트: 등록156/렌더155/검토114, 양테마91/기존누끼23/동작41/구형7/신규1189. rope-triceps-pushdown imagegen alpha-edit로 기구/로프 보존후 양테마교체(adoption-9.json). 원본JPG/이전MP4/spec백업, editedPNG rigSource SHA등록, custom renderer지정. RGB는완전동일아님(MAE5.92/255), 원본16자세시각비교/양테마32frame/전체decode/Edge통과.
- 기존skinned-pilot 미등록정확ID14종중 cross-body-hammer-curl/scaption 2종을 기존3D모델·동작으로 native480x480/24fps/8초192frames 직접재렌더. 앱정확배경 #fafafa/#09090b, 광학보간없음. 4영상32frame root검토·전체decode·Edge play/seek/loop 통과, sourcechain/의존성스냅샷SHA 검증, provenance JSON과16컷진단atlas 및spec등록. 증거 skinned-reuse-audit/native/*-review.json 및 publish-native.mjs. 파일68~114KB, 원1080/60보존. 작은다크덤벨대비/맨발마네킹스타일한계기록.
- 신규 band-external-rotation 생성+표적수정도 팔이길어지는잘못된동작이라 source-only보류. 원본/프롬프트보존. 대신 기존3D리그17각도 검사에서 고정팔꿈치/90도 유지가능; rig-feasibility.json/rig-kinematic-proof.json. 다음격리3D모션으로 제작하고 피부·밴드접촉시각검증필요.
- 가슴3종은 기존실패그대로 재현하여 미승인(motion-review-chest/). 남은누끼23종 실패색인 cutout-holds.json 23/23. 다음은 나머지3D미리보기12종 native통합검토와 장비소실후보alpha-edit,3D외회전구현. 이번미디어4파일18개+exactSHA리뷰4개=22개통과. 전체목표진행중, 실기기/배포/커밋/푸시없음. 모든배치작업종료,기존개발서버유지.
- 2026-10-07 신규 band-front-raise 양테마 추가: 생성 alpha 원본16컷 중 어깨높이를 넘는13~16 제외, 1~12 상승/정점유지/역순하강. 모든 cell 원본보존, 양테마32frame 육안/전체decode/480x480 24fps 8초/최종 Edge mobile play·seek·loop 통과. 미디어4파일18개+SHA리뷰4개=22개 통과. 등록154/렌더153/검토112, 양테마88/기존누끼24/동작41/구형7/신규1191. 경미한 원본 몸통/실루엣 변화는 기록. 증거 imports/all-exercises-20261007/band-front-raise/ (prompt.txt, source-reference.json, 원본PNG, 재현prepare/render/publish, render-evidence, playback, published-evidence).
- 병렬4종 판정: low-cable-fly/wide-grip-lat-pulldown/cable-lateral-raise-2는 u2net 기구·케이블 소실로 보류; cable-front-raise는 기구복원 성공했으나2.5초 손/바/케이블 이중잔상으로 미반영. A 각review 및 B/raise-batch-review.json. 모든후보프로세스 종료, 기존개발서버 유지. 다음 미시도 케이블 운동(straight-arm-pulldown-2,cable-rear-delt-fly-2,face-pull-2,cable-upright-row,cable-glute-kickback,lat-pulldown) 및 신규 종목 제작. 전체목표 진행중; 실기기/운영배포/커밋/푸시 없음.
- 이전 체크포인트: 등록153/렌더152/검토111, 양테마87/기존누끼24/동작검토41/구형7/신규1192. 신규 wall-calf-stretch 정적 유지 자세 양테마 추가 및 같은 동작 calf-stretch ID에 exact 파일 재사용(별도 신규 동작 아님). triceps-pushdown-2 원본 어두운 기구/케이블 복원 후 양테마 반영(adoption-8.json). calf 두 ID의 스쿼트 오기 설명을 벽 지지·뒤꿈치 접지·뒤 무릎 신전·유지 안내로 수정. methodSteps 회귀 포함 5파일20개, 대상 ESLint·TypeScript·diffcheck 통과. 신규 hold 양테마192프레임 동일/decode/Edge play·seek·loop 통과. seated-calf-raise/belt-squat/rope-pushdown/overhead는 기구 소실, TRX-row는 끈 사이 배경/보간 번짐, sumo-squat은 원본 배경 결함으로 보류. 다음 B standing-cable-curl 후보 검토, 이후 미완료 영상 계속. 실기기/배포/커밋/푸시 없음.
- 2026-10-07 보류2종 해결: lying-triceps-extension u2net+원본검은벤치복원/하단잔여12px이하제거 및 ez-bar-skull-crusher u2net 양테마 교체. sourceSHA유지,기존MP4백업,후보/공개SHA일치검증,root양테마32프레임확인,전체decode와Edge모바일play/7.5seek/loop통과. adoption-6.json/adoption-7.json 및각final-review근거. 등록151/렌더150/검토109 유지, 양테마84/기존누끼검토25/동작검토41/구형7/신규필요1194. 미디어4파일18개+리뷰4개=22개 및diffcheck통과. 실기기/운영/커밋/푸시없음. 모든생성프로세스종료;다음기존25종배경처리와41종동작및신규1194진행. low-row3보간설정과rear-delt16컷/2D리그는품질불충분근거보존/미반영.
- 2026-10-07 다음배치: band-triceps-pushdown 신규16자세 alpha보존 양테마영상 추가. 고정점/밴드/신발/팔동작32프레임,전체decode,Edge재생/7.5초탐색/loop 확인. 등록151/렌더150/검토109/양테마82, 신규필요1194. 원본/프롬프트/prepare/render/publish/해시증거 imports/all-exercises-20261007/band-triceps-pushdown/. bench-dip alias는 최저팔꿈치각도가대상90도안내와달라보류(alias-validation-bench/review.json). 저메모리색상마스크 low-row/machine-rear-delt 후보진행, 공개는최종시각검토후결정.
- 2026-10-07 별칭 연결 추가: hammer-curl→hammer-curl-2(덤벨), ez-bar-curl→ez-bar-curl-2(바벨)의 동일동작/기구를 원본·현재MP4·rig·양테마32프레임·decode·Edge로 확인하여 exact 파일 복사와 aliasOf 추적정보로 연결. 신규영상2개 생성이 아니라 기존검증영상2개를 누락ID에 재사용한 것. 현재 등록150/렌더149/검토108/양테마81; 신규필요1195. 증거 imports/all-exercises-20261007/alias-validation/{review,adopted}.json. bench-dip 별칭은 아직미반영. 모든 작업프로세스 종료, 개발서버 유지.
- 2026-10-07 후속: band-lateral-raise 신규16자세 투명원본·양테마8초24fps 추가, ab-rollout 공식u2net으로 신발/바퀴 보존 개선 반영. 등록148/렌더147/시각검토106/양테마79. 신규필요1197, 기존누끼검토27, 동작검토41,구형재제작7. 양테마32프레임/전체decode/모바일Edge play·seek·loop 및 미디어단위4파일18개 통과. 소스·rig·영상 exactSHA 기록. chest-dip은 종아리누락/기구안쪽배경잔여로 보류. alias18후보중 정확동일기구/동작3개 추가영상검토중(아직연결없음).
- 신규 cross-body-shoulder-stretch 고정 스트레칭 영상 양테마 추가. 등록147/렌더146/검토105/양테마77. 각192프레임동일·디코드·모바일Edge재생/탐색/반복 통과. imports/all-exercises-20261007/cross-body-shoulder-stretch/에 원본·프롬프트·재현스크립트·증거. 전체목표 진행중.
- 사용자 전체 운동 완성까지 계속/병렬 제작 지시. 전체 진행표 tools/media/motion-refresh/all-exercises-progress.json, 재집계 node tools/media/audit-all-motion.mjs. 카탈로그 ID기준이며 동작/기구별 별칭 중복은 신규 제작 전 검토. 기존 v2 전용7종을 누락하지 않도록 분리.
- 현재 배치: A good-morning/band-biceps-curl/crunch 및 lying-triceps-extension/ez-bar-skull-crusher/dumbbell-pullover, B pistol-squat/cossack-squat/sit-up 및 sissy-squat/ab-rollout/inverted-row. 각자 별도 candidate폴더, 공유 public/review는 root만 반영. 최대2동시·가용RAM2.5GiB 추론가드, 메모리부족시 순차.
- 이번 추가반영: good-morning, crunch, pistol-squat-refined, cossack-squat-refined, sit-up, sissy-squat-refined. 신발 소실2종은 원본 윤곽기반 국소복원 후 양테마32시점/모바일Edge HTTP play/seek/loop 검증. 원본SHA 유지·기존MP4백업 후 정확해시승인. 누끼양테마70→76.
- 공개반영 근거: imports/all-exercises-20261007/adoption-1~4.json, imports/cutout-all-20261007-a/*-review.json, imports/cutout-all-20261007-b/batch-review.json. band-biceps-curl은 밴드 누락/폐쇄배경 잔여로 보류.
- 신규 box-squat 원본16컷 생성 및 유색fringe 후보보정, 박스아래흰바닥/발·박스 위치 일관성 확인 필요로 미등록. 출처/프롬프트/후보/리뷰 imports/all-exercises-20261007/box-squat/.
- 아직 전체미완료. 나머지 현재배치 검토/반영과 검증기록 갱신 필요. 전체목표 active 유지.


## 2026-10-07 로컬 누끼 병렬 제작 결과
- 사용자 계속·여러 개 동시 처리 지시로 로컬 rembg u2netp 사용. 드래그 컬/스모 스쿼트 두 프로세스 실제 겹쳐 실행(132.1s/132.9s), 이후 체스트딥과 드래그 컬 보정 처리. 최대 동시2개, OMP2, 여유RAM 약4.2GiB 유지 관측.
- 3종/4후보, 양테마8영상 제작. 각480×480/8초/24fps 전체FFmpeg decode 통과. 이는 시각승인을 의미하지 않음.
- 드래그 컬: 기존 흰 스튜디오 다리 사이 잔여 제거를 별도8패널 캐시에 적용, 흰 신발 보존. 양테마32시점 접촉시트 및 mobile Edge loopback 재생/7.5초 탐색/반복 통과. 원본SHA 보존·기존 영상 백업 후 앱 라이트/다크2파일 교체, exact review/verification/manifest 갱신. 검토통과104 유지, 양테마승인69→70.
- 체스트딥은 평행봉 안쪽 회색 잔여로 보류. 스모 스쿼트는 원본 자체 머리/발 유색 테두리 확인, 새 후보 미반영. 두 기존 앱 영상 유지.
- 증거/후보/재현도구: tools/media/imports/cutout-review-20261007/ (batch-review.json, playback.json, local/, original-drag-curl/). 캐시재개 Python테스트1개, guide-review Node테스트4개, 대상ESLint·tsc --noEmit·git diff --check 통과. file URL 재생은 Edge 접근차단으로 실패했고 loopback HTTP로 동일 파일 재검증 통과.
- 운영 배포·커밋·푸시·실기기 검증 없음. 생성 프로세스 모두 종료. 다음은 원본 결함 없는 나머지34개 공개본 누끼 및 체스트딥/스모 스쿼트 원본·기구 마스크 보정.


## 2026-10-07 기존 제작 영상 포함 누끼 재개
- 사용자 범위: 신규뿐 아니라 이미 제작한 영상도 누끼 처리. 원본·공개 영상 보존.
- 내장 imagegen 원본 추출+매트 보정 후보2개 생성. 둘 다1254×1254 PNG alpha 확인. 머리/어깨 흰색·유색 테두리 및 기구 안쪽 잔여물 때문에 rejected, 신규 공개0. 정확한 후보/프롬프트 요약/리뷰: tools/media/imports/cutout-review-20261007/.
- 실제 원본·영상·rig SHA 및 기존 리뷰 대조: 등록146, 공개 검토통과104, 양테마 검토통과69. 공개본 중 양테마 추가검토35, 기존 품질보류41, 미렌더1. cutout 렌더 메타데이터/실파일 일치87은 시각승인 수와 다름. existing-video-audit.json에 전체 목록 보존.
- guide-review.test.mjs 4개 통과. 앱 코드·공개 자산 변경 없음; 앱 빌드/E2E는 이번 후보 제작에서 실행하지 않음. 로컬 가용 RAM 약6.1GiB, 기존 기본모델10GB 가드 미충족.
- 다음: 사용자에게 로컬 rembg 처리 방식으로 전환할지 질문한 상태. 답변 전 로컬 추론 미실행. 승인되면 메모리 사용을 확인하며 별도 후보에서 순차 시험하고, 사람/기구 누락과 양테마 영상 잔상 검토 후 통과본만 공개.


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

스모 데드리프트 추가 후보는 원본 정수리 클리핑·바 연결 누락·보간 원판 소실/잔상으로 보류. 기계적 디코드와 Edge 재생 검증 통과만으로 공개하지 않음. 증거 tools/media/imports/cutout-all-20261007-a/sumo-deadlift-review.json. 모든 후보 처리 프로세스 종료.

- 저메모리 배경마스크 배치 최종: low-row-machine 및 machine-rear-delt-fly는 누끼·기구·신발 보존 개선이나 minterpolate 전환팔/손잡이잔상으로 hold-motion. low-row1.25/5.25초 신규/기존공개원본 비교에서 원본영상에도잔상확인, source8키포즈는단일윤곽. 두후보미반영. seated-calf-raise는회색배경/인체색겹침으로마스크부적합. 증거 cutout-all-20261007-b/border-comparison.json. band-triceps-pushdown 대상ESLint와미디어4파일18테스트 통과. 전체목표는미완료로유지, 모든생성/검증프로세스종료. 다음은잔상종목원본포즈추가/렌더보정, 기존27누끼및41동작검토, 미제작1194 진행.

- 2026-10-07 잔상보정 조사: rear-delt 새16컷alpha원본 생성·양테마검토했으나 첫전환간격 여전히커서 hold-source-spacing, 공개교체없음. 원본과프롬프트·SHA·판정 imports/all-exercises-20261007/rear-delt-dense/. 기존2D rigid리그는원근변화 때문에 pivot/손접촉유지불가: 근사173→202px 축손거리, 동일길이회전시35.5px 손끝오차. cutout-all-20261007-b/rig-feasibility/assessment.json. 다음은가려진팔/기계레이어와수평면투영 또는정확한중간자세보정 필요.

- 2026-10-07 low-row 잔상재검증: bilat8/bidir8/bilat16 세설정 정·역2초 총6클립 제작비교.1.375초 팔/복부/케이블의 잔상또는블록번짐이모두남아 미반영.단순보간설정으로해결못함. cutout-all-20261007-a/low-row-flow/review.json에필터/해시/판정. lying-triceps-extension은u2net+원본검은벤치복원조합으로 주요1/11/16포즈기구/팔경계개선,전체재생검증진행중.

- 2026-10-07 배치 종료: standing-cable-curl 원본기구복원은 성공했지만 2.5초 손/바 이중잔상(root 확대검토 확인)으로 hold-motion. cable-rope-hammer-curl-2는 원본타워상단 잘림+분할기구소실로 보류. B/curl-batch-review.json. 신규 앱 반영 없음, 양테마87/기존누끼24/동작41/구형7/신규1192 유지. 리뷰 SHA 게이트4개 추가통과, 합계24개. 모든 후보 처리 프로세스 종료, 기존 개발서버 유지. 다음은 아직 시도하지 않은 케이블 운동(low-cable-fly, wide-grip-lat-pulldown 등)의 원본검토와 신규 운동 제작; 이미 기록한 소스/동작 보류는 단순 동일 재시도 대신 원본 재제작 필요. 전체 목표 active, 미완료.

- 후속 진행: barbell-overhead-press alpha-edit도 바/팔 보존은 성공했지만 1.25·1.5초 보간 잔상으로 hold-motion. 별도 보간 설정 비교 중이며 기존파일은 유지. standing-toe-raise는 발뒤꿈치481샘플 접지 통과 후 손가락·의자 접촉 수정 중으로 아직 승인하지 않음. wrist-cutout은 original bench 픽셀 복원 후 검토 진행.


## 2026-10-16 런닝 누끼 영상

- [완료] 런닝 8초/480×480/30fps: 실제 알파 WebM 816,782바이트와 라이트·다크 MP4 제작. 제작 입력/해시/출처/검수는 `tools/media/imports/running-20261016/`.
- [완료] 정면·측면 16프레임 검토, 481관절 표본/루프 오차0/팔꿈치90.41도, 알파240프레임 가장자리 잘림0, 전체 디코드 및 Edge 3파일 재생·3초 탐색·반복 통과. 최초 탐색 실패는 검증 서버의 Range 미지원으로 확인 후 206응답 추가하여 재검증.
- [완료] 워밍업·마무리 `running`에 양테마 MP4 연결. 호환용 MP4는 투명 채널이 없고 WebM만 실제 알파. 기구 없는 몸동작 시범이므로 `treadmill-running` 카탈로그 완료 수에는 포함하지 않음.
- [완료] 관련 단위20개 및 전체 TypeScript 통과, 변경 TSX ESLint 오류0/기존 미사용 disable 경고9. 런닝만 별도 커밋·푸시 요청. 다음 작업은 사용자 요청대로 신규 3종 묶음.
- [대기] 운영 배포 및 실기기 확인.
