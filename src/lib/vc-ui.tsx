import { Link } from "@tanstack/react-router";

export function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null)
    return (
      <span className="inline-flex items-center rounded px-2 py-0.5 data-mono text-xs bg-secondary text-muted-foreground">
        —
      </span>
    );
  const cls =
    score >= 80
      ? "bg-bullish/15 text-bullish"
      : score >= 50
      ? "bg-neutral/15 text-neutral"
      : "bg-bearish/15 text-bearish";
  return (
    <span className={"inline-flex items-center rounded px-2 py-0.5 data-mono text-xs " + cls}>
      {score}
    </span>
  );
}

export function StatusPill({ status }: { status: string | null | undefined }) {
  const s = status ?? "new";
  const cls =
    s === "approved"
      ? "bg-bullish/15 text-bullish"
      : s === "rejected"
      ? "bg-bearish/15 text-bearish"
      : s === "screened"
      ? "bg-primary/15 text-primary"
      : "bg-secondary text-muted-foreground";
  return (
    <span className={"inline-flex items-center rounded px-2 py-0.5 text-[10px] uppercase tracking-wider font-mono " + cls}>
      {s}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6 px-8 py-6 border-b bg-surface-container-low">
      <div>
        <h1 className="text-2xl font-display font-semibold tracking-tight">{title}</h1>
        {subtitle && <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>}
      </div>
      {right}
    </div>
  );
}

export function OppLink({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <Link
      to="/opportunity/$id"
      params={{ id }}
      className="text-primary hover:underline"
    >
      {children}
    </Link>
  );
}