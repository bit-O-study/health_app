# 헬스장 배경 이미지 넣는 곳

그룹 탭 헬스장 배경은 **이미지가 있으면 그걸로 고퀄**, 없으면 코드로 그린 CSS 헬스장으로 폴백합니다.

## 넣는 법

1. 헬스장 인테리어 일러스트/사진(가로형, 예: 1200×800 이상)을 준비.
2. 파일명을 **`gym.png`** 로 바꿔 이 폴더(`public/gym/`)에 넣는다.
   → 최종 경로: `public/gym/gym.png` (jpg/webp 도 되면 이름을 gym.png 로)
3. 배포하면 헬스장 배경이 자동으로 그 이미지로 바뀐다. (코드 수정 불필요)

렌더링: `src/features/groups/components/gym-room.tsx` (`<img src="/gym/gym.png">`, 실패 시 CSS 폴백).
늑대 캐릭터 애셋은 `public/wolf/README.md` 참고.
