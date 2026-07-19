import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { demoOpportunities, demoEvidence, demoThesis } from "@/lib/demo-data";
import { MSym } from "@/components/AppSidebar";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/thesis")({
  head: () => ({ meta: [{ title: "Intelligence — Cérebro VC" }] }),
  component: IntelligencePage,
});

function IntelligencePage() {
  const thesis = useQuery({
    queryKey: ["thesis-intel"],
    queryFn: async () => {
      try {
        const { data } = await supabase.from("thesis_config").select("*").limit(1).maybeSingle();
        return data ?? demoThesis;
      } catch {
        return demoThesis;
      }
    },
  });

  const opps = useQuery({
    queryKey: ["opps-intel"],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("opportunities")
          .select("id, company_name, status, screening_result, updated_at, founders(name, founder_score)")
          .order("updated_at", { ascending: false });
        if (data && data.length > 0) return data as any[];
      } catch {}
      return demoOpportunities as any[];
    },
  });

  const evidence = useQuery({
    queryKey: ["evidence-intel"],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("evidence_logs")
          .select("*")
          .order("trust_score", { ascending: false })
          .limit(10);
        if (data && data.length > 0) return data as any[];
      } catch {}
      return [...demoEvidence].sort((a, b) => b.trust_score - a.trust_score).slice(0, 10);
    },
  });

  const t = thesis.data as any;
  const rows = opps.data ?? [];

  const fitBuckets = { High: 0, Medium: 0, Low: 0 } as Record<string, number>;
  const sentBuckets = { Bullish: 0, Neutral: 0, Bearish: 0 } as Record<string, number>;
  for (const r of rows) {
    const fit = r.screening_result?.idea?.fit;
    const sent = r.screening_result?.market?.sentiment;
    if (fit && fitBuckets[fit] !== undefined) fitBuckets[fit]++;
    if (sent && sentBuckets[sent] !== undefined) sentBuckets[sent]++;
  }
  const maxFit = Math.max(1, ...Object.values(fitBuckets));

  return (
    <main className="px-4 mt-6 max-w-lg mx-auto pb-24">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Intelligence</h1>
        <p className="text-xs text-on-surface-variant mt-1">
          Thesis engine · market signals · reasoning logs
        </p>
      </header>

      {/* Active Thesis */}
      <section className="glass-panel rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] uppercase tracking-wider font-bold text-outline">
            Active Thesis
          </span>
          <MSym name="tune" className="!text-[16px] text-primary" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <ThesisField label="Sectors" value={(t?.sectors ?? []).join(" · ") || "—"} />
          <ThesisField label="Geography" value={(t?.geography ?? []).join(" · ") || "—"} />
          <ThesisField
            label="Check Size"
            value={t?.check_size ? `$${(t.check_size / 1000).toFixed(0)}K` : "—"}
          />
          <ThesisField label="Risk" value={t?.risk_appetite ?? "—"} />
        </div>
      </section>

      {/* Idea Fit distribution */}
      <section className="mb-6">
        <h2 className="font-display text-lg font-semibold mb-3">Thesis Match</h2>
        <div className="glass-panel rounded-xl p-4 space-y-3">
          {(["High", "Medium", "Low"] as const).map((k) => {
            const v = fitBuckets[k];
            const pct = (v / maxFit) * 100;
            const color =
              k === "High" ? "bg-bullish" : k === "Medium" ? "bg-neutral" : "bg-bearish";
            return (
              <div key={k}>
                <div className="flex justify-between font-mono text-[10px] uppercase tracking-wider mb-1">
                  <span className="text-outline">{k} fit</span>
                  <span className="text-on-surface font-bold">{v}</span>
                </div>
                <div className="h-2 bg-surface-container-lowest rounded-full overflow-hidden">
                  <div
                    className={"h-full " + color}
                    style={{ width: `${Math.max(4, pct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Sentiment */}
      <section className="mb-6">
        <h2 className="font-display text-lg font-semibold mb-3">Market Sentiment</h2>
        <div className="grid grid-cols-3 gap-2">
          {(["Bullish", "Neutral", "Bearish"] as const).map((s) => {
            const cls =
              s === "Bullish"
                ? "text-bullish border-bullish/30"
                : s === "Bearish"
                  ? "text-bearish border-bearish/30"
                  : "text-neutral border-neutral/30";
            return (
              <div
                key={s}
                className={"glass-panel rounded-xl p-3 text-center border " + cls}
              >
                <MSym
                  name={s === "Bullish" ? "trending_up" : s === "Bearish" ? "trending_down" : "trending_flat"}
                  className="!text-[18px]"
                />
                <div className="font-mono text-2xl font-bold mt-1">{sentBuckets[s]}</div>
                <div className="font-mono text-[9px] uppercase tracking-wider">{s}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Top signals */}
      <section className="mb-6">
        <h2 className="font-display text-lg font-semibold mb-3">Top Signals</h2>
        <div className="space-y-2">
          {(evidence.data ?? []).slice(0, 6).map((e: any) => (
            <a
              key={e.id}
              href={e.source_url}
              target="_blank"
              rel="noreferrer"
              className="glass-panel rounded-lg p-3 flex items-start gap-3 hover:border-primary/40"
            >
              <div className="w-10 shrink-0 text-center">
                <div className="font-mono text-sm font-bold text-primary">
                  {(Number(e.trust_score) * 100).toFixed(0)}
                </div>
                <div className="font-mono text-[8px] uppercase text-outline">trust</div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs leading-snug">{e.content_snippet}</p>
                <div className="font-mono text-[9px] uppercase tracking-wider text-outline mt-1 truncate">
                  {new URL(e.source_url).hostname}
                </div>
              </div>
              <MSym name="open_in_new" className="!text-[14px] text-outline" />
            </a>
          ))}
        </div>
      </section>

      {/* Reasoning log explorer */}
      <section>
        <h2 className="font-display text-lg font-semibold mb-3">Reasoning Log</h2>
        <div className="space-y-2">
          {rows.slice(0, 5).map((o: any) => (
            <ReasoningRow key={o.id} opp={o} />
          ))}
        </div>
      </section>
    </main>
  );
}

function ThesisField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-outline">{label}</div>
      <div className="font-mono text-sm text-on-surface mt-0.5">{value}</div>
    </div>
  );
}

function ReasoningRow({ opp }: { opp: any }) {
  const [open, setOpen] = useState(false);
  const sr = opp.screening_result ?? {};
  return (
    <div className="glass-panel rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between p-3 text-left"
      >
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{opp.company_name}</div>
          <div className="font-mono text-[10px] text-outline uppercase tracking-wider">
            {opp.founders?.name ?? "—"} · score {opp.founders?.founder_score ?? "—"}
          </div>
        </div>
        <MSym
          name={open ? "expand_less" : "expand_more"}
          className="!text-[18px] text-outline"
        />
      </button>
      {open && (
        <div className="px-3 pb-3 border-t border-outline-variant/20">
          <pre className="font-mono text-[10px] leading-relaxed text-on-surface-variant whitespace-pre-wrap mt-2 max-h-56 overflow-y-auto">
{`> AGENT REASONING · ${opp.company_name}
> founder.score = ${sr.founder?.score ?? "—"}
> founder.signals = ${JSON.stringify(sr.founder?.signals ?? [], null, 2)}
> market.sentiment = ${sr.market?.sentiment ?? "—"}
> market.tam = $${((sr.market?.tam_estimate_usd ?? 0) / 1e9).toFixed(1)}B
> market.note = ${sr.market?.thesis_note ?? "—"}
> idea.fit = ${sr.idea?.fit ?? "—"}
> idea.moat = ${sr.idea?.moat ?? "—"}
> idea.wedge = ${sr.idea?.wedge ?? "—"}`}
          </pre>
          <Link
            to="/opportunity/$id"
            params={{ id: opp.id }}
            className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-primary font-bold"
          >
            Open dossier <MSym name="arrow_forward" className="!text-[12px]" />
          </Link>
        </div>
      )}
    </div>
  );
}