export type InviteCard = { title: string; description: string; imageUrl: string; url: string };
export type KakaoShare = { sendDefault: (options: unknown) => void | Promise<void> };

/** A Kakao invitation is a button card. Never silently substitute a plain-text share. */
export async function sendGroupInviteCard(card: InviteCard, inApp: boolean, loadWeb: () => Promise<{ Share?: KakaoShare } | null>): Promise<boolean> {
  try {
    if (inApp) {
      const { CapacitorKakao } = await import("capacitor-kakao-plugin");
      await CapacitorKakao.shareDefault({ title: card.title, description: card.description, imageUrl: card.imageUrl, imageLinkUrl: card.url, buttonTitle: "그룹 참여하기" });
    } else {
      const kakao = await loadWeb();
      if (!kakao?.Share) return false;
      const link = { webUrl: card.url, mobileWebUrl: card.url };
      await kakao.Share.sendDefault({ objectType: "feed", content: { title: card.title, description: card.description, imageUrl: card.imageUrl, link }, buttons: [{ title: "그룹 참여하기", link }] });
    }
    return true;
  } catch { return false; }
}