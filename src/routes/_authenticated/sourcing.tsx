import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { demoOpportunities, demoEvidence } from "@/lib/demo-data";
import { MSym } from "@/components/AppSidebar";
import { useState } from "react";
import { toast } from "sonner";
import { runSourcing } from "@/lib/vc.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/_authenticated/sourcing")({
  head: () => ({ meta: [{ title: "Sourcing Pipeline — Cérebro VC" }] }),
  component: SourcingPage,
});

const COLUMNS: Array<{ key: string; label: string; accent: string }> = [
  { key: "sourced", label: "Sourced", accent: "text-outline" },
  { key: "screened", label: "Screened", accent: "text-primary" },
  { key: "approved", label: "Approved", accent: "text-bullish" },
  { key: "rejected", label: "Rejected", accent: "text-bearish" },
];

function SourcingPage() {
  const [running, setRunning] = useState(false);
  const run = useServerFn(runSourcing);

  const opps = useQuery({
    queryKey: ["opps-sourcing"],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("opportunities")
          .select("id, company_name, status, updated_at, created_at, founders(name, founder_score, github_handle)")
          .order("updated_at", { ascending: false });
        if (data && data.length > 0) return data as any[];
      } catch {}
      return demoOpportunities as any[];
    },
  });

  const evidence = useQuery({
    queryKey: ["evidence-sourcing"],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("evidence_logs")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(12);
        if (data && data.length > 0) return data as any[];
      } catch {}
      return demoEvidence as any[];
    },
  });

  const rows = opps.data ?? [];
  const ev = evidence.data ?? [];
  const normStatus = (s: string) =>
    s === "screening_complete" ? "screened" : s ?? "sourced";

  const kpis = [
    { k: "sourced", v: rows.filter((r) => normStatus(r.status) === "sourced").length, label: "Sourced", icon: "explore" },
    { k: "screened", v: rows.filter((r) => normStatus(r.status) === "screened").length, label: "Screened", icon: "analytics" },
    { k: "approved", v: rows.filter((r) => normStatus(r.status) === "approved").length, label: "Approved", icon: "check_circle" },
    { k: "rejected", v: rows.filter((r) => normStatus(r.status) === "rejected").length, label: "Rejected", icon: "cancel" },
  ];

  const sourceCoverage = ["github", "web", "manual"].map((src) => ({
    src,
    n: ev.filter((e: any) => e.source_type === src).length,
  }));

  const onRun = async () => {
    setRunning(true);
    try {
      const r = await run({});
      toast.success(`Sourcing complete: ${r.inserted} new opportunities`);
      opps.refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Sourcing failed (sign in required)");
    } finally {
      setRunning(false);
    }
  };

  return (
    <main className="px-4 mt-6 max-w-lg mx-auto pb-24">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold">Sourcing Pipeline</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Autonomous deal-flow funnel · live agent activity
          </p>
        </div>
        <button
          onClick={onRun}
          disabled={running}
          className="shrink-0 px-3 py-2 rounded-lg bg-secondary-container text-on-secondary-container font-mono text-[11px] font-bold uppercase tracking-wider flex items-center gap-2 disabled:opacity-40 cyber-glow"
        >
          <MSym name={running ? "hourglass_top" : "auto_awesome"} className="!text-[16px]" />
          {running ? "Running…" : "Run AI Sourcing"}
        </button>
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-6">
        {kpis.map((k) => (
          <div key={k.k} className="glass-panel rounded-xl p-3 text-center">
            <MSym name={k.icon} className="!text-[16px] text-outline" />
            <div className="font-mono text-xl font-bold mt-1">{k.v}</div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-outline">{k.label}</div>
          </div>
        ))}
      </section>

      {/* Source coverage */}
      <section className="mb-6 flex gap-2 flex-wrap">
        {sourceCoverage.map((s) => (
          <span
            key={s.src}
            className="px-3 py-1 rounded-full bg-surface-container-lowest border border-outline-variant/30 font-mono text-[10px] uppercase tracking-wider flex items-center gap-2"
          >
            <MSym
              name={s.src === "github" ? "code" : s.src === "web" ? "public" : "edit_note"}
              className="!text-[12px] text-primary"
            />
            {s.src} · <span className="text-on-surface font-bold">{s.n}</span>
          </span>
        ))}
      </section>

      {/* Kanban */}
      <section className="mb-8">
        <h2 className="font-display text-lg font-semibold mb-3">Pipeline</h2>
        <div className="flex gap-3 overflow-x-auto hide-scrollbar -mx-4 px-4 pb-2 snap-x">
          {COLUMNS.map((c) => {
            const items = rows.filter((r) => normStatus(r.status) === c.key);
            return (
              <div key={c.key} className="w-[220px] shrink-0 snap-start">
                <div className={"flex items-center justify-between mb-2 " + c.accent}>
                  <span className="font-mono text-[10px] uppercase tracking-wider font-bold">
                    {c.label}
                  </span>
                  <span className="font-mono text-[10px] opacity-70">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.length === 0 && (
                    <div className="glass-panel rounded-lg p-3 text-[11px] text-outline text-center">
                      Empty
                    </div>
                  )}
                  {items.map((o: any) => {
                    const score = o.founders?.founder_score ?? 0;
                    const initials = (o.founders?.name ?? "?")
                      .split(" ")
                      .map((n: string) => n[0])
                      .slice(0, 2)
                      .join("");
                    return (
                      <Link
                        key={o.id}
                        to="/opportunity/$id"
                        params={{ id: o.id }}
                        className="glass-panel rounded-lg p-3 block hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center text-[9px] font-bold shrink-0">
                              {initials}
                            </div>
                            <span className="text-sm font-medium truncate">
                              {o.company_name}
                            </span>
                          </div>
                          <span
                            className={
                              "font-mono text-[10px] font-bold px-1.5 py-0.5 rounded " +
                              (score >= 80
                                ? "bg-bullish/15 text-bullish"
                                : score >= 50
                                  ? "bg-neutral/15 text-neutral"
                                  : "bg-bearish/15 text-bearish")
                            }
                          >
                            {score || "—"}
                          </span>
                        </div>
                        <div className="font-mono text-[10px] text-outline truncate">
                          {o.founders?.name ?? "—"}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Live agent feed */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-display text-lg font-semibold">Agent Activity</h2>
          <div className="w-2 h-2 bg-bullish rounded-full status-pulse" />
        </div>
        <div className="space-y-2">
          {ev.slice(0, 8).map((e: any) => (
            <a
              key={e.id}
              href={e.source_url}
              target="_blank"
              rel="noreferrer"
              className="glass-panel rounded-lg p-3 flex items-start gap-3 hover:border-primary/40 transition-colors"
            >
              <MSym
                name={e.source_type === "github" ? "code" : "public"}
                className="!text-[16px] text-primary mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs leading-snug">{e.content_snippet}</p>
                <div className="mt-1 flex items-center gap-2 font-mono text-[9px] uppercase tracking-wider text-outline">
                  <span>{e.source_type}</span>
                  <span>·</span>
                  <span>trust {(Number(e.trust_score) * 100).toFixed(0)}%</span>
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}