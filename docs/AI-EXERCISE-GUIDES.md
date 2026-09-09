# AI 사진 기반 운동 가이드 6종 (2026-09-08)

현재 내장 영상이 연결된 6종 전체를 교체한다. exercise_media DB 등록은 조사 당시 0건이다. 다른 운동의 텍스트 가이드는 유지한다.

제작: Codex 내장 imagegen으로 운동별 3×2 사진 시트 생성 → Sharp로 6장 분할 → FFmpeg로 장면당 4초, 총 24초 무음 MP4 제작. 960×720, H.264 main, yuv420p, faststart. 영상 안에 자막·화살표·음성을 추가하지 않는다. 앱의 기존 세팅/동작 설명을 함께 사용한다.

| 운동 | 장면 순서 |
| --- | --- |
| 벤치프레스 | 랙/안전바 높이 → 감싸 쥐는 그립 → 발바닥 접지 → 등·엉덩이 벤치 지지 → 가슴으로 내리기 → 밀어 올리기 |
| 랫풀다운 | 의자/허벅지 패드 → 발바닥 접지 → 양손 그립 → 상체 세팅 → 가슴 앞쪽으로 당기기 → 통제하며 복귀 |
| 풀업 | 발판에서 바 잡기 → 오버핸드 그립 → 몸통 안정 → 팔꿈치 굽혀 상승 → 턱이 바 위로 → 통제하며 복귀 |
| 스미스 스쿼트 | 안전장치 → 등 위쪽 바/양손 위치 → 발 간격 → 몸통 세팅 → 뒤꿈치 유지하며 앉기 → 일어서기 |
| 덤벨 숄더프레스 | 등받이 조절 → 발/등 지지 → 손목과 팔꿈치 위치 → 측면 지지 자세 → 머리 위로 밀기 → 어깨 높이 복귀 |
| 레그프레스 | 등받이 조절 → 등/골반 지지 → 발판의 발 위치 → 손잡이/시작 자세 → 골반 유지하며 내리기 → 발바닥으로 밀기 |

## 파일과 재제작

- 최종 영상: `public/exercise-guides/ai-v2/{exercise-id}.mp4`
- 원본 생성 시트/최종 프롬프트: `tools/media/ai-guides/*.png`, `prompts.json`
- 변환: `node tools/media/build-ai-exercise-guides.mjs` (FFmpeg/FFprobe 필요)
- 변환 시 분할 JPG와 `verification.json`을 만든다. 분할 JPG는 재생성 가능하므로 커밋에서 제외한다.
- 연결: `src/features/exercises/exercise-media.ts`. 상세/운동모드가 같은 경로를 사용한다.
- 사진 가이드는 정상 속도로 재생한다. 영상 교체 이전 0.5배속을 적용하면 단계가 불필요하게 길어진다.

## 내용 참고

프롬프트는 아래의 일반적인 자세 원칙을 참고해 작성했다. 사진은 실사 촬영이 아닌 AI 생성 이미지이며 기구 모델별 조절법을 그대로 재현한 매뉴얼은 아니다.

- NASM 벤치프레스: https://www.nasm.org/resource-center/exercise-library/barbell-bench-press
- NASM 풀업: https://www.nasm.org/resource-center/exercise-library/pull-up
- NASM 레그프레스: https://www.nasm.org/resource-center/exercise-library/leg-press
- ACE 랫풀다운: https://www.acefitness.org/resources/everyone/exercise-library/158/seated-lat-pulldown/

생성 시트는 손발 접점, 주요 자세, 순서를 육안 검토한다. 풀업 초안의 철봉 높이 변화는 재생성 대상으로 제외했다. 배포 후 실제 앱 시청과 트레이너 내용 검수는 별도로 남아 있다.
