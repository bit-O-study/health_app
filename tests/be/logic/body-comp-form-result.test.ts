import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

// Model React batching: state updater callbacks are flushed after the event finishes.
const state = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, queue: [] as (() => void)[], scan: vi.fn() }));
vi.mock("react", async original => ({
  ...await original<typeof import("react")>(),
  useState: (initial: unknown) => {
    const index = state.cursor++;
    if (!(index in state.slots)) state.slots[index] = typeof initial === "function" ? initial() : initial;
    return [state.slots[index], (next: unknown) => state.queue.push(() => {
      state.slots[index] = typeof next === "function" ? next(state.slots[index]) : next;
    })];
  },
  useTransition: () => [false, vi.fn()],
  useSyncExternalStore: (_subscribe: unknown, get: () => unknown) => get(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/supabase/client", () => ({ createSupabaseBrowserClient: () => ({
  auth: { getUser: async () => ({ data: { user: { id: "test-owner" } } }) },
  storage: { from: () => ({ upload: async () => ({ error: null }) }) },
}) }));
vi.mock("@/lib/image/resize-for-ai", () => ({ resizeImageForAI: async () => ({ base64: "test", mediaType: "image/jpeg" }) }));
vi.mock("@/features/body-composition/actions", () => ({ saveBodyCompositionAction: vi.fn() }));
vi.mock("@/features/body-composition/body-comp-scan-actions", () => ({ scanBodyCompPhotoAction: state.scan }));
import { BodyCompForm } from "@/features/body-composition/components/body-comp-form";

type Element = ReactElement<Record<string, unknown>>;
function elements(node: unknown): Element[] {
  if (Array.isArray(node)) return node.flatMap(elements);
  if (!node || typeof node !== "object" || !("props" in node)) return [];
  const el = node as Element;
  return [el, ...elements(el.props.children)];
}
function text(node: unknown): string {
  if (Array.isArray(node)) return node.map(text).join("");
  if (node && typeof node === "object" && "props" in node) return text((node as Element).props.children);
  return typeof node === "string" || typeof node === "number" ? String(node) : "";
}
let aiScanEnabled = true;
function render() {
  for (const update of state.queue.splice(0)) update();
  state.cursor = 0;
  return BodyCompForm({ hasExistingImage: false, aiScanEnabled });
}
async function scan(values: Record<string, number>) {
  state.scan.mockResolvedValue({ ok: true, values });
  return pressScan();
}
async function pressScan() {
  let tree = render();
  const upload = elements(tree).find(el => el.type === "input" && el.props.type === "file")!;
  await (upload.props.onChange as (e: unknown) => Promise<void>)({ target: { files: [new File(["test"], "report.jpg", { type: "image/jpeg" })] } });
  tree = render();
  const button = elements(tree).find(el => el.type === "button" && text(el).includes("사진에서 자동 추출"))!;
  await (button.props.onClick as () => Promise<void>)();
  return render();
}

/** 앱(1.0.6~)의 폰 안 글자 인식 플러그인 흉내 — 체중·골격근 두 줄. */
function fakeDeviceOcr() {
  const word = (text: string, left: number, top: number) => ({ text, left, top, right: left + 60, bottom: top + 20 });
  const recognize = vi.fn(async () => ({ words: [word("체중", 0, 0), word("71.4", 300, 0), word("골격근량", 0, 40), word("31.0", 300, 40)] }));
  (globalThis as { window?: unknown }).window = { Capacitor: { isPluginAvailable: (n: string) => n === "BodyCompOcr", Plugins: { BodyCompOcr: { recognize } } } };
  return recognize;
}

describe("체성분 추출 결과 표시 — React 상태 갱신 지연", () => {
  beforeEach(() => { state.slots = []; state.cursor = 0; state.queue = []; state.scan.mockReset(); aiScanEnabled = true; delete (globalThis as { window?: unknown }).window; });
  it("읽은 값이 있으면 상태 반영 순서와 무관하게 성공 개수를 표시한다", async () => {
    const tree = await scan({ weightKg: 72.5, skeletalMuscleKg: 34.2 });
    expect(text(tree)).toContain("2개 항목을 읽어 채웠습니다");
    expect(text(tree)).not.toContain("수치를 인식하지 못했습니다");
    const inputs = elements(tree).filter(el => el.type === "input");
    expect(inputs.some(el => el.props.value === "72.5")).toBe(true);
    expect(inputs.some(el => el.props.value === "34.2")).toBe(true);
  });
  it("빈 결과는 성공으로 표시하거나 기존 수치를 지우지 않는다", async () => {
    await scan({ weightKg: 72.5 });
    const tree = await scan({});
    expect(text(tree)).not.toContain("개 항목을 읽어 채웠습니다");
    expect(elements(tree).some(el => el.type === "input" && el.props.value === "72.5")).toBe(true);
  });
  it("AI 가 없어도 앱이면 폰 안에서 읽어 채운다 — 서버 AI 는 안 부른다", async () => {
    aiScanEnabled = false;
    const recognize = fakeDeviceOcr();
    const tree = await pressScan();
    expect(recognize).toHaveBeenCalledTimes(1);
    expect(state.scan).not.toHaveBeenCalled();
    expect(text(tree)).toContain("2개 항목을 읽어 채웠습니다");
    expect(text(tree)).toContain("이 폰 안에서 읽어 외부로 보내지 않아요");
    const inputs = elements(tree).filter(el => el.type === "input");
    expect(inputs.some(el => el.props.value === "71.4")).toBe(true);
    expect(inputs.some(el => el.props.value === "31")).toBe(true);
  });
  it("AI 가 실패해도(횟수 소진 등) 앱이면 폰 안에서 다시 읽는다", async () => {
    const recognize = fakeDeviceOcr();
    state.scan.mockResolvedValue({ ok: false, error: "이번 달 횟수를 다 썼어요." });
    const tree = await pressScan();
    expect(recognize).toHaveBeenCalledTimes(1);
    expect(text(tree)).toContain("2개 항목을 읽어 채웠습니다");
  });
  it("AI 도 플러그인도 없으면 자동 추출 버튼이 없고 직접 입력 안내", () => {
    aiScanEnabled = false;
    const tree = render();
    expect(elements(tree).some(el => el.type === "button" && text(el).includes("사진에서 자동 추출"))).toBe(false);
    expect(text(tree)).toContain("직접 입력해 주세요");
  });
});
