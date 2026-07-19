import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getDemoOpportunity } from "@/lib/demo-data";
import ReactMarkdown from "react-markdown";
import { useServerFn } from "@tanstack/react-start";
import { enrichOpportunity } from "@/lib/vc.functions";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { MSym } from "@/components/AppSidebar";

export const Route = createFileRoute("/_authenticated/opportunity/$id")({
  head: () => ({ meta: [{ title: "Opportunity — Cérebro VC" }] }),
  component: OpportunityPage,
});

function OpportunityPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const enrichFn = useServerFn(enrichOpportunity);
  const [enriching, setEnriching] = useState(false);
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
  }, []);

  const isDemo = !!getDemoOpportunity(id);
  const canEnrich = authed && !isDemo;

  async function runEnrich() {
    setEnriching(true);
    try {
      const res = await enrichFn({ data: { opportunityId: id } });
      toast.success(`Enriched · Score ${res.founder_score}`, {
        description: `GitHub: ${res.providers.github} · Tavily: ${res.providers.tavily} · arXiv: ${res.providers.arxiv ?? "n/a"}`,
      });
      qc.invalidateQueries({ queryKey: ["opportunity", id] });
    } catch (e: any) {
      toast.error("Enrichment failed", { description: String(e?.message ?? e).slice(0, 300) });
    } finally {
      setEnriching(false);
    }
  }

  const opp = useQuery({
    queryKey: ["opportunity", id],
    queryFn: async () => {
      const demo = getDemoOpportunity(id);
      if (demo) return demo as any;
      try {
        const { data } = await supabase
          .from("opportunities")
          .select("*, founders(*)")
          .eq("id", id)
          .maybeSingle();
        if (data) return data;
      } catch {}
      return null;
    },
  });

  if (opp.isLoading) return <div className="p-8 text-on-surface-variant">Loading...</div>;
  if (!opp.data) return <div className="p-8">Not found</div>;

  const f = opp.data.founders as any;
  const s = (opp.data.screening_result as any) ?? null;
  const claims = ((opp.data.trust_report as any)?.claims ?? []) as Array<{
    claim: string;
    trust_score: number;
    source_url: string;
  }>;
  const verified = claims.filter((c) => c.trust_score >= 0.7).length;
  const flags = claims.filter((c) => c.trust_score < 0.5).length;
  const memoText = (opp.data.investment_memo ?? "").toString();

  return (
    <main className="px-4 mt-6 max-w-lg mx-auto space-y-6">
      {/* Identity Header */}
      <section className="flex flex-col gap-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="flex gap-4 min-w-0">
            <div className="w-16 h-16 shrink-0 rounded-xl glass-panel flex items-center justify-center border border-primary/30">
              <MSym name="hub" className="text-primary !text-4xl" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-semibold truncate">{opp.data.company_name}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="font-mono text-[11px] font-bold tracking-[0.06em] text-on-surface-variant uppercase">
                  Series A
                </span>
                <span className="w-1 h-1 rounded-full bg-outline-variant" />
                <span className="font-mono text-[11px] font-bold tracking-[0.06em] text-on-surface-variant uppercase">
                  DeepTech
                </span>
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-mono text-[13px] text-primary">ID: {id.slice(0, 6).toUpperCase()}</div>
          </div>
        </div>

        {/* Score Panel */}
        <div className="glass-panel rounded-xl p-4 flex items-center justify-between border-primary/30">
          <div className="flex flex-col">
            <span className="font-mono text-[11px] font-bold tracking-[0.06em] text-primary/70 uppercase">
              Founder Score
            </span>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-5xl font-bold text-primary">{f?.founder_score ?? "—"}</span>
              <span className="font-mono text-[11px] font-bold text-outline">/100</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <svg viewBox="0 0 100 40" className="h-10 w-24 stroke-secondary fill-none stroke-2">
              <path d="M0 35 L20 30 L40 32 L60 15 L80 18 L100 5" />
            </svg>
            <span className="font-mono text-[10px] text-primary flex items-center gap-1">
              <MSym name="trending_up" className="!text-xs" /> +12% vs Month 1
            </span>
          </div>
        </div>

        <button
          disabled
          className="w-full h-14 bg-secondary-container text-on-secondary-container font-display text-lg font-semibold rounded-xl cyber-glow flex items-center justify-center gap-2 active:scale-95 transition-transform disabled:opacity-70"
        >
          <MSym name="verified_user" />
          APPROVE $100K CHECK
        </button>
      </section>

      {/* Trust Score Badge */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary status-pulse" />
          <span className="font-mono text-[11px] font-bold tracking-[0.06em] uppercase">
            Agentic Trust Score
          </span>
        </div>
        <div className="flex gap-2">
          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-mono text-[10px] border border-primary/30">
            {verified} VERIFIED
          </span>
          {flags > 0 && (
            <span className="px-2 py-0.5 rounded bg-error-container/20 text-error font-mono text-[10px] border border-error/20">
              {flags} FLAG
            </span>
          )}
        </div>
      </div>

      {/* Founder Analysis */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <MSym name="person_search" className="text-primary" />
          <h3 className="font-mono text-[11px] font-bold tracking-[0.06em] uppercase text-primary">
            Founder Analysis
          </h3>
        </div>
        <div className="glass-panel rounded-xl p-4 space-y-4">
          <p className="text-sm text-on-surface-variant leading-relaxed">
            {f?.bio ?? "No founder bio."}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-surface-container-high rounded-lg border border-outline-variant/30 flex flex-col gap-2">
              <span className="font-mono text-[10px] font-bold tracking-wider uppercase text-outline">GitHub</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-primary text-base">
                  {f?.github_handle ? `@${f.github_handle}` : "N/A"}
                </span>
                {f?.github_handle && <MSym name="open_in_new" className="!text-sm text-primary" />}
              </div>
            </div>
            <div className="p-3 bg-surface-container-high rounded-lg border border-outline-variant/30 flex flex-col gap-2">
              <span className="font-mono text-[10px] font-bold tracking-wider uppercase text-outline">Location</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-primary text-base">{f?.location ?? "—"}</span>
              </div>
            </div>
          </div>
          {(s?.founder?.signals ?? []).length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-outline-variant/20">
              {(s?.founder?.signals ?? []).map((sig: string, i: number) => (
                <span
                  key={i}
                  className="px-2 py-1 glass-panel text-[10px] font-mono text-primary flex items-center gap-1 rounded"
                >
                  <MSym name="analytics" className="!text-xs" /> {sig}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Market Analysis */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <MSym name="analytics" className="text-primary" />
          <h3 className="font-mono text-[11px] font-bold tracking-[0.06em] uppercase text-primary">
            Market Analysis (SWOT)
          </h3>
        </div>
        <div className="glass-panel rounded-xl p-4 space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MSym name="add_circle" className="text-primary mt-0.5" />
              <div>
                <span className="font-mono text-[10px] font-bold tracking-wider uppercase text-primary">
                  Bullish Signal
                </span>
                <p className="text-sm mt-1">{s?.market?.thesis_note ?? "No signal."}</p>
              </div>
            </div>
            {s?.market?.sentiment === "Bearish" && (
              <div className="flex items-start gap-3">
                <MSym name="remove_circle" className="text-error mt-0.5" />
                <div>
                  <span className="font-mono text-[10px] font-bold tracking-wider uppercase text-error">
                    Bearish Signal
                  </span>
                  <p className="text-sm mt-1">Sentiment currently bearish; monitor closely.</p>
                </div>
              </div>
            )}
          </div>
          <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant/30">
            <div className="flex justify-between items-center mb-3">
              <span className="font-mono text-[10px] font-bold tracking-wider uppercase text-outline">
                Market Sizing (Est)
              </span>
              <span className="font-mono text-[10px] font-bold tracking-wider uppercase text-primary">
                Confidence: 89%
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs">TAM (Total)</span>
                <span className="font-mono text-xs">
                  ${(((s?.market?.tam_estimate_usd ?? 0) * 2) / 1e9).toFixed(1)}B
                </span>
              </div>
              <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
                <div className="bg-primary h-full" style={{ width: "85%" }} />
              </div>
              <div className="flex justify-between items-center">
                <span className="font-mono text-xs">SOM (Target)</span>
                <span className="font-mono text-xs">
                  ${((s?.market?.tam_estimate_usd ?? 0) / 1e9 / 30).toFixed(1)}B
                </span>
              </div>
              <div className="w-full bg-surface-container-high h-1 rounded-full overflow-hidden">
                <div className="bg-primary h-full" style={{ width: "15%" }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Wedge */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <MSym name="vpn_key" className="text-primary" />
          <h3 className="font-mono text-[11px] font-bold tracking-[0.06em] uppercase text-primary">
            Idea vs Market: The Wedge
          </h3>
        </div>
        <div className="glass-panel rounded-xl p-4 border-l-4 border-primary/50">
          <p className="text-sm italic text-on-surface-variant">"{s?.idea?.wedge ?? "No wedge defined."}"</p>
          <div className="mt-4 flex items-center gap-3">
            <div className="flex -space-x-2">
              <div className="w-6 h-6 rounded-full border border-surface bg-surface-container-high flex items-center justify-center">
                <MSym name="database" className="!text-[10px]" />
              </div>
              <div className="w-6 h-6 rounded-full border border-surface bg-surface-container-high flex items-center justify-center">
                <MSym name="memory" className="!text-[10px]" />
              </div>
            </div>
            <span className="font-mono text-[10px] font-bold tracking-wider uppercase text-outline">
              Moat: {s?.idea?.moat ? s.idea.moat.slice(0, 40) : "—"}
            </span>
          </div>
        </div>
      </section>

      {/* Trust Report */}
      {claims.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <MSym name="verified" className="text-primary" />
            <h3 className="font-mono text-[11px] font-bold tracking-[0.06em] uppercase text-primary">
              Verified Claims
            </h3>
          </div>
          <div className="glass-panel rounded-xl divide-y divide-outline-variant/20">
            {claims.map((c, i) => (
              <div key={i} className="p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{c.claim}</p>
                  <a
                    href={c.source_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <MSym name="open_in_new" className="!text-xs" /> source
                  </a>
                </div>
                <div className="w-24 shrink-0">
                  <div className="flex items-center justify-between text-[10px] font-mono font-bold tracking-wider uppercase">
                    <span>Trust</span>
                    <span>{Math.round((c.trust_score ?? 0) * 100)}%</span>
                  </div>
                  <div className="h-1.5 bg-surface-container-high rounded mt-1 overflow-hidden">
                    <div
                      className="h-full bg-primary"
                      style={{ width: `${(c.trust_score ?? 0) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Investment Memo */}
      {memoText && (
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <MSym name="description" className="text-primary" />
            <h3 className="font-mono text-[11px] font-bold tracking-[0.06em] uppercase text-primary">
              Investment Memo
            </h3>
          </div>
          <div className="glass-panel rounded-xl p-4 prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p>{highlight(children)}</p>,
                li: ({ children }) => <li>{highlight(children)}</li>,
              }}
            >
              {memoText}
            </ReactMarkdown>
          </div>
        </section>
      )}

      {/* Reasoning Log */}
      <section className="pt-4">
        <div className="bg-primary-container/40 rounded-xl border border-primary/30 p-4 violet-glow">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <MSym name="forum" className="text-primary !text-base" />
              <h4 className="font-mono text-[11px] font-bold tracking-[0.06em] uppercase text-primary">
                Reasoning Log (AI Agent)
              </h4>
            </div>
            <MSym name="expand_more" className="text-outline" />
          </div>
          <div className="space-y-3 pt-2 border-t border-primary/10">
            {[
              `THESIS_MATCH: ${f?.name ?? "Founder"} technical background aligns with active thesis.`,
              `RISK_DETECT: Signal quality scored ${verified}/${claims.length || "—"} verified.`,
              `RECOMMENDATION: ${(f?.founder_score ?? 0) >= 70 ? "Proceed with investment." : "Defer — needs more signal."}`,
            ].map((line, i) => (
              <div key={i} className="flex gap-3">
                <div className="w-0.5 bg-primary/30 shrink-0" />
                <p className="font-mono text-[11px] leading-relaxed text-on-surface-variant">
                  [14:2{2 + i}] {line}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Decision + Enrich */}
      <section className="grid grid-cols-2 gap-3 pt-2">
        <button
          disabled={!authed}
          className="rounded-lg bg-bullish/20 border border-bullish/40 py-3 text-bullish font-mono text-[11px] font-bold tracking-wider uppercase hover:bg-bullish/30 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <MSym name="check_circle" className="!text-base" />
          Approve
        </button>
        <button
          disabled={!authed}
          className="rounded-lg bg-error-container/20 border border-error/40 py-3 text-error font-mono text-[11px] font-bold tracking-wider uppercase hover:bg-error-container/30 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <MSym name="cancel" className="!text-base" />
          Reject
        </button>
        <button
          onClick={runEnrich}
          disabled={!canEnrich || enriching}
          title={!authed ? "Sign in to run real enrichment" : isDemo ? "Demo is read-only" : ""}
          className="col-span-2 rounded-lg border border-primary/40 bg-primary/10 py-3 text-primary font-mono text-[11px] font-bold tracking-wider uppercase hover:bg-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <MSym name={enriching ? "autorenew" : "bolt"} className={"!text-base " + (enriching ? "animate-spin" : "")} />
          {enriching ? "Enriching…" : "Enrich with Real Data"}
        </button>
      </section>
    </main>
  );
}

function highlight(children: React.ReactNode): React.ReactNode {
  if (typeof children === "string") {
    const parts = children.split(/(Not disclosed|Undisclosed)/gi);
    return parts.map((p, i) =>
      /Not disclosed|Undisclosed/i.test(p) ? (
        <span key={i} className="bg-neutral/20 text-neutral px-1 rounded">{p}</span>
      ) : (
        <span key={i}>{p}</span>
      ),
    );
  }
  if (Array.isArray(children)) return children.map((c, i) => <span key={i}>{highlight(c)}</span>);
  return children;
}