import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { demoOpportunities, demoThesis } from "@/lib/demo-data";
import { MSym } from "@/components/AppSidebar";
import { discoverOpportunities, promoteDiscovery } from "@/lib/vc.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Cérebro VC" }] }),
  component: Dashboard,
});

function Dashboard() {
  const qc = useQueryClient();
  const runDiscover = useServerFn(discoverOpportunities);
  const runPromote = useServerFn(promoteDiscovery);

  const thesis = useQuery({
    queryKey: ["thesis"],
    queryFn: async () => {
      try {
        const { data } = await supabase.from("thesis_config").select("*").limit(1).maybeSingle();
        return data ?? demoThesis;
      } catch {
        return demoThesis;
      }
    },
  });

  const discovered = useQuery({
    queryKey: ["discovered"],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("opportunities")
          .select("id, company_name, source, discovery_reason, discovered_at, status, founders(name, founder_score)")
          .in("source", ["github", "arxiv"])
          .order("discovered_at", { ascending: false })
          .limit(10);
        return (data ?? []) as any[];
      } catch {
        return [] as any[];
      }
    },
  });

  const discoverMut = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sign in to run AI Discovery.");
      return runDiscover();
    },
    onSuccess: (res: any) => {
      if (res?.error) {
        toast.error(`Discovery failed: ${res.error}`);
      } else {
        toast.success(
          `AI Discovery: +${res?.inserted ?? 0} new · ${res?.skipped ?? 0} skipped` +
            (res?.providers ? ` · GH: ${res.providers.github} · arXiv: ${res.providers.arxiv}` : ""),
        );
      }
      qc.invalidateQueries({ queryKey: ["discovered"] });
      qc.invalidateQueries({ queryKey: ["opportunities"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Discovery failed. Sign in to enable."),
  });

  const promoteMut = useMutation({
    mutationFn: async (id: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Sign in to promote candidates.");
      return runPromote({ data: { opportunityId: id } });
    },
    onSuccess: () => {
      toast.success("Promoted to pipeline");
      qc.invalidateQueries({ queryKey: ["discovered"] });
      qc.invalidateQueries({ queryKey: ["opportunities"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Promote failed"),
  });

  const opps = useQuery({
    queryKey: ["opportunities"],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("opportunities")
          .select("id, company_name, status, updated_at, founders(name, founder_score)")
          .order("created_at", { ascending: false });
        if (data && data.length > 0) return data as any[];
      } catch {}
      return demoOpportunities as any[];
    },
  });

  const thesisLine = thesis.data
    ? `${(thesis.data.sectors ?? [])[0] ?? "Series A"} / ${(thesis.data.sectors ?? [])[1] ?? "DeepTech"} / $${((thesis.data.check_size ?? 100000) / 1000).toFixed(0)}K checks`
    : "Series A / DeepTech / $100K checks";

  return (
    <main className="px-4 mt-6 max-w-lg mx-auto">
      {/* Search & Thesis */}
      <section className="space-y-4 mb-8">
        <div className="relative">
          <MSym name="search" className="!absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant !text-[20px]" />
          <input
            type="text"
            placeholder="Technical founders in Berlin, AI Infra..."
            className="w-full bg-surface-container-lowest border border-outline-variant/30 rounded-xl py-3 pl-10 pr-4 text-sm focus:border-primary transition-all outline-none"
          />
        </div>
        <div className="glass-panel p-3 rounded-xl flex items-center justify-between">
          <div>
            <span className="font-mono text-[11px] font-bold tracking-[0.06em] text-outline block mb-0.5 uppercase">
              Active Thesis
            </span>
            <p className="font-mono text-[13px] font-medium text-primary">{thesisLine}</p>
          </div>
          <div className="h-8 w-8 bg-secondary-container/20 rounded-full flex items-center justify-center">
            <MSym name="filter_list" className="text-primary !text-[18px]" />
          </div>
        </div>
      </section>

      {/* AI Discovery Feed */}
      <section className="mb-8">
        <div className="flex justify-between items-end gap-3 mb-4">
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-semibold">AI Discovery Feed</h2>
            <p className="font-mono text-[11px] text-outline-variant mt-1">
              GitHub + arXiv · curated by OpenAI · driven by active thesis
            </p>
          </div>
          <button
            onClick={() => discoverMut.mutate()}
            disabled={discoverMut.isPending}
            className="shrink-0 px-3 py-2 rounded-lg bg-secondary-container text-on-secondary-container text-[12px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
          >
            <MSym name={discoverMut.isPending ? "hourglass_top" : "neurology"} className="!text-[16px]" />
            {discoverMut.isPending ? "Scanning…" : "Run"}
          </button>
        </div>
        {(discovered.data?.length ?? 0) === 0 ? (
          <div className="glass-panel p-4 rounded-xl text-center text-sm text-outline-variant">
            No discoveries yet. Tap <span className="text-primary font-mono">Run</span> to scan GitHub + arXiv against
            your active thesis.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(discovered.data ?? []).map((d: any) => (
              <div
                key={d.id}
                className="w-full glass-panel p-3 rounded-xl border-l-2 border-l-primary flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-primary/15 text-primary">
                    {d.source === "github" ? "GitHub" : "arXiv"}
                  </span>
                  <span className={`font-mono text-[11px] font-bold ${
                    (d.founders?.founder_score ?? 0) > 80 ? "text-bullish" :
                    (d.founders?.founder_score ?? 0) > 50 ? "text-tertiary" : "text-outline"
                  }`}>
                    {d.founders?.founder_score ?? "—"}
                  </span>
                </div>
                <Link
                  to="/opportunity/$id"
                  params={{ id: d.id }}
                  className="block"
                >
                  <p className="font-display text-base font-semibold leading-tight">{d.company_name}</p>
                  <p className="text-[12px] text-outline-variant">{d.founders?.name ?? "Unknown founder"}</p>
                </Link>
                <p className="text-[12px] leading-snug line-clamp-3 text-on-surface/80">{d.discovery_reason}</p>
                <button
                  onClick={() => promoteMut.mutate(d.id)}
                  disabled={promoteMut.isPending || d.status !== "discovered"}
                  className="mt-1 w-full py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-mono font-bold uppercase tracking-wider disabled:opacity-40"
                >
                  {d.status === "discovered" ? "Promote to Pipeline" : "Promoted"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Priority Decisions */}
      <section className="mb-8">
        <div className="flex justify-between items-end mb-4">
          <h2 className="font-display text-2xl font-semibold">Priority Decisions</h2>
          <span className="font-mono text-[11px] font-bold tracking-[0.06em] uppercase text-error status-pulse flex items-center gap-1">
            <MSym name="timer" className="!text-[14px]" />
            Critical
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(opps.data ?? []).map((o: any, idx: number) => (
            <OpportunityCard key={o.id} opp={o} accent={idx === 0 ? "secondary" : "tertiary"} />
          ))}
        </div>
      </section>

      {/* Live Sourcing */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h2 className="font-display text-2xl font-semibold">Live Sourcing</h2>
          <div className="w-2 h-2 bg-bullish rounded-full status-pulse" />
        </div>
        <div className="space-y-3">
          <div className="glass-panel p-4 rounded-xl border-l-2 border-l-primary">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded bg-primary-container flex items-center justify-center shrink-0">
                <MSym name="terminal" className="!text-[18px] text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug">
                  <span className="font-bold">New Signal:</span> High-impact commit in{" "}
                  <span className="text-primary font-mono">'VectorDB-Core'</span> by{" "}
                  <span className="text-on-surface">@alexcodes</span>
                </p>
                <span className="font-mono text-[10px] font-bold tracking-wider uppercase text-outline">
                  2m ago • Founder Score: A-
                </span>
              </div>
            </div>
            <button className="w-full border border-primary/30 py-2 rounded-lg font-mono text-[10px] font-bold tracking-wider uppercase text-primary flex items-center justify-center gap-2 hover:bg-primary/10 transition-all">
              <MSym name="send" className="!text-[14px]" />
              Activate Reach-Out
            </button>
          </div>
          <div className="glass-panel p-4 rounded-xl border-l-2 border-l-tertiary">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded bg-primary-container flex items-center justify-center shrink-0">
                <MSym name="emoji_events" className="!text-[18px] text-tertiary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug">
                  <span className="font-bold">Hackathon Winner:</span> MIT AI-Native Challenge — Team{" "}
                  <span className="text-tertiary font-mono">'NeuroNet'</span>
                </p>
                <span className="font-mono text-[10px] font-bold tracking-wider uppercase text-outline">
                  1h ago • Context: Multimodal Agents
                </span>
              </div>
            </div>
            <button className="w-full border border-tertiary/30 py-2 rounded-lg font-mono text-[10px] font-bold tracking-wider uppercase text-tertiary flex items-center justify-center gap-2 hover:bg-tertiary/10 transition-all">
              <MSym name="visibility" className="!text-[14px]" />
              Track Team
            </button>
          </div>
        </div>
      </section>

      {/* Memory Bench */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-display text-2xl font-semibold">Memory Bench</h2>
          <Link
            to="/founders"
            className="text-xs text-primary font-mono font-bold tracking-wider uppercase hover:underline"
          >
            View All
          </Link>
        </div>
        <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/20">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant/30 text-left">
                <th className="p-3 font-mono text-[10px] font-bold tracking-wider uppercase text-outline">Individual</th>
                <th className="p-3 font-mono text-[10px] font-bold tracking-wider uppercase text-outline text-right">Score</th>
                <th className="p-3 font-mono text-[10px] font-bold tracking-wider uppercase text-outline text-right">Trend</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {(opps.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={3} className="p-6 text-center">
                    <p className="text-on-surface-variant text-sm mb-3">
                      No founders indexed yet. Run AI Discovery to source real candidates from GitHub &amp; arXiv.
                    </p>
                    <button
                      onClick={() => discoverMut.mutate()}
                      disabled={discoverMut.isPending}
                      className="px-4 py-2 rounded-lg bg-secondary-container text-on-secondary-container font-mono text-[11px] font-bold tracking-wider uppercase disabled:opacity-60"
                    >
                      {discoverMut.isPending ? "Discovering…" : "Run AI Discovery"}
                    </button>
                  </td>
                </tr>
              )}
              {(opps.data ?? []).slice(0, 4).map((o: any) => {
                const name = o.founders?.name ?? "—";
                const initials = name.split(" ").map((n: string) => n[0]).slice(0, 2).join("");
                const score = o.founders?.founder_score ?? 0;
                const up = score >= 80;
                return (
                  <tr key={o.id} className="border-b border-outline-variant/10 last:border-0 hover:bg-white/[0.02] transition-colors">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center text-[10px] font-bold">
                          {initials}
                        </div>
                        <span className="font-medium">{name}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right font-mono">{score.toFixed(1)}</td>
                    <td className="p-3 text-right">
                      <MSym
                        name={up ? "trending_up" : "trending_flat"}
                        className={"!text-[14px] " + (up ? "text-bullish" : "text-on-surface-variant")}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function OpportunityCard({ opp, accent }: { opp: any; accent: "secondary" | "tertiary" }) {
  const score = opp.founders?.founder_score ?? 0;
  const trust = opp.trust_report?.claims
    ? Math.round(
        (opp.trust_report.claims.reduce((s: number, c: any) => s + (c.trust_score ?? 0), 0) /
          opp.trust_report.claims.length) *
          100,
      )
    : 92;
  const isSecondary = accent === "secondary";
  return (
    <Link
      to="/opportunity/$id"
      params={{ id: opp.id }}
      className="glass-panel w-full p-3 sm:p-4 rounded-xl relative overflow-hidden block"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 mb-4">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold mb-1 truncate">{opp.company_name}</h3>
          <p className="text-on-surface-variant text-xs truncate">
            {opp.screening_result?.market?.sentiment ? "Infrastructure" : "DeepTech"} • Series A
          </p>
        </div>
        <span className="shrink-0 font-mono text-[10px] font-medium text-error bg-error-container/20 px-2 py-0.5 rounded">
          14:22:05 left
        </span>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <span className="font-mono text-[10px] font-bold tracking-wider uppercase text-outline block">
            Founder Score
          </span>
          <div className="flex items-center gap-1">
            <span className="font-mono text-xl text-on-surface">{score}/100</span>
            <MSym name="trending_up" className="text-bullish !text-sm" />
          </div>
        </div>
        <div>
          <span className="font-mono text-[10px] font-bold tracking-wider uppercase text-outline block">
            Trust Score
          </span>
          <span className="font-mono text-xl text-primary">{trust}%</span>
        </div>
      </div>
      <div className="h-32 flex items-center justify-center bg-surface-container-lowest/50 rounded-lg mb-4 border border-outline-variant/10">
        <svg viewBox="0 0 100 100" className="w-24 h-24">
          <polygon points="50,10 90,40 75,85 25,85 10,40" className="radar-grid" fill="none" />
          <polygon points="50,25 80,45 70,75 30,75 20,45" className="radar-grid" fill="none" />
          <polygon
            points="50,15 85,42 70,80 35,75 15,35"
            className="radar-area"
            style={
              isSecondary
                ? undefined
                : { fill: "rgba(223, 193, 167, 0.2)", stroke: "#dfc1a7" }
            }
          />
          <text x="50" y="7" textAnchor="middle" className="fill-outline" fontSize="6" fontFamily="JetBrains Mono">FOUNDER</text>
          <text x="98" y="45" textAnchor="end" className="fill-outline" fontSize="6" fontFamily="JetBrains Mono">M</text>
          <text x="50" y="98" textAnchor="middle" className="fill-outline" fontSize="6" fontFamily="JetBrains Mono">IDEA</text>
        </svg>
      </div>
      <div
        className={
          "w-full py-2.5 rounded-lg font-mono text-[11px] font-bold tracking-wider uppercase text-center " +
          (isSecondary
            ? "bg-secondary-container text-on-secondary-container"
            : "bg-surface-container-high text-on-surface")
        }
      >
        Review Dossier
      </div>
    </Link>
  );
}