import { beforeEach, describe, expect, it, vi } from "vitest";
const native = vi.hoisted(() => vi.fn());
vi.mock("capacitor-kakao-plugin", () => ({ CapacitorKakao: { shareDefault: native } }));
import { sendGroupInviteCard } from "@/features/groups/share-invite";
const card = { title: "운동 그룹", description: "함께 운동해요", imageUrl: "https://health-app-five-iota.vercel.app/icon-512.png", url: "https://health-app-five-iota.vercel.app/groups/join/invite-token" };
beforeEach(() => { native.mockReset(); });
describe("button-only Kakao group invitations", () => {
  it("includes the participation button and exact token URL on native", async () => {
    native.mockResolvedValue(undefined);
    const web = vi.fn();
    expect(await sendGroupInviteCard(card, true, web)).toBe(true);
    expect(native).toHaveBeenCalledWith({ title: card.title, description: card.description, imageUrl: card.imageUrl, imageLinkUrl: card.url, buttonTitle: "그룹 참여하기" });
    expect(web).not.toHaveBeenCalled();
  });
  it("includes a web and mobile link on the browser card button", async () => {
    const sendDefault = vi.fn();
    expect(await sendGroupInviteCard(card, false, async () => ({ Share: { sendDefault } }))).toBe(true);
    expect(sendDefault.mock.calls[0][0]).toMatchObject({ buttons: [{ title: "그룹 참여하기", link: { webUrl: card.url, mobileWebUrl: card.url } }] });
    expect(native).not.toHaveBeenCalled();
  });
  it("surfaces native failure instead of disguising it as a successful link share", async () => {
    native.mockRejectedValue(new Error("SDK unavailable"));
    const web = vi.fn();
    expect(await sendGroupInviteCard(card, true, web)).toBe(false);
    expect(web).not.toHaveBeenCalled();
  });
  it("reports missing or failed browser SDK without a text fallback", async () => {
    expect(await sendGroupInviteCard(card, false, async () => null)).toBe(false);
    expect(await sendGroupInviteCard(card, false, async () => ({ Share: { sendDefault: vi.fn().mockRejectedValue(new Error("blocked")) } }))).toBe(false);
  });
});