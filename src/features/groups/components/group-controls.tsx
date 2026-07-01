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
  const siteBase = () =>
    (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(
      /\/$/,
      "",
    );
  const inviteUrl = () => `${siteBase()}/groups/join/${inviteToken}`;

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

    // 링크는 별도 줄에 두면 카카오톡이 OG 카드로 깔끔하게 펼친다("참여 링크:" 접두 제거).
    const text = `${groupName} 운동 그룹에 초대합니다 💪\n${url}`;

    // in-app(네이티브/웹뷰) 판별 — appendUserAgent 표식(helssu-app) 우선, window.Capacitor,
    // 그리고 Android WebView 표식(UA 의 'wv') 까지 본다. wv 를 포함하면 브라우저용 카카오
    // 카드(intent://)는 제로페이로 새거나 무반응이라 절대 안 쓰고, 네이티브 공유→복사로 간다.
    // (구버전 APK 라 helssu-app 표식이 없어도 '앱 안'임을 감지해 조용히 실패하지 않게 한다.)
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const hasUa = ua.includes("helssu-app");
    const isAndroidWebView = /;\s*wv\)/.test(ua) || /\bwv\b/.test(ua);
    const hasBridge =
      typeof window !== "undefined" &&
      !!(window as unknown as { Capacitor?: unknown }).Capacitor;
    const inApp = hasUa || hasBridge || isAndroidWebView;

    if (inApp) {
      // 1) 카카오 네이티브 SDK — "그룹 참여하기" 버튼이 박힌 카카오톡 카드(원하던 그 카드).
      try {
        const mod = (await import("capacitor-kakao-plugin")) as unknown as {
          CapacitorKakao: {
            shareDefault(o: {
              title: string;
              description: string;
              imageUrl: string;
              imageLinkUrl: string;
              buttonTitle: string;
            }): Promise<void>;
          };
        };
        await mod.CapacitorKakao.shareDefault({
          title: `${groupName} · 운동 그룹 초대`,
          description: "운동 랭킹대전에 함께 참여해요 💪",
          imageUrl: `${siteBase()}/icon-512.png`,
          imageLinkUrl: url,
          buttonTitle: "그룹 참여하기",
        });
        return;
      } catch {
        /* 카카오 네이티브 불가(SDK/브리지/미설치) → 아래 공유시트로 폴백 */
      }

      // 2) 네이티브 공유시트(@capacitor/share) — 카카오톡 등 선택 전송.
      try {
        const { Share } = await import("@capacitor/share");
        await Share.share({
          title: `${groupName} 그룹 초대`,
          text,
          url,
          dialogTitle: "친구에게 초대 보내기",
        });
        return;
      } catch (e) {
        // 실패 원인을 그대로 노출(브리지/플러그인 진단) — 링크 복사로 폴백.
        await copyLink();
        window.alert(
          `앱 공유 실패 → 링크 복사함.\n사유: ${
            e instanceof Error ? e.message : String(e)
          }\n[진단] 앱UA:${hasUa ? "O" : "X"} · 브릿지:${hasBridge ? "O" : "X"}`,
        );
        return;
      }
    }

    // 웹: 카카오 카드(버튼) 우선 → 기기 공유 → 링크 복사.
    const key = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
    if (key) {
      try {
        const Kakao = await loadKakao();
        if (Kakao?.Share) {
          const link = { mobileWebUrl: url, webUrl: url };
          Kakao.Share.sendDefault({
            objectType: "feed",
            content: {
              title: `${groupName} · 운동 그룹 초대`,
              description: "운동 랭킹대전에 함께 참여해요 💪",
              imageUrl: `${siteBase()}/icon-512.png`,
              link,
            },
            buttons: [{ title: "그룹 참여하기", link }],
          });
          return;
        }
      } catch {
        /* 폴백 진행 */
      }
    }

    const nav = navigator as Navigator & {
      share?: (data: ShareData) => Promise<void>;
    };
    if (nav.share) {
      try {
        await nav.share({ title: `${groupName} 그룹 초대`, text, url });
        return;
      } catch {
        /* 취소 등 — 복사로 폴백 */
      }
    }
    await copyLink();
    window.alert("초대 링크를 복사했어요. 카카오톡 대화방에 붙여넣어 보내주세요.");
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
