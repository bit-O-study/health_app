/**
 * 커뮤니티 앱 안 알림 — 순수 로직(커뮤니티 3단계, 2026-09-30).
 * 알림 행(community_notifications) → 한 줄 문구 + 누르면 갈 곳. 푸시 문구도 여기서 만든다(앱 안과 같은 말).
 */

/** reply·accepted 는 커뮤니티 4-2(답글·답변 채택). */
export type CommunityNotificationKind = "comment" | "teaching_comment" | "likes" | "reply" | "accepted";

export type CommunityNotification = {
  id: string;
  kind: CommunityNotificationKind;
  actorName: string | null;
  postId: string | null;
  teachingPostId: string | null;
  /** 댓글 알림이면 그 댓글 id — 상세에서 그 댓글로 바로 간다(커뮤니티 4-1). */
  sourceId?: string | null;
  preview: string | null;
  likeCount: number | null;
  createdAt: string;
  read: boolean;
};

/** 누르면 갈 곳 — 피드 글은 상세(댓글 알림이면 그 댓글 위치 #c-<id>), 운동 영상은 영상 한 편 화면. */
export function notificationHref(
  n: Pick<CommunityNotification, "postId" | "teachingPostId"> & { sourceId?: string | null; kind?: CommunityNotificationKind },
): string {
  if (n.postId) {
    const toComment = n.kind === "comment" || n.kind === "reply" || n.kind === "accepted";
    return toComment && n.sourceId ? `/community/${n.postId}#${commentAnchor(n.sourceId)}` : `/community/${n.postId}`;
  }
  if (n.teachingPostId) return `/community/reel/${n.teachingPostId}`;
  return "/community";
}

/** 한 줄 문구. 이름이 없으면 '누군가'. */
export function notificationText(
  n: Pick<CommunityNotification, "kind" | "actorName" | "preview" | "likeCount">,
): { title: string; body: string } {
  const who = n.actorName?.trim() || "누군가";
  switch (n.kind) {
    case "comment":
      return { title: `${who}님이 내 글에 댓글을 남겼어요`, body: n.preview ?? "" };
    case "teaching_comment":
      return { title: `${who}님이 내 운동 영상에 댓글을 남겼어요`, body: n.preview ?? "" };
    case "reply":
      return { title: `${who}님이 내 댓글에 답글을 남겼어요`, body: n.preview ?? "" };
    case "accepted":
      return { title: `${who}님이 내 답변을 채택했어요`, body: n.preview ?? "" };
    case "likes": {
      const c = Math.max(0, n.likeCount ?? 0);
      return { title: `오늘 좋아요 ${c}개를 받았어요`, body: "어떤 글인지 확인해 보세요." };
    }
  }
}

/** 알림 목록 뱃지 — 99 넘으면 '99+'. 0 이면 안 보인다(null). */
export function unreadBadge(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  return count > 99 ? "99+" : String(Math.floor(count));
}

/** 댓글 위치 표시(상세 화면의 댓글 요소 id 와 같은 값). */
export function commentAnchor(commentId: string): string {
  return `c-${commentId}`;
}

/** 주소의 #c-<댓글 id> → 댓글 id. 모양이 다르면 null. */
export function commentIdFromHash(hash: string): string | null {
  const m = /^#c-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i.exec(hash ?? "");
  return m ? m[1] : null;
}
