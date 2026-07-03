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
