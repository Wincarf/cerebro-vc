import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { demoFounders } from "@/lib/demo-data";
import { MSym } from "@/components/AppSidebar";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/founders")({
  head: () => ({ meta: [{ title: "Memory Bench — Cérebro VC" }] }),
  component: MemoryPage,
});

type Row = {
  id: string;
  name: string;
  founder_score: number | null;
  location?: string | null;
  github_handle?: string | null;
  linkedin_url?: string | null;
  company_name?: string | null;
  bio?: string | null;
  last_updated?: string;
  opportunity_id?: string;
};

function MemoryPage() {
  const q = useQuery<Row[]>({
    queryKey: ["memory-founders"],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from("founders")
          .select("*, opportunities(id)")
          .order("founder_score", { ascending: false });
        if (data && data.length > 0) {
          return data.map((f: any) => ({
            id: f.id,
            name: f.name,
            founder_score: f.founder_score,
            location: f.location,
            github_handle: f.github_handle,
            linkedin_url: f.linkedin_url,
            company_name: f.company_name,
            bio: f.bio,
            last_updated: f.last_updated ?? f.updated_at,
            opportunity_id: f.opportunities?.[0]?.id,
          }));
        }
      } catch {}
      return demoFounders as any;
    },
  });

  const [minScore, setMinScore] = useState(0);
  const [sort, setSort] = useState<"score" | "recent">("score");
  const [selected, setSelected] = useState<Row | null>(null);

  const rows = useMemo(() => {
    const filtered = (q.data ?? []).filter(
      (r) => (r.founder_score ?? 0) >= minScore,
    );
    return sort === "score"
      ? [...filtered].sort((a, b) => (b.founder_score ?? 0) - (a.founder_score ?? 0))
      : [...filtered].sort(
          (a, b) =>
            new Date(b.last_updated ?? 0).getTime() -
            new Date(a.last_updated ?? 0).getTime(),
        );
  }, [q.data, minScore, sort]);

  const avg = rows.length
    ? Math.round(rows.reduce((s, r) => s + (r.founder_score ?? 0), 0) / rows.length)
    : 0;

  return (
    <main className="px-4 mt-6 max-w-lg mx-auto pb-24">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold">Memory Bench</h1>
        <p className="text-xs text-on-surface-variant mt-1">
          Every founder the agent has ever profiled
        </p>
      </header>

      {/* Trend strip */}
      <section className="grid grid-cols-3 gap-2 mb-5">
        <StatTile label="Tracked" value={rows.length.toString()} icon="database" />
        <StatTile label="Avg score" value={avg.toString()} icon="analytics" />
        <StatTile
          label="Top score"
          value={(rows[0]?.founder_score ?? 0).toString()}
          icon="military_tech"
        />
      </section>

      {/* Filters */}
      <section className="glass-panel rounded-xl p-3 mb-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] uppercase tracking-wider text-outline">
            Min score: <span className="text-on-surface font-bold">{minScore}</span>
          </span>
          <div className="flex gap-1">
            {(["score", "recent"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setSort(k)}
                className={
                  "px-2 py-1 rounded font-mono text-[10px] uppercase tracking-wider " +
                  (sort === k
                    ? "bg-secondary-container text-on-secondary-container"
                    : "text-outline")
                }
              >
                {k}
              </button>
            ))}
          </div>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={minScore}
          onChange={(e) => setMinScore(Number(e.target.value))}
          className="w-full accent-secondary"
        />
      </section>

      {/* Leaderboard */}
      <section>
        <div className="bg-surface-container-lowest rounded-xl overflow-x-auto border border-outline-variant/20">
          <table className="w-full min-w-[420px]">
            <thead>
              <tr className="border-b border-outline-variant/30 text-left">
                <th className="p-3 font-mono text-[10px] uppercase tracking-wider text-outline">#</th>
                <th className="p-3 font-mono text-[10px] uppercase tracking-wider text-outline">Founder</th>
                <th className="p-3 font-mono text-[10px] uppercase tracking-wider text-outline text-right">Score</th>
                <th className="p-3 font-mono text-[10px] uppercase tracking-wider text-outline text-right">Links</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {rows.map((r, i) => {
                const s = r.founder_score ?? 0;
                const initials = r.name.split(" ").map((n) => n[0]).slice(0, 2).join("");
                return (
                  <tr
                    key={r.id}
                    onClick={() => setSelected(r)}
                    className="border-b border-outline-variant/10 last:border-0 hover:bg-white/[0.02] cursor-pointer"
                  >
                    <td className="p-3 font-mono text-[11px] text-outline">{i + 1}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center text-[10px] font-bold">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium truncate">{r.name}</div>
                          <div className="font-mono text-[10px] text-outline truncate">
                            {r.company_name ?? "—"} · {r.location ?? "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <span
                        className={
                          "font-mono text-xs font-bold px-1.5 py-0.5 rounded " +
                          (s >= 80
                            ? "bg-bullish/15 text-bullish"
                            : s >= 50
                              ? "bg-neutral/15 text-neutral"
                              : "bg-bearish/15 text-bearish")
                        }
                      >
                        {s}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div
                        className="inline-flex items-center gap-2 text-outline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {r.github_handle && (
                          <a
                            href={`https://github.com/${r.github_handle}`}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-primary"
                          >
                            <MSym name="code" className="!text-[14px]" />
                          </a>
                        )}
                        {r.linkedin_url && (
                          <a
                            href={r.linkedin_url}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-primary"
                          >
                            <MSym name="link" className="!text-[14px]" />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-xs text-outline">
                    No founders match the current filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setSelected(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass-panel rounded-2xl p-5 w-full max-w-md relative"
          >
            <button
              onClick={() => setSelected(null)}
              className="absolute top-3 right-3 text-outline hover:text-on-surface"
            >
              <MSym name="close" className="!text-[18px]" />
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-surface-container-high flex items-center justify-center text-sm font-bold">
                {selected.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
              </div>
              <div>
                <div className="font-display text-lg font-semibold">{selected.name}</div>
                <div className="font-mono text-[10px] uppercase tracking-wider text-outline">
                  {selected.company_name ?? "—"} · {selected.location ?? "—"}
                </div>
              </div>
            </div>
            {selected.bio && (
              <p className="text-xs text-on-surface-variant mb-4">{selected.bio}</p>
            )}
            <div className="grid grid-cols-2 gap-2 mb-4">
              <div className="glass-panel rounded-lg p-3">
                <div className="font-mono text-[9px] uppercase text-outline">Score</div>
                <div className="font-mono text-2xl font-bold text-primary">
                  {selected.founder_score ?? "—"}
                </div>
              </div>
              <div className="glass-panel rounded-lg p-3">
                <div className="font-mono text-[9px] uppercase text-outline">Updated</div>
                <div className="font-mono text-xs mt-1">
                  {selected.last_updated
                    ? new Date(selected.last_updated).toLocaleDateString()
                    : "—"}
                </div>
              </div>
            </div>
            {selected.opportunity_id && (
              <Link
                to="/opportunity/$id"
                params={{ id: selected.opportunity_id }}
                className="block w-full text-center py-2.5 rounded-lg bg-secondary-container text-on-secondary-container font-mono text-[11px] uppercase tracking-wider font-bold cyber-glow"
              >
                Open Dossier
              </Link>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function StatTile({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="glass-panel rounded-xl p-3 text-center">
      <MSym name={icon} className="!text-[16px] text-outline" />
      <div className="font-mono text-xl font-bold mt-1">{value}</div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-outline">{label}</div>
    </div>
  );
}