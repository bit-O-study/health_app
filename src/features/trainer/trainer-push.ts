import "server-only";

import { after } from "next/server";

import { notifyUser } from "@/features/notifications/push-fanout";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * 트레이너 ↔ 회원 앱 푸시(2026-10-14) — 유료 문자 없이.
 *
 * 푸시 보내는 장치(웹푸시 · FCM)는 이미 있었는데 트레이너 기능에서는 안 썼다. 그래서 회원이 연결을
 * 끊어도 트레이너는 몰랐고(유료 알림톡 설정이 없으면 '대기'로만 남았다), 처방이 와도 회원은 앱을 열어야 알았다.
 * 응답을 보낸 뒤(after) 보낸다 — 푸시가 늦어도 화면은 기다리지 않는다. 실패는 조용히 넘긴다(본 동작은 이미 끝났다).
 */
function pushLater(userId: string, payload: { type: string; title: string; body: string; url: string }) {
  try {
    after(async () => {
      const admin = createSupabaseAdminClient();
      if (!admin) return;
      await notifyUser(admin, userId, payload).catch(() => {});
    });
  } catch {
    /* 요청 밖(스크립트 등)에서는 푸시를 건너뛴다 — 처방·연결 해제 자체는 이미 끝났다 */
  }
}

/** 회원이 연결을 끊었을 때 — 트레이너에게. `notificationId` 는 pt_disconnect 가 만든 알림 행. */
export async function pushTrainerDisconnect(notificationId: string): Promise<void> {
  const admin = createSupabaseAdminClient();
  if (!admin) return;
  const { data } = await admin.from("pt_notifications").select("trainer_id, payload").eq("id", notificationId).maybeSingle();
  const row = data as { trainer_id: string; payload: { member?: string } | null } | null;
  if (!row?.trainer_id) return;
  pushLater(row.trainer_id, {
    type: "pt_disconnect",
    title: "회원 연결 해제",
    body: `${row.payload?.member ?? "회원"} 님이 트레이너 연결을 끊었어요.`,
    url: "/trainer/members",
  });
}

/** 트레이너가 처방했을 때 — 회원에게. */
export function pushMemberPrescription(memberId: string): void {
  pushLater(memberId, {
    type: "pt_prescription",
    title: "트레이너 처방",
    body: "트레이너가 운동을 정해 줬어요. 오늘 운동에서 확인해 보세요.",
    url: "/routine",
  });
}
