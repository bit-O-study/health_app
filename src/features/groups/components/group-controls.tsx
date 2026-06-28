"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, LogOut, MessageCircle, Trash2 } from "lucide-react";

import {
  deleteGroupAction,
  leaveGroupAction,
} from "@/features/groups/group-actions";

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
}: {
  groupId: string;
  groupName: string;
  inviteToken: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  // 공개 배포 주소가 설정돼 있으면 그걸로(로컬 테스트 시 localhost 링크가 공유되는 문제 방지).
  const inviteUrl = () => {
    const base = (
      process.env.NEXT_PUBLIC_SITE_URL || window.location.origin
    ).replace(/\/$/, "");
    return `${base}/groups/join/${inviteToken}`;
  };

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

  async function shareKakao() {
    const url = inviteUrl();
    // 1) 카카오 JS SDK(전용 카드) — 키 있을 때
    try {
      const Kakao = await loadKakao();
      if (Kakao?.Share) {
        Kakao.Share.sendDefault({
          objectType: "text",
          text: `${groupName} 그룹에 초대합니다!\n운동 랭킹대전에 함께 참여해요 💪\n${url}`,
          link: { mobileWebUrl: url, webUrl: url },
          buttonTitle: "그룹 참여하기",
        });
        return;
      }
    } catch {
      /* 폴백으로 진행 */
    }
    // 2) 기기 공유 시트(모바일은 카카오톡 선택 가능)
    const nav = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    };
    if (nav.share) {
      try {
        // 링크를 text 안에도 넣어, 일부 공유 대상(카카오톡 등)이 url 필드를 빼먹어도 링크가 남게 한다.
        await nav.share({
          title: `${groupName} 그룹 초대`,
          text: `${groupName} 운동 그룹에 초대합니다 💪\n${url}`,
          url,
        });
        return;
      } catch {
        /* 취소 등 — 복사로 폴백 */
      }
    }
    // 3) 최후: 링크 복사 + 안내
    await copyLink();
    window.alert(
      "카카오톡 공유 창을 열 수 없어 초대 링크를 복사했어요.\n카카오톡 대화방에 붙여넣어 보내주세요.",
    );
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

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={shareKakao}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#FEE500] text-base font-bold text-[#191600] transition hover:brightness-95"
      >
        <MessageCircle aria-hidden="true" size={18} /> 카카오톡으로 초대
      </button>

      <button
        type="button"
        onClick={copyLink}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 text-base font-bold text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
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
