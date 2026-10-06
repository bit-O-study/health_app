import { afterEach, describe, expect, it, vi } from "vitest";
import { resizeImageForAI } from "@/lib/image/resize-for-ai";
function setup(encode: (quality: number) => number) {
  const canvas = { width: 0, height: 0, getContext: () => ({ drawImage: vi.fn() }), toDataURL: vi.fn((_type, quality) => "data:image/jpeg;base64," + "a".repeat(encode(quality))) };
  vi.stubGlobal("document", { createElement: () => canvas });
  vi.stubGlobal("FileReader", class { result = "data:image/jpeg;base64,test"; onload = () => {}; readAsDataURL() { this.onload(); } });
  vi.stubGlobal("window", { Image: class { width = 2000; height = 3000; onload = () => {}; set src(_value: string) { this.onload(); } } });
  return canvas;
}
afterEach(() => vi.unstubAllGlobals());
describe("문서 사진 크기와 전송 용량", () => {
  it("인바디 숫자 해상도를 1800px로 유지하면서 용량을 맞춘다", async () => {
    const canvas = setup(q => q > 0.7 ? 180_000 : 150_000);
    const result = await resizeImageForAI(new File([], "report.jpg"), 1800, 0.9, 160_000);
    expect([canvas.width, canvas.height]).toEqual([1200, 1800]);
    expect(result.base64.length).toBe(150_000);
  });
  it("용량 초과이면 작은 글씨를 더 줄이지 않고 잘라서 올리도록 안내한다", async () => {
    setup(() => 180_000);
    await expect(resizeImageForAI(new File([], "report.jpg"), 1800, 0.9, 160_000)).rejects.toThrow("나눠 촬영");
  });
  it("기존 음식·기구 사진의 기본 크기는 유지한다", async () => {
    const canvas = setup(() => 100);
    await resizeImageForAI(new File([], "food.jpg"));
    expect([canvas.width, canvas.height]).toEqual([512, 768]);
  });
});