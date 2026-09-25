import { describe, it, expect } from "vitest";
import { groupTodayRowsByFocus, prescriptionNote, reportRange, summarizeMember, todayPlanState, validPrescription, type MemberReportData, type MemberTodayPlan, type TodayPlanRow } from "@/features/trainer/member-report";

const empty = (): MemberReportData => ({ sharing: { workout: true, diet: true, body: true, prescription: true }, name: "회원", exercises: [], completions: [], conditioning: [], sessions: [], diet: [], weights: [] });
describe("회원 통계 기간", () => {
  it("월요일부터 일요일까지, 연도를 넘는 주", () => expect(reportRange("week", "2027-01-01")).toEqual({ from: "2026-12-28", to: "2027-01-03" }));
  it("일요일도 같은 주", () => expect(reportRange("week", "2026-09-20")).toEqual({ from: "2026-09-14", to: "2026-09-20" }));
  it("윤년의 한 달", () => expect(reportRange("month", "2028-02-29")).toEqual({ from: "2028-02-01", to: "2028-02-29" }));
  it("연간은 1월 1일부터 12월 31일", () => expect(reportRange("year", "2026-09-20")).toEqual({ from: "2026-01-01", to: "2026-12-31" }));
  it.each(["bad", "2026-02-29", "2026-13-01", "2026-9-1", "0000-01-01", "9999-12-31"])("잘못된 날짜 %s 거절", date => expect(() => reportRange("week", date)).toThrow());
});
describe("회원 통계 집계", () => {
  it("빈 주는 7일의 0값과 체중 부족을 표시", () => {
    const result = summarizeMember(empty(), "week", "2026-09-14", "2026-09-20");
    expect(result.workoutDays).toBe(0); expect(result.series).toHaveLength(7); expect(result.weightDelta).toBeNull();
  });
  it("근력·컨디셔닝의 같은 날을 한 번만 집계하고 기간 밖 기록 제외", () => {
    const data = empty();
    data.completions = ["2026-09-14", "2026-09-14", "2026-09-13"].map(for_date => ({ for_date, exercise_id: "squat", sets: 2, reps: 10, weight_kg: 20, set_details: null }));
    data.conditioning = [{ for_date: "2026-09-14" }, { for_date: "2026-09-15" }];
    data.diet = [{ for_date: "2026-09-15" }, { for_date: "2026-09-15" }, { for_date: "2026-09-21" }];
    const result = summarizeMember(data, "week", "2026-09-14", "2026-09-20");
    expect(result).toMatchObject({ workoutDays: 2, sets: 4, volume: 800, dietDays: 1 });
  });
  it("드롭세트는 실제 세트별 값으로 집계", () => {
    const data = empty();
    data.completions = [{ for_date: "2026-09-14", exercise_id: "squat", sets: 3, reps: 10, weight_kg: 60, set_details: [{ weightKg: 60, reps: 10 }, { weightKg: 50, reps: 10 }, { weightKg: 40, reps: 12 }] }];
    expect(summarizeMember(data, "month", "2026-09-01", "2026-09-30")).toMatchObject({ volume: 1580, sets: 3 });
  });
  it("맨몸은 완료일·세트가 있지만 볼륨은 0", () => {
    const data = empty();
    data.completions = [{ for_date: "2026-09-14", exercise_id: "push-up", sets: 3, reps: 10, weight_kg: null, set_details: null }];
    expect(summarizeMember(data, "month", "2026-09-01", "2026-09-30")).toMatchObject({ workoutDays: 1, sets: 3, volume: 0 });
  });
  it("시간은 초로 합산 후 반올림, 체중은 기간 안의 첫/마지막", () => {
    const data = empty();
    data.sessions = [{ for_date: "2026-09-14", duration_sec: 20 }, { for_date: "2026-09-15", duration_sec: 20 }, { for_date: "2026-08-31", duration_sec: 3600 }];
    data.weights = [{ date: "2026-08-31", weight_kg: 100 }, { date: "2026-09-01", weight_kg: 70 }, { date: "2026-09-20", weight_kg: 69.2 }, { date: "2026-10-01", weight_kg: 80 }];
    expect(summarizeMember(data, "month", "2026-09-01", "2026-09-30")).toMatchObject({ minutes: 1, weightDelta: -0.8 });
  });
  it("윤년 연간 366일 기록도 12개 월로 묶음", () => {
    const data = empty(); data.conditioning = [{ for_date: "2028-02-29" }, { for_date: "2028-12-31" }];
    const result = summarizeMember(data, "year", "2028-01-01", "2028-12-31");
    expect(result.series).toHaveLength(12); expect(result.series[1].workoutDays).toBe(1); expect(result.series[11].workoutDays).toBe(1);
  });
});
describe("처방 입력 검증", () => {
  const input = { exerciseId: "squat", equipment: "barbell", sets: 3, reps: 10, weightKg: 20 };
  it("정상 범위와 미설정 중량", () => { expect(validPrescription(input)).toBe(true); expect(validPrescription({ ...input, weightKg: null })).toBe(true); });
  it.each([{ sets: 0 }, { sets: 21 }, { sets: 1.5 }, { reps: 101 }, { weightKg: -1 }, { weightKg: NaN }, { weightKg: Infinity }, { weightKg: 20.12 }, { exerciseId: "" }])("잘못된 값 %j", change => expect(validPrescription({ ...input, ...change })).toBe(false));
});

describe("오늘만 처방 — 화면 상태 판정", () => {
  const plan = (over: Partial<MemberTodayPlan> = {}): MemberTodayPlan => ({
    date: "2026-09-20", dayIndex: 2, rest: false, swapped: false, rows: [], ...over,
  });
  const row = (over: Partial<TodayPlanRow> = {}): TodayPlanRow => ({
    focus: "chest", position: 0, exercise_id: "bench", equipment: "barbell",
    sets: 3, reps: 10, weight_kg: null, source: "routine", ...over,
  });

  it("처방 미동의(null)는 편집 불가 + 이유 안내", () => {
    const state = todayPlanState(null);
    expect(state.editable).toBe(false);
    expect(state.notice).toContain("허용하지 않았");
  });
  it("회원이 오늘을 휴식으로 바꾼 날은 편집 불가", () => {
    const state = todayPlanState(plan({ rest: true }));
    expect(state.editable).toBe(false);
    expect(state.notice).toContain("휴식");
  });
  // 서버(`trainer_prescribe_today`)도 같은 날을 거절한다 — 화면과 서버 판정이 어긋나면
  // 트레이너는 "저장했는데 안 됐다" 만 보게 된다.
  it("회원이 오늘 부위를 갈아끼웠고 담은 운동이 없으면 편집 불가", () => {
    const state = todayPlanState(plan({ swapped: true }));
    expect(state.editable).toBe(false);
    expect(state.notice).toContain("부위를 직접 바꿨");
  });
  it("오늘 예정된 운동이 없으면 편집 불가", () => {
    expect(todayPlanState(plan()).editable).toBe(false);
  });
  it("오늘 운동이 있으면 편집 가능 + 안내 없음", () => {
    expect(todayPlanState(plan({ rows: [row()] }))).toEqual({ editable: true, notice: null });
  });
  it("부위별로 묶고 부위 안에서는 position 순", () => {
    const grouped = groupTodayRowsByFocus([
      row({ focus: "back", position: 1, exercise_id: "row2" }),
      row({ focus: "chest", position: 1, exercise_id: "fly" }),
      row({ focus: "back", position: 0, exercise_id: "row1" }),
      row({ focus: "chest", position: 0, exercise_id: "bench" }),
    ]);
    expect(grouped.map(g => g.focus)).toEqual(["back", "chest"]);
    expect(grouped[0].rows.map(r => r.exercise_id)).toEqual(["row1", "row2"]);
    expect(grouped[1].rows.map(r => r.exercise_id)).toEqual(["bench", "fly"]);
  });
});

describe("처방 코멘트 문구", () => {
  const input = { exerciseId: "squat", equipment: "barbell", sets: 3, reps: 10, weightKg: 20 };
  // 🔴 "오늘만 바꿨는데 루틴이 바뀐 줄 알았다" 를 막는 유일한 장치가 이 문장이다.
  it("영구 루틴과 오늘만이 서로 다르게 읽힌다", () => {
    expect(prescriptionNote("routine", "스쿼트", input)).toContain("영구 루틴");
    expect(prescriptionNote("today", "스쿼트", input)).toContain("오늘 운동");
    expect(prescriptionNote("today", "스쿼트", input)).not.toContain("영구 루틴");
  });
  it("중량 미설정은 kg 대신 미설정으로 적는다", () => {
    expect(prescriptionNote("today", "스쿼트", { ...input, weightKg: null })).toContain("중량 미설정");
    expect(prescriptionNote("today", "스쿼트", input)).toContain("20kg");
  });
  it("삭제는 축을 밝혀 적는다", () => {
    expect(prescriptionNote("today", "", null)).toBe("운동 처방: 오늘 운동에서 운동 1개를 삭제했어요.");
    expect(prescriptionNote("routine", "", null)).toBe("운동 처방: 영구 루틴에서 운동 1개를 삭제했어요.");
  });
});
