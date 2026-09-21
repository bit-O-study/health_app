import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import {
  BODY_PART_ORDER,
  groupedByBodyPart,
  type BodyPart,
  type CatalogExercise,
} from "@/features/routine/exercise-catalog";
import { ExerciseFinder } from "@/features/routine/components/exercise-finder";
import { ExerciseLibrary } from "@/features/exercises/components/exercise-library";
import { absoluteUrl } from "@/lib/seo";

// 순수 카탈로그(인메모리) 데이터만 쓰므로 정적 렌더 — 사용자별 데이터 없음.
// (예전엔 force-dynamic 이라 매 요청마다 서버 렌더했는데 불필요했다.)

export const metadata: Metadata = {
  title: "운동 종목 리스트",
  description:
    "가슴, 등, 어깨, 팔, 하체, 코어 운동을 부위별로 확인하고 기구별 운동법을 찾아보세요.",
  // 로그인 후에만 접근 가능(미들웨어 게이트) → 검색엔진 색인 제외.
  robots: { index: false, follow: false },
  alternates: {
    canonical: absoluteUrl("/exercises"),
  },
  openGraph: {
    title: "운동 종목 리스트 | 헬쑤",
    description:
      "부위별 헬스 운동 카탈로그와 기구별 운동 방법을 확인하세요.",
    url: absoluteUrl("/exercises"),
  },
};

export default function ExercisesPage() {
  const grouped = groupedByBodyPart();
  const sections: { part: BodyPart; items: CatalogExercise[] }[] =
    BODY_PART_ORDER.map((part) => ({ part, items: grouped[part] }));

  // 공통 머리글 + 부위 칩 + 부위별 그룹 목록(2026-09-16 8단계) — 영문 머리말·설명 문장은 뺐다.
  return (
    <div className="app-page">
      <PageHeader title="운동 종목" back />
      <main className="app-container space-y-4">
        {/* 자연어로 찾기 — 예전엔 운동탭 머리글에 있었는데, 하단 '운동찾기' 칸과
            이름이 거의 같아 헷갈렸다. 찾는 곳을 여기 하나로 모았다(2026-09-21). */}
        <div className="flex justify-end">
          <ExerciseFinder />
        </div>
        <ExerciseLibrary sections={sections} />
      </main>
    </div>
  );
}
