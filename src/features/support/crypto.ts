import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
function key(secret: string) {
  if (!/^[0-9a-f]{64}$/i.test(secret)) throw new Error("고객센터 암호화 키 설정이 필요해요.");
  return Buffer.from(secret, "hex");
}
export function seal(value: string, secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  return Buffer.concat([iv, cipher.update(value, "utf8"), cipher.final(), cipher.getAuthTag()]).toString("base64");
}
export function unseal(value: string, secret: string) {
  const bytes = Buffer.from(value, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(secret), bytes.subarray(0, 12));
  decipher.setAuthTag(bytes.subarray(-16));
  return Buffer.concat([decipher.update(bytes.subarray(12, -16)), decipher.final()]).toString("utf8");
}
