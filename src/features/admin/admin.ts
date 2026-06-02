import "server-only";

import { cache } from "react";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";

/**
 * 현재 사용자가 관리자인지 — admins 테이블(이메일) 기반.
 * RLS: 관리자는 admins 전체 조회 가능, 비관리자는 본인 이메일 행만(=없음).
 * 따라서 조회 결과가 1개 이상이면 관리자.
 */
export const isAdminUser = cache(async (): Promise<boolean> => {
  const user = await getCurrentUser();
  if (!user) return false;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("admins").select("email").limit(1);
  if (error) return false;
  return (data?.length ?? 0) > 0;
});

export type AdminRow = { email: string; createdAt: string };

/** 전체 관리자 목록 (관리자만 조회 가능). */
export async function getAdmins(): Promise<AdminRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("admins")
    .select("email, created_at")
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return (data as { email: string; created_at: string }[]).map((r) => ({
    email: r.email,
    createdAt: r.created_at,
  }));
}

export type MemberRow = {
  userId: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  gender: string | null;
  experience: string | null;
  heightCm: number | null;
  weightKg: number | null;
  createdAt: string;
};

/**
 * 전체 회원 목록 (관리자만). 이메일은 auth.users 소관이라 SECURITY DEFINER
 * 함수 admin_members() 로 조회한다(내부에서 is_admin() 게이트 → 비관리자는 0행).
 */
export async function getMembers(): Promise<MemberRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_members");
  if (error || !data) return [];
  return (
    data as {
      user_id: string;
      email: string | null;
      name: string | null;
      phone: string | null;
      gender: string | null;
      experience: string | null;
      height_cm: number | null;
      weight_kg: number | string | null;
      created_at: string;
    }[]
  ).map((r) => ({
    userId: r.user_id,
    email: r.email,
    name: r.name,
    phone: r.phone,
    gender: r.gender,
    experience: r.experience,
    heightCm: r.height_cm,
    weightKg:
      r.weight_kg === null || r.weight_kg === "" ? null : Number(r.weight_kg),
    createdAt: r.created_at,
  }));
}
