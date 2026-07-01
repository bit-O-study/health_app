/**
 * Claude 비전 응답 텍스트에서 기구 분석 JSON 을 뽑아 검증하는 순수 파서.
 * (모델이 ```json 코드펜스로 감싸거나 앞뒤에 잡소리를 붙여도 안전하게 파싱.)
 */

export type Confidence = "high" | "medium" | "low";

export type VisionExercise = { name: string; description: string };

export type VisionResult = {
  equipmentName: string;
  equipmentNameEn: string;
  confidence: Confidence;
  summary: string;
  muscles: string[];
  exercises: VisionExercise[];
};

function isConfidence(v: unknown): v is Confidence {
  return v === "high" || v === "medium" || v === "low";
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** 텍스트에서 첫 번째 균형 잡힌 { … } 블록을 찾아 JSON.parse. 실패 시 null. */
function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/**
 * 모델 응답을 VisionResult 로 정규화. 파싱 불가/필수값 없음이면 null.
 * (부분 누락은 안전한 기본값으로 채움 — 화면이 '침묵실패' 하지 않게.)
 */
export function parseVisionResult(text: string): VisionResult | null {
  const raw = extractJson(text);
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;

  const equipmentName = str(o.equipmentName);
  if (!equipmentName) return null; // 최소한 기구 이름은 있어야 유효

  const musclesRaw = Array.isArray(o.muscles) ? o.muscles : [];
  const muscles = musclesRaw.map(str).filter(Boolean);

  const exRaw = Array.isArray(o.exercises) ? o.exercises : [];
  const exercises: VisionExercise[] = [];
  for (const e of exRaw) {
    if (!e || typeof e !== "object") continue;
    const name = str((e as Record<string, unknown>).name);
    if (!name) continue;
    exercises.push({
      name,
      description: str((e as Record<string, unknown>).description),
    });
  }

  return {
    equipmentName,
    equipmentNameEn: str(o.equipmentNameEn),
    confidence: isConfidence(o.confidence) ? o.confidence : "medium",
    summary: str(o.summary),
    muscles,
    exercises,
  };
}
