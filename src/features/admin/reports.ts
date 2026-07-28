import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isPostModerator } from "@/features/admin/admin";
import type { ReportTargetKind } from "@/features/community/report";

export type ReportRow = {
  id: string;
  targetKind: ReportTargetKind;
  targetId: string;
  targetUserId: string | null;
  targetAuthor: string | null;
  targetPreview: string | null;
  reason: string;
  status: "open" | "resolved";
  createdAt: string;
  /** 신고된 글/댓글이 아직 남아 있는지(삭제 버튼 상태). */
  contentExists: boolean;
  /** 작성자 정지 만료시각(ISO). 프로필을 못 읽으면(모더레이터) null. */
  targetSuspendedUntil: string | null;
  targetBannedAt: string | null;
};

const TABLE: Record<ReportTargetKind, string> = {
  community_post: "community_posts",
  community_comment: "community_comments",
  teaching_post: "teaching_posts",
  teaching_comment: "teaching_comments",
};

/** 신고 목록(모더레이터 전용). 미처리(open) 우선, 최신순. */
export async function getReports(limit = 200): Promise<ReportRow[]> {
  if (!(await isPostModerator())) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("post_reports")
    .select(
      "id, target_kind, target_id, target_user_id, target_author, target_preview, reason, status, created_at",
    )
    .order("status", { ascending: true }) // open < resolved
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as {
    id: string;
    target_kind: ReportTargetKind;
    target_id: string;
    target_user_id: string | null;
    target_author: string | null;
    target_preview: string | null;
    reason: string;
    status: "open" | "resolved";
    created_at: string;
  }[];
  if (rows.length === 0) return [];

  // 대상이 아직 살아있는지 종류별로 한 번씩만 조회(행 수만큼 쿼리하지 않는다).
  const idsByKind = new Map<ReportTargetKind, string[]>();
  for (const r of rows) {
    const list = idsByKind.get(r.target_kind) ?? [];
    if (!list.includes(r.target_id)) list.push(r.target_id);
    idsByKind.set(r.target_kind, list);
  }
  const userIds = [
    ...new Set(rows.map((r) => r.target_user_id).filter((v): v is string => !!v)),
  ];

  const [aliveSets, banByUser] = await Promise.all([
    Promise.all(
      [...idsByKind].map(async ([kind, ids]) => {
        const { data: alive } = await supabase
          .from(TABLE[kind])
          .select("id")
          .in("id", ids);
        return [
          kind,
          new Set(((alive ?? []) as { id: string }[]).map((x) => x.id)),
        ] as const;
      }),
    ),
    (async () => {
      // 정지 상태 표시용. profiles 전체 열람은 관리자 RLS라 일반 모더레이터는 빈 결과
      // → 뱃지만 안 뜨고 나머지 기능은 그대로 동작한다.
      if (userIds.length === 0) return new Map<string, BanInfo>();
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, suspended_until, banned_at")
        .in("user_id", userIds);
      return new Map(
        (
          (profs ?? []) as {
            user_id: string;
            suspended_until: string | null;
            banned_at: string | null;
          }[]
        ).map((p) => [
          p.user_id,
          { suspendedUntil: p.suspended_until, bannedAt: p.banned_at },
        ]),
      );
    })(),
  ]);

  const aliveByKind = new Map(aliveSets);

  return rows.map((r) => {
    const ban = banByUser.get(r.target_user_id ?? "");
    return {
      id: r.id,
      targetKind: r.target_kind,
      targetId: r.target_id,
      targetUserId: r.target_user_id,
      targetAuthor: r.target_author,
      targetPreview: r.target_preview,
      reason: r.reason,
      status: r.status,
      createdAt: r.created_at,
      contentExists: aliveByKind.get(r.target_kind)?.has(r.target_id) ?? false,
      targetSuspendedUntil: ban?.suspendedUntil ?? null,
      targetBannedAt: ban?.bannedAt ?? null,
    };
  });
}

type BanInfo = { suspendedUntil: string | null; bannedAt: string | null };

/** 미처리 신고 개수(네비 뱃지용). */
export async function getOpenReportCount(): Promise<number> {
  if (!(await isPostModerator())) return 0;
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from("post_reports")
    .select("id", { count: "exact", head: true })
    .eq("status", "open");
  return count ?? 0;
}