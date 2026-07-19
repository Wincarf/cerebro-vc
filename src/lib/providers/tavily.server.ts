export type TavilyHit = { title: string; url: string; content: string; score: number };

export type TavilyOptions = {
  maxResults?: number;
  searchDepth?: "basic" | "advanced";
  includeDomains?: string[];
  excludeDomains?: string[];
};

// Curated defaults for VC sourcing — high-signal sources, filter obvious noise.
export const DEFAULT_INCLUDE_DOMAINS = [
  "github.com",
  "arxiv.org",
  "techcrunch.com",
  "ycombinator.com",
  "news.ycombinator.com",
  "medium.com",
  "producthunt.com",
  "crunchbase.com",
  "linkedin.com",
];

export const DEFAULT_EXCLUDE_DOMAINS = [
  "pinterest.com",
  "facebook.com",
  "instagram.com",
  "tiktok.com",
];

const TRUSTED = ["github.com", "arxiv.org", "techcrunch.com", "ycombinator.com", "news.ycombinator.com", "crunchbase.com"];

/** Boost trust for hits from curated high-signal domains. */
export function domainTrustBoost(url: string): number {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return TRUSTED.some((d) => host === d || host.endsWith("." + d)) ? 0.15 : 0;
  } catch {
    return 0;
  }
}

export async function tavilySearch(
  query: string,
  optsOrMax: TavilyOptions | number = {},
): Promise<{ hits: TavilyHit[]; error?: string }> {
  const opts: TavilyOptions = typeof optsOrMax === "number" ? { maxResults: optsOrMax } : optsOrMax;
  const maxResults = opts.maxResults ?? 5;
  const searchDepth = opts.searchDepth ?? "advanced";
  const includeDomains = opts.includeDomains ?? DEFAULT_INCLUDE_DOMAINS;
  const excludeDomains = opts.excludeDomains ?? DEFAULT_EXCLUDE_DOMAINS;

  const key = process.env.TAVILY_API_KEY;
  if (!key) return { hits: [], error: "TAVILY_API_KEY not configured" };
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        query,
        search_depth: searchDepth,
        max_results: maxResults,
        include_answer: false,
        include_domains: includeDomains,
        exclude_domains: excludeDomains,
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { hits: [], error: `Tavily request failed (${res.status})` };
    }
    const json = await res.json();
    const hits = (json.results ?? []).map((r: any) => {
      const baseScore = r.score ?? 0;
      return {
        title: r.title ?? "",
        url: r.url ?? "",
        content: (r.content ?? "").slice(0, 800),
        score: Math.min(1, baseScore + domainTrustBoost(r.url ?? "")),
      };
    });
    return { hits };
  } catch (e: any) {
    return { hits: [], error: e?.message ?? String(e) };
  }
}