import "server-only";
import { cache } from "react";
import { createSupabaseServerClient, getCurrentUser } from "@/lib/supabase/server";
import type { TrainerPass, TrainerLink } from "./types";

export const hasTrainerPass = cache(async () => {
  if (!(await getCurrentUser())) return false;
  const db = await createSupabaseServerClient();
  const { data, error } = await db.rpc("pt_has_pass");
  return !error && data === true;
});
export async function getTrainerPass() {
  const user = await getCurrentUser();
  if (!user) return null;
  const db = await createSupabaseServerClient();
  const { data, error } = await db.from("pt_passes").select("*").eq("trainer_id", user.id).maybeSingle();
  if (error) throw new Error("트레이너 이용권을 불러오지 못했어요.");
  return data as TrainerPass | null;
}
export async function getTrainerLinks(asTrainer = false) {
  const user = await getCurrentUser();
  if (!user) return [];
  const db = await createSupabaseServerClient();
  const { data, error } = await db.from("pt_links").select("*").eq(asTrainer ? "trainer_id" : "member_id", user.id).eq("active", true);
  if (error) throw new Error("트레이너 연결을 불러오지 못했어요.");
  return (data ?? []) as TrainerLink[];
}