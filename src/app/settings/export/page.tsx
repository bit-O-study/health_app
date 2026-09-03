import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, Download, ShieldCheck } from "lucide-react";

import { BackLink } from "@/components/back-link";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  EXPORT_KINDS,
  EXPORT_SCOPE,
  type ExportKind,
} from "@/features/export/export-format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "내 데이터 내보내기",
};

/**
 * 내 데이터 내보내기 화면 — 로드맵 5.1.
 *
 * 받는 버튼은 전부 **평범한 링크**다. 클릭 → `/api/export/...` 가 첨부파일로
 * 응답한다. 자바스크립트로 만들어 저장하는 방식(Blob + a.click)을 쓰지 않는 이유는
 * 두 가지 — 전 기간 데이터를 브라우저 메모리에 올려야 하고, 안드로이드 WebView 에서
 * blob 다운로드가 조용히 실패한다. 서버가 첨부파일로 주면 둘 다 없다.
 */

const ORDER: ExportKind[] = ["workouts", "body", "diet", "backup"];

export default async function ExportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/settings/export");

  const excluded = EXPORT_SCOPE.filter((s) => !s.included);
  const included = EXPORT_SCOPE.filter((s) => s.included);

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-10 sm:px-8">
      <BackLink className="inline-flex items-center gap-1 text-sm font-semibold text-zinc-500 transition hover:text-zinc-800 dark:hover:text-zinc-200">
        <ChevronLeft aria-hidden="true" size={16} />
        뒤로
      </BackLink>

      <div className="mt-6 space-y-1">
        <h1 className="text-2xl font-bold text-zinc-950 dark:text-zinc-100">
          내 데이터 내보내기
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          내가 기록한 것은 내 것입니다. 언제든 파일로 받아 갈 수 있어요.
        </p>
      </div>

      <section className="mt-8 space-y-3">
        {ORDER.map((kind) => {
          const meta = EXPORT_KINDS[kind];
          return (
            <a
              key={kind}
              href={`/api/export/${kind}`}
              download
              data-testid={`export-${kind}`}
              className="group flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-4 shadow-sm transition hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md sm:gap-4 sm:p-5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
                <Download aria-hidden="true" size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">
                  {meta.label}
                  <span className="ml-2 rounded bg-zinc-100 dark:bg-zinc-700 px-1.5 py-0.5 text-[11px] font-bold uppercase text-zinc-500 dark:text-zinc-300">
                    {meta.ext}
                  </span>
                </h2>
                <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
                  {meta.description}
                </p>
              </div>
            </a>
          );
        })}
      </section>

      <p className="mt-4 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
        CSV 는 엑셀·구글시트에서 바로 열립니다(한글이 깨지지 않게 UTF-8 표식을 넣어
        보냅니다). 기록이 많으면 파일을 만드는 데 몇 초가 걸릴 수 있어요.
      </p>

      <section className="mt-10 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold text-zinc-950 dark:text-zinc-100">
          <ShieldCheck
            aria-hidden="true"
            size={18}
            className="text-emerald-600 dark:text-emerald-400"
          />
          무엇이 담기고, 무엇이 빠지나
        </h2>

        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
          내보내는 파일에는 <b>내 계정의 기록만</b> 담깁니다. 서버에는 파일을 만들어
          두지 않고, 요청한 그 자리에서 바로 내려보냅니다 — 나중에 링크로 남의 손에
          갈 파일이 없습니다.
        </p>

        <h3 className="mt-5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
          담기는 것
        </h3>
        <ul className="mt-2 space-y-1">
          {included.map((s) => (
            <li
              key={s.table}
              className="text-sm text-zinc-700 dark:text-zinc-300"
            >
              <b className="font-semibold">{s.label}</b>
              <span className="text-zinc-500 dark:text-zinc-400">
                {" "}
                — {s.reason}
              </span>
            </li>
          ))}
        </ul>

        <h3 className="mt-5 text-sm font-bold text-zinc-900 dark:text-zinc-100">
          일부러 빼는 것
        </h3>
        <ul className="mt-2 space-y-1">
          {excluded.map((s) => (
            <li
              key={s.table}
              className="text-sm text-zinc-700 dark:text-zinc-300"
            >
              <b className="font-semibold">{s.label}</b>
              <span className="text-zinc-500 dark:text-zinc-400">
                {" "}
                — {s.reason}
              </span>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          사진은 파일 자체가 아니라 <b>경로만</b> 담깁니다. 받은 파일에는 내 기록이
          그대로 들어 있으니, 공용 PC 나 공유 폴더에 두지 마세요.
        </p>
      </section>

      <section className="mt-6 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-5">
        <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-100">
          계정을 지우기 전에
        </h2>
        <p className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
          계정을 삭제하면 위 기록도 함께 사라지고 <b>되돌릴 수 없습니다.</b> 지우기
          전에 먼저 내려받아 두세요.
        </p>
        <Link
          href="/account-deletion"
          className="mt-3 inline-block text-sm font-semibold text-amber-800 dark:text-amber-300 underline underline-offset-4"
        >
          계정 삭제 안내 보기
        </Link>
      </section>
    </main>
  );
}
