import Link from "next/link";
import { notFound } from "next/navigation";
import { Leaf, Play } from "lucide-react";

import { isAdminUser } from "@/features/admin/admin";

export const dynamic = "force-dynamic";

// 관리자 전용 "테스트" 탭 — 실험/숨은 기능 진입점 모음.
export default async function AdminTestPage() {
  if (!(await isAdminUser())) notFound();

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10 sm:px-8">
      <h1 className="mb-1 text-2xl font-bold text-zinc-950 dark:text-zinc-100">
        테스트
      </h1>
      <p className="mb-6 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        아직 메뉴에 공개하지 않은 실험 기능들을 여기서 열어볼 수 있습니다.
      </p>

      <Link
        href="/running"
        className="block rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-emerald-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Play aria-hidden="true" size={24} />
          </span>
          <div className="min-w-0">
            <p className="text-base font-bold text-zinc-950 dark:text-zinc-100">
              런닝 모드 🏃
            </p>
            <p className="mt-0.5 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              카메라로 머리 움직임을 인식해 달리는 게임. 고개를 좌우로 돌려 레인
              이동, 위로 보면 점프, 제자리에서 달리면 캐릭터도 달립니다.
            </p>
            <p className="mt-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
              휴대폰에서 열어주세요 (카메라 필요).
            </p>
          </div>
        </div>
      </Link>

      <Link
        href="/jog"
        className="mt-4 block rounded-2xl border border-zinc-200 bg-white p-5 transition hover:border-emerald-400 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <Leaf aria-hidden="true" size={24} />
          </span>
          <div className="min-w-0">
            <p className="text-base font-bold text-zinc-950 dark:text-zinc-100">
              힐링 러닝 🌿
            </p>
            <p className="mt-0.5 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
              카메라 없이 폰의 흔들림으로 제자리 달리기를 감지합니다. 조작 없이,
              달리면 캐릭터가 예쁜 풍경 속을 자동으로 달리고 멈추면 함께 쉽니다.
            </p>
            <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              휴대폰 권장 (모션 센서). PC에선 화면을 꾹 눌러 달리기.
            </p>
          </div>
        </div>
      </Link>
    </main>
  );
}
