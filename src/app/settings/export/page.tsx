import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Download } from "lucide-react";

import { PageHeader } from "@/components/page-header";
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
 *
 * 촘촘한 그룹 목록(2026-09-16 8단계) — "담기는 것 / 일부러 빼는 것" 약속은 목록 그대로 남긴다.
 */

const ORDER: ExportKind[] = ["workouts", "body", "diet", "backup"];

export default async function ExportPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirect=/settings/export");

  const excluded = EXPORT_SCOPE.filter((s) => !s.included);
  const included = EXPORT_SCOPE.filter((s) => s.included);

  return (
    <div className="app-page">
      <PageHeader title="내 데이터 내보내기" back="설정" />
      <main className="app-container space-y-4">
        <section>
          <h2 className="app-section-label">파일로 받기</h2>
          <div className="app-list">
            {ORDER.map((kind) => {
              const meta = EXPORT_KINDS[kind];
              return (
                <a
                  key={kind}
                  href={`/api/export/${kind}`}
                  download
                  data-testid={`export-${kind}`}
                  className="app-row transition active:bg-zinc-100 dark:active:bg-white/[0.06]"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-white/[0.08] dark:text-zinc-300">
                    <Download aria-hidden="true" size={16} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base text-zinc-900 dark:text-zinc-100">
                      {meta.label}
                    </span>
                    <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {meta.description}
                    </span>
                  </span>
                  <span className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-medium uppercase text-zinc-500 dark:bg-white/[0.08] dark:text-zinc-300">
                    {meta.ext}
                  </span>
                </a>
              );
            })}
          </div>
          <p className="mt-1.5 px-1 text-xs text-zinc-500 dark:text-zinc-400">
            CSV 는 엑셀·구글시트에서 바로 열립니다.
          </p>
        </section>

        {/* 담기는 것은 이름만 한 줄로 — 항목이 많아 줄마다 이유를 달면 화면이 끝없이 길어진다. */}
        <section>
          <h2 className="app-section-label">담기는 것</h2>
          <p className="app-card p-3 text-sm leading-6 text-zinc-700 dark:text-zinc-300">
            {included.map((s) => s.label).join(" · ")}
          </p>
        </section>
        <ScopeList title="일부러 빼는 것" items={excluded} />
        <p className="-mt-2 px-1 text-xs text-zinc-500 dark:text-zinc-400">
          내 계정 기록만 담기고 서버에 파일을 남기지 않아요. 사진은 경로만 담깁니다.
        </p>

        <Link
          href="/account-deletion"
          className="app-card flex items-center gap-2 p-3 text-sm transition active:bg-zinc-100 dark:active:bg-white/[0.06]"
        >
          <span className="min-w-0 flex-1 text-zinc-700 dark:text-zinc-300">
            계정을 삭제하면 기록이 <b className="font-semibold text-danger">되돌릴 수 없게</b> 사라져요
          </span>
          <span className="shrink-0 font-semibold text-brand">계정 삭제 안내 보기</span>
          <ChevronRight aria-hidden="true" size={16} className="-ml-1 shrink-0 text-zinc-400" />
        </Link>
      </main>
    </div>
  );
}

function ScopeList({
  title,
  items,
}: {
  title: string;
  items: { table: string; label: string; reason: string }[];
}) {
  return (
    <section>
      <h2 className="app-section-label">{title}</h2>
      <ul className="app-list">
        {items.map((s) => (
          <li key={s.table} className="px-3 py-2">
            <p className="text-sm text-zinc-900 dark:text-zinc-100">{s.label}</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{s.reason}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
