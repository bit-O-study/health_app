"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Heart, MessageCircle, Video } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { relativeTime } from "../community";
import { markCommunityNotificationsReadAction } from "../community-actions";
import { notificationHref, notificationText, type CommunityNotification } from "../community-notifications";

/**
 * 커뮤니티 알림 목록. 들어오면 전부 읽음으로 — 안 읽은 줄은 이번 방문에서만 점으로 표시한다.
 * 글이 지워지면 알림도 같이 지워진다(DB on delete cascade) — 눌렀는데 없는 글로 가지 않게.
 */
export function CommunityNotificationList({ items }: { items: CommunityNotification[] }) {
  const [now] = useState(() => Date.now());
  useEffect(() => {
    if (items.some((n) => !n.read)) void markCommunityNotificationsReadAction();
  }, [items]);

  return (
    <div className="app-page">
      <PageHeader title="알림" backHref="/community" back="커뮤니티" />
      <main className="mx-auto w-full max-w-3xl px-4 pb-24 sm:px-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-20 text-center">
            <Bell aria-hidden="true" size={28} className="text-zinc-300 dark:text-zinc-600" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400">아직 알림이 없어요</p>
            <p className="text-xs text-zinc-400">내 글에 댓글이 달리면 바로, 받은 좋아요는 하루 한 번 모아 알려드려요.</p>
          </div>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-100 dark:divide-white/[0.06]" data-testid="community-notifications">
            {items.map((n) => {
              const text = notificationText(n);
              const Icon = n.kind === "likes" ? Heart : n.kind === "teaching_comment" ? Video : MessageCircle;
              return (
                <li key={n.id}>
                  <Link href={notificationHref(n)} className="flex items-start gap-3 py-3">
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
                      <Icon aria-hidden="true" size={18} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold leading-snug text-zinc-900 dark:text-zinc-100">{text.title}</span>
                      {text.body ? <span className="mt-0.5 block truncate text-sm text-zinc-500 dark:text-zinc-400">{text.body}</span> : null}
                      <span className="mt-0.5 block text-xs text-zinc-400">{relativeTime(new Date(n.createdAt).getTime(), now)}</span>
                    </span>
                    {!n.read ? <span aria-label="새 알림" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-rose-500" /> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <p className="mt-6 text-center text-xs text-zinc-400">
          푸시 알림은 <Link href="/settings/notifications" className="underline">설정 › 알림</Link>의 ‘커뮤니티 반응’에서 끌 수 있어요.
        </p>
      </main>
    </div>
  );
}
