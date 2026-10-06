import { describe, expect, it } from "vitest";

import { buildNvidiaBody, imageDataUri } from "@/features/coach/nvidia-format";

describe("imageDataUri", () => {
  it("builds a data URI from base64 + mediaType", () => {
    expect(imageDataUri({ base64: "AAAA", mediaType: "image/png" })).toBe(
      "data:image/png;base64,AAAA",
    );
  });

  it("falls back to jpeg for disallowed types", () => {
    expect(imageDataUri({ base64: "AAAA", mediaType: "image/tiff" })).toBe(
      "data:image/jpeg;base64,AAAA",
    );
  });
});

describe("buildNvidiaBody", () => {
  it("uses a system message when there are no images", () => {
    const body = buildNvidiaBody("m", "you are a coach", "hi", [], 500);
    expect(body.model).toBe("m");
    expect(body.max_tokens).toBe(500);
    expect(body.messages).toEqual([
      { role: "system", content: "you are a coach" },
      { role: "user", content: "hi" },
    ]);
  });

  it("omits the system message when system is empty", () => {
    const body = buildNvidiaBody("m", "", "hi");
    expect(body.messages).toEqual([{ role: "user", content: "hi" }]);
  });

  it("folds system into the user text and appends images (vision path)", () => {
    const body = buildNvidiaBody("m", "SYS", "look", [
      { base64: "IMG", mediaType: "image/jpeg" },
    ]);
    expect(body.messages).toHaveLength(1);
    const msg = body.messages[0];
    expect(msg.role).toBe("user");
    const content = msg.content as Array<Record<string, unknown>>;
    expect(content[0]).toEqual({ type: "text", text: "SYS\n\nlook" });
    expect(content[1]).toEqual({
      type: "image_url",
      image_url: { url: "data:image/jpeg;base64,IMG" },
    });
  });

  it("supports multiple images in one user message", () => {
    const body = buildNvidiaBody("m", "", "frames", [
      { base64: "A", mediaType: "image/jpeg" },
      { base64: "B", mediaType: "image/png" },
    ]);
    const content = body.messages[0].content as Array<Record<string, unknown>>;
    // [text, image, image]
    expect(content).toHaveLength(3);
    expect(content[2]).toEqual({
      type: "image_url",
      image_url: { url: "data:image/png;base64,B" },
    });
  });
});

describe("NVIDIA 모델·순서 (2026-09-30 실측)", () => {
  it("글은 Nemotron 3 Super, 사진은 Nemotron 3 Nano Omni — 환경변수가 있으면 그걸", async () => {
    const { pickNvidiaModel, NVIDIA_TEXT_MODEL, NVIDIA_VISION_MODEL } = await import("@/features/coach/nvidia-format");
    expect(pickNvidiaModel(false)).toBe(NVIDIA_TEXT_MODEL);
    expect(pickNvidiaModel(true)).toBe(NVIDIA_VISION_MODEL);
    expect(NVIDIA_TEXT_MODEL).toBe("nvidia/nemotron-3-super-120b-a12b");
    expect(NVIDIA_VISION_MODEL).toBe("nvidia/nemotron-3-nano-omni-30b-a3b-reasoning");
    expect(pickNvidiaModel(false, { NVIDIA_MODEL: "x/text" })).toBe("x/text");
    expect(pickNvidiaModel(true, { NVIDIA_MODEL: "x/text", NVIDIA_VISION_MODEL: "x/vis" })).toBe("x/vis");
  });

  it("🔴 Nemotron 3 은 생각 과정을 끈다 — 안 끄면 답에 'We need to…'가 섞여 JSON 을 못 읽는다", () => {
    const body = buildNvidiaBody("nvidia/nemotron-3-super-120b-a12b", "s", "u");
    expect(body.chat_template_kwargs).toEqual({ enable_thinking: false });
    expect(buildNvidiaBody("meta/llama-3.2-11b-vision-instruct", "s", "u").chat_template_kwargs).toBeUndefined();
  });

  it("남은 <think> 는 걷어낸다", async () => {
    const { cleanNvidiaText } = await import("@/features/coach/nvidia-format");
    expect(cleanNvidiaText('<think>hmm\nok</think>\n{"a":1}')).toBe('{"a":1}');
    expect(cleanNvidiaText('{"a":1}')).toBe('{"a":1}');
  });

  it("부르는 순서: NVIDIA → Gemini → Claude, 키 있는 것만", async () => {
    const { aiProviderOrder } = await import("@/features/coach/nvidia-format");
    expect(aiProviderOrder({ nvidia: true, gemini: true, claude: true })).toEqual(["nvidia", "gemini", "claude"]);
    expect(aiProviderOrder({ nvidia: false, gemini: true, claude: false })).toEqual(["gemini"]);
    expect(aiProviderOrder({ nvidia: false, gemini: false, claude: false })).toEqual([]);
  });
});

describe("NVIDIA 과부하 대응", () => {
  it("글은 Nano Omni 로, 사진은 Llama 11B Vision 으로 한 번 더", async () => {
    const m = await import("@/features/coach/nvidia-format");
    expect(m.nvidiaFallbackModel(m.NVIDIA_TEXT_MODEL, false)).toBe(m.NVIDIA_VISION_MODEL);
    expect(m.nvidiaFallbackModel(m.NVIDIA_VISION_MODEL, true)).toBe(m.NVIDIA_VISION_FALLBACK);
    expect(m.nvidiaFallbackModel(m.NVIDIA_VISION_MODEL, false)).toBeNull(); // 같은 모델은 다시 안 부른다
  });

  it("다시 부를 실패: 429·5xx 만", async () => {
    const { isRetryableStatus } = await import("@/features/coach/nvidia-format");
    expect(isRetryableStatus(503)).toBe(true);
    expect(isRetryableStatus(429)).toBe(true);
    expect(isRetryableStatus(404)).toBe(false);
    expect(isRetryableStatus(400)).toBe(false);
  });
});

describe("AI_PROVIDER_ORDER (2026-10-01 운영은 유료 Gemini 우선)", () => {
  it("환경변수 순서대로, 적지 않은 건 뒤에 기본 순서로, 키 없는 건 뺀다", async () => {
    const { aiProviderOrder } = await import("@/features/coach/nvidia-format");
    const all = { nvidia: true, gemini: true, claude: true };
    expect(aiProviderOrder(all, "gemini,claude,nvidia")).toEqual(["gemini", "claude", "nvidia"]);
    expect(aiProviderOrder(all, "gemini")).toEqual(["gemini", "nvidia", "claude"]);
    expect(aiProviderOrder(all, " Gemini , bogus ")).toEqual(["gemini", "nvidia", "claude"]);
    expect(aiProviderOrder({ nvidia: true, gemini: false, claude: true }, "gemini,claude")).toEqual(["claude", "nvidia"]);
    expect(aiProviderOrder(all, undefined)).toEqual(["nvidia", "gemini", "claude"]);
  });
});
