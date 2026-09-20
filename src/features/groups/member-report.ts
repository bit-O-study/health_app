import { recordVolume, type ProgressRecord } from "@/features/routine/progress";
import { parseSetDetails } from "@/features/routine/set-details";

export type ReportPeriod = "week" | "month" | "year";
const ymd = (d: Date) => d.toISOString().slice(0, 10);
export function reportRange(period: ReportPeriod, anchor: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(anchor)) throw new Error("날짜를 확인해 주세요.");
  const date = new Date(`${anchor}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || ymd(date) !== anchor || date.getUTCFullYear() < 1900 || date.getUTCFullYear() > 9998) throw new Error("날짜를 확인해 주세요.");
  const from = new Date(date), to = new Date(date);
  if (period === "week") {
    from.setUTCDate(from.getUTCDate() - (from.getUTCDay() + 6) % 7);
    to.setTime(from.getTime()); to.setUTCDate(to.getUTCDate() + 6);
  } else if (period === "month") {
    from.setUTCDate(1); to.setUTCMonth(to.getUTCMonth() + 1, 0);
  } else {
    from.setUTCMonth(0, 1); to.setUTCMonth(11, 31);
  }
  return { from: ymd(from), to: ymd(to) };
}
export type MemberReportData = {
  sharing: { workout: boolean; diet: boolean; body: boolean; prescription: boolean };
  name: string;
  exercises: MemberExercise[];
  completions: {
    for_date: string; exercise_id: string | null; sets: number | null;
    reps: number | null; weight_kg: number | null; set_details: unknown;
  }[];
  conditioning: { for_date: string }[];
  sessions: { for_date: string; duration_sec: number }[];
  diet: { for_date: string }[];
  weights: { date: string; weight_kg: number }[];
};
export type MemberExercise = {
  id: string; day_index: number | null; focus: string; exercise_id: string;
  equipment: string; sets: number; reps: number; weight_kg: number | null;
  set_details: unknown; updated_at: string;
};
export function summarizeMember(data: MemberReportData, period: ReportPeriod, from: string, to: string) {
  const within = (date: string) => date >= from && date <= to;
  const buckets = new Map<string, { label: string; days: Set<string>; sets: number; volume: number; seconds: number }>();
  for (const day = new Date(`${from}T00:00:00Z`); day.getTime() <= Date.parse(`${to}T00:00:00Z`); day.setUTCDate(day.getUTCDate() + 1)) {
    const key = period === "year" ? ymd(day).slice(0, 7) : ymd(day);
    if (!buckets.has(key)) buckets.set(key, { label: key, days: new Set(), sets: 0, volume: 0, seconds: 0 });
  }
  const bucket = (date: string) => buckets.get(period === "year" ? date.slice(0, 7) : date);
  for (const row of data.completions.filter(r => within(r.for_date))) {
    const b = bucket(row.for_date)!;
    const details = parseSetDetails(row.set_details);
    const record: ProgressRecord = { forDate: row.for_date, exerciseId: row.exercise_id, status: "done", sets: row.sets, reps: row.reps, weightKg: row.weight_kg, setDetails: details };
    b.days.add(row.for_date); b.sets += details?.length || row.sets || 0; b.volume += recordVolume(record);
  }
  for (const row of data.conditioning.filter(r => within(r.for_date))) bucket(row.for_date)!.days.add(row.for_date);
  for (const row of data.sessions.filter(r => within(r.for_date))) bucket(row.for_date)!.seconds += row.duration_sec;
  const series = [...buckets.values()].map(b => ({ label: b.label, workoutDays: b.days.size, sets: b.sets, volume: Math.round(b.volume), minutes: Math.round(b.seconds / 60) }));
  const weights = data.weights.filter(r => within(r.date)).sort((a,b) => a.date.localeCompare(b.date));
  const totals = [...buckets.values()].reduce((a,b) => ({ workoutDays: a.workoutDays + b.days.size, sets: a.sets + b.sets, volume: a.volume + b.volume, seconds: a.seconds + b.seconds }), { workoutDays: 0, sets: 0, volume: 0, seconds: 0 });
  return { ...totals, volume: Math.round(totals.volume), minutes: Math.round(totals.seconds / 60), dietDays: new Set(data.diet.filter(r => within(r.for_date)).map(r => r.for_date)).size, weightDelta: weights.length >= 2 ? Math.round((weights.at(-1)!.weight_kg - weights[0].weight_kg) * 10) / 10 : null, series };
}

export type PrescriptionInput = { exerciseId: string; equipment: string; sets: number; reps: number; weightKg: number | null };
export function validPrescription(input: PrescriptionInput): boolean {
  return !!input && typeof input.exerciseId === "string" && input.exerciseId.length > 0 &&
    typeof input.equipment === "string" && Number.isInteger(input.sets) && input.sets >= 1 && input.sets <= 20 &&
    Number.isInteger(input.reps) && input.reps >= 1 && input.reps <= 100 &&
    (input.weightKg === null || (Number.isFinite(input.weightKg) && input.weightKg >= 0 && input.weightKg <= 9999.9 && Math.abs(input.weightKg * 10 - Math.round(input.weightKg * 10)) < 1e-8));
}

// ─── 오늘만 처방 ──────────────────────────────────────────────────────────────
// 결정(2026-09-20): 처방 축은 **영구 루틴 + 오늘만 둘 다**.
//
// 🔴 원칙 #2 — 오늘만 처방은 회원의 영구 루틴을 건드리지 않는다. 내일이면 원래 루틴이다.
//    (실제 보증은 `trainer_prescribe_today` 가 `daily_plan` 에만 쓰는 것으로 한다.)

/** 오늘 화면에 뜨는 운동 한 줄. `source` 는 그 줄이 어디서 왔는지. */
export type TodayPlanRow = {
  focus: string;
  position: number;
  exercise_id: string;
  equipment: string;
  sets: number;
  reps: number;
  weight_kg: number | null;
  /** daily = 이미 '오늘만' 으로 고정됨, routine = 아직 루틴 그대로. */
  source: "daily" | "routine";
};

export type MemberTodayPlan = {
  date: string;
  /** 루틴 기준 오늘 일차(0~6). 루틴이 없으면 null. */
  dayIndex: number | null;
  /** 회원이 오늘을 휴식으로 바꿨다. */
  rest: boolean;
  /** 회원이 오늘만 부위를 갈아끼웠다(그 선택을 덮어쓰면 안 된다). */
  swapped: boolean;
  rows: TodayPlanRow[];
};

/**
 * 오늘만 처방이 가능한 상태인가 + 안 되면 트레이너에게 보여줄 이유.
 *
 * 🔴 **"버튼은 있는데 눌러도 안 되는" 상태를 만들지 않는다.** 휴식일·부위 교체일은
 *    서버가 거절하므로(`trainer_prescribe_today`), 화면에서도 같은 판정으로 먼저 막고
 *    왜 못 하는지 말해 준다. 두 판정이 어긋나면 트레이너는 원인을 알 수 없다.
 */
export function todayPlanState(plan: MemberTodayPlan | null): {
  editable: boolean;
  notice: string | null;
} {
  if (!plan) return { editable: false, notice: "회원이 운동 처방을 허용하지 않았어요." };
  if (plan.rest)
    return { editable: false, notice: "회원이 오늘을 휴식일로 바꿨어요. 오늘 할 운동이 없어요." };
  if (plan.rows.length === 0)
    return {
      editable: false,
      notice: plan.swapped
        ? "회원이 오늘 부위를 직접 바꿨어요. 회원이 오늘 운동을 담으면 그때 처방할 수 있어요."
        : "오늘 예정된 운동이 없어요.",
    };
  return { editable: true, notice: null };
}

/** 오늘 운동을 부위별로 묶는다(부위 → 줄들, position 순). 화면 표시 순서를 고정한다. */
export function groupTodayRowsByFocus<T extends { focus: string; position: number }>(
  rows: T[],
): { focus: string; rows: T[] }[] {
  const byFocus = new Map<string, T[]>();
  for (const row of rows) {
    const cur = byFocus.get(row.focus);
    if (cur) cur.push(row);
    else byFocus.set(row.focus, [row]);
  }
  return [...byFocus.entries()]
    .map(([focus, list]) => ({
      focus,
      rows: [...list].sort((a, b) => a.position - b.position),
    }))
    .sort((a, b) => a.focus.localeCompare(b.focus));
}

/**
 * 회원에게 남는 처방 코멘트 한 줄 — **영구/오늘만이 서로 다르게 읽혀야 한다.**
 * "오늘만 바꿨는데 루틴이 바뀐 줄 알았다" 가 제일 위험한 오해라서 문장에 축을 박는다.
 */
export function prescriptionNote(
  axis: "routine" | "today",
  exerciseName: string,
  input: PrescriptionInput | null,
): string {
  const where = axis === "today" ? "오늘 운동" : "영구 루틴";
  if (input === null) return `운동 처방: ${where}에서 운동 1개를 삭제했어요.`;
  const weight = input.weightKg === null ? " · 중량 미설정" : ` · ${input.weightKg}kg`;
  return `운동 처방: ${exerciseName} ${input.sets}세트 × ${input.reps}회${weight}로 ${where}을 변경했어요.`;
}
