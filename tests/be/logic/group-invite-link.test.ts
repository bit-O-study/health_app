import { describe, expect, it } from "vitest";
import { groupInviteOrigin, groupInviteUrl } from "@/features/groups/invite-link";
describe("public group invitation links", () => {
  it.each([undefined, "", "capacitor://localhost", "http://localhost:3000", "https://localhost", "invalid"])("uses a public HTTPS domain for %s", value => {
    expect(groupInviteUrl("token", value)).toBe("https://health-app-five-iota.vercel.app/groups/join/token");
  });
  it("normalizes configured origin without dropping the invite token", () => {
    expect(groupInviteUrl("a/b", " https://example.com/base/ ")).toBe("https://example.com/groups/join/a%2Fb");
  });
  it("does not leak URL credentials into messages", () => {
    expect(groupInviteOrigin("https://name:password@example.com")).toBe("https://health-app-five-iota.vercel.app");
  });
});