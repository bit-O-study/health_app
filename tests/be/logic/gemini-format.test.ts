import { describe, expect, it } from "vitest";

import {
  buildGeminiBody,
  imageMimeType,
  parseGeminiText,
} from "@/features/coach/gemini-format";

const IMG = { base64: "AAAA", mediaType: "image/jpeg" };

describe("buildGeminiBody", () => {
  it("텍스트만 — system 은 systemInstruction 으로 따로 간다", () => {
    const b = buildGeminiBody("너는 코치다", "분석해줘");
    expect(b.systemInstruction?.parts[0]?.text).toBe("너는 코치다");
    expect(b.contents[0]?.parts).toEqual([{ text: "분석해줘" }]);
    expect(b.contents[0]?.role).toBe("user");
  });

  it("빈 system 이면 키 자체를 안 만든다 — 빈 문자열을 보내면 400 이 난다", () => {
    // 기구 인식은 system 없이 부른다(`equipment/vision.ts`).
    const b = buildGeminiBody("", "이 기구 뭐야");
    expect(b.systemInstruction).toBeUndefined();
    expect("systemInstruction" in b).toBe(false);
  });

  it("이미지는 텍스트 앞에 온다", () => {
    const b = buildGeminiBody("s", "u", [IMG]);
    expect(b.contents[0]!.parts[0]).toEqual({
      inlineData: { mimeType: "image/jpeg", data: "AAAA" },
    });
    expect(b.contents[0]!.parts[1]).toEqual({ text: "u" });
  });

  it("🔴 여러 장을 그대로 싣는다 — NVIDIA 와 달리 격자로 합칠 필요가 없다", () => {
    const b = buildGeminiBody("s", "u", [
      IMG,
      { base64: "BBBB", mediaType: "image/png" },
      { base64: "CCCC", mediaType: "image/webp" },
      { base64: "DDDD", mediaType: "image/jpeg" },
    ]);
    // 이미지 4 + 텍스트 1
    expect(b.contents[0]!.parts).toHaveLength(5);
    expect(
      b.contents[0]!.parts.filter((p) => "inlineData" in p),
    ).toHaveLength(4);
  });

  it("maxTokens 와 temperature 를 싣는다", () => {
    expect(buildGeminiBody("s", "u", [], 1234).generationConfig).toEqual({
      maxOutputTokens: 1234,
      temperature: 0.2,
    });
    // 기본값
    expect(buildGeminiBody("s", "u").generationConfig.maxOutputTokens).toBe(900);
  });
});

describe("imageMimeType", () => {
  it("허용 타입은 그대로", () => {
    for (const mt of ["image/jpeg", "image/png", "image/webp", "image/gif"]) {
      expect(imageMimeType({ base64: "x", mediaType: mt })).toBe(mt);
    }
  });

  it("엉뚱한 타입은 jpeg 로 — 카메라·업로드에서 드물게 온다", () => {
    expect(imageMimeType({ base64: "x", mediaType: "image/heic" })).toBe("image/jpeg");
    expect(imageMimeType({ base64: "x", mediaType: "" })).toBe("image/jpeg");
  });
});

describe("parseGeminiText", () => {
  const wrap = (parts: { text?: string }[]) => ({
    candidates: [{ content: { parts } }],
  });

  it("텍스트를 꺼낸다", () => {
    expect(parseGeminiText(wrap([{ text: "안녕" }]))).toBe("안녕");
  });

  it("🔴 조각이 여러 개면 이어 붙인다 — 첫 조각만 읽으면 JSON 이 잘려 파싱이 깨진다", () => {
    expect(parseGeminiText(wrap([{ text: '{"a":' }, { text: "1}" }]))).toBe('{"a":1}');
  });

  it("응답이 이상하면 빈 문자열 — 호출부가 '비어 있어요' 로 처리한다", () => {
    expect(parseGeminiText(null)).toBe("");
    expect(parseGeminiText({})).toBe("");
    expect(parseGeminiText({ candidates: [] })).toBe("");
    expect(parseGeminiText({ candidates: [{ content: {} }] })).toBe("");
    // 안전 필터에 걸려 parts 가 통째로 빠지는 경우.
    expect(parseGeminiText({ candidates: [{ finishReason: "SAFETY" }] })).toBe("");
  });

  it("빈 조각이 섞여도 터지지 않는다", () => {
    expect(parseGeminiText(wrap([{}, { text: " 답 " }, {}]))).toBe("답");
  });
});
