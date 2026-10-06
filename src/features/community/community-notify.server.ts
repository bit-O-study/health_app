import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  loadDevices,
  notifyDevices,
  notifyEnabled,
  notifyUser,
} from "@/features/notifications/push-fanout";
import {
  DEFAULT_PREFERENCES,
  decideSend,
  filterByPreference,
  seoulHour,
} from "@/features/notifications/preferences";
import { loadPreferences } from "@/features/notifications/preferences-data";
import { mapWithConcurrency } from "@/lib/batch";
import {
  notificationHref,
  notificationText,
  type CommunityNotification,
  type CommunityNotificationKind,
} from "./community-notifications";

/**
 * 커뮤니티 알림(커뮤니티 3단계, 2026-09-30).
 *
 * 앱 안 알림 행은 **DB 트리거가** 만든다(community_comment_notify) — 자기 댓글·차단 사이는 거기서 거른다.
 * 여기서는 그 행을 읽어 푸시를 보낸다. 트리거가 행을 안 만들었으면 푸시도 안 간다(판단이 한 곳).
 * 🔴 푸시는 설정(커뮤니티 반응 · 야간 방해 금지)을 본다. 앱 안 목록은 설정과 무관하게 쌓인다.
 */

type Row = {
  id: string;
  user_id: string;
  kind: CommunityNotificationKind;
  actor_name: string | null;
  post_id: string | null;
  teaching_post_id: string | null;
  source_id?: string | null;
  preview: string | null;
  like_count: number | null;
  created_at: string;
  read_at: string | null;
};

const COLUMNS = "id, user_id, kind, actor_name, post_id, teaching_post_id, source_id, preview, like_count, created_at, read_at";

function toNotification(r: Row): CommunityNotification {
  return {
    id: r.id,
    kind: r.kind,
    actorName: r.actor_name,
    postId: r.post_id,
    teachingPostId: r.teaching_post_id,
    sourceId: r.source_id ?? null,
    preview: r.preview,
    likeCount: r.like_count,
    createdAt: r.created_at,
    read: !!r.read_at,
  };
}

/** 내 알림 최근 50개(RLS 로 본인 것만). */
export async function listMyCommunityNotifications(
  supabase: SupabaseClient,
  limit = 50,
): Promise<CommunityNotification[]> {
  const { data } = await supabase
    .from("community_notifications")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as Row[]).map(toNotification);
}

/** 안 읽은 알림 수(머리글 종 뱃지). */
export async function countUnreadCommunityNotifications(supabase: SupabaseClient): Promise<number> {
  const { count } = await supabase
    .from("community_notifications")
    .select("id", { count: "exact", head: true })
    .is("read_at", null);
  return count ?? 0;
}

/**
 * 댓글 푸시 — 댓글 저장(또는 답변 채택) 직후 부른다. 트리거가 만든 알림 행이 있을 때만 보낸다.
 * "comment" 는 그 댓글로 생긴 글쓴이 알림 + 답글 알림(부모 댓글 쓴 사람)을 모두 보낸다(커뮤니티 4-2).
 * 실패는 삼킨다(댓글은 이미 남았다).
 */
export async function pushCommentNotification(
  kind: "comment" | "teaching_comment" | "accepted",
  commentId: string,
): Promise<void> {
  try {
    if (!notifyEnabled()) return;
    const admin = createSupabaseAdminClient();
    if (!admin) return;
    const kinds: CommunityNotificationKind[] = kind === "comment" ? ["comment", "reply"] : [kind];
    const { data } = await admin
      .from("community_notifications")
      .select(COLUMNS)
      .in("kind", kinds)
      .eq("source_id", commentId);
    const rows = (data ?? []) as Row[];
    if (rows.length === 0) return;
    const prefsByUser = await loadPreferences(admin, rows.map((r) => r.user_id));
    for (const row of rows) {
      const prefs = prefsByUser.get(row.user_id) ?? DEFAULT_PREFERENCES;
      if (!decideSend(prefs, "community-activity", seoulHour()).allowed) continue;
      const n = toNotification(row);
      const text = notificationText(n);
      await notifyUser(admin, row.user_id, {
        type: "community-comment",
        title: text.title,
        body: text.body.length > 60 ? `${text.body.slice(0, 60)}…` : text.body,
        url: notificationHref(n),
      });
    }
  } catch {
    /* 알림 실패는 무시 */
  }
}

/**
 * 좋아요 하루 묶음 — 하루 리마인더 크론이 같이 부른다(Vercel Hobby 는 크론 두 개까지라 따로 못 둔다).
 * 앱 안 알림은 모두에게 쌓고, 푸시는 설정을 켠 사람 중 **오늘 저녁 리마인더를 안 받는 사람만**
 * (저녁에 알림 두 개가 연달아 뜨면 알림을 꺼 버린다 — 크론의 부위 균형 알림과 같은 규칙).
 */
export async function runLikeDigest(
  admin: SupabaseClient,
  skipPushFor: ReadonlySet<string>,
  hour = seoulHour(),
): Promise<{ created: number; pushed: number }> {
  const { data, error } = await admin.rpc("community_like_digest");
  if (error) throw new Error(`좋아요 묶음 실패: ${error.message}`);
  const rows = (data ?? []) as {
    user_id: string;
    like_count: number;
    post_id: string | null;
    teaching_post_id: string | null;
  }[];
  if (rows.length === 0 || !notifyEnabled()) return { created: rows.length, pushed: 0 };

  const candidates = rows.filter((r) => !skipPushFor.has(r.user_id));
  const prefs = await loadPreferences(admin, candidates.map((r) => r.user_id));
  const { allowed } = filterByPreference(candidates, (r) => r.user_id, prefs, "community-activity", hour);
  const devices = await loadDevices(admin, allowed.map((r) => r.user_id));
  const sent = await mapWithConcurrency(allowed, 8, async (r) => {
    const text = notificationText({ kind: "likes", actorName: null, preview: null, likeCount: r.like_count });
    try {
      return await notifyDevices(admin, devices.get(r.user_id), {
        type: "community-likes",
        title: text.title,
        body: text.body,
        url: notificationHref({ postId: r.post_id, teachingPostId: r.teaching_post_id }),
      });
    } catch {
      return false;
    }
  });
  return { created: rows.length, pushed: sent.filter(Boolean).length };
}
