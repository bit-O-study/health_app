/**
 * 보관된 AI 분석의 모양과 표기 — 로드맵 7.1. 순수 모듈(DB·서버 의존 없음).
 *
 * DB 에서 온 값을 화면이 그대로 믿지 않게 여기서 한 번 거른다. 분석 본문은 **AI 가 쓴
 * 글**이라 형식이 어긋난 채로 저장돼 있을 수 있고(옛 파서·중간에 바뀐 프롬프트),
 * 그걸 화면이 그대로 펼치면 목록이 통째로 깨진다.
 */

import type { CoachAnalysis, CoachPoint } from "@/features/coach/parse";

/** 저장하는 분석 종류. 사용량 한도의 기능 id 와는 별개다(코치 분석이 두 종류라서). */
export type AnalysisKind = "workout" | "diet" | "posture";

export const ANALYSIS_KINDS: readonly AnalysisKind[] = [
  "workout",
  "diet",
  "posture",
] as const;

export function isAnalysisKind(v: unknown): v is AnalysisKind {
  return typeof v === "string" && (ANALYSIS_KINDS as readonly string[]).includes(v);
}

/**
 * 종류별로 남겨 둘 개수.
 *
 * 하나만 남기면 "지난번이랑 뭐가 달라졌지" 를 볼 수 없고, 무한히 쌓으면 쓰지도 않는
 * 글이 계속 는다. 몇 달치 흐름을 보기엔 10개면 충분하다.
 */
export const ANALYSIS_KEEP_PER_KIND = 10;

export type StoredAnalysis = CoachAnalysis & {
  /** 분석한 대상(자세 분석의 운동 이름 등). 없으면 null. */
  subject: string | null;
  /** 저장 시각(ISO). */
  createdAt: string;
};

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** DB 행 → 화면값. 쓸 수 없는 행이면 null(빈 카드를 만들지 않는다). */
export function toStoredAnalysis(row: {
  summary: unknown;
  points: unknown;
  subject: unknown;
  createdAt: unknown;
}): StoredAnalysis | null {
  const summary = str(row.summary);
  if (!summary) return null;
  const createdAt = str(row.createdAt) || toIso(row.createdAt);
  if (!createdAt) return null;

  const points: CoachPoint[] = Array.isArray(row.points)
    ? (row.points as unknown[])
        .map((p) => {
          const o = (p ?? {}) as { title?: unknown; detail?: unknown };
          return { title: str(o.title), detail: str(o.detail) };
        })
        // 제목이 없는 항목은 화면에서 빈 줄이 된다.
        .filter((p) => p.title.length > 0)
    : [];

  const subject = str(row.subject);
  return { summary, points, subject: subject || null, createdAt };
}

function toIso(v: unknown): string {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? "" : v.toISOString();
  return "";
}

/**
 * "언제 분석한 것인가" 표기 — **서울 날짜**로.
 *
 * 상대 시각("3일 전")을 쓰지 않는 이유: 분석은 며칠~몇 주 간격으로 다시 보는 것이라
 * 날짜가 더 또렷하다. 오늘 것만 '오늘' 이라고 적어 방금 받은 결과임을 알린다.
 */
export function analysisDateLabel(
  createdAt: string,
  now: Date = new Date(),
): string {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "";
  const fmt = (t: Date) =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(t);
  const ymd = fmt(d);
  if (ymd === fmt(now)) return "오늘 분석";
  const [, m, day] = ymd.split("-");
  return `${Number(m)}월 ${Number(day)}일 분석`;
}
