import Link from "next/link";

export function EmptyState({ title, description, href, action }: {
  title: string; description?: string; href?: string; action?: string;
}) {
  return <div className="app-card space-y-2 p-5 text-center">
    <p className="text-sm font-semibold text-foreground">{title}</p>
    {description && <p className="text-sm text-muted">{description}</p>}
    {href && action && <Link href={href} className="inline-flex min-h-11 items-center text-sm font-semibold text-brand">{action} →</Link>}
  </div>;
}
