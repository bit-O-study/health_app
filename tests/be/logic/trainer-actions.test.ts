import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  user: vi.fn(), rpc: vi.fn(), admin: vi.fn(), dispatch: vi.fn(),
  revalidate: vi.fn(), redirect: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  getCurrentUser: mock.user,
  createSupabaseServerClient: async () => ({ rpc: mock.rpc }),
}));
vi.mock("@/features/admin/admin", () => ({ isAdminUser: mock.admin }));
vi.mock("@/features/trainer/messaging.server", () => ({ dispatchTrainerNotification: mock.dispatch }));
vi.mock("next/cache", () => ({ revalidatePath: mock.revalidate }));
vi.mock("next/navigation", () => ({ redirect: mock.redirect }));
import { trainerAction } from "@/features/trainer/actions";

function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}
const previous = { ok: false, message: "" };
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com");
  mock.user.mockResolvedValue({ id: "member" });
  mock.admin.mockResolvedValue(false);
  mock.rpc.mockResolvedValue({ data: "notification-id", error: null });
  mock.dispatch.mockRejectedValue(new Error("private provider credentials"));
});
afterEach(() => vi.unstubAllEnvs());

describe("트레이너 저장 결과와 알림 장애 분리", () => {
  it("알림 장애에도 연결 삭제 성공과 화면 갱신을 보존한다", async () => {
    const result = await trainerAction(previous, form({ intent: "disconnect", connection: "link", confirm: "on" }));
    expect(result.ok).toBe(true);
    expect(result.message).toContain("연결을 삭제했어요");
    expect(result.message).toContain("알림");
    expect(result.message).not.toContain("private");
    expect(mock.rpc).toHaveBeenCalledExactlyOnceWith("pt_disconnect", { p_link: "link" });
    expect(mock.revalidate).toHaveBeenCalledWith("/settings/trainers");
    expect(mock.revalidate).toHaveBeenCalledWith("/", "layout");
    expect(mock.dispatch).toHaveBeenCalledTimes(1);
  });
  it("초대 저장 후 발송 장애가 나도 생성한 링크를 돌려준다", async () => {
    const result = await trainerAction(previous, form({ intent: "invite", phone: "01012345678", channel: "LMS" }));
    expect(result.ok).toBe(true);
    expect(result.link).toMatch(/^https:\/\/example.com\/trainer\/invite\/[a-f0-9]{64}$/);
    expect(result.message).not.toContain("private");
    expect(mock.rpc).toHaveBeenCalledTimes(1);
    expect(mock.revalidate).toHaveBeenCalledWith("/trainer");
  });
  it("관리자 재시도 장애도 확인 가능한 안내로 반환한다", async () => {
    mock.admin.mockResolvedValue(true);
    const result = await trainerAction(previous, form({ intent: "retry", notification: "note" }));
    expect(result.message).toContain("알림");
    expect(result.message).not.toContain("private");
    expect(mock.revalidate).toHaveBeenCalledWith("/admin/trainers");
    expect(mock.dispatch).toHaveBeenCalledExactlyOnceWith("note");
  });
  it("DB에서 삭제가 거절되면 성공이나 알림 발송으로 처리하지 않는다", async () => {
    mock.rpc.mockResolvedValue({ data: null, error: { code: "42501", message: "private" } });
    const result = await trainerAction(previous, form({ intent: "disconnect", connection: "link", confirm: "on" }));
    expect(result.ok).toBe(false);
    expect(mock.dispatch).not.toHaveBeenCalled();
    expect(mock.revalidate).not.toHaveBeenCalled();
  });
  it("삭제 확인과 관리자 권한이 없으면 변경하지 않는다", async () => {
    expect((await trainerAction(previous, form({ intent: "disconnect", connection: "link" }))).ok).toBe(false);
    expect((await trainerAction(previous, form({ intent: "retry", notification: "note" }))).ok).toBe(false);
    expect(mock.rpc).not.toHaveBeenCalled();
    expect(mock.dispatch).not.toHaveBeenCalled();
  });
  it("정상 접수 안내는 그대로 보여준다", async () => {
    mock.dispatch.mockResolvedValue("발송 업체에 접수했어요.");
    const result = await trainerAction(previous, form({ intent: "disconnect", connection: "link", confirm: "on" }));
    expect(result.message).toContain("발송 업체에 접수했어요.");
  });
});