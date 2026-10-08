/**
 * 운동 끝 리포트(라이트, 2026-10-08) — 순수 로직, AI 없음.
 *
 * 오늘 한 운동을 '지난번의 나'와 비교한다. 운동할 때마다 보게 되는 화면이라 990원의
 * '없으면 조금 불편한' 혜택이 된다(라이트 혜자 보고서).
 *  - 오늘 총량(운동 수 · 세트 · 볼륨)과 지난 같은 부위 날 대비 볼륨.
 *  - 종목별 지난번 대비(가장 무거운 세트의 무게·횟수).
 *  - 오늘 신기록(예상 1RM 이 지난 최고를 넘김).
 *  - 이번 주(월~일) 운동한 날.
 */
import { recordOneRM, recordVolume, type ProgressRecord } from "@/features/routine/progress";
import { PR_MIN_GAIN_KG } from "@/features/routine/personal-record";
import { PART_PREFIX, setShare, type PartId, type StimulusOf } from "@/features/routine/fit";

type Top = { kg: number; reps: number };

function topSet(r: ProgressRecord): Top | null {
  const sets = Array.isArray(r.setDetails) && r.setDetails.length > 0
    ? r.setDetails.map((s) => ({ kg: s.weightKg ?? 0, reps: s.reps }))
    : [{ kg: r.weightKg ?? 0, reps: r.reps ?? 0 }];
  let best: Top | null = null;
  for (const s of sets) {
    if (!(s.kg > 0) || !(s.reps > 0)) continue;
    if (!best || s.kg > best.kg || (s.kg === best.kg && s.reps > best.reps)) best = s;
  }
  return best;
}

const setCount = (r: ProgressRecord) =>
  Array.isArray(r.setDetails) && r.setDetails.length > 0 ? r.setDetails.length : Math.max(0, r.sets ?? 0);

/** 그날 가장 많이 한 부위(유효 세트). */
function mainPart(records: readonly ProgressRecord[], stimulusOf: StimulusOf): PartId | null {
  const sum: Partial<Record<PartId, number>> = {};
  for (const r of records) {
    if (!r.exerciseId) continue;
    const n = setCount(r);
    for (const [sub, share] of Object.entries(setShare(stimulusOf(r.exerciseId)))) {
      const part = PART_PREFIX.find((p) => sub.startsWith(`${p}-`));
      if (part) sum[part] = (sum[part] ?? 0) + n * share;
    }
  }
  const best = Object.entries(sum).sort((a, b) => b[1] - a[1])[0];
  return best && best[1] > 0 ? (best[0] as PartId) : null;
}

export type ExerciseCompare = {
  exerciseId: string;
  now: Top;
  prev: Top | null;
  prevDate: string | null;
  /** 그 종목 그날 볼륨(무게 × 횟수 합). */
  nowVolumeKg: number;
  prevVolumeKg: number | null;
  /** 그 종목 그날 예상 최대(1RM). */
  nowOneRmKg: number;
  prevOneRmKg: number | null;
  /** 무게가 늘었거나, 같은 무게로 횟수가 늘었다. */
  better: boolean;
};

export type SessionReport = {
  exercises: number;
  sets: number;
  volumeKg: number;
  mainPart: PartId | null;
  /** 지난번 같은 부위가 주인 날. 없으면 null. */
  lastSamePart: { date: string; volumeKg: number } | null;
  compares: ExerciseCompare[];
  prs: { exerciseId: string; oneRmKg: number; gainKg: number }[];
  weekDays: number;
};

/** 월요일 시작 주의 첫날. */
function weekStart(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  const back = (d.getUTCDay() + 6) % 7;
  return new Date(d.getTime() - back * 86_400_000).toISOString().slice(0, 10);
}

/** 오늘 끝낸 운동이 하나도 없으면 null. records 는 오늘 포함 지난 기록(완료만 쓴다). */
export function sessionReport(records: readonly ProgressRecord[], today: string, stimulusOf: StimulusOf): SessionReport | null {
  const done = records.filter((r) => r.status === "done" && r.exerciseId);
  const todays = done.filter((r) => r.forDate === today);
  if (todays.length === 0) return null;
  const before = done.filter((r) => r.forDate < today);

  const volume = (rs: readonly ProgressRecord[]) => Math.round(rs.reduce((a, r) => a + recordVolume(r), 0));
  const part = mainPart(todays, stimulusOf);

  // 지난 같은 부위 날 — 날짜별로 묶어 최근부터.
  const byDate = new Map<string, ProgressRecord[]>();
  for (const r of before) byDate.set(r.forDate, [...(byDate.get(r.forDate) ?? []), r]);
  let lastSamePart: SessionReport["lastSamePart"] = null;
  if (part) {
    for (const date of [...byDate.keys()].sort().reverse()) {
      const rs = byDate.get(date)!;
      if (mainPart(rs, stimulusOf) === part) {
        lastSamePart = { date, volumeKg: volume(rs) };
        break;
      }
    }
  }

  // 종목별 지난번 — 오늘 가장 무거운 세트 vs 그 종목을 마지막으로 한 날의 가장 무거운 세트.
  const compares: ExerciseCompare[] = [];
  const seen = new Set<string>();
  for (const r of todays) {
    const id = r.exerciseId!;
    if (seen.has(id)) continue;
    seen.add(id);
    const now = todays.filter((x) => x.exerciseId === id).map(topSet).filter((t): t is Top => !!t)
      .sort((a, b) => b.kg - a.kg || b.reps - a.reps)[0];
    if (!now) continue;
    const prevRows = before.filter((x) => x.exerciseId === id && topSet(x));
    const prevDate = prevRows.map((x) => x.forDate).sort().at(-1) ?? null;
    const prev = prevDate
      ? prevRows.filter((x) => x.forDate === prevDate).map(topSet).filter((t): t is Top => !!t).sort((a, b) => b.kg - a.kg || b.reps - a.reps)[0]
      : null;
    const better = !!prev && (now.kg > prev.kg || (now.kg === prev.kg && now.reps > prev.reps));
    const todayRows = todays.filter((x) => x.exerciseId === id);
    const prevRows2 = prevDate ? before.filter((x) => x.exerciseId === id && x.forDate === prevDate) : [];
    const r1 = (n: number) => Math.round(n * 10) / 10;
    compares.push({
      exerciseId: id,
      now,
      prev: prev ?? null,
      prevDate,
      better,
      nowVolumeKg: volume(todayRows),
      prevVolumeKg: prevDate ? volume(prevRows2) : null,
      nowOneRmKg: r1(Math.max(0, ...todayRows.map(recordOneRM))),
      prevOneRmKg: prevDate ? r1(Math.max(0, ...prevRows2.map(recordOneRM))) : null,
    });
  }

  // 오늘 신기록 — 지난 최고 예상 1RM 을 0.5kg 이상 넘긴 종목(처음 한 종목은 신기록이 아니다).
  const prs: SessionReport["prs"] = [];
  for (const id of seen) {
    const prevBest = Math.max(0, ...before.filter((x) => x.exerciseId === id).map(recordOneRM));
    const todayBest = Math.max(0, ...todays.filter((x) => x.exerciseId === id).map(recordOneRM));
    if (prevBest > 0 && todayBest - prevBest >= PR_MIN_GAIN_KG) {
      prs.push({ exerciseId: id, oneRmKg: Math.round(todayBest * 10) / 10, gainKg: Math.round((todayBest - prevBest) * 10) / 10 });
    }
  }

  const ws = weekStart(today);
  const weekDays = new Set(done.filter((r) => r.forDate >= ws && r.forDate <= today).map((r) => r.forDate)).size;

  return {
    exercises: seen.size,
    sets: todays.reduce((a, r) => a + setCount(r), 0),
    volumeKg: volume(todays),
    mainPart: part,
    lastSamePart,
    // 나아진 종목 먼저, 그다음 지난 기록이 있는 종목.
    compares: compares.sort((a, b) => Number(b.better) - Number(a.better) || Number(!!b.prev) - Number(!!a.prev)),
    prs: prs.sort((a, b) => b.gainKg - a.gainKg),
    weekDays,
  };
}

/** "60kg×10" — 같은 무게면 횟수 차이, 아니면 무게 차이 문구. */
export function compareText(c: ExerciseCompare): string {
  if (!c.prev) return "처음 기록";
  if (c.now.kg === c.prev.kg) {
    const d = c.now.reps - c.prev.reps;
    return d === 0 ? "지난번과 같아요" : d > 0 ? `+${d}회` : `${d}회`;
  }
  const d = Math.round((c.now.kg - c.prev.kg) * 10) / 10;
  return d > 0 ? `+${d}kg` : `${d}kg`;
}

