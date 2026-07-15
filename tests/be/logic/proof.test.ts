import { describe, expect, it } from "vitest";

import {
  compareProofOrder,
  normalizeProofMediaType,
  proofMediaTypeFromExt,
  type ProofOrderable,
} from "@/features/groups/proof";

describe("proofMediaTypeFromExt", () => {
  it("gif → gif (대소문자·점 무시)", () => {
    expect(proofMediaTypeFromExt("gif")).toBe("gif");
    expect(proofMediaTypeFromExt("GIF")).toBe("gif");
    expect(proofMediaTypeFromExt(".gif")).toBe("gif");
  });
  it("영상 확장자 → video", () => {
    expect(proofMediaTypeFromExt("webm")).toBe("video");
    expect(proofMediaTypeFromExt("mp4")).toBe("video");
    expect(proofMediaTypeFromExt("")).toBe("video");
  });
});

describe("normalizeProofMediaType", () => {
  it("'gif' 만 gif, 그 외/미설정 = video", () => {
    expect(normalizeProofMediaType("gif")).toBe("gif");
    expect(normalizeProofMediaType("video")).toBe("video");
    expect(normalizeProofMediaType(null)).toBe("video");
    expect(normalizeProofMediaType("mp4")).toBe("video");
  });
});

describe("compareProofOrder — 인증자 먼저·최신순, 미인증은 본인·가나다", () => {
  const mk = (
    name: string,
    isMe: boolean,
    at: string | null,
  ): ProofOrderable => ({ name, isMe, proofCreatedAt: at });

  it("인증한 사람이 미인증보다 앞", () => {
    const posted = mk("A", false, "2026-07-15T01:00:00Z");
    const none = mk("B", false, null);
    expect(compareProofOrder(posted, none)).toBeLessThan(0);
    expect(compareProofOrder(none, posted)).toBeGreaterThan(0);
  });

  it("인증자끼리는 최신 인증이 앞", () => {
    const older = mk("A", false, "2026-07-15T01:00:00Z");
    const newer = mk("B", false, "2026-07-15T05:00:00Z");
    expect(compareProofOrder(newer, older)).toBeLessThan(0);
  });

  it("미인증끼리는 본인이 앞", () => {
    const me = mk("나", true, null);
    const other = mk("가", false, null);
    expect(compareProofOrder(me, other)).toBeLessThan(0);
  });

  it("full sort 예시", () => {
    const list: ProofOrderable[] = [
      mk("무인증갑", false, null),
      mk("나", true, null),
      mk("일찍인증", false, "2026-07-15T01:00:00Z"),
      mk("늦게인증", false, "2026-07-15T09:00:00Z"),
    ];
    const sorted = [...list].sort(compareProofOrder).map((m) => m.name);
    expect(sorted).toEqual(["늦게인증", "일찍인증", "나", "무인증갑"]);
  });
});