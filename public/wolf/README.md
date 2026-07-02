# 헬스장 늑대 캐릭터 애셋 넣는 곳

그룹 탭 헬스장의 늑대는 **Lottie 애셋**이 있으면 그걸로 고퀄 애니메이션을 재생하고,
없으면 코드로 그린 SVG 늑대로 자동 폴백합니다.

## 넣는 법 (Lottie)

1. LottieFiles 등에서 마음에 드는 **늑대(wolf) 애니메이션**을 받는다.
   - 형식: `.json` (Lottie JSON). (`.lottie`/`dotLottie`는 별도 처리 필요 — 요청 주세요.)
2. 파일 이름을 **`wolf.json`** 으로 바꿔 이 폴더(`public/wolf/`)에 넣는다.
   → 최종 경로: `public/wolf/wolf.json`
3. 배포하면 헬스장 늑대가 그 애니메이션으로 자동 교체된다. (코드 수정 불필요)

## 참고

- 렌더링: `src/features/groups/components/wolf-character.tsx` (라이브러리 `lottie-react`).
- 애셋이 없으면: `wolf-svg.tsx` 의 직접 그린 SVG 늑대로 폴백.
- Rive(`.riv`)나 3D(`.glb`)로 가고 싶으면 말씀해 주세요 — 그 로더로 교체해 드립니다.
