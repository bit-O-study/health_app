/**
 * 체성분 분석지 OCR 결과 텍스트에서 14개 수치를 추출하는 순수 파서.
 * Tesseract.js 가 인식한 raw text → 부분 폼 값으로 매핑.
 *
 * Tesseract 의 한국어 인식 정확도가 완벽하지 않으므로:
 * - 못 찾은 값은 비워둔다 (추측 금지 → 사용자가 보고 직접 채움)
 * - 키워드의 흔한 오인식까지 대응 (체중↔체증, 체지방률↔체지방를 등)
 */

export type OcrField =
  | "weightKg"
  | "skeletalMuscleKg"
  | "bodyFatKg"
  | "bodyFatPct"
  | "muscleRightArm"
  | "muscleLeftArm"
  | "muscleTrunk"
  | "muscleRightLeg"
  | "muscleLeftLeg"
  | "fatRightArm"
  | "fatLeftArm"
  | "fatTrunk"
  | "fatRightLeg"
  | "fatLeftLeg";

/** "12.3" / "12,3" / "12 . 3" 같은 표기 모두 number 로 */
function toNumber(raw: string): number | null {
  const s = raw.replace(/[,\s]/g, ".").replace(/[^\d.]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * "키워드 ... 숫자[kg|%]" 패턴.
 * 같은 줄 안에서 키워드 뒤 첫 번째 숫자를 가져옴.
 */
function findByKeyword(
  text: string,
  keywords: RegExp,
  opts: { unit?: "kg" | "%"; range?: [number, number] } = {},
): number | null {
  // 키워드부터 줄 끝(또는 \n)까지의 첫 숫자를 캡처
  const re = new RegExp(
    keywords.source + String.raw`[^\d\n]{0,30}(\d{1,3}(?:[.,]\d{1,2})?)`,
    "i",
  );
  const m = text.match(re);
  if (!m) return null;
  const n = toNumber(m[1]);
  if (n === null) return null;
  if (opts.range && (n < opts.range[0] || n > opts.range[1])) return null;
  return n;
}

/**
 * 부위별 표는 보통 "근육량" 섹션과 "체지방" 섹션이 따로 있어
 * 본문을 두 부분으로 나눠 각각 파싱한다.
 */
function splitByHeader(text: string): {
  muscleBlock: string;
  fatBlock: string;
  full: string;
} {
  // "근육량" 또는 "골격근" 이 첫 등장 ~ "체지방" 이 첫 등장 직전까지를 muscleBlock
  const fatIdx = text.search(/체\s*지\s*방(?!률)/);
  const muscleIdx = text.search(/(근육량|골격근|근\s*육)/);
  if (muscleIdx < 0 || fatIdx < 0 || muscleIdx >= fatIdx) {
    return { muscleBlock: text, fatBlock: text, full: text };
  }
  return {
    muscleBlock: text.slice(muscleIdx, fatIdx),
    fatBlock: text.slice(fatIdx),
    full: text,
  };
}

export function parseBodyCompText(rawText: string): Partial<Record<OcrField, number>> {
  const out: Partial<Record<OcrField, number>> = {};
  // 줄 단위 분석을 위해 줄 단위는 그대로 두고 가로 공백만 정규화
  const text = rawText
    .replace(/[ \t]+/g, " ")
    .replace(/[ \t]*\n[ \t]*/g, "\n");
  const blocks = splitByHeader(text);

  // 상단 요약 — 전체 텍스트에서 first match
  const weight = findByKeyword(blocks.full, /체\s*중/, { range: [30, 250] });
  if (weight !== null) out.weightKg = weight;

  const skeletal = findByKeyword(
    blocks.full,
    /(골격근(?:량)?|SMM)/,
    { range: [5, 80] },
  );
  if (skeletal !== null) out.skeletalMuscleKg = skeletal;

  const fatKg = findByKeyword(
    blocks.full,
    /체지방(?:량)?(?!률)/,
    { range: [0, 100] },
  );
  if (fatKg !== null) out.bodyFatKg = fatKg;

  const fatPct = findByKeyword(
    blocks.full,
    /체지방(?:률|율|%)|체지\s*방률|PBF/,
    { range: [1, 70] },
  );
  if (fatPct !== null) out.bodyFatPct = fatPct;

  // 부위별 — 근육 블록에서 5개, 체지방 블록에서 5개
  const SEG: { ocr: OcrField; muscle: boolean; re: RegExp }[] = [
    { ocr: "muscleRightArm", muscle: true, re: /우(?:측)?\s*상지|오른\s*팔|R\s*arm/i },
    { ocr: "muscleLeftArm", muscle: true, re: /좌(?:측)?\s*상지|왼\s*팔|L\s*arm/i },
    { ocr: "muscleTrunk", muscle: true, re: /체\s*간|몸\s*통|trunk/i },
    { ocr: "muscleRightLeg", muscle: true, re: /우(?:측)?\s*하지|오른\s*다리|R\s*leg/i },
    { ocr: "muscleLeftLeg", muscle: true, re: /좌(?:측)?\s*하지|왼\s*다리|L\s*leg/i },
    { ocr: "fatRightArm", muscle: false, re: /우(?:측)?\s*상지|오른\s*팔|R\s*arm/i },
    { ocr: "fatLeftArm", muscle: false, re: /좌(?:측)?\s*상지|왼\s*팔|L\s*arm/i },
    { ocr: "fatTrunk", muscle: false, re: /체\s*간|몸\s*통|trunk/i },
    { ocr: "fatRightLeg", muscle: false, re: /우(?:측)?\s*하지|오른\s*다리|R\s*leg/i },
    { ocr: "fatLeftLeg", muscle: false, re: /좌(?:측)?\s*하지|왼\s*다리|L\s*leg/i },
  ];

  for (const s of SEG) {
    const block = s.muscle ? blocks.muscleBlock : blocks.fatBlock;
    const v = findByKeyword(block, s.re, {
      range: s.muscle ? [0.3, 60] : [0, 60],
    });
    if (v !== null) out[s.ocr] = v;
  }

  return out;
}
