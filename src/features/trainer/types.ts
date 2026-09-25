export const SHARE_FIELDS = ["workout", "diet", "body", "prescription"] as const;
export type Sharing = Record<(typeof SHARE_FIELDS)[number], boolean>;
export const SHARE_LABELS: Record<keyof Sharing, string> = {
  workout: "운동 기록 (일수·세트·시간)", diet: "식단 기록", body: "체중·체성분", prescription: "운동 처방 허용",
};
export type TrainerPass = { trainer_id: string; name: string; phone: string; status: string; starts_on: string | null; ends_on: string | null; seats: number };
export type TrainerLink = { id: string; trainer_id: string; member_id: string; member_name: string; active: boolean; share_workout: boolean; share_diet: boolean; share_body: boolean; allow_prescription: boolean };
export function normalizePhone(value: string): string | null {
  const phone = value.replace(/[\s()-]/g, "").replace(/^\+82/, "0");
  return /^01\d{8,9}$/.test(phone) ? phone : null;
}
export function linkSharing(link: TrainerLink): Sharing {
  return { workout: link.share_workout, diet: link.share_diet, body: link.share_body, prescription: link.allow_prescription };
}
export function validSharing(value: unknown): value is Sharing {
  return !!value && typeof value === "object" && SHARE_FIELDS.every(key => typeof (value as Sharing)[key] === "boolean");
}