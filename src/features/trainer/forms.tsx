"use client";
import { useActionState, useState, type ReactNode } from "react";
import { trainerAction } from "./actions";
import { SHARE_FIELDS, SHARE_LABELS, type Sharing } from "./types";
import { sendGroupInviteCard } from "@/features/groups/share-invite";
import { loadKakao } from "@/features/groups/kakao-sdk";
import { groupInviteOrigin } from "@/features/groups/invite-link";
import { isNativeApp } from "@/lib/platform/is-native-app";

/**
 * 만든 초대 링크 보내기 — 카카오톡 공유(수락 버튼이 달린 카드) · 링크 복사.
 * 그룹 초대와 같은 방식이라 발송 업체 없이, 비용 없이 보낸다. 받는 사람은 카카오톡에서 트레이너가 고른다.
 */
function InviteShare({ link }: { link: string }) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  async function share() {
    if (busy) return;
    setBusy(true);
    setNote("");
    try {
      const inApp = isNativeApp() || /\bwv\b/.test(navigator.userAgent);
      const opened = await sendGroupInviteCard({
        title: "헬쑤 · 트레이너 초대",
        description: "트레이너가 연결을 요청했어요. 공유할 항목을 확인하고 수락해 주세요. 7일 동안 쓸 수 있어요.",
        imageUrl: `${groupInviteOrigin(process.env.NEXT_PUBLIC_SITE_URL)}/icon-512.png`,
        url: link,
        button: "초대 확인하기",
      }, inApp, loadKakao);
      if (!opened) setNote("카카오톡을 열지 못했어요. 링크를 복사해서 보내 주세요.");
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setNote("링크를 복사했어요.");
    } catch {
      setNote("복사하지 못했어요. 아래 링크를 길게 눌러 복사해 주세요.");
    }
  }
  const btn = "min-h-11 flex-1 rounded-xl px-4 py-2 text-sm font-semibold";
  return <div className="space-y-2" data-testid="trainer-invite-share">
    <div className="flex gap-2">
      <button type="button" onClick={share} disabled={busy} className={`${btn} bg-brand text-white disabled:opacity-60 dark:text-zinc-950`}>{busy ? "여는 중…" : "카카오톡으로 보내기"}</button>
      <button type="button" onClick={copy} className={`${btn} border border-line`}>링크 복사</button>
    </div>
    {note && <p role="status" className="text-sm">{note}</p>}
    <label className="block space-y-1 text-sm">초대 링크 (7일 유효)<input readOnly value={link} onFocus={event => event.target.select()} className="min-h-11 w-full rounded-lg border border-line px-2" /></label>
  </div>;
}
export function TrainerForm({ intent, label, children }: { intent: string; label: string; children?: ReactNode }) {
  const [state, action, pending] = useActionState(trainerAction, { ok: false, message: "" });
  return <form action={action} className="space-y-3">
    <input type="hidden" name="intent" value={intent} />
    <fieldset disabled={pending} className="space-y-3 disabled:opacity-60">{children}
      <button className="min-h-11 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white dark:text-zinc-950" type="submit">{pending ? "처리 중…" : label}</button>
    </fieldset>
    {state.message && <p role={state.ok ? "status" : "alert"} className="text-sm leading-6">{state.message}</p>}
    {state.link && <InviteShare link={state.link} />}
  </form>;
}
export function SharingFields({ initial }: { initial?: Sharing }) {
  return <fieldset className="space-y-2"><legend className="mb-2 text-sm font-semibold">트레이너에게 허용할 정보</legend>
    {SHARE_FIELDS.map(key => <label key={key} className="flex min-h-11 items-center gap-3 text-sm">
      <input type="checkbox" name={key} defaultChecked={initial?.[key] ?? false} className="h-5 w-5 accent-brand" />{SHARE_LABELS[key]}
    </label>)}
  </fieldset>;
}