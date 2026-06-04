# DeeVid AI 운동 영상 프롬프트 (전체)

> 앱 운동 카탈로그(`src/features/routine/exercise-catalog.ts`)에서 자동 생성. 운동별로 **영어 프롬프트**(AI 비디오는 영어가 가장 안정적)와 한국어 자세 큐(참고)를 함께 제공합니다.

## 사용 팁

- **모델/체육관 일관성**: 첫 컷을 만든 뒤 그 프레임을 reference image 로 고정(image-to-video)하고 동작만 바꾸세요. 텍스트만으로는 매 클립 인물이 달라집니다.
- **`{athlete}` 성별**: 프롬프트의 `a fit athlete` 를 `a fit male athlete` / `a fit female athlete` 로 바꿔 쓰세요.
- **5초 = 1렙**: 무게 동작이 빠르면 손/바가 뭉개집니다. `slow, controlled, one repetition` 유지.
- **카메라**: 폼 검증엔 측면(side), 좌우 대칭 동작(레이즈·플라이·슈러그·페이스풀)은 정면(front) — 이미 운동별로 지정됨.
- **앱 삽입용**: 세로 9:16 또는 1:1 로 출력하고 운동 슬러그와 매칭해 저장.
- **네거티브**(no text / extra limbs / morphing weights ...)는 항상 유지 — AI 비디오 최대 약점.


## 가슴 (chest) — 13개

### 벤치프레스 — Bench Press `bench-press`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Bench Press using a barbell, training the pectorals, triceps, front delts (emphasis: mid chest, lower chest). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 대흉근 · 삼두 · 전면 삼각근
- 기구: 바벨 / 덤벨 / 머신
- 자세 큐(참고):
  - 견갑을 모아 벤치에 고정하고 어깨너비보다 약간 넓게 잡기
  - 바를 가슴 중앙으로 내리며 팔꿈치는 45도 유지
  - 발로 바닥을 밀며 호흡 내쉬고 밀어 올리기

### 인클라인 프레스 — Incline Press `incline-press`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Incline Press using a barbell, training the upper chest, front delts (emphasis: upper chest). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 상부 대흉근 · 전면 삼각근
- 기구: 바벨 / 덤벨
- 자세 큐(참고):
  - 벤치 각도 30~45도, 견갑 고정
  - 바를 쇄골 약간 아래로 내리기
  - 팔꿈치 과신전 없이 밀어 올리기

### 체스트 플라이 — Chest Fly `chest-fly`

**Prompt**

```text
Static tripod camera, front view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Chest Fly using dumbbells, training the pectorals(squeeze) (emphasis: inner chest, mid chest). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 대흉근(모음)
- 기구: 덤벨 / 케이블 / 머신
- 자세 큐(참고):
  - 팔꿈치 약간 굽힌 각도 고정
  - 큰 호를 그리며 가슴을 늘렸다 모으기
  - 어깨가 말리지 않게 견갑 고정

### 딥스 — Dips `dips`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Dips using bodyweight (no equipment), training the lower chest, triceps (emphasis: lower chest). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 하부 대흉근 · 삼두
- 기구: 맨몸
- 자세 큐(참고):
  - 어깨 내려 고정하고 몸을 약간 앞으로 기울이기
  - 팔꿈치 90도까지 내려가며 가슴 늘리기
  - 삼두·가슴으로 밀어 올리되 어깨 으쓱 금지

### 디클라인 벤치프레스 — Decline Press `decline-press`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Decline Press using a barbell, training the lower chest, triceps (emphasis: lower chest). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 하부 대흉근 · 삼두
- 기구: 바벨 / 덤벨 / 머신
- 자세 큐(참고):
  - 벤치 각도 -15~-30도, 발 잡고 고정
  - 바를 가슴 하부로 내리며 팔꿈치 45도
  - 가슴 하부로 끝까지 밀어 올리기

### 푸시업 — Push-Up `push-up`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Push-Up using bodyweight (no equipment), training the pectorals, triceps, core (emphasis: mid chest). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 대흉근 · 삼두 · 코어
- 기구: 맨몸
- 자세 큐(참고):
  - 손은 어깨 약간 넓게, 몸을 일직선
  - 팔꿈치 45도로 가슴이 바닥 가까이
  - 가슴·삼두로 밀어 올리며 코어 고정

### 펙덱 플라이 — Pec Deck Fly `pec-deck`

**Prompt**

```text
Static tripod camera, front view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Pec Deck Fly using a machine, training the pectorals(squeeze) (emphasis: inner chest, mid chest). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 대흉근(모음)
- 기구: 머신
- 자세 큐(참고):
  - 팔뚝/팔꿈치를 패드에 대고 시트 조절
  - 팔꿈치 각 유지하며 가슴 앞에서 모으기
  - 정점 1초 수축 후 통제 복귀

### 케이블 크로스오버 — Cable Crossover `cable-crossover`

**Prompt**

```text
Static tripod camera, front view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Cable Crossover using a cable machine, training the pectorals(squeeze, lower) (emphasis: inner chest, lower chest). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 대흉근(모음·하부)
- 기구: 케이블
- 자세 큐(참고):
  - 고/중간 도르래에 D-그립, 한 발 앞으로
  - 팔꿈치 각 유지하며 배꼽 앞에서 교차
  - 정점 수축 후 천천히 복귀

### 클로즈그립 벤치프레스 — Close Grip Bench Press `close-grip-bench-press`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Close Grip Bench Press using a barbell, training the triceps, inner chest (emphasis: inner chest). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 삼두 · 내측 대흉근
- 기구: 바벨
- 자세 큐(참고):
  - 어깨너비보다 좁게, 손목 부담 없는 폭
  - 팔꿈치 옆구리 가까이 유지하며 내리기
  - 삼두로 끝까지 밀어 올리기

### 스미스 벤치프레스 — Smith Machine Bench Press `smith-bench-press`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Smith Machine Bench Press using a machine, training the pectorals (emphasis: mid chest). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 대흉근
- 기구: 머신
- 자세 큐(참고):
  - 수직 레일이라 궤적 고정 — 초보·보강 운동에 적합
  - 바를 가슴 중앙으로 내리고 어깨가 떨어지지 않게
  - 끝까지 밀되 팔꿈치 완전 잠금 직전까지

### 머신 체스트 프레스 — Machine Chest Press `machine-chest-press`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Machine Chest Press using a machine, training the pectorals, triceps (emphasis: mid chest). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 대흉근 · 삼두
- 기구: 머신
- 자세 큐(참고):
  - 시트 조절로 손잡이가 가슴 중앙 높이
  - 견갑 모은 채 끝까지 밀고 천천히 복귀
  - 어깨가 앞으로 말리지 않게 가슴으로 밀기

### 인클라인 케이블 플라이 — Incline Cable Fly `incline-cable-fly`

**Prompt**

```text
Static tripod camera, front view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Incline Cable Fly using a cable machine, training the upper chest (emphasis: upper chest). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 상부 대흉근
- 기구: 케이블
- 자세 큐(참고):
  - 인클라인 벤치 30~45도, 양쪽 낮은 도르래에 D-그립
  - 팔꿈치 각 유지하며 가슴 위에서 모으기
  - 정점에서 1초 수축 후 천천히 복귀

### 덤벨 풀오버 — Dumbbell Pullover `dumbbell-pullover`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Dumbbell Pullover using dumbbells, training the pectorals, lats (emphasis: lower chest, lats). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 대흉근 · 광배
- 기구: 덤벨
- 자세 큐(참고):
  - 벤치에 어깨만 가로로 걸치고 덤벨 양손에
  - 팔꿈치 살짝 굽힌 채 머리 뒤로 호 그리며 늘리기
  - 광배·가슴으로 끌어올려 가슴 위까지


## 등 (back) — 16개

### 데드리프트 — Deadlift `deadlift`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Deadlift using a barbell, training the glutes, hamstrings, erector spinae (emphasis: erector spinae, lats). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 둔근 · 햄스트링 · 척추기립근
- 기구: 바벨
- 자세 큐(참고):
  - 바를 발 중앙 위, 정강이 가까이 두기
  - 등을 편 채 엉덩이와 가슴 동시에 세우기
  - 바를 몸에 붙여 끌어올리고 정점에서 둔근 수축

### 로우 — Barbell Row `barbell-row`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Barbell Row using a barbell, training the lats, traps, biceps (emphasis: lats, rhomboids). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 광배근 · 승모근 · 이두
- 기구: 바벨 / 덤벨
- 자세 큐(참고):
  - 힙 힌지로 상체 45도 숙이고 등 펴기
  - 바를 배꼽 쪽으로 당기며 견갑 모으기
  - 반동 없이 천천히 복귀

### 랫풀다운 — Lat Pulldown `lat-pulldown`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Lat Pulldown using a machine, training the lats, biceps (emphasis: lats). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 광배근 · 이두
- 기구: 머신 / 케이블
- 자세 큐(참고):
  - 허벅지 패드 고정, 가슴 들고 약간 뒤로
  - 바를 쇄골 쪽으로 당기며 팔꿈치 아래로
  - 광배 수축 후 천천히 복귀

### 풀업 — Pull-Up `pull-up`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Pull-Up using bodyweight (no equipment), training the lats, biceps (emphasis: lats). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 광배근 · 이두
- 기구: 맨몸
- 자세 큐(참고):
  - 어깨너비보다 약간 넓게 오버그립
  - 견갑 하강 후 가슴을 바 쪽으로 끌어올리기
  - 내릴 때 완전히 펴며 통제

### 티바 로우 — T-Bar Row `t-bar-row`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a T-Bar Row using a barbell, training the lats, rhomboids, traps (emphasis: lats, rhomboids). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 광배 · 능형근 · 승모
- 기구: 바벨 / 머신
- 자세 큐(참고):
  - 바 끝을 코너에 고정, 다리 사이로 잡기
  - 힙 힌지로 상체 45도 숙이고 등 펴기
  - 팔꿈치 뒤로 빼며 가슴까지 당기기

### 시티드 케이블 로우 — Seated Cable Row `seated-cable-row`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Seated Cable Row using a cable machine, training the lats mid, rhomboids (emphasis: rhomboids, lats). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 광배 중부 · 능형근
- 기구: 케이블
- 자세 큐(참고):
  - 발판에 발 고정, 무릎 살짝 굽히기
  - 상체 세우고 배꼽 쪽으로 당기기
  - 견갑 모은 후 통제하며 복귀

### 원암 덤벨 로우 — One Arm Dumbbell Row `one-arm-dumbbell-row`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a One Arm Dumbbell Row using dumbbells, training the lats, rhomboids (emphasis: lats). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 광배 · 능형근
- 기구: 덤벨
- 자세 큐(참고):
  - 벤치에 한 손·한 무릎 지지, 등 평평
  - 덤벨을 골반 쪽으로 당기며 팔꿈치 뒤
  - 광배 수축 후 통제 복귀

### 스트레이트암 풀다운 — Straight Arm Pulldown `straight-arm-pulldown`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Straight Arm Pulldown using a cable machine, training the lats(lower) (emphasis: lats). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 광배(하부)
- 기구: 케이블
- 자세 큐(참고):
  - 스트레이트 바, 고 도르래, 살짝 숙이기
  - 팔꿈치 살짝 굽혀 고정
  - 팔로 호를 그리며 허벅지까지 끌어내리기

### 슈러그 — Shrug `shrug`

**Prompt**

```text
Static tripod camera, front view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Shrug using a barbell, training the upper traps (emphasis: traps). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 상승모
- 기구: 바벨 / 덤벨
- 자세 큐(참고):
  - 바를 허벅지 앞에서 잡고 팔을 길게
  - 어깨를 귀 쪽으로 끌어올리기
  - 정점 1초 후 통제 하강

### 친업 — Chin-Up `chin-up`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Chin-Up using bodyweight (no equipment), training the lats, biceps (emphasis: lats). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 광배 · 이두
- 기구: 맨몸
- 자세 큐(참고):
  - 언더그립 어깨너비, 견갑 하강
  - 턱이 바 위로 올라오게 당기기
  - 통제하며 완전히 펴기

### 하이퍼익스텐션 — Hyperextension `hyperextension`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Hyperextension using a machine, training the erector spinae, glutes (emphasis: erector spinae). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 척추기립근 · 둔근
- 기구: 머신 / 맨몸
- 자세 큐(참고):
  - 발 고정, 패드를 골반에 위치
  - 등을 둥글지 않게 펴고 상체 일직선까지
  - 허리 과신전 없이 통제 복귀

### 펜들레이 로우 — Pendlay Row `pendlay-row`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Pendlay Row using a barbell, training the lats, rhomboids, traps (emphasis: lats, rhomboids). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 광배 · 능형근 · 승모
- 기구: 바벨
- 자세 큐(참고):
  - 상체 거의 수평까지 숙이고 등 완전히 펴기
  - 매 반복마다 바를 바닥에 내려놓고 출발
  - 배꼽 쪽으로 폭발적으로 당겨 견갑 모으기

### 메도우스 로우 — Meadows Row `meadows-row`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Meadows Row using a barbell, training the lats, rear delts (emphasis: lats). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 광배 · 후면 삼각근
- 기구: 바벨
- 자세 큐(참고):
  - 랜드마인(코너 고정) 바 끝에 핸들 또는 그립 부착
  - 한 쪽 발 앞으로 디뎌 옆으로 서서 한 손으로 잡기
  - 팔꿈치 뒤로 빼며 골반까지, 광배 수축 후 통제 복귀

### 리버스 펙덱 — Reverse Pec Deck `reverse-pec-deck`

**Prompt**

```text
Static tripod camera, front view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Reverse Pec Deck using a machine, training the rear delts, rhomboids (emphasis: rear delts, rhomboids). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 후면 삼각근 · 능형근
- 기구: 머신
- 자세 큐(참고):
  - 펙덱 머신을 뒤집어 사용 — 가슴 패드에 밀착해 앉기
  - 팔을 뒤로 호를 그리며 견갑 모으기
  - 어깨가 으쓱하지 않게, 정점 1초 정지

### 인버티드 로우 — Inverted Row `inverted-row`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Inverted Row using bodyweight (no equipment), training the lats, rhomboids (emphasis: rhomboids, lats). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 광배 · 능형근
- 기구: 맨몸
- 자세 큐(참고):
  - 낮은 바(스미스/링) 아래 누워 어깨너비로 잡기
  - 몸 일직선 유지하며 가슴이 바에 닿게 당기기
  - 통제하며 천천히 내리기 — 발 위치로 난이도 조절

### 와이드 그립 풀업 — Wide-Grip Pull-Up `wide-grip-pull-up`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Wide-Grip Pull-Up using bodyweight (no equipment), training the lats (outer) (emphasis: lats). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 광배 (외측)
- 기구: 맨몸
- 자세 큐(참고):
  - 어깨너비보다 훨씬 넓게 오버그립
  - 견갑 하강 후 가슴 들고 위로
  - 팔꿈치를 옆구리로 끌어내리는 느낌 — 광배 폭 강조


## 어깨 (shoulder) — 10개

### 오버헤드프레스 — Overhead Press `ohp`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Overhead Press using a barbell, training the deltoids, triceps (emphasis: front delts, side delts). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 삼각근 · 삼두
- 기구: 바벨 / 덤벨 / 머신
- 자세 큐(참고):
  - 바를 쇄골 위, 코어·둔근 단단히
  - 머리 피하며 수직으로 밀어 올리기
  - 정점에서 바가 정수리 위 일직선

### 사이드 레터럴 레이즈 — Lateral Raise `lateral-raise`

**Prompt**

```text
Static tripod camera, front view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Lateral Raise using dumbbells, training the side delts (emphasis: side delts). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 측면 삼각근
- 기구: 덤벨 / 케이블
- 자세 큐(참고):
  - 팔꿈치 살짝 굽히고 새끼손가락 살짝 위로
  - 어깨 높이까지만 양옆으로 들기
  - 반동 없이 천천히 내리기

### 페이스풀 — Face Pull `face-pull`

**Prompt**

```text
Static tripod camera, front view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Face Pull using a cable machine, training the rear delts, traps (emphasis: rear delts, traps). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 후면 삼각근 · 승모근
- 기구: 케이블
- 자세 큐(참고):
  - 도르래를 얼굴 높이, 로프 양끝 잡기
  - 팔꿈치 높게 유지하며 얼굴 쪽으로 당기기
  - 견갑 모으고 1초 정지 후 복귀

### 아놀드 프레스 — Arnold Press `arnold-press`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Arnold Press using dumbbells, training the front and side delts (emphasis: front delts, side delts). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 전·측면 삼각근
- 기구: 덤벨
- 자세 큐(참고):
  - 덤벨 손바닥이 몸 쪽으로 보이게 시작
  - 회전하며 위로 밀어 올리며 손바닥 정면으로
  - 내릴 때 역순으로 회전

### 프론트 레이즈 — Front Raise `front-raise`

**Prompt**

```text
Static tripod camera, front view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Front Raise using dumbbells, training the front delts (emphasis: front delts). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 전면 삼각근
- 기구: 덤벨 / 케이블 / 바벨
- 자세 큐(참고):
  - 덤벨을 허벅지 앞에서 시작
  - 팔꿈치 살짝 굽혀 어깨 높이까지 들기
  - 반동 없이 통제 하강

### 리어 델트 플라이 — Rear Delt Fly `rear-delt-fly`

**Prompt**

```text
Static tripod camera, front view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Rear Delt Fly using dumbbells, training the rear delts (emphasis: rear delts). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 후면 삼각근
- 기구: 덤벨 / 머신 / 케이블
- 자세 큐(참고):
  - 상체 숙여 등 평평, 팔꿈치 살짝 굽힘
  - 양옆·뒤로 호를 그리며 견갑 모으기
  - 어깨 으쓱 없이 후면 삼각근 집중

### 업라이트 로우 — Upright Row `upright-row`

**Prompt**

```text
Static tripod camera, front view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Upright Row using a barbell, training the side delts, traps (emphasis: side delts, traps). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 측면 삼각근 · 승모
- 기구: 바벨 / 덤벨 / 케이블
- 자세 큐(참고):
  - 어깨너비 또는 그보다 약간 넓게 잡기
  - 팔꿈치를 가슴 높이까지 끌어올리기
  - 어깨 부담 시 가동범위 줄이기

### 케이블 사이드 레터럴 — Cable Lateral Raise `cable-lateral-raise`

**Prompt**

```text
Static tripod camera, front view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Cable Lateral Raise using a cable machine, training the side delts (emphasis: side delts). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 측면 삼각근
- 기구: 케이블
- 자세 큐(참고):
  - 낮은 도르래를 몸 뒤·옆에 두고 반대편 손잡이 잡기
  - 팔꿈치 살짝 굽힌 채 어깨 높이까지 옆으로
  - 장력 유지하며 천천히 복귀

### 머신 숄더 프레스 — Machine Shoulder Press `machine-shoulder-press`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Machine Shoulder Press using a machine, training the deltoids (emphasis: front delts, side delts). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 삼각근
- 기구: 머신
- 자세 큐(참고):
  - 시트 조절로 손잡이가 어깨 높이
  - 끝까지 밀고 천천히 복귀 — 팔꿈치 잠금 피하기
  - 허리는 등받이에 밀착, 코어 단단히

### 머신 리어 델트 플라이 — Machine Rear Delt Fly `machine-rear-delt-fly`

**Prompt**

```text
Static tripod camera, front view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Machine Rear Delt Fly using a machine, training the rear delts (emphasis: rear delts). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 후면 삼각근
- 기구: 머신
- 자세 큐(참고):
  - 가슴 패드에 밀착, 손잡이를 뒤로 호 그리며 모으기
  - 정점에서 1초 수축, 어깨 으쓱 금지
  - 통제하며 복귀 — 가동범위 끝까지


## 팔 (arm) — 17개

### 바이셉스 컬 — Biceps Curl `biceps-curl`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Biceps Curl using a barbell, training the biceps (emphasis: biceps long head, biceps short head). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 이두
- 기구: 바벨 / 덤벨 / 케이블
- 자세 큐(참고):
  - 팔꿈치를 옆구리에 고정
  - 반동 없이 바를 들어 이두 수축
  - 천천히 끝까지 펴며 내리기

### 해머컬 — Hammer Curl `hammer-curl`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Hammer Curl using dumbbells, training the biceps, forearms (emphasis: forearms, biceps long head). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 이두 · 전완
- 기구: 덤벨
- 자세 큐(참고):
  - 손바닥이 마주 보는 중립 그립
  - 팔꿈치 고정하고 들어 올리기
  - 전완·이두 수축 후 천천히 복귀

### 트라이셉스 푸시다운 — Triceps Pushdown `triceps-pushdown`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Triceps Pushdown using a cable machine, training the triceps (emphasis: triceps lateral head, triceps medial head). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 삼두
- 기구: 케이블 / 머신
- 자세 큐(참고):
  - 팔꿈치를 옆구리에 고정
  - 팔만 펴서 끝까지 밀어 삼두 수축
  - 반동 없이 천천히 복귀

### 프리처 컬 — Preacher Curl `preacher-curl`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Preacher Curl using a barbell, training the biceps(lower) (emphasis: biceps short head). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 이두(하부)
- 기구: 바벨 / 덤벨 / 머신
- 자세 큐(참고):
  - 프리처 벤치에 팔 안쪽 밀착
  - 팔꿈치 고정하고 완전 신전~수축
  - 내릴 때 통제 (잠금 직전까지)

### 이지바 컬 — EZ-Bar Curl `ez-bar-curl`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a EZ-Bar Curl using a barbell, training the biceps (emphasis: biceps long head, biceps short head). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 이두
- 기구: 바벨
- 자세 큐(참고):
  - EZ바 내측 그립으로 잡기
  - 팔꿈치 옆구리 고정 후 컬
  - 반동 없이 끝까지 펴며 내리기

### 인클라인 덤벨 컬 — Incline Curl `incline-curl`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Incline Curl using dumbbells, training the biceps(장두) (emphasis: biceps long head). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 이두(장두)
- 기구: 덤벨
- 자세 큐(참고):
  - 인클라인 벤치에 등 기대고 팔 늘어뜨리기
  - 팔꿈치 뒤로 고정한 채 컬
  - 장두 늘림 강조하며 통제 하강

### 컨센트레이션 컬 — Concentration Curl `concentration-curl`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Concentration Curl using dumbbells, training the biceps short head (emphasis: biceps short head). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 이두 단두
- 기구: 덤벨
- 자세 큐(참고):
  - 벤치에 앉아 팔꿈치를 허벅지 안쪽에 고정
  - 이두만으로 끌어올려 1초 수축
  - 통제하며 완전히 펴기

### 라잉 트라이셉스 익스텐션 — Lying Triceps Extension (Skull Crusher) `skull-crusher`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Lying Triceps Extension (Skull Crusher) using a barbell, training the triceps long head (emphasis: triceps long head). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 삼두 장두
- 기구: 바벨 / 덤벨
- 자세 큐(참고):
  - EZ바, 누워서 팔 수직
  - 팔꿈치 고정하고 이마 위로 내리기
  - 삼두로 밀어 올리되 어깨 닫지 않기

### 오버헤드 트라이셉스 익스텐션 — Overhead Triceps Extension `overhead-triceps-extension`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Overhead Triceps Extension using dumbbells, training the triceps long head (emphasis: triceps long head). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 삼두 장두
- 기구: 덤벨 / 케이블
- 자세 큐(참고):
  - 덤벨 한 개를 양손으로 잡고 머리 위로
  - 팔꿈치 고정한 채 뒤로 내리기
  - 삼두로 펴며 위로

### 벤치 딥 — Bench Dip `bench-dip`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Bench Dip using bodyweight (no equipment), training the triceps (emphasis: triceps medial head, triceps long head). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 삼두
- 기구: 맨몸
- 자세 큐(참고):
  - 벤치 모서리 잡고 엉덩이 앞으로
  - 팔꿈치 90도까지 내리기
  - 삼두로 밀어 올리되 어깨 으쓱 금지

### 리버스 컬 — Reverse Curl `reverse-curl`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Reverse Curl using a barbell, training the forearms, biceps short head (emphasis: forearms). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 전완 · 이두 단두
- 기구: 바벨 / 덤벨
- 자세 큐(참고):
  - 오버그립으로 EZ바 잡기
  - 팔꿈치 고정한 채 컬
  - 통제 하강, 손목 곧게

### 리스트 컬 — Wrist Curl `wrist-curl`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Wrist Curl using dumbbells, training the wrist flexors (emphasis: forearms). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 전완 굴근
- 기구: 덤벨 / 바벨
- 자세 큐(참고):
  - 팔뚝을 벤치에 얹고 손바닥이 위로
  - 손목만 굽혀 끌어올리기
  - 통제하며 완전히 펴기

### 드래그 컬 — Drag Curl `drag-curl`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Drag Curl using a barbell, training the biceps (장두 emphasis) (emphasis: biceps long head). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 이두 (장두 강조)
- 기구: 바벨
- 자세 큐(참고):
  - EZ바를 잡고 팔꿈치를 몸 뒤로 보내며 컬
  - 바가 몸을 따라 위로 끌리듯 올라옴 (이름의 유래)
  - 이두 수축 강조, 견갑 으쓱 금지

### 조트만 컬 — Zottman Curl `zottman-curl`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Zottman Curl using dumbbells, training the biceps, forearms (emphasis: forearms, biceps short head). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 이두 · 전완
- 기구: 덤벨
- 자세 큐(참고):
  - 언더그립으로 컬 올리기 (이두 자극)
  - 정점에서 손목을 회내전(오버그립)으로 돌리기
  - 오버그립으로 천천히 내리기 (전완 자극)

### 케이블 로프 해머컬 — Cable Rope Hammer Curl `cable-rope-hammer-curl`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Cable Rope Hammer Curl using a cable machine, training the biceps, forearms (emphasis: forearms, biceps long head). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 이두 · 전완
- 기구: 케이블
- 자세 큐(참고):
  - 낮은 도르래에 로프 부착, 중립 그립으로 양손
  - 팔꿈치 고정한 채 가슴까지 컬
  - 정점에서 로프 양끝을 밖으로 살짝 벌리며 수축

### 트라이셉스 킥백 — Triceps Kickback `triceps-kickback`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Triceps Kickback using dumbbells, training the triceps (emphasis: triceps lateral head). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 삼두
- 기구: 덤벨 / 케이블
- 자세 큐(참고):
  - 상체 숙이고 한 손·한 무릎 벤치 지지
  - 팔꿈치를 옆구리에 고정한 채 뒤로 펴기
  - 정점에서 1초 수축, 통제하며 복귀

### 다이아몬드 푸시업 — Diamond Push-Up `diamond-pushup`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Diamond Push-Up using bodyweight (no equipment), training the triceps, inner chest (emphasis: triceps medial head, triceps lateral head). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 삼두 · 내측 대흉근
- 기구: 맨몸
- 자세 큐(참고):
  - 양손 엄지·검지 다이아몬드 모양으로 가슴 아래에
  - 팔꿈치를 옆구리에 가깝게 유지하며 내리기
  - 삼두로 밀어 올리되 어깨 으쓱 금지


## 하체 (lower) — 33개

### 스쿼트 — Squat `squat`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Squat using a barbell, training the quads, glutes, hamstrings (emphasis: quads, glutes). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 대퇴사두 · 둔근 · 햄스트링
- 기구: 바벨 / 머신 / 맨몸
- 자세 큐(참고):
  - 바를 승모근 위, 코어 단단히
  - 무릎과 발끝 방향 맞추고 엉덩이 뒤로
  - 허벅지 평행까지 내렸다 발 전체로 밀기

### 레그프레스 — Leg Press `leg-press`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Leg Press using a machine, training the quads, glutes (emphasis: quads, glutes). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 대퇴사두 · 둔근
- 기구: 머신
- 자세 큐(참고):
  - 발을 어깨너비로 발판 중앙에
  - 허리 시트에서 떨어지지 않게 깊이 조절
  - 무릎 완전 잠금 없이 밀기

### 루마니안 데드리프트 — Romanian Deadlift `rdl`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Romanian Deadlift using a barbell, training the hamstrings, glutes (emphasis: hamstrings, glutes). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 햄스트링 · 둔근
- 기구: 바벨 / 덤벨
- 자세 큐(참고):
  - 무릎 살짝 굽힌 각 유지
  - 엉덩이 뒤로 보내며 바를 다리 따라 내리기
  - 햄스트링 늘어남 느끼고 둔근으로 세우기

### 레그컬 — Leg Curl `leg-curl`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Leg Curl using a machine, training the hamstrings (emphasis: hamstrings). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 햄스트링
- 기구: 머신
- 자세 큐(참고):
  - 패드를 발목 위에 맞추고 골반 고정
  - 햄스트링으로 끝까지 굽히기
  - 반동 없이 천천히 복귀

### 힙 스러스트 — Hip Thrust `hip-thrust`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Hip Thrust using a barbell, training the glutes, hamstrings (emphasis: glutes). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 둔근 · 햄스트링
- 기구: 바벨 / 머신
- 자세 큐(참고):
  - 견갑을 벤치에 걸치고 바를 골반에 패드와 함께 올리기
  - 발로 바닥 밀며 엉덩이를 끝까지 들어 둔근 수축
  - 정점에서 1초 정지 후 천천히 내리기

### 글루트 브릿지 — Glute Bridge `glute-bridge`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Glute Bridge using bodyweight (no equipment), training the glutes, core (emphasis: glutes). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 둔근 · 코어
- 기구: 맨몸 / 바벨
- 자세 큐(참고):
  - 무릎 세워 눕고 발은 엉덩이 가까이
  - 둔근 조여 엉덩이를 들어 일직선
  - 정점에서 1초 정지 후 내리기

### 런지 — Lunge `lunge`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Lunge using dumbbells, training the quads, glutes (emphasis: quads, glutes). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 대퇴사두 · 둔근
- 기구: 덤벨 / 맨몸
- 자세 큐(참고):
  - 덤벨을 양손에 들고 한 발 앞으로
  - 뒤 무릎이 바닥 가까이 오도록 내리기
  - 앞발로 밀어 시작 자세 복귀

### 불가리안 스플릿 스쿼트 — Bulgarian Split Squat `bulgarian-split-squat`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Bulgarian Split Squat using dumbbells, training the quads, glutes (emphasis: quads, glutes). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 대퇴사두 · 둔근
- 기구: 덤벨 / 맨몸
- 자세 큐(참고):
  - 뒷발을 벤치에 올리고 덤벨 들기
  - 앞 허벅지가 평행이 되도록 내리기
  - 앞발로 밀어 올리며 균형 유지

### 케이블 킥백 — Cable Kickback `cable-kickback`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Cable Kickback using a cable machine, training the glutes (emphasis: glutes). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 둔근
- 기구: 케이블
- 자세 큐(참고):
  - 발목에 스트랩 걸고 살짝 숙이기
  - 무릎 각 유지하며 다리를 뒤로 차기
  - 둔근 수축 1초 후 통제 복귀

### 힙 어브덕션 — Hip Abduction `hip-abduction`

**Prompt**

```text
Static tripod camera, front view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Hip Abduction using a machine, training the glute medius (emphasis: glutes). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 중둔근
- 기구: 머신
- 자세 큐(참고):
  - 패드에 무릎 바깥쪽을 대고 앉기
  - 다리를 바깥으로 벌려 중둔근 수축
  - 반동 없이 천천히 모으기

### 프론트 스쿼트 — Front Squat `front-squat`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Front Squat using a barbell, training the quads, core (emphasis: quads). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 대퇴사두 · 코어
- 기구: 바벨
- 자세 큐(참고):
  - 바를 쇄골 위 랙 포지션, 팔꿈치 높게
  - 코어 단단히, 평행까지 앉기
  - 상체 세운 채 발 전체로 일어서기

### 고블릿 스쿼트 — Goblet Squat `goblet-squat`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Goblet Squat using dumbbells, training the quads, glutes (emphasis: quads, glutes). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 대퇴사두 · 둔근
- 기구: 덤벨
- 자세 큐(참고):
  - 덤벨을 가슴 앞에 컵 모양으로 잡기
  - 팔꿈치가 무릎 안쪽에 닿을 만큼 앉기
  - 발 전체로 밀어 일어서기

### 핵 스쿼트 — Hack Squat `hack-squat`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Hack Squat using a machine, training the quads, glutes (emphasis: quads). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 대퇴사두 · 둔근
- 기구: 머신
- 자세 큐(참고):
  - 어깨 패드·발판에 안정적으로 위치
  - 허리 시트 밀착 유지하며 깊게 내리기
  - 발 전체로 밀어 올리기

### 레그 익스텐션 — Leg Extension `leg-extension`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Leg Extension using a machine, training the quads (emphasis: quads). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 대퇴사두
- 기구: 머신
- 자세 큐(참고):
  - 발목 패드를 발등 아래에 위치
  - 무릎 완전 펴며 정점 1초 수축
  - 반동 없이 통제 복귀

### 시티드 레그컬 — Seated Leg Curl `seated-leg-curl`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Seated Leg Curl using a machine, training the hamstrings (emphasis: hamstrings). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 햄스트링
- 기구: 머신
- 자세 큐(참고):
  - 허리 패드 밀착, 발목 패드 위치 조절
  - 햄스트링으로 끝까지 굽히기
  - 반동 없이 통제 복귀

### 스탠딩 카프 레이즈 — Standing Calf Raise `standing-calf-raise`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Standing Calf Raise using a machine, training the gastrocnemius (emphasis: calves). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 비복근
- 기구: 머신 / 맨몸
- 자세 큐(참고):
  - 어깨 패드 받치고 발 앞꿈치를 발판에
  - 발끝으로 끝까지 들고 1초 정지
  - 발뒤꿈치 깊게 내려 스트레치

### 시티드 카프 레이즈 — Seated Calf Raise `seated-calf-raise`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Seated Calf Raise using a machine, training the soleus (emphasis: calves). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 가자미근
- 기구: 머신
- 자세 큐(참고):
  - 패드를 무릎 위에, 발 앞꿈치 발판에
  - 발끝으로 끝까지 들기
  - 정점 1초 후 통제 하강

### 스모 데드리프트 — Sumo Deadlift `sumo-deadlift`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Sumo Deadlift using a barbell, training the glutes, adductors, hamstrings (emphasis: glutes, adductors, hamstrings). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 둔근 · 내전근 · 햄스트링
- 기구: 바벨
- 자세 큐(참고):
  - 발 어깨보다 넓게, 발끝 45도
  - 바를 발 중앙, 안쪽 그립
  - 엉덩이·가슴 동시에 세우며 발로 밀기

### 굿모닝 — Good Morning `good-morning`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Good Morning using a barbell, training the hamstrings, erector spinae (emphasis: hamstrings, erector spinae). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 햄스트링 · 척추기립근
- 기구: 바벨
- 자세 큐(참고):
  - 바를 승모근 위에 안전하게
  - 무릎 살짝 굽힌 채 힙 힌지
  - 둔근 수축하며 상체 세우기

### 스텝업 — Step-Up `step-up`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Step-Up using dumbbells, training the quads, glutes (emphasis: quads, glutes). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 대퇴사두 · 둔근
- 기구: 덤벨 / 맨몸
- 자세 큐(참고):
  - 덤벨 양손에 들고 박스에 한 발
  - 앞발로 밀어 올라서기 (뒷발 반동 금지)
  - 통제하며 내려오기

### 힙 어덕션 — Hip Adduction `hip-adduction`

**Prompt**

```text
Static tripod camera, front view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Hip Adduction using a machine, training the adductors (emphasis: adductors). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 내전근
- 기구: 머신
- 자세 큐(참고):
  - 패드 안쪽에 무릎 대고 다리 벌린 상태
  - 내전근으로 다리 모으기
  - 통제 복귀

### 워킹 런지 — Walking Lunge `walking-lunge`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Walking Lunge using dumbbells, training the quads, glutes (emphasis: quads, glutes). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 대퇴사두 · 둔근
- 기구: 덤벨 / 맨몸
- 자세 큐(참고):
  - 덤벨 양손에 길게 들기
  - 한 발 크게 디뎌 뒤 무릎이 바닥 가까이
  - 앞발로 밀며 다음 보 연속

### 스미스 머신 스쿼트 — Smith Machine Squat `smith-squat`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Smith Machine Squat using a machine, training the quads, glutes (emphasis: quads, glutes). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 대퇴사두 · 둔근
- 기구: 머신
- 자세 큐(참고):
  - 발 위치를 살짝 앞으로 두어 무릎 부담 줄이기
  - 허리 중립, 평행까지 내리기
  - 발 전체로 밀어 올리며 무릎 잠금 회피

### 스티프 레그 데드리프트 — Stiff-Leg Deadlift `stiff-leg-deadlift`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Stiff-Leg Deadlift using a barbell, training the hamstrings, glutes (emphasis: hamstrings, glutes). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 햄스트링 · 둔근
- 기구: 바벨
- 자세 큐(참고):
  - 무릎 거의 펴고(아주 살짝만 굽힘) 시작
  - 엉덩이 뒤로 보내며 바를 다리 따라 내리기
  - 햄스트링 늘림 느끼고 둔근으로 세우기

### 피스톨 스쿼트 — Pistol Squat `pistol-squat`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Pistol Squat using bodyweight (no equipment), training the quads, glutes, core (emphasis: quads, glutes). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 대퇴사두 · 둔근 · 코어
- 기구: 맨몸
- 자세 큐(참고):
  - 한 발 앞으로 길게 뻗고 다른 발로 균형
  - 엉덩이 뒤로 보내며 깊게 앉기 — 뻗은 다리 바닥에 닿지 않게
  - 발 전체로 밀어 올라오기 — 너무 어려우면 박스 위에서 연습

### 시시 스쿼트 — Sissy Squat `sissy-squat`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Sissy Squat using bodyweight (no equipment), training the quads (esp. rectus femoris) (emphasis: quads). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 대퇴사두 (특히 직근)
- 기구: 맨몸
- 자세 큐(참고):
  - 발끝 위로 일어선 채 무릎을 앞으로 굽혀 상체 뒤로
  - 고관절은 펴고 무릎만 굽힘 — 대퇴직근 강조
  - 발 앞꿈치로 밀어 일어남, 무릎 통증 시 즉시 중단

### 코삭 스쿼트 — Cossack Squat `cossack-squat`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Cossack Squat using bodyweight (no equipment), training the adductors, thighs, hip mobility (emphasis: adductors, quads). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 내전근 · 대퇴 · 고관절 가동성
- 기구: 맨몸
- 자세 큐(참고):
  - 다리를 어깨보다 훨씬 넓게 벌리고 발끝 살짝 바깥
  - 한 쪽으로 체중 옮기며 그쪽 무릎 깊게 굽히고 반대 다리는 곧게
  - 통제하며 반대쪽으로 — 좌우 번갈아

### 박스 스쿼트 — Box Squat `box-squat`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Box Squat using a barbell, training the quads, glutes (깊이 통제) (emphasis: quads, glutes). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 대퇴사두 · 둔근 (깊이 통제)
- 기구: 바벨
- 자세 큐(참고):
  - 박스/벤치 앞에 서서 바를 승모근 위에
  - 엉덩이 뒤로 보내며 박스에 살짝 앉기 (체중 다 싣지 않기)
  - 발 전체로 폭발적으로 일어서기 — 일정 깊이 보장

### 벨트 스쿼트 — Belt Squat `belt-squat`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Belt Squat using a machine, training the quads, glutes (허리 부담 적음) (emphasis: quads, glutes). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 대퇴사두 · 둔근 (허리 부담 적음)
- 기구: 머신
- 자세 큐(참고):
  - 벨트를 허리에 차고 무게를 매단 채 플랫폼 위에 서기
  - 스쿼트 하듯 평행까지 앉기 — 등은 곧게
  - 발 전체로 밀어 올라옴 — 척추 부담 없이 다리 자극

### 싱글 레그프레스 — Single-Leg Leg Press `single-leg-leg-press`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Single-Leg Leg Press using a machine, training the quads, glutes (좌우 균형 보강) (emphasis: quads, glutes). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 대퇴사두 · 둔근 (좌우 균형 보강)
- 기구: 머신
- 자세 큐(참고):
  - 한 발만 발판 중앙에 두고 다른 발은 옆에
  - 허리 시트에서 떨어지지 않게 깊이 조절
  - 발 전체로 밀고 좌우 번갈아 — 약한 쪽 더 신경

### 커트시 런지 — Curtsy Lunge `curtsy-lunge`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Curtsy Lunge using dumbbells, training the glute medius, thighs (emphasis: glutes, quads). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 중둔근 · 대퇴
- 기구: 덤벨 / 맨몸
- 자세 큐(참고):
  - 한 발 대각선 뒤로 디뎌 마치 인사하듯
  - 앞 무릎 90도, 뒷 다리는 발끝으로 바닥 가까이
  - 앞발로 밀어 일어나 좌우 번갈아

### 스모 스쿼트 — Sumo Squat `sumo-squat`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Sumo Squat using dumbbells, training the adductors, glutes, thighs (emphasis: adductors, glutes, quads). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 내전근 · 둔근 · 대퇴
- 기구: 덤벨 / 맨몸
- 자세 큐(참고):
  - 다리를 어깨너비보다 훨씬 넓게, 발끝 45도 바깥
  - 덤벨 한 개를 양손으로 사이에 들고 평행까지 앉기
  - 발 전체로 밀어 일어서기 — 내전근 수축 강조

### 동키 카프 레이즈 — Donkey Calf Raise `donkey-calf-raise`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Donkey Calf Raise using bodyweight (no equipment), training the gastrocnemius (emphasis: calves). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 비복근
- 기구: 맨몸
- 자세 큐(참고):
  - 벤치/박스에 양손 짚고 상체 90도 숙이기
  - 발 앞꿈치만 발판에 두고 발끝으로 끝까지
  - 발뒤꿈치 깊게 내려 스트레치 — 동작 천천히


## 코어 (core) — 16개

### 플랭크 — Plank `plank`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Plank using bodyweight (no equipment), training the abs, core (emphasis: upper abs, lower abs). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 복근 · 코어
- 기구: 맨몸
- 자세 큐(참고):
  - 팔꿈치 어깨 아래, 몸 일직선
  - 복부·둔근 조여 허리 처짐 방지
  - 호흡 유지하며 30~60초

### 행잉 레그레이즈 — Hanging Leg Raise `hanging-leg-raise`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Hanging Leg Raise using bodyweight (no equipment), training the lower abs, core (emphasis: lower abs). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 하복부 · 코어
- 기구: 맨몸
- 자세 큐(참고):
  - 바에 매달려 견갑 살짝 고정
  - 골반을 말아 다리를 들어 올리기
  - 반동 없이 천천히 내리기

### 케이블 크런치 — Cable Crunch `cable-crunch`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Cable Crunch using a cable machine, training the abs (emphasis: upper abs). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 복근
- 기구: 케이블
- 자세 큐(참고):
  - 로프를 머리 옆에 두고 무릎 꿇기
  - 복부를 말아 상체를 굽히기
  - 엉덩이 회전 아닌 복근 수축에 집중

### 싯업 — Sit-Up `sit-up`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Sit-Up using bodyweight (no equipment), training the abs (emphasis: upper abs). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 복근
- 기구: 맨몸
- 자세 큐(참고):
  - 무릎 굽히고 발 고정, 손은 가슴 또는 머리 옆
  - 복근으로 상체 들어 무릎 쪽으로
  - 통제하며 천천히 내리기

### 크런치 — Crunch `crunch`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Crunch using bodyweight (no equipment), training the upper abs (emphasis: upper abs). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 상복근
- 기구: 맨몸
- 자세 큐(참고):
  - 무릎 굽혀 눕고 손은 가슴 또는 관자놀이
  - 복근만 말아 상체 살짝 들기
  - 정점 1초 후 통제 하강

### 사이드 플랭크 — Side Plank `side-plank`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Side Plank using bodyweight (no equipment), training the obliques (emphasis: obliques). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 복사근
- 기구: 맨몸
- 자세 큐(참고):
  - 팔꿈치 어깨 아래, 옆으로 몸 일직선
  - 엉덩이 떨어지지 않게 코어 유지
  - 30~60초 유지 후 반대쪽

### 러시안 트위스트 — Russian Twist `russian-twist`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Russian Twist using bodyweight (no equipment), training the obliques (emphasis: obliques). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 복사근
- 기구: 맨몸 / 덤벨
- 자세 큐(참고):
  - 무릎 굽히고 발 들기, 상체 살짝 뒤로
  - 양옆으로 손을 바닥 가깝게 회전
  - 허리 비틀지 않고 복부 회전

### 앱 휠 롤아웃 — Ab Wheel Rollout `ab-rollout`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Ab Wheel Rollout using bodyweight (no equipment), training the abs, core (emphasis: upper abs, lower abs). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 복근 · 코어
- 기구: 맨몸
- 자세 큐(참고):
  - 무릎 꿇고 휠을 어깨 아래에
  - 허리 처지지 않게 천천히 굴려 늘리기
  - 복근·광배로 끌어당겨 복귀

### 마운틴 클라이머 — Mountain Climber `mountain-climber`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Mountain Climber using bodyweight (no equipment), training the core, conditioning (emphasis: lower abs). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 코어 · 심폐
- 기구: 맨몸
- 자세 큐(참고):
  - 플랭크 자세, 손 어깨 아래
  - 무릎을 가슴 쪽으로 빠르게 번갈아
  - 엉덩이 들리지 않게 유지

### 우드 차퍼 — Wood Chopper `wood-chopper`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Wood Chopper using a cable machine, training the obliques, core (emphasis: obliques). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 복사근 · 코어
- 기구: 케이블
- 자세 큐(참고):
  - 고 도르래, 옆으로 서서 양손 잡기
  - 대각선 아래·반대편으로 끌어내리기
  - 팔 아닌 몸통(코어) 회전

### 팰로프 프레스 — Pallof Press `pallof-press`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Pallof Press using a cable machine, training the core(anti-rotation) (emphasis: obliques). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 코어(안티 회전)
- 기구: 케이블
- 자세 큐(참고):
  - 가슴 높이 도르래, 옆으로 서서 손잡이 잡기
  - 가슴 앞으로 밀어 펴기 (회전 저항)
  - 통제하며 복귀, 좌우 균형

### 리버스 크런치 — Reverse Crunch `reverse-crunch`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Reverse Crunch using bodyweight (no equipment), training the lower abs (emphasis: lower abs). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 하복부
- 기구: 맨몸
- 자세 큐(참고):
  - 누워서 무릎 굽히고 발 들어 올림
  - 하복부로 골반을 말아 무릎을 가슴으로
  - 통제하며 천천히 내리기 — 반동 금지

### 브이업 — V-Up `v-up`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a V-Up using bodyweight (no equipment), training the full abs (emphasis: upper abs, lower abs). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 복근 전체
- 기구: 맨몸
- 자세 큐(참고):
  - 누워서 팔·다리 길게 뻗기
  - 복근으로 동시에 상체·다리를 들어 손이 발끝에 닿게
  - 통제하며 시작 자세로 — 허리 통증 시 무릎 살짝 굽힘

### 할로우 홀드 — Hollow Hold `hollow-hold`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Hollow Hold using bodyweight (no equipment), training the abs, core 안정성 (emphasis: upper abs, lower abs). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 복근·코어 안정성
- 기구: 맨몸
- 자세 큐(참고):
  - 누워서 허리를 바닥에 밀착(complete tuck)
  - 팔·다리를 일직선으로 살짝 들어 바나나 자세
  - 20~40초 호흡하며 유지 — 허리 떠오르지 않게

### 토스 투 바 — Toes-to-Bar `toes-to-bar`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Toes-to-Bar using bodyweight (no equipment), training the abs, lats (emphasis: lower abs). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 복근 · 광배
- 기구: 맨몸
- 자세 큐(참고):
  - 풀업 바에 매달려 견갑 살짝 하강
  - 발끝이 바에 닿을 때까지 복부로 다리 들기
  - 통제하며 내리기 — 반동 줄이고 복부 사용

### 바이시클 크런치 — Bicycle Crunch `bicycle-crunch`

**Prompt**

```text
Static tripod camera, side-profile view, eye-level, full body in frame. A fit athlete in fitted gym wear, realistic body proportions, anatomically correct hands. Performing a Bicycle Crunch using bodyweight (no equipment), training the obliques, abs (emphasis: obliques, upper abs). One slow, controlled repetition through full range of motion with clean technique. Clean modern gym, soft even lighting, neutral background. Photorealistic, 4K, smooth natural motion, seamless loop. Negative: no text, no watermark, no extra people, no distorted or extra limbs, no morphing weights, no fast cuts, no jitter.
```

- 자극 부위: 복사근 · 복근
- 기구: 맨몸
- 자세 큐(참고):
  - 누워서 손은 머리 옆, 무릎 굽혀 들기
  - 오른 팔꿈치와 왼 무릎이 만나게 회전, 반대편 다리는 곧게
  - 교대로 자전거 페달 차듯 — 천천히 통제


---
총 105개 운동.
