import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ user: vi.fn(), rpc: vi.fn(), revalidate: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ getCurrentUser: mock.user, createSupabaseServerClient: async () => ({ rpc: mock.rpc }) }));
vi.mock("next/cache", () => ({ revalidatePath: mock.revalidate }));
vi.mock("@/features/routine/exercise-catalog", () => ({ ALL_EXERCISES: [], getCatalogExercise: (id: string) => id === "squat" ? { name: "스쿼트", equipments: [{ equipment: "barbell" }] } : undefined }));
import { prescribeMemberExercise, prescribeMemberToday } from "@/features/groups/prescription-actions";
import { getMemberReport, getMemberTodayPlan } from "@/features/groups/member-report-data";
const input = { exerciseId: "squat", equipment: "barbell", sets: 3, reps: 10, weightKg: 20 };
beforeEach(() => { vi.clearAllMocks(); mock.user.mockResolvedValue({ id: "trainer" }); mock.rpc.mockResolvedValue({ data: true, error: null }); });
describe("운동 처방 서버 액션", () => {
  it("비로그인 거절", async () => { mock.user.mockResolvedValue(null); expect((await prescribeMemberExercise("g", "m", "r", "v", input)).ok).toBe(false); expect(mock.rpc).not.toHaveBeenCalled(); });
  it("본인 처방 거절", async () => { expect((await prescribeMemberExercise("g", "trainer", "r", "v", input)).ok).toBe(false); expect(mock.rpc).not.toHaveBeenCalled(); });
  it("종목에 없는 기구 거절", async () => { expect((await prescribeMemberExercise("g", "m", "r", "v", { ...input, equipment: "cable" })).ok).toBe(false); expect(mock.rpc).not.toHaveBeenCalled(); });
  it("없는 종목 거절", async () => { expect((await prescribeMemberExercise("g", "m", "r", "v", { ...input, exerciseId: "missing" })).ok).toBe(false); expect(mock.rpc).not.toHaveBeenCalled(); });
  it("범위 밖 값 거절", async () => { expect((await prescribeMemberExercise("g", "m", "r", "v", { ...input, sets: 0 })).ok).toBe(false); expect(mock.rpc).not.toHaveBeenCalled(); });
  it("그룹·회원·행·버전을 DB에 넘기고 성공 후 재검증", async () => {
    expect(await prescribeMemberExercise("g", "m", "r", "v", input)).toEqual({ ok: true });
    expect(mock.rpc).toHaveBeenCalledWith("trainer_prescribe_exercise", expect.objectContaining({ p_group_id: "g", p_member: "m", p_row: "r", p_expected_updated_at: "v", p_patch: input }));
    expect(mock.revalidate).toHaveBeenCalledWith("/routine");
  });
  it("삭제도 같은 권한 RPC로 처리", async () => { await prescribeMemberExercise("g", "m", "r", "v", null); expect(mock.rpc).toHaveBeenCalledWith("trainer_prescribe_exercise", expect.objectContaining({ p_patch: null })); });
  it("권한 거절/수정 충돌은 성공 처리하지 않음", async () => { mock.rpc.mockResolvedValue({ data: false, error: null }); expect((await prescribeMemberExercise("g", "m", "r", "v", input)).ok).toBe(false); expect(mock.revalidate).not.toHaveBeenCalled(); });
  it("DB 실패 내용을 노출하지 않음", async () => { mock.rpc.mockResolvedValue({ data: null, error: { message: "secret" } }); const result = await prescribeMemberExercise("g", "m", "r", "v", input); expect(result.ok).toBe(false); expect(result.error).not.toContain("secret"); });
});
describe("통계 조회 실패/권한", () => {
  it("로그인하지 않으면 조회 안 함", async () => { mock.user.mockResolvedValue(null); expect(await getMemberReport("g", "m", "from", "to")).toBeNull(); expect(mock.rpc).not.toHaveBeenCalled(); });
  it("DB의 권한 거절(null)을 빈 통계로 만들지 않음", async () => { mock.rpc.mockResolvedValue({ data: null, error: null }); expect(await getMemberReport("g", "m", "from", "to")).toBeNull(); });
  it("조회 실패를 운동 0으로 표시하지 않음", async () => { mock.rpc.mockResolvedValue({ data: null, error: { message: "missing function" } }); await expect(getMemberReport("g", "m", "from", "to")).rejects.toThrow("불러오지 못했어요"); });
});

describe("오늘만 처방 서버 액션", () => {
  it("비로그인 거절", async () => {
    mock.user.mockResolvedValue(null);
    expect((await prescribeMemberToday("g", "m", "chest", 0, "squat", input)).ok).toBe(false);
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("본인 처방 거절", async () => {
    expect((await prescribeMemberToday("g", "trainer", "chest", 0, "squat", input)).ok).toBe(false);
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("종목에 없는 기구·없는 종목·범위 밖 값 거절", async () => {
    expect((await prescribeMemberToday("g", "m", "chest", 0, "squat", { ...input, equipment: "cable" })).ok).toBe(false);
    expect((await prescribeMemberToday("g", "m", "chest", 0, "squat", { ...input, exerciseId: "missing" })).ok).toBe(false);
    expect((await prescribeMemberToday("g", "m", "chest", 0, "squat", { ...input, reps: 0 })).ok).toBe(false);
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  // 🔴 원칙 #2 — 오늘만 처방은 **오늘 전용 RPC** 로만 간다. 영구 루틴 RPC 를 부르면
  //    회원 루틴이 바뀐다(내일부터도 그 운동이 남는다).
  it("영구 루틴 RPC 가 아니라 오늘만 RPC 를 부른다", async () => {
    expect(await prescribeMemberToday("g", "m", "chest", 2, "squat", input)).toEqual({ ok: true });
    expect(mock.rpc).toHaveBeenCalledTimes(1);
    expect(mock.rpc).toHaveBeenCalledWith("trainer_prescribe_today", expect.objectContaining({
      p_group_id: "g", p_member: "m", p_focus: "chest", p_position: 2,
      p_expected_exercise_id: "squat", p_patch: input,
    }));
    expect(mock.rpc).not.toHaveBeenCalledWith("trainer_prescribe_exercise", expect.anything());
  });
  it("코멘트 문구에 '오늘' 축이 박힌다(회원이 루틴 변경으로 오해하지 않게)", async () => {
    await prescribeMemberToday("g", "m", "chest", 0, "squat", input);
    const note = mock.rpc.mock.calls[0][1].p_note as string;
    expect(note).toContain("오늘 운동");
    expect(note).not.toContain("영구 루틴");
  });
  it("삭제도 같은 RPC 로 처리", async () => {
    await prescribeMemberToday("g", "m", "chest", 0, "squat", null);
    expect(mock.rpc).toHaveBeenCalledWith("trainer_prescribe_today", expect.objectContaining({ p_patch: null }));
  });
  it("권한 거절/충돌은 성공 처리하지 않음", async () => {
    mock.rpc.mockResolvedValue({ data: false, error: null });
    expect((await prescribeMemberToday("g", "m", "chest", 0, "squat", input)).ok).toBe(false);
    expect(mock.revalidate).not.toHaveBeenCalled();
  });
  it("DB 실패 내용을 노출하지 않음", async () => {
    mock.rpc.mockResolvedValue({ data: null, error: { message: "secret" } });
    const result = await prescribeMemberToday("g", "m", "chest", 0, "squat", input);
    expect(result.ok).toBe(false);
    expect(result.error).not.toContain("secret");
  });
  it("성공하면 회원의 오늘 화면(/routine)도 새로 그린다", async () => {
    await prescribeMemberToday("g", "m", "chest", 0, "squat", input);
    expect(mock.revalidate).toHaveBeenCalledWith("/routine");
  });
});

describe("오늘 계획 조회", () => {
  it("로그인하지 않으면 조회 안 함", async () => {
    mock.user.mockResolvedValue(null);
    expect(await getMemberTodayPlan("g", "m")).toBeNull();
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  // 오늘 처방은 부가 기능 — 실패해도 통계 화면 전체가 죽으면 안 된다(리포트와 다른 정책).
  it("조회 실패는 통계 화면을 죽이지 않고 null", async () => {
    mock.rpc.mockResolvedValue({ data: null, error: { message: "missing function" } });
    expect(await getMemberTodayPlan("g", "m")).toBeNull();
  });
  it("권한 거절(null)도 null", async () => {
    mock.rpc.mockResolvedValue({ data: null, error: null });
    expect(await getMemberTodayPlan("g", "m")).toBeNull();
  });
});
