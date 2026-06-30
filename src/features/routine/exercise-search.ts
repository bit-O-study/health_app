/**
 * 운동 찾기 — 로컬 키워드/동의어 검색(AI 없이). 자연어 묘사("덤벨 쓰고 머리 뒤로
 * 왔다갔다 하는 운동")에서 키워드를 뽑아 카탈로그의 이름·자극부위·기구·동의어와 매칭.
 */

import {
  ALL_EXERCISES,
  EQUIPMENT_LABELS,
} from "@/features/routine/exercise-catalog";

/**
 * 동작/자세/부위 묘사 동의어 — 이름/자극부위/기구만으로 안 잡히는 자연어를 연결.
 * (이름·target·기구 라벨은 자동 포함되므로 여기엔 '묘사' 위주로만 보강.)
 */
export const EXERCISE_KEYWORDS: Record<string, string[]> = {
  "overhead-triceps-extension": [
    "머리 뒤", "머리뒤", "머리 위", "머리위", "뒤로", "팔 뒤", "팔뒤",
    "프렌치프레스", "프렌치 프레스", "익스텐션", "위로 폈다",
  ],
  "skull-crusher": ["누워서", "이마", "이마쪽", "머리쪽", "스컬", "라잉"],
  "triceps-pushdown": ["케이블", "밀어내리", "아래로", "푸쉬다운", "줄"],
  "lateral-raise": ["옆으로", "양옆", "팔 옆", "어깨 옆", "측면", "벌려"],
  "front-raise": ["앞으로", "팔 앞", "정면", "들어올려"],
  "rear-delt-fly": ["뒤쪽 어깨", "후면 어깨", "숙여서", "벌려", "리어"],
  "ohp": ["머리 위로", "위로 밀어", "어깨로 밀어", "프레스", "숄더프레스", "숄더 프레스"],
  "arnold-press": ["돌리면서", "회전", "비틀어", "아놀드"],
  "lat-pulldown": ["위에서 당겨", "랫풀", "넓은등", "광배", "당기는"],
  "pull-up": ["매달려", "철봉", "턱걸이", "몸 들어"],
  "chin-up": ["매달려", "철봉", "언더그립", "턱걸이"],
  "seated-cable-row": ["앉아서 당겨", "로우", "노젓기", "당기는"],
  "barbell-row": ["숙여서 당겨", "로우", "당기는", "노젓기"],
  "deadlift": ["바닥에서 들어", "들어올려", "데드"],
  "rdl": ["엉덩이 빼고", "힌지", "햄스트링", "루마니안"],
  "bench-press": ["누워서 밀어", "가슴 밀어", "벤치"],
  "incline-press": ["기울여", "상부 가슴", "윗가슴", "인클라인"],
  "chest-fly": ["가슴 모아", "벌렸다 모아", "플라이", "안아주는"],
  "cable-crossover": ["케이블", "교차", "모아주는", "크로스"],
  "dips": ["몸 내려", "평행봉", "딥스", "밀어 올려"],
  "push-up": ["엎드려", "팔굽혀펴기", "푸쉬업", "맨몸"],
  "squat": ["앉았다 일어", "스쿼트", "하체", "다리"],
  "leg-press": ["발판 밀어", "기계 다리", "앉아서 밀어"],
  "leg-extension": ["앉아서 다리 펴", "무릎 펴", "앞벅지", "대퇴사두"],
  "leg-curl": ["다리 접어", "무릎 굽혀", "뒷벅지", "햄스트링", "엎드려 다리"],
  "lunge": ["한발 앞으로", "런지", "내딛어"],
  "hip-thrust": ["엉덩이 들어", "골반 들어", "둔근", "엉덩이"],
  "calf-raise": ["까치발", "발뒤꿈치", "종아리"],
  "standing-calf-raise": ["까치발", "발뒤꿈치", "종아리", "서서"],
  "biceps-curl": ["팔 굽혀", "이두", "알통", "말아 올려", "컬"],
  "hammer-curl": ["세로로 잡고", "망치", "해머", "이두"],
  "preacher-curl": ["팔 고정", "프리처", "기대고 컬"],
  "shrug": ["으쓱", "승모근", "어깨 들썩"],
  "plank": ["버티기", "코어", "엎드려 버텨", "플랭크"],
  "hanging-leg-raise": ["매달려 다리", "복근", "다리 들어"],
  "cable-crunch": ["케이블 복근", "윗몸", "복근 말아"],
  "russian-twist": ["좌우 비틀", "옆구리", "트위스트"],
};

const STOPWORDS = new Set([
  "운동", "있는데", "있는", "있어", "하는", "해주는", "쓰고", "쓰는", "쓰면",
  "좀", "그", "이런", "저런", "머지", "뭐지", "뭐야", "뭐", "어떤", "거", "것",
  "왔다갔다", "하고", "그리고", "할", "때", "이거", "그거", "예를", "들어",
  "찾아줘", "찾아", "알려줘", "추천", "해줘", "처럼", "같은", "같이",
]);

const PARTICLES = ["으로", "로", "을", "를", "이가", "이", "가", "은", "는", "에서", "에", "의", "와", "과", "도", "랑", "이랑"];

function stripParticle(t: string): string {
  for (const p of PARTICLES) {
    if (t.length > p.length + 1 && t.endsWith(p)) return t.slice(0, -p.length);
  }
  return t;
}

/** 질의를 검색 토큰으로 — 소문자화, 기호 제거, 조사/불용어 제거. */
export function tokenize(query: string): string[] {
  return (query ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map(stripParticle)
    .filter((t) => t.length >= 1 && !STOPWORDS.has(t));
}

type Indexed = {
  id: string;
  name: string;
  target: string;
  text: string;
  // 공백 무시 매칭용(예: '싱글레그컬' ↔ '싱글 레그 컬').
  textNoSpace: string;
  nameNoSpace: string;
};

function buildIndex(): Indexed[] {
  return ALL_EXERCISES.map((ex) => {
    const equip = ex.equipments
      .map((e) => EQUIPMENT_LABELS[e.equipment])
      .join(" ");
    const kw = (EXERCISE_KEYWORDS[ex.id] ?? []).join(" ");
    const text = `${ex.name} ${ex.target} ${equip} ${kw}`.toLowerCase();
    return {
      id: ex.id,
      name: ex.name,
      target: ex.target,
      text,
      textNoSpace: text.replace(/\s+/g, ""),
      nameNoSpace: ex.name.toLowerCase().replace(/\s+/g, ""),
    };
  });
}

export type SearchHit = {
  id: string;
  name: string;
  target: string;
  score: number;
};

/**
 * 키워드 매칭 검색. 토큰이 운동의 검색텍스트(이름·부위·기구·동의어)에 포함되면 가점,
 * 이름에 들어가면 가중. 점수>0 인 상위 limit 개 반환.
 */
export function searchExercises(
  query: string,
  limit = 5,
  index: Indexed[] = buildIndex(),
): SearchHit[] {
  const tokens = [...new Set(tokenize(query))];
  if (tokens.length === 0) return [];
  const hits: SearchHit[] = [];
  for (const it of index) {
    let score = 0;
    for (const tok of tokens) {
      const tokNo = tok.replace(/\s+/g, "");
      // 공백 있/없 양쪽으로 매칭 — '싱글레그컬'(붙여) 도 '싱글 레그 컬' 을 찾게.
      const inText = it.text.includes(tok) || it.textNoSpace.includes(tokNo);
      if (inText) {
        const inName =
          it.name.toLowerCase().includes(tok) || it.nameNoSpace.includes(tokNo);
        score += inName ? 2 : 1;
      }
    }
    if (score > 0) hits.push({ id: it.id, name: it.name, target: it.target, score });
  }
  hits.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return hits.slice(0, limit);
}
