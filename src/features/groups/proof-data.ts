import "server-only";

import {
  createSupabaseServerClient,
  getCurrentUser,
} from "@/lib/supabase/server";
import { seoulYmd } from "@/features/routine/data";
import { resolveMemberName } from "@/features/groups/member-name";
import {
  compareProofOrder,
  normalizeProofMediaType,
} from "@/features/groups/proof";

/** 오늘 인증 움짤 1개(멤버당 하루 1개). */
export type ProofItem = {
  mediaUrl: string;
  mediaType: "video" | "gif";
  caption: string | null;
  createdAt: string;
};

/** 인증 피드의 멤버 한 명 — 이름 + 오늘 인증(없으면 null). */
export type ProofMember = {
  userId: string;
  name: string;
  isMe: boolean;
  proof: ProofItem | null;
};

export type ProofBoard = {
  id: string;
  name: string;
  inviteToken: string;
  isOwner: boolean;
  today: string;
  /** 인증한 멤버가 앞, 아직 안 한 멤버(본인 우선)가 뒤. */
  members: ProofMember[];
  /** 내 오늘 인증(없으면 null) — 녹화/교체 UI용. */
  myProof: ProofItem | null;
  doneCount: number;
  totalCount: number;
};

/**
 * 그룹의 '오늘 운동 인증 움짤' 피드. 내가 멤버가 아니면 null.
 * (group_id,user_id,for_date) 유니크라 멤버당 오늘 인증은 최대 1개.
 */
export async function getGroupProofBoard(
  groupId: string,
): Promise<ProofBoard | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createSupabaseServerClient();
  const today = seoulYmd();

  const [{ data: group }, { data: members }] = await Promise.all([
    supabase
      .from("groups")
      .select("id, name, owner_id, invite_token")
      .eq("id", groupId)
      .maybeSingle(),
    supabase
      .from("group_members")
      .select("user_id, display_name")
      .eq("group_id", groupId),
  ]);
  if (!group) return null;
  const g = group as {
    id: string;
    name: string;
    owner_id: string;
    invite_token: string;
  };

  const memberRows = (members ?? []) as {
    user_id: string;
    display_name: string | null;
  }[];
  const memberIds = memberRows.map((r) => r.user_id);
  if (!memberIds.includes(user.id)) return null; // 멤버 아님

  const [{ data: profiles }, { data: proofRows }] = await Promise.all([
    supabase
      .from("profiles")
      .select("user_id, name, nickname")
      .in("user_id", memberIds),
    supabase
      .from("group_proofs")
      .select("user_id, media_url, media_type, caption, created_at")
      .eq("group_id", groupId)
      .eq("for_date", today),
  ]);

  const dispOf = new Map<string, string | null>();
  for (const r of memberRows) dispOf.set(r.user_id, r.display_name);
  const nameOf = new Map<string, string>();
  for (const p of (profiles ?? []) as {
    user_id: string;
    name: string | null;
    nickname: string | null;
  }[]) {
    nameOf.set(
      p.user_id,
      resolveMemberName(p.nickname, p.name, dispOf.get(p.user_id)),
    );
  }
  for (const r of memberRows) {
    if (!nameOf.has(r.user_id)) {
      nameOf.set(r.user_id, resolveMemberName(null, null, r.display_name));
    }
  }

  const proofOf = new Map<string, ProofItem>();
  for (const r of (proofRows ?? []) as {
    user_id: string;
    media_url: string;
    media_type: string;
    caption: string | null;
    created_at: string;
  }[]) {
    proofOf.set(r.user_id, {
      mediaUrl: r.media_url,
      mediaType: normalizeProofMediaType(r.media_type),
      caption: r.caption,
      createdAt: r.created_at,
    });
  }

  const members2: ProofMember[] = memberIds.map((uid) => ({
    userId: uid,
    name: nameOf.get(uid) ?? "회원",
    isMe: uid === user.id,
    proof: proofOf.get(uid) ?? null,
  }));

  // 정렬: 인증한 사람 먼저(최근 인증 우선), 그 다음 미인증(본인을 맨 앞으로).
  members2.sort((a, b) =>
    compareProofOrder(
      { name: a.name, isMe: a.isMe, proofCreatedAt: a.proof?.createdAt ?? null },
      { name: b.name, isMe: b.isMe, proofCreatedAt: b.proof?.createdAt ?? null },
    ),
  );

  return {
    id: g.id,
    name: g.name,
    inviteToken: g.invite_token,
    isOwner: g.owner_id === user.id,
    today,
    members: members2,
    myProof: proofOf.get(user.id) ?? null,
    doneCount: proofOf.size,
    totalCount: memberIds.length,
  };
}