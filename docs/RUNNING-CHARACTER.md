# 런닝 캐릭터 교체 (Mixamo 러너)

런닝 모드(실내/야외/힐링)의 3D 캐릭터를 바꾸는 방법. 코드는 **드롭인**으로 준비돼 있어,
`.glb` 파일 하나만 넣고 경로를 바꾸면 **실내·야외·힐링 모두** 새 캐릭터로 바뀐다.

## 코드 쪽 (이미 준비됨)

- 캐릭터 설정은 한 곳: **`src/features/running/character.ts`**
  - `CHARACTER_MODEL_URL` — 모델 경로(기본 `/models/runner-robot.glb`)
  - `pickClipName()` — 클립 이름이 제각각(`Idle`/`Running`/`Run`/`mixamo.com` 등)이어도
    자동 매칭. `running-3d.tsx`(실내)·`zen-scene.tsx`(힐링·야외) 둘 다 이걸 쓴다.
- **바꾸려면**: 새 `.glb` 를 `public/models/` 에 넣고 `CHARACTER_MODEL_URL` 만 그 파일로.
- idle 클립이 없으면 멈췄을 때 run 을 정지(timeScale 0)시켜 '가만히' 폴백한다.

## Mixamo 에서 러너 GLB 만들기 (무료, 어도비 계정 필요)

⚠ 이 단계는 **어도비 로그인 + 파일 변환**이 필요해 사람이 직접 해야 한다(자동화 불가).

1. **Mixamo 접속** — https://www.mixamo.com (Adobe 계정으로 로그인, 무료).
2. **Characters** 에서 마음에 드는 캐릭터 선택(예: "Y Bot", 또는 예쁜 캐릭터).
   - 또는 자체 캐릭터 FBX 업로드해서 자동 리깅.
3. **Animations** 에서 애니메이션을 받는다 — 최소 2개:
   - **Running**(또는 Jog) — 달릴 때
   - **Idle**(또는 Breathing Idle) — 멈췄을 때
   - 각 애니메이션에서 **Download** → 설정:
     - Format: **FBX Binary(.fbx)**
     - Skin: **With Skin**(첫 다운로드) / 이후 애니는 **Without Skin** 가능
     - Frames per Second: 30, Keyframe Reduction: none
4. **FBX → GLB 변환 + 클립 합치기** (아래 중 하나):
   - **Blender**(무료): 캐릭터 FBX + 애니 FBX 들을 import → 각 액션 이름을
     `Idle`, `Run` 으로 정리 → **glTF 2.0 (.glb)** 로 export(애니메이션 포함).
   - 또는 온라인 변환기(예: FBX2glTF, gltf.report)로 변환 후 클립 이름 확인.
   - 클립 이름은 `Idle`/`Run` 으로 두면 가장 확실하지만, `pickClipName` 이 `Running`/`Jog`/
     `Breathing Idle` 등도 매칭한다.
5. **파일 넣기**: 만든 `.glb` 를 `public/models/` 에 넣고(예: `runner-mixamo.glb`),
   `character.ts` 의 `CHARACTER_MODEL_URL` 을 `/models/runner-mixamo.glb` 로 바꾼다.
6. **크기/방향**: 코드가 자동으로 키 1.5~1.7 로 맞추고(+X 를 보고 달림) 그림자를 켠다.
   방향이 이상하면 export 시 회전(보통 -Z forward)만 맞추면 된다.

## 체크리스트

- [ ] `.glb` 에 **Idle + Run**(또는 유사 이름) 애니메이션이 둘 다 들어있다.
- [ ] 파일 크기가 너무 크지 않다(모바일 — 되도록 2~4MB 이하 권장).
- [ ] `public/models/` 에 넣고 `CHARACTER_MODEL_URL` 갱신.
- [ ] `/running`(실내/야외)·`/jog`(힐링) 에서 캐릭터가 뜨고, 달리면 Run·멈추면 Idle.

## 라이선스

Mixamo 캐릭터/애니메이션은 어도비 계정으로 받으면 상업적 사용 가능(어도비 약관 확인).
자체 캐릭터를 쓸 경우 그 캐릭터의 라이선스를 확인할 것.
