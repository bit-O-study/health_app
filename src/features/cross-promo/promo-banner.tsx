import { otherApps } from "@/features/cross-promo/apps";

/** 자매 서비스 홍보 배너 — 헬쑤 홈 하단. 헬쑤를 뺀 나머지(IQ·양주)를 노출. */
export function PromoBanner() {
  const apps = otherApps("health");
  return (
    <section className="mt-8">
      <p className="mb-2 text-xs font-semibold text-zinc-400">함께 해보세요</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {apps.map((a) => (
          <a
            key={a.key}
            href={a.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-3.5 transition hover:border-zinc-300 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700"
          >
            <span className="text-2xl" aria-hidden="true">
              {a.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                {a.name}
              </p>
              <p className="truncate text-xs text-zinc-500">{a.desc}</p>
            </div>
            <span className="text-zinc-400" aria-hidden="true">
              →
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}