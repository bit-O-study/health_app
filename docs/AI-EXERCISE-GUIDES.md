# AI 사진 기반 운동 가이드 (2026-09-09)

전체 운동 카탈로그 1,351종에 대해 운동당 한 영상을 제작하는 작업이 진행 중이다. 생성/변환 개수와 내용 검수 통과 개수는 다르며, 전체 완료로 보고하지 않는다.

## 규격

Codex 내장 imagegen으로 운동별 3×2 사진 시트를 생성하고 Sharp로 분할한 뒤 FFmpeg로 사진당 1.5초, 총 9초 무음 MP4를 만든다. 640×480, 12fps, H.264 main, yuv420p, CRF 32, faststart. 새 원본 시트는 JPEG로 압축해 보관한다. 각 영상은 6장의 기구 세팅·손·발·자세·동작 사진으로 구성한다. 사진의 전환 속도는 실제 운동 반복 속도를 지시하지 않는다.

## 내용 검수와 연결

운동 방법과 영상이 다르다는 사용자 지적에 따라 기존 제작본도 재검수한다. 운동 이름만으로 유사 동작을 대신 연결하지 않는다.

1. 카탈로그의 정확한 운동 변형과 기구를 확인하고 해당 운동의 공신력 있는 설명/시범을 조사한다.
2. 실제 생성 사진 여섯 장을 운동명, 기구, 세팅, 손 위치, 발 위치, 시작·수축·복귀 동작으로 대조한다.
3. 잘못되거나 식별이 불가능한 장면은 재생성한다. 출처 링크와 구체적인 관찰을 reviews.json에 남긴다.
4. 검수 대상 원본과 MP4의 SHA-256이 일치하는 통과본만 manifest.json으로 연결한다. 파일을 바꾸면 재검수해야 한다.
5. 앱에서 선택한 기구와 영상의 검수 기구가 다르면 해당 영상을 표시하지 않는다. 상세 화면의 기구 전환은 설명과 시범을 함께 갱신한다.

기존 사진 라이브러리에는 유사 변형 매핑이 남아 있어 전체 정밀 대조가 필요하다. 이 문서는 그 작업까지 완료했다는 의미가 아니다. AI 사진의 육안 검수와 파일 디코딩 검증은 트레이너 검수 또는 실제 기기 검증을 대신하지 않는다.

## 파일과 제작 명령

- 목록: tools/media/ai-guides/catalog.json
- 제작 프롬프트: tools/media/ai-guides/prompts.json
- 사진 시트: tools/media/ai-guides/{exercise-id}.png 또는 .jpg
- 변환본: public/exercise-guides/ai-v2/{exercise-id}.mp4
- 파일 규격/디코딩: tools/media/ai-guides/verification.json
- 운동별 참고 출처·내용 검수·대상 기구·파일 해시: tools/media/ai-guides/reviews.json
- 앱 연결 목록: public/exercise-guides/ai-v2/manifest.json
- 누락 집계: tools/media/ai-guides/coverage.json
- 제작: node tools/media/manage-ai-guides.mjs build
- 검수된 파일의 연결 갱신: node tools/media/manage-ai-guides.mjs publish-reviewed
- 현황 갱신: node tools/media/manage-ai-guides.mjs coverage
- 재검수 자료 확인: node tools/media/manage-ai-guides.mjs inspect EXERCISE_ID
- 검수 기록: node tools/media/manage-ai-guides.mjs review EXERCISE_ID URI_ENCODED_JSON
- 검수 연결 회귀 테스트: node --test tools/media/guide-review.test.mjs
- 모바일 확인: node tools/media/manage-ai-guides.mjs check-mobile

사진은 내장 imagegen으로 생성한다. inspect는 검수용 출력이며 원본을 변경하지 않는다. register는 생성된 이미지와 정확한 프롬프트를 저장한다. 분할 JPG는 재생성 가능해 커밋에서 제외한다. 렌더링 성공만으로 검수 통과를 자동 지정하지 않는다.

## 발견한 불일치

- 와이드 랫풀다운 초안의 목 뒤 당기기: 등록/연결 제외, 가슴 앞쪽으로 당기는 장면으로 재제작·출처 대조 후 연결.
- 시티드 레그컬 초안의 패드/움직임이 레그익스텐션처럼 표현됨: 해당 초안 제외, 종아리 뒤 패드와 무릎 굽힘을 표현한 새 시트로 교체. 새 시트도 재검수 대상.
- 데드버그의 같은 쪽 팔·다리 표현: 초안 제외, 반대쪽 팔·다리를 확인할 수 있는 위쪽 시점으로 재제작.
- 스미스 벤치와 디클라인 덤벨 프레스의 바 위치/벤치 경사 오류: 초안 제외, 재생성본 보관.
- 같은 벤치프레스 ID의 바벨 영상이 덤벨·머신 선택에도 사용되고, 기구별 method 대신 공통 요약이 표시됨: 기구별 미디어 필터와 상세 기구 전환 동기화로 수정.

## 현재 검증 기록 (2026-09-09)

67/1351종이 변환되었고 16종이 출처 기반 재검수를 통과해 연결되어 있다. 남은 51개 변환본은 재검수 전이며 미제작은 1284종이다.

- 사진·기구별 영상 선택·리소스 단위 테스트 3파일 24개 통과. 검수 연결 게이트 node:test 2개 통과.
- mobile-chromium, localhost:3110: 기존 6종의 9초 재생/7.5초 탐색/화면 크기와 바벨→덤벨→머신→바벨 전환 1개 시나리오 통과. 영상 복귀 시 effect 재연결에서 src가 사라지는 문제도 수정.
- 대상 ESLint, TypeScript, Next 프로덕션 빌드 통과. 배포와 실제 기기 검증은 별도 대기.
- 기존 손목 컬 덤벨/바벨 및 덤벨 스컬크러셔/오버헤드 익스텐션의 불일치 사진 4개 연결을 명시적 null로 차단. 정확한 사진이 없을 때 다른 운동으로 재대체하지 않는다. 전체 기존 사진 교정은 미완료.
- 레그프레스 카프레이즈의 발 지지 불일치, 케이블 리어델트 플라이의 목 뒤 케이블, 케이블 킥백의 장면 간 케이블 방향 불일치 초안은 미등록·재제작 대상.

## 참고

구체적인 운동별 참고 출처와 검수 관찰은 reviews.json에 기록한다. 대표 자료:

- [ACE 랫풀다운](https://www.acefitness.org/resources/everyone/exercise-library/158/seated-lat-pulldown/)
- [NASM 바벨 벤치프레스](https://www.nasm.org/resource-center/exercise-library/barbell-bench-press)
- [NASM 레그프레스](https://www.nasm.org/resource-center/exercise-library/leg-press)
- [NASM 풀업](https://www.nasm.org/resource-center/exercise-library/pull-up)
- [ACE 앉아서 덤벨 숄더프레스](https://www.acefitness.org/resources/everyone/exercise-library/45/seated-overhead-press/)
- [Planet Fitness 스미스 기구 사용법](https://www.planetfitness.com/blog/articles/overcoming-your-fear-smith-machine)
- [NASM 데드버그](https://www.nasm.org/resource-center/exercise-library/dead-bug)
