import Link from "next/link";

import { POSE_LABEL } from "@/features/lite/body-photos";
import type { BodyPhotosView } from "@/features/lite/body-photos-data";

const md = (ymd: string) => `${Number(ymd.slice(5, 7))}/${Number(ymd.slice(8, 10))}`;

/** 맞춤 운동 › 리포트 탭의 몸 사진 카드 — 최근 3장 + 비교 화면으로. */
export function BodyPhotosCard({ view }: { view: BodyPhotosView }) {
  return (
    <section className="app-card space-y-2 p-3" data-testid="lite-report-photos">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">몸 사진</h2>
        <Link href="/settings/body-photos" className="text-xs font-semibold text-brand">
          {view.photos.length ? "비교하러 가기 →" : "첫 사진 남기기 →"}
        </Link>
      </div>
      {view.photos.length ? (
        <ul className="grid grid-cols-3 gap-2">
          {view.photos.map((p) => (
            <li key={p.id} className="space-y-1">
              <div className="aspect-[3/4] overflow-hidden rounded-lg bg-zinc-100 dark:bg-white/[0.06]">
                {p.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.url} alt={`${md(p.takenOn)} ${POSE_LABEL[p.pose]} 몸 사진`} className="h-full w-full object-cover" />
                ) : null}
              </div>
              <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
                {md(p.takenOn)} {POSE_LABEL[p.pose]}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          한 달에 한 번 같은 자세로 찍어 두면, 숫자보다 변화가 잘 보여요. 사진은 나만 봐요.
        </p>
      )}
    </section>
  );
}
