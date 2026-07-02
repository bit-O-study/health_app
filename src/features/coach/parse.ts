/** 헬쑤쌤(AI 코치) 응답 파서 — 순수 로직. 테스트 가능. */

import { isCommitmentMetric } from "@/features/commitments/commitment";

/** 텍스트에서 첫 균형 { … } 블록을 JSON.parse. 코드펜스/잡소리 안전. */
export function extractJsonObject(text: string): unknown {
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

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

export type CoachPoint = { title: string; detail: string };
export type CoachAnalysis = { summary: string; points: CoachPoint[] };

/** { summary, points:[{title,detail}] } 형태로 정규화. summary 필수. */
export function parseCoachAnalysis(text: string): CoachAnalysis | null {
  const raw = extractJsonObject(text);
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const summary = str(o.summary);
  if (!summary) return null;
  const pointsRaw = Array.isArray(o.points) ? o.points : [];
  const points: CoachPoint[] = [];
  for (const p of pointsRaw) {
    if (!p || typeof p !== "object") continue;
    const title = str((p as Record<string, unknown>).title);
    if (!title) continue;
    points.push({ title, detail: str((p as Record<string, unknown>).detail) });
  }
  return { summary, points };
}

export type SuggestedCommitment = {
  title: string;
  metric: string;
  target: number;
  days: number;
};

/** { suggestions:[{title,metric,target,days}] } → 유효한 것만. metric/target/days 검증. */
export function parseCommitmentSuggestions(text: string): SuggestedCommitment[] {
  const raw = extractJsonObject(text);
  if (!raw || typeof raw !== "object") return [];
  const arr = (raw as Record<string, unknown>).suggestions;
  if (!Array.isArray(arr)) return [];
  const out: SuggestedCommitment[] = [];
  for (const s of arr) {
    if (!s || typeof s !== "object") continue;
    const o = s as Record<string, unknown>;
    const title = str(o.title);
    const metric = str(o.metric);
    const target = Math.floor(Number(o.target));
    const days = Math.floor(Number(o.days));
    if (!title || !isCommitmentMetric(metric)) continue;
    if (!Number.isFinite(target) || target <= 0) continue;
    if (!Number.isFinite(days) || days <= 0 || days > 365) continue;
    out.push({ title: title.slice(0, 40), metric, target, days });
  }
  return out;
}
