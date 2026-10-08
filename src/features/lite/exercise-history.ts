/**
 * 종목별 기록 찾기(라이트, 2026-10-08) — 순수 로직.
 * "지난달 데드리프트 몇 kg였지?"를 바로 찾게, 한 종목의 날짜별 기록과 최고 기록을 돌려준다.
 */
import { recordOneRM, recordVolume, type ProgressRecord } from "@/features/routine/progress";

export type ExerciseIndexRow = { exerciseId: string; sessions: number; lastDate: string; bestKg: number | null };

/** 한 기록의 가장 무거운 세트. */
function topSet(r: ProgressRecord): { kg: number; reps: number } | null {
  const sets = Array.isArray(r.setDetails) && r.setDetails.length > 0
    ? r.setDetails.map((s) => ({ kg: s.weightKg ?? 0, reps: s.reps }))
    : [{ kg: r.weightKg ?? 0, reps: r.reps ?? 0 }];
  let best: { kg: number; reps: number } | null = null;
  for (const s of sets) {
    if (!(s.kg > 0)) continue;
    if (!best || s.kg > best.kg || (s.kg === best.kg && s.reps > best.reps)) best = s;
  }
  return best;
}

/** 한 번이라도 한 종목 목록 — 최근에 한 순. 이름 거르기는 부르는 쪽이 한다(이름표가 화면에 있다). */
export function exerciseIndex(records: readonly ProgressRecord[]): ExerciseIndexRow[] {
  const map = new Map<string, { dates: Set<string>; lastDate: string; bestKg: number | null }>();
  for (const r of records) {
    if (r.status !== "done" || !r.exerciseId) continue;
    const row = map.get(r.exerciseId) ?? { dates: new Set<string>(), lastDate: r.forDate, bestKg: null };
    row.dates.add(r.forDate);
    if (r.forDate > row.lastDate) row.lastDate = r.forDate;
    const top = topSet(r);
    if (top && (row.bestKg === null || top.kg > row.bestKg)) row.bestKg = top.kg;
    map.set(r.exerciseId, row);
  }
  return [...map].map(([exerciseId, v]) => ({ exerciseId, sessions: v.dates.size, lastDate: v.lastDate, bestKg: v.bestKg }))
    .sort((a, b) => b.lastDate.localeCompare(a.lastDate) || b.sessions - a.sessions);
}

export type SessionRow = {
  date: string;
  sets: number;
  /** 가장 무거운 세트(무게 기록이 없으면 null). */
  top: { kg: number; reps: number } | null;
  /** 세트 그대로 — "60×10 · 60×8 · 55×10". 세트별 기록이 없으면 "4세트 × 10회 · 60kg". */
  detail: string;
  volumeKg: number;
  oneRmKg: number;
  /** 그날이 그때까지의 최고(예상 1RM)였나. */
  pr: boolean;
};

const kg = (n: number | null) => (n == null ? "" : `${Math.round(n * 10) / 10}`);

export type SessionSummary = {
  /** 처음 한 날 예상 최대. */
  firstOneRmKg: number;
  /** 최근 3번 평균 예상 최대(한 번의 컨디션에 흔들리지 않게). */
  recentOneRmKg: number;
  /** 첫 기록 대비 변화(kg). */
  changeKg: number;
  /** 평균 몇 일마다 했나. */
  everyDays: number | null;
};

/** 종목 요약 — 첫 기록 → 최근 3번 평균, 하는 간격. 무게 기록이 없으면 null. sessions 는 최근 순. */
export function sessionSummary(sessions: readonly SessionRow[]): SessionSummary | null {
  const asc = [...sessions].filter((s) => s.oneRmKg > 0).reverse();
  if (asc.length === 0) return null;
  const recent3 = asc.slice(-3);
  const recent = Math.round((recent3.reduce((a, s) => a + s.oneRmKg, 0) / recent3.length) * 10) / 10;
  const span = asc.length > 1 ? (Date.parse(`${asc[asc.length - 1].date}T00:00:00Z`) - Date.parse(`${asc[0].date}T00:00:00Z`)) / 86_400_000 : null;
  return {
    firstOneRmKg: asc[0].oneRmKg,
    recentOneRmKg: recent,
    changeKg: Math.round((recent - asc[0].oneRmKg) * 10) / 10,
    everyDays: span !== null ? Math.round((span / (asc.length - 1)) * 10) / 10 : null,
  };
}

/** 한 종목의 날짜별 기록 — 최근 순. 같은 날 여러 줄이면 합친다. */
export function exerciseSessions(records: readonly ProgressRecord[], exerciseId: string): SessionRow[] {
  const byDate = new Map<string, ProgressRecord[]>();
  for (const r of records) {
    if (r.status !== "done" || r.exerciseId !== exerciseId) continue;
    byDate.set(r.forDate, [...(byDate.get(r.forDate) ?? []), r]);
  }
  const asc = [...byDate.keys()].sort();
  let best = 0;
  const out: SessionRow[] = [];
  for (const date of asc) {
    const rs = byDate.get(date)!;
    const tops = rs.map(topSet).filter((t): t is { kg: number; reps: number } => !!t);
    const top = tops.sort((a, b) => b.kg - a.kg || b.reps - a.reps)[0] ?? null;
    const oneRm = Math.max(0, ...rs.map(recordOneRM));
    const detail = rs.map((r) =>
      Array.isArray(r.setDetails) && r.setDetails.length > 0
        ? r.setDetails.map((s) => (s.weightKg ? `${kg(s.weightKg)}×${s.reps}` : `${s.reps}회`)).join(" · ")
        : `${r.sets ?? 0}세트 × ${r.reps ?? 0}회${r.weightKg ? ` · ${kg(r.weightKg)}kg` : ""}`,
    ).join(" / ");
    const sets = rs.reduce((a, r) => a + (Array.isArray(r.setDetails) && r.setDetails.length ? r.setDetails.length : Math.max(0, r.sets ?? 0)), 0);
    const pr = oneRm > 0 && best > 0 && oneRm > best;
    if (oneRm > best) best = oneRm;
    out.push({ date, sets, top, detail, volumeKg: Math.round(rs.reduce((a, r) => a + recordVolume(r), 0)), oneRmKg: Math.round(oneRm * 10) / 10, pr });
  }
  return out.reverse();
}
