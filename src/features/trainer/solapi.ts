import { createHmac } from "node:crypto";
export function solapiAuthorization(apiKey: string, secret: string, date: string, salt: string) {
  const signature = createHmac("sha256", secret).update(date + salt).digest("hex");
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${salt}, signature=${signature}`;
}
export type Notification = { id: string; kind: "invite" | "disconnect"; channel: "ATA" | "LMS"; phone: string; payload: { trainer: string; member?: string; url?: string } };
export function solapiMessage(note: Notification, config: { from?: string; pfId?: string; inviteTemplate?: string; disconnectTemplate?: string }) {
  if (note.channel === "LMS") {
    if (!config.from || !note.payload.url || note.kind !== "invite") return null;
    return { to: note.phone, from: config.from, type: "LMS", text: `[헬쑤] ${note.payload.trainer} 트레이너의 초대입니다. 공유 항목을 확인하고 수락해 주세요. ${note.payload.url}` };
  }
  const templateId = note.kind === "invite" ? config.inviteTemplate : config.disconnectTemplate;
  if (!config.pfId || !templateId) return null;
  return { to: note.phone, type: "ATA", kakaoOptions: {
    pfId: config.pfId, templateId, disableSms: true,
    variables: note.kind === "invite"
      ? { "#{트레이너}": note.payload.trainer, "#{초대링크}": note.payload.url }
      : { "#{트레이너}": note.payload.trainer, "#{회원}": note.payload.member },
  } };
}