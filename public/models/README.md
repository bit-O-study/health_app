# 3D 해부학 모델 (근육 마네킹)

이 폴더에 **`anatomy.glb`** 파일을 넣으면, 근육별 운동선택 화면(`/plan/muscle`)의
마네킹이 자동으로 그 실사 해부학 모델로 바뀝니다. 파일이 없으면 절차적(도형) 인체로
자연스럽게 폴백합니다. (코드 수정 불필요 — 경로는
`src/features/routine/components/muscle-mannequin-3d.tsx` 의 `ANATOMY_MODEL_URL`)

## 권장 모델
- **근육 해부학(écorché) 모델**이 이 앱에 가장 잘 맞습니다(진짜 근육 형태 + 근육별 클릭).
- 무료 CC0/CC-BY GLB 예: Meshy(meshy.ai, 무료 계정 CC0), Sketchfab(CC 라이선스 모델),
  Z-Anatomy(CC-BY-SA) 등에서 받아 `.glb`로 내보낸 뒤 이 폴더에 `anatomy.glb`로 저장.

## 자동 매핑
로더가 표준 해부학 메쉬 이름(영문·라틴)을 우리 세부근육 체계로 **자동 매핑**합니다.
예: `Pectoralis...`→가슴, `Deltoid`→어깨, `Biceps...`→이두, `Triceps lateral`→삼두 외측두,
`Latissimus`→광배, `Rectus femoris/Vastus`→대퇴사두, `Gastrocnemius/Soleus`→종아리 등.

자동으로 안 잡히는 메쉬는 같은 파일의 `MESH_NAME_OVERRIDE` 에
`"모델메쉬이름": "세부근육id"` 형식으로 추가하면 됩니다. (세부근육 id 목록은
`src/features/routine/muscle-detail.ts` 의 `SUB_MUSCLES` 참고)

> 모델 메쉬 이름을 모르겠으면, .glb 를 주시면 메쉬 이름을 뽑아 매핑을 채워드립니다.