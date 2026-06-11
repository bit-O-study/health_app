/**
 * 운동 방법 문구(한 단계)에서 핵심 신체 부위를 찾아, 실사 사진을 그 부위로 확대(줌인)할
 * 초점을 돌려준다. 예) "허리 중립 유지" → 허리 부위로 줌 + 마커, "무릎과 발끝…" → 무릎.
 *
 * 가이드 튜토리얼에서 자막이 가리키는 부위를 화면에서 직접 키워서 보여주기 위함.
 * (사용자 요청: "허리를 편다 → 허리가 어떻게 펴지는지 허리 부분을 봐야 한다")
 * 순수 함수 — tests/be/logic 단위테스트로 검증한다.
 */

export type StepFocus = {
  /** 마커에 표시할, 사람이 읽는 부위명 */
  part: string;
  /** 정규화 초점 x (0=좌, 1=우). 대부분 0.5(가운데). */
  x: number;
  /** 정규화 초점 y (0=위, 1=아래). 서 있는 전신 사진 기준 부위 높이. */
  y: number;
  /** 확대 배율(1 = 원본). */
  zoom: number;
};

type Region = StepFocus & { keywords: string[] };

/**
 * 부위 사전 — 서 있는 전신 사진 기준 대략적인 세로 위치(y).
 * 한 단계에 여러 부위가 나오면 "문장에서 먼저 등장한" 부위를 주제로 본다(결정적).
 * 키워드는 부분일치(`indexOf`). 더 구체적인 형태("발끝")를 먼저, 짧은 형태("발")는 뒤에.
 */
const REGIONS: Region[] = [
  { part: "시선·목", x: 0.5, y: 0.13, zoom: 1.7, keywords: ["시선", "고개", "뒤통수", "정수리", "머리"] },
  { part: "어깨", x: 0.5, y: 0.24, zoom: 1.65, keywords: ["승모근", "견갑", "어깨", "삼각근", "쇄골", "회전근개", "후면 삼각", "측면 삼각"] },
  { part: "가슴", x: 0.5, y: 0.31, zoom: 1.65, keywords: ["가슴", "대흉근", "흉근"] },
  { part: "등·광배", x: 0.5, y: 0.4, zoom: 1.6, keywords: ["광배", "능형근", "등 평평", "등 펴", "등 가운데", "등을", "어깨뼈", "척추기립", "기립근"] },
  { part: "팔(이두·삼두)", x: 0.5, y: 0.4, zoom: 1.75, keywords: ["이두", "삼두", "상완", "전완", "팔 뒤", "팔 앞"] },
  { part: "팔꿈치", x: 0.5, y: 0.42, zoom: 1.8, keywords: ["팔꿈치", "팔꿉"] },
  { part: "허리·코어", x: 0.5, y: 0.46, zoom: 1.6, keywords: ["허리", "코어", "척추", "복부", "복근", "복직근", "골반 말림"] },
  { part: "손·손목", x: 0.5, y: 0.5, zoom: 1.85, keywords: ["손목", "손바닥", "손가락", "악력", "그립"] },
  { part: "엉덩이", x: 0.5, y: 0.57, zoom: 1.65, keywords: ["엉덩이", "둔근", "고관절", "골반", "힙"] },
  { part: "허벅지", x: 0.5, y: 0.68, zoom: 1.6, keywords: ["허벅지", "대퇴", "햄스트링", "사두", "내전근", "외전근", "모음근"] },
  { part: "무릎", x: 0.5, y: 0.79, zoom: 1.75, keywords: ["무릎", "슬개"] },
  { part: "종아리", x: 0.5, y: 0.86, zoom: 1.75, keywords: ["종아리", "정강이", "비복근", "가자미근", "카프"] },
  { part: "발", x: 0.5, y: 0.93, zoom: 1.85, keywords: ["발끝", "발뒤꿈치", "발바닥", "발 전체", "발판", "발목", "앞꿈치", "발 ", "발을", "발로", "발이", "발"] },
];

/**
 * 한 단계 문구 → 확대 초점. 부위 키워드가 하나도 없으면 null(확대/마커 없이 전체 보기).
 * 여러 부위가 있으면 문장에서 가장 먼저 나온 부위를 고른다.
 */
export function focusForStep(step: string): StepFocus | null {
  if (!step) return null;
  let bestIdx = Infinity;
  let best: Region | null = null;
  for (const r of REGIONS) {
    for (const kw of r.keywords) {
      const idx = step.indexOf(kw);
      if (idx >= 0 && idx < bestIdx) {
        bestIdx = idx;
        best = r;
      }
    }
  }
  if (!best) return null;
  return { part: best.part, x: best.x, y: best.y, zoom: best.zoom };
}