"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  Check,
  Copy,
  Loader2,
  LogOut,
  MessageCircle,
  Trash2,
} from "lucide-react";

import {
  deleteGroupAction,
  leaveGroupAction,
} from "@/features/groups/group-actions";
import { isNativeApp } from "@/lib/platform/is-native-app";
import { sendGroupInviteCard } from "@/features/groups/share-invite";
import { groupInviteOrigin, groupInviteUrl } from "@/features/groups/invite-link";
import {
  DEFAULT_GROUP_MODE,
  GROUP_INVITE_DESCRIPTION,
  type GroupMode,
} from "@/features/groups/group-mode";

type KakaoLike = {
  isInitialized: () => boolean;
  init: (key: string) => void;
  Share?: { sendDefault: (opts: unknown) => void };
};

/** 카카오 JS SDK 로드 + init. 키(NEXT_PUBLIC_KAKAO_JS_KEY) 없으면 null. */
async function loadKakao(): Promise<KakaoLike | null> {
  const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
  if (!key || typeof window === "undefined") return null;
  const w = window as unknown as { Kakao?: KakaoLike };
  if (!w.Kakao) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error("sdk load fail"));
      document.head.appendChild(s);
    }).catch(() => {});
  }
  const Kakao = w.Kakao;
  if (!Kakao) return null;
  if (!Kakao.isInitialized()) Kakao.init(key);
  return Kakao;
}

export function GroupControls({
  groupId,
  groupName,
  inviteToken,
  isOwner,
  compact = false,
  mode = DEFAULT_GROUP_MODE,
}: {
  groupId: string;
  groupName: string;
  inviteToken: string;
  isOwner: boolean;
  /** 관리 목록용 — 작은 아이콘 버튼 한 줄. */
  compact?: boolean;
  /** 그룹탭 전역 모드 — 초대 카드 문구를 지금 보이는 화면에 맞춘다. */
  mode?: GroupMode;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState("");

  // 공개 배포 주소가 설정돼 있으면 그걸로(로컬 테스트 시 localhost 링크가 공유되는 문제 방지).
  const siteBase = () => groupInviteOrigin(process.env.NEXT_PUBLIC_SITE_URL);
  const inviteUrl = () => groupInviteUrl(inviteToken, process.env.NEXT_PUBLIC_SITE_URL);

  async function copyLink() {
    const url = inviteUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt("초대 링크를 복사하세요", url);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // 중복 클릭 방지 — 공유가 진행 중이면 무시(공유시트 여러 개 뜨는 문제 차단).
  async function shareKakao() {
    if (sharing) return;
    setSharing(true);
    setShareError("");
    try {
      await doShareKakao();
    } finally {
      setSharing(false);
    }
  }

  async function doShareKakao() {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const inApp = isNativeApp() || /\bwv\b/.test(ua);
    const opened = await sendGroupInviteCard({
      title: `${groupName} · 운동 그룹 초대`,
      description: GROUP_INVITE_DESCRIPTION[mode],
      imageUrl: `${siteBase()}/icon-512.png`,
      url: inviteUrl(),
    }, inApp, loadKakao);
    if (!opened) setShareError("참여 버튼이 있는 카카오 초대를 열지 못했어요. 다시 시도해 주세요. 링크 복사로 보내면 참여 버튼은 표시되지 않아요.");
  }
  function leave() {
    if (!window.confirm("그룹에서 나가시겠어요?")) return;
    start(async () => {
      await leaveGroupAction(groupId);
      router.push("/groups");
    });
  }

  function remove() {
    if (!window.confirm("그룹을 삭제하면 되돌릴 수 없어요. 삭제할까요?")) return;
    start(async () => {
      await deleteGroupAction(groupId);
      router.push("/groups");
    });
  }

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {shareError && <p role="alert" className="w-full text-xs text-red-600 dark:text-red-400">{shareError}</p>}
        <button
          type="button"
          onClick={shareKakao}
          disabled={sharing}
          className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-[#FEE500] text-xs font-bold text-[#191600] transition hover:brightness-95 disabled:opacity-60"
        >
          {sharing ? (
            <Loader2 aria-hidden="true" size={13} className="animate-spin" />
          ) : (
            <MessageCircle aria-hidden="true" size={13} />
          )}{" "}
          초대
        </button>
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-lg border border-brand/40 bg-brand-soft text-xs font-bold text-brand transition hover:bg-brand-soft"
        >
          {copied ? (
            <Check aria-hidden="true" size={13} />
          ) : (
            <Copy aria-hidden="true" size={13} />
          )}
          {copied ? "복사됨" : "링크"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={isOwner ? remove : leave}
          aria-label={isOwner ? "그룹 삭제" : "그룹 나가기"}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-300 text-zinc-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-red-950/40"
        >
          {isOwner ? (
            <Trash2 aria-hidden="true" size={14} />
          ) : (
            <LogOut aria-hidden="true" size={14} />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {shareError && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{shareError}</p>}
      <button
        type="button"
        onClick={shareKakao}
        disabled={sharing}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] text-base font-bold text-[#191600] transition hover:brightness-95 disabled:opacity-60"
      >
        {sharing ? (
          <Loader2 aria-hidden="true" size={18} className="animate-spin" />
        ) : (
          <MessageCircle aria-hidden="true" size={18} />
        )}{" "}
        카카오톡으로 초대
      </button>

      <button
        type="button"
        onClick={copyLink}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-brand/40 bg-brand-soft text-base font-bold text-brand transition hover:bg-brand-soft"
      >
        {copied ? (
          <>
            <Check aria-hidden="true" size={18} /> 복사됨!
          </>
        ) : (
          <>
            <Copy aria-hidden="true" size={18} /> 초대 링크 복사
          </>
        )}
      </button>


      {isOwner ? (
        <button
          type="button"
          disabled={pending}
          onClick={remove}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-300 text-sm font-bold text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:hover:bg-red-950/40"
        >
          <Trash2 aria-hidden="true" size={16} /> 그룹 삭제
        </button>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={leave}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-zinc-300 text-sm font-bold text-zinc-600 transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <LogOut aria-hidden="true" size={16} /> 그룹 나가기
        </button>
      )}
    </div>
  );
}
