export type ArxivPaper = {
  title: string;
  summary: string;
  authors: string[];
  published: string;
  categories: string[];
  url: string;
};

export type ArxivResult = {
  papers: ArxivPaper[];
  count: number;
  recent_count: number;
  top_categories: string[];
  error?: string;
};

const ENDPOINT = "http://export.arxiv.org/api/query";

function decode(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function parseEntries(xml: string): ArxivPaper[] {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  return entries.map((e) => {
    const title = decode((e.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "").slice(0, 300));
    const summary = decode((e.match(/<summary>([\s\S]*?)<\/summary>/)?.[1] ?? "").slice(0, 600));
    const published = (e.match(/<published>([\s\S]*?)<\/published>/)?.[1] ?? "").trim();
    const url = (e.match(/<id>([\s\S]*?)<\/id>/)?.[1] ?? "").trim();
    const authors = Array.from(e.matchAll(/<name>([\s\S]*?)<\/name>/g)).map((m) => decode(m[1]));
    const categories = Array.from(e.matchAll(/<category[^>]*term="([^"]+)"/g)).map((m) => m[1]);
    return { title, summary, authors, published, categories, url };
  });
}

async function query(searchQuery: string, opts: { sortBy?: "relevance" | "submittedDate"; max?: number }): Promise<{ papers: ArxivPaper[]; error?: string }> {
  const params = new URLSearchParams({
    search_query: searchQuery,
    sortBy: opts.sortBy ?? "relevance",
    sortOrder: "descending",
    max_results: String(opts.max ?? 8),
    start: "0",
  });
  try {
    const res = await fetch(`${ENDPOINT}?${params.toString()}`, {
      headers: { "User-Agent": "CerebroVC/1.0", Accept: "application/atom+xml" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return { papers: [], error: `arXiv ${res.status}` };
    const xml = await res.text();
    return { papers: parseEntries(xml) };
  } catch (e: any) {
    return { papers: [], error: e?.message ?? String(e) };
  }
}

function summarize(papers: ArxivPaper[]): Pick<ArxivResult, "count" | "recent_count" | "top_categories"> {
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 365 * 2;
  const recent = papers.filter((p) => {
    const t = Date.parse(p.published);
    return Number.isFinite(t) && t >= cutoff;
  }).length;
  const catCount: Record<string, number> = {};
  for (const p of papers) for (const c of p.categories) catCount[c] = (catCount[c] ?? 0) + 1;
  const top = Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([c]) => c);
  return { count: papers.length, recent_count: recent, top_categories: top };
}

export async function fetchFounderPapers(name?: string | null): Promise<ArxivResult> {
  if (!name || name.trim().length < 3) {
    return { papers: [], count: 0, recent_count: 0, top_categories: [], error: "no-name" };
  }
  const cleaned = name.replace(/["\\]/g, " ").trim();
  const { papers, error } = await query(`au:"${cleaned}"`, { sortBy: "submittedDate", max: 10 });
  return { papers, ...summarize(papers), error };
}

export async function searchTopicPapers(query_text: string): Promise<ArxivResult> {
  const q = query_text.replace(/["\\]/g, " ").trim().slice(0, 200);
  if (!q) return { papers: [], count: 0, recent_count: 0, top_categories: [], error: "empty-query" };
  const { papers, error } = await query(`all:${JSON.stringify(q)}`, { sortBy: "relevance", max: 8 });
  return { papers, ...summarize(papers), error };
}

/**
 * Discover recent arXiv papers across thesis sectors (most recent submissions).
 */
export async function arxivDiscover(
  sectors: string[],
  opts: { perSector?: number } = {},
): Promise<{ papers: ArxivPaper[]; error?: string }> {
  const perSector = opts.perSector ?? 8;
  const seen = new Set<string>();
  const out: ArxivPaper[] = [];
  const errors: string[] = [];
  for (const sector of sectors.slice(0, 4)) {
    const cleaned = sector.replace(/["\\]/g, " ").trim();
    if (!cleaned) continue;
    const { papers, error } = await query(`all:${JSON.stringify(cleaned)}`, {
      sortBy: "submittedDate",
      max: perSector,
    });
    if (error) errors.push(`arxiv ${sector}: ${error}`);
    for (const p of papers) {
      if (seen.has(p.url)) continue;
      seen.add(p.url);
      out.push(p);
    }
  }
  return { papers: out, error: errors.length ? errors.join("; ") : undefined };
}