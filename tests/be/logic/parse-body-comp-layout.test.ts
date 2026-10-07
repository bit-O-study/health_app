import { describe, expect, it } from "vitest";

import { parseBodyCompLayout, type OcrWord } from "@/features/body-composition/parse-body-comp-layout";

/** 글자 한 조각 — 폭은 글자 수로 대충, 높이 20px. */
function w(text: string, x: number, y: number): OcrWord {
  const width = Math.max(12, text.length * 12);
  return { text, left: x, top: y, right: x + width, bottom: y + 20 };
}
/** 한 줄에 단어 여러 개를 왼→오로 [텍스트, x] 로 놓는다. */
function row(y: number, ...items: [string, number][]): OcrWord[] {
  return items.map(([t, x]) => w(t, x, y));
}

/**
 * 인바디 570 결과지 모양을 흉내 낸 배치 — 실제 용지 사진이 없어 구조만 맞췄다.
 * 체중 72.3 · 골격근 32.4 · 체지방 15.2kg(21.0%) · 부위별 근육/지방 각 5개.
 * 함정: 표준범위 괄호, 그래프 눈금(정수), 과거 기록 줄, 적정체중·체중조절.
 */
function inbody570(): OcrWord[] {
  return [
    ...row(100, ["체성분분석", 40], ["Body", 200], ["Composition", 260], ["Analysis", 400]),
    ...row(150, ["체수분", 40], ["Total", 120], ["Body", 190], ["Water", 250], ["(L)", 320], ["37.5", 400], ["(35.6~43.6)", 470]),
    ...row(180, ["단백질", 40], ["Protein", 120], ["(kg)", 320], ["10.1", 400], ["(9.5~11.7)", 470]),
    ...row(210, ["무기질", 40], ["Minerals", 120], ["(kg)", 320], ["3.52", 400], ["(3.29~4.03)", 470]),
    ...row(240, ["체지방량", 40], ["Body", 120], ["Fat", 180], ["Mass", 230], ["(kg)", 320], ["15.2", 400], ["(8.3~16.6)", 470]),
    ...row(270, ["체중", 40], ["Weight", 120], ["(kg)", 320], ["72.3", 400], ["(55.0~74.4)", 470]),

    ...row(300, ["골격근·지방분석", 40], ["Muscle-Fat", 240], ["Analysis", 380]),
    ...row(330, ["55", 300], ["70", 360], ["85", 420], ["100", 480], ["115", 540], ["130", 600], ["%", 660]),
    ...row(360, ["체중", 40], ["Weight", 120], ["(kg)", 220], ["72.3", 640]),
    ...row(400, ["골격근량", 40], ["SMM", 140], ["(kg)", 220], ["32.4", 560]),
    ...row(440, ["체지방량", 40], ["Body", 120], ["Fat", 180], ["Mass", 230], ["(kg)", 290], ["15.2", 700]),

    ...row(500, ["비만분석", 40], ["Obesity", 160], ["Analysis", 260]),
    ...row(530, ["BMI", 40], ["(kg/m²)", 120], ["23.6", 500]),
    ...row(560, ["체지방률", 40], ["PBF", 140], ["(%)", 220], ["21.0", 520]),

    // 부위별 근육(왼쪽 칸) — 몸 그림 둘레에 이름, 그 아래 kg, 그 아래 %.
    ...row(650, ["부위별근육분석", 40], ["부위별체지방분석", 600]),
    ...row(700, ["오른팔", 60], ["왼팔", 300], ["오른팔", 620], ["왼팔", 860]),
    ...row(725, ["3.21kg", 60], ["3.18kg", 300], ["0.9kg", 620], ["1.0kg", 860]),
    ...row(750, ["102.3%", 60], ["101.0%", 300], ["150.2%", 620], ["160.1%", 860]),
    ...row(780, ["몸통", 180], ["몸통", 740]),
    ...row(805, ["25.4kg", 180], ["7.8kg", 740]),
    ...row(830, ["99.8%", 180], ["180.4%", 740]),
    ...row(860, ["오른다리", 60], ["왼다리", 300], ["오른다리", 620], ["왼다리", 860]),
    ...row(885, ["8.90kg", 60], ["8.85", 300], ["kg", 360], ["2.4kg", 620], ["2.5kg", 860]),
    ...row(910, ["97.2%", 60], ["96.9%", 300], ["120.3%", 620], ["121.0%", 860]),

    // 과거 기록 — 같은 줄에 숫자 여러 개.
    ...row(950, ["체성분변화", 40], ["Body", 200], ["Composition", 260], ["History", 400]),
    ...row(1000, ["체중", 40], ["Weight", 120], ["74.1", 300], ["73.5", 400], ["70.8", 500]),
    ...row(1030, ["골격근량", 40], ["SMM", 140], ["31.8", 300], ["32.0", 400], ["30.1", 500]),

    ...row(1100, ["체중조절", 40], ["Weight", 160], ["Control", 240]),
    ...row(1130, ["적정체중", 40], ["68.5", 300], ["kg", 360]),
    ...row(1160, ["체중조절", 40], ["-3.8", 300], ["kg", 360]),
  ];
}

const FULL = {
  weightKg: 72.3,
  skeletalMuscleKg: 32.4,
  bodyFatKg: 15.2,
  bodyFatPct: 21.0,
  muscleRightArm: 3.21,
  muscleLeftArm: 3.18,
  muscleTrunk: 25.4,
  muscleRightLeg: 8.9,
  muscleLeftLeg: 8.85,
  fatRightArm: 0.9,
  fatLeftArm: 1.0,
  fatTrunk: 7.8,
  fatRightLeg: 2.4,
  fatLeftLeg: 2.5,
};

/** 사진을 deg 도 기울여 찍었을 때의 좌표. ML Kit 처럼 각 단어에 그 기울기를 붙인다. */
function tilt(words: OcrWord[], deg: number): OcrWord[] {
  const r = (deg * Math.PI) / 180;
  return words.map((o) => {
    const cx = (o.left + o.right) / 2;
    const cy = (o.top + o.bottom) / 2;
    const x = cx * Math.cos(r) - cy * Math.sin(r);
    const y = cx * Math.sin(r) + cy * Math.cos(r);
    const hw = (o.right - o.left) / 2;
    const hh = (o.bottom - o.top) / 2;
    return { text: o.text, left: x - hw, right: x + hw, top: y - hh, bottom: y + hh, angle: deg };
  });
}

describe("parseBodyCompLayout — 폰 안 글자 인식 결과를 위치로 짝짓기", () => {
  it("인바디 570 배치에서 14개를 모두 읽는다(표준범위·눈금·과거 기록·적정체중은 무시)", () => {
    expect(parseBodyCompLayout(inbody570())).toEqual(FULL);
  });

  it("사진이 4도 기울어도 같은 값 — 기울기 부호가 반대로 와도", () => {
    expect(parseBodyCompLayout(tilt(inbody570(), 4))).toEqual(FULL);
    const flipped = tilt(inbody570(), 4).map((o) => ({ ...o, angle: -4 }));
    expect(parseBodyCompLayout(flipped)).toEqual(FULL);
  });

  it("단어 순서가 섞여 와도(ML Kit 블록 순서) 같은 값", () => {
    const words = inbody570();
    const shuffled = words.map((o, i) => ({ o, k: (i * 7919) % words.length })).sort((a, b) => a.k - b.k).map((x) => x.o);
    expect(parseBodyCompLayout(shuffled)).toEqual(FULL);
  });

  it("인바디 270처럼 부위별이 판정(표준)뿐이면 부위별은 비운다", () => {
    const words = [
      ...row(100, ["체중", 40], ["Weight", 120], ["(kg)", 220], ["68.0", 400]),
      ...row(140, ["골격근량", 40], ["SMM", 140], ["(kg)", 220], ["29.9", 400]),
      ...row(300, ["부위별근육분석", 40]),
      ...row(350, ["오른팔", 60], ["표준", 60 + 80], ["왼팔", 300], ["표준", 380]),
      ...row(400, ["몸통", 180], ["표준이상", 260]),
    ];
    expect(parseBodyCompLayout(words)).toEqual({ weightKg: 68.0, skeletalMuscleKg: 29.9 });
  });

  it("소수점 없는 숫자·괄호 범위·Weight Control 은 체중으로 잡지 않는다", () => {
    const words = [
      ...row(100, ["Weight", 40], ["Control", 120], ["68.5", 300]),
      ...row(140, ["적정체중", 40], ["66.2", 300]),
      ...row(180, ["체중", 40], ["(kg)", 120], ["(55.0~74.4)", 300], ["70", 500]),
    ];
    expect(parseBodyCompLayout(words)).toEqual({});
  });

  it("과거 기록 줄(숫자 3개 이상)만 있으면 비운다", () => {
    const words = row(100, ["체중", 40], ["74.1", 200], ["73.5", 300], ["72.3", 400]);
    expect(parseBodyCompLayout(words)).toEqual({});
  });

  it("체지방량이 체중보다 크면 체지방량을 버린다", () => {
    const words = [
      ...row(100, ["체중", 40], ["62.0", 300]),
      ...row(140, ["체지방량", 40], ["82.0", 300]),
    ];
    expect(parseBodyCompLayout(words)).toEqual({ weightKg: 62.0 });
  });

  it("글자가 없으면 빈 결과", () => {
    expect(parseBodyCompLayout([])).toEqual({});
  });
});
