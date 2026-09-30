/**
 * AI 트레이너 — 오늘의 운동(2026-09-30 2단계, `docs/ai-trainer-plans-2026-09-30.html`).
 *
 * 순수 모듈. 후보 운동 목록 만들기 · AI 에 보낼 글 · AI 답 읽기와 검사.
 *
 * 🔴 사용자 결정: **AI 가 운동을 직접 바꾸지 않는다.** AI 트레이너 탭에 오늘의 운동을 보여 주고,
 *    사용자가 [적용]을 누를 때만 '오늘만 운동 변경'(daily_plan)으로 넘긴다. 영구 루틴은 그대로(원칙 2).
 * 🔴 AI 는 **후보 목록 안에서만** 고른다. 후보는 오늘만 운동 변경에서 고를 수 있는 부위(원칙 1)의
 *    카탈로그 운동 중 내 헬스장에서 할 수 있는 것. 목록 밖 운동·지어낸 이름은 버린다.
 * 🔴 무게·세트·횟수는 AI 가 정하지 않는다 — 적용할 때 기존 처방(`prescribe`)이 내 기록으로 채운다.
 */
import type { BodyPart } from "@/features/routine/exercise-catalog-labels";
import { BODY_PART_LABEL } from "@/features/routine/exercise-catalog-labels";
import type { EquipmentId } from "@/features/routine/exercise-catalog-labels";

export const TRAINER_PARTS: readonly BodyPart[] = ["chest", "back", "shoulder", "arm", "lower", "core"];

/** 부위당 후보 수 — 많으면 AI 입력(=비용)이 커지고, 적으면 고를 게 없다. */
export const CANDIDATES_PER_PART = 8;
export const PLAN_MIN = 2;
export const PLAN_MAX = 6;
export const REASON_MAX = 60;

export type Candidate = {
  exerciseId: string;
  name: string;
  part: BodyPart;
  equipment: EquipmentId;
};

export type TodayPlanItem = {
  exerciseId: string;
  name: string;
  part: BodyPart;
  equipment: EquipmentId;
  /** 왜 이 운동인지(한 줄). */
  reason: string;
};

export type TodayPlan = {
  /** 오늘 운동 방향 2~3문장. */
  summary: string;
  items: TodayPlanItem[];
  /** 한 줄 팁(없으면 빈 문자열). */
  tip: string;
};

/**
 * 후보 목록 — 부위별 카탈로그(이미 헬스장 기구로 거른 목록)를 받아 부위당 N개씩, 중복 없이.
 * 아픈 부위가 있으면 그 부위는 통째로 뺀다(무료 '아픈 부위 빼기'와 같은 규칙).
 */
export function buildCandidates(
  byPart: Partial<Record<BodyPart, readonly { id: string; name: string; equipment: EquipmentId }[]>>,
  painAreas: readonly BodyPart[] = [],
): Candidate[] {
  const seen = new Set<string>();
  const out: Candidate[] = [];
  for (const part of TRAINER_PARTS) {
    if (painAreas.includes(part)) continue;
    let n = 0;
    for (const ex of byPart[part] ?? []) {
      if (n >= CANDIDATES_PER_PART) break;
      if (seen.has(ex.id)) continue;
      seen.add(ex.id);
      out.push({ exerciseId: ex.id, name: ex.name, part, equipment: ex.equipment });
      n += 1;
    }
  }
  return out;
}

export const TRAINER_SYSTEM = [
  "너는 헬스 트레이너 '짐꾼쌤'이다. 회원의 최근 상태 숫자를 보고 **오늘 하루** 할 운동을 짠다.",
  "규칙:",
  "- 운동은 반드시 아래 '고를 수 있는 운동' 목록의 id 로만 고른다. 목록에 없는 운동은 쓰지 않는다.",
  `- ${PLAN_MIN}~${PLAN_MAX - 1}개. 부족한 부위(부족·안 함)를 먼저, 무게가 멈춘 종목은 다른 자극으로 바꿔 준다.`,
  "- 최근에 많이 한 부위(많음)는 쉬게 한다. 무게·세트·횟수는 쓰지 않는다(앱이 정한다).",
  "- reason 은 회원 숫자를 근거로 한 줄(30자 안팎), 한국어 존댓말.",
  "- 의학적 진단·치료 조언은 하지 않는다.",
  '반드시 JSON 객체 하나만 출력(설명·코드펜스 없이): {"summary":"2~3문장","items":[{"id":"운동 id","reason":"한 줄"}],"tip":"한 줄 팁"}',
].join("\n");

export function buildTrainerUserText(stateLines: readonly string[], candidates: readonly Candidate[]): string {
  const list = TRAINER_PARTS.map((part) => {
    const xs = candidates.filter((c) => c.part === part);
    return xs.length ? `${BODY_PART_LABEL[part]}: ${xs.map((c) => `${c.exerciseId}(${c.name})`).join(", ")}` : null;
  })
    .filter(Boolean)
    .join("\n");
  return `회원 상태:\n${stateLines.length ? stateLines.join("\n") : "기록이 거의 없음"}\n\n고를 수 있는 운동:\n${list}`;
}

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

const clip = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/**
 * AI 답 → 오늘의 운동. 후보에 없는 id·중복은 버리고, 남은 게 PLAN_MIN 개보다 적으면 null
 * (그 정도면 AI 가 규칙을 안 지킨 것이라 믿지 않는다). 최대 PLAN_MAX 개.
 */
export function parseTodayPlan(text: string, candidates: readonly Candidate[]): TodayPlan | null {
  const raw = extractJson(text) as { summary?: unknown; items?: unknown; tip?: unknown } | null;
  if (!raw || !Array.isArray(raw.items)) return null;
  const byId = new Map(candidates.map((c) => [c.exerciseId, c]));
  const items: TodayPlanItem[] = [];
  const seen = new Set<string>();
  for (const it of raw.items as { id?: unknown; reason?: unknown }[]) {
    const id = typeof it?.id === "string" ? it.id.trim() : "";
    const c = byId.get(id);
    if (!c || seen.has(id)) continue;
    seen.add(id);
    items.push({ ...c, reason: clip(it.reason, REASON_MAX) });
    if (items.length >= PLAN_MAX) break;
  }
  if (items.length < PLAN_MIN) return null;
  return { summary: clip(raw.summary, 300), items, tip: clip(raw.tip, 100) };
}

/** 기기 보관 키 — 하루 한 번 만든 제안을 다시 열 때 AI 를 또 부르지 않게. 사람별·날짜별. */
export function todayPlanStorageKey(userId: string, ymd: string): string {
  return `jimkkun.ai-trainer.${userId}.${ymd}`;
}

/** 기기에 보관한 값 읽기 — 형식이 틀리면 null(옛 형식·손댄 값). */
export function readStoredPlan(raw: string | null): TodayPlan | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as TodayPlan;
    if (!v || typeof v.summary !== "string" || !Array.isArray(v.items)) return null;
    const items = v.items.filter(
      (i) => i && typeof i.exerciseId === "string" && typeof i.name === "string" && typeof i.equipment === "string",
    );
    return items.length ? { summary: v.summary, items, tip: typeof v.tip === "string" ? v.tip : "" } : null;
  } catch {
    return null;
  }
}
