const GH_BASE = "https://api.github.com";

export type GitHubSignals = {
  handle: string;
  found: boolean;
  name?: string | null;
  bio?: string | null;
  company?: string | null;
  location?: string | null;
  followers?: number;
  public_repos?: number;
  created_at?: string;
  top_repos: Array<{ name: string; stars: number; language: string | null; description: string | null; url: string }>;
  total_stars: number;
  recent_commit_events_90d: number;
  error?: string;
};

async function gh(path: string, token: string) {
  const res = await fetch(`${GH_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "cerebro-vc",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`GitHub request failed (${res.status})`);
  }
  return res.json();
}

export async function fetchFounderGitHub(handle: string | null | undefined): Promise<GitHubSignals> {
  const empty: GitHubSignals = { handle: handle ?? "", found: false, top_repos: [], total_stars: 0, recent_commit_events_90d: 0 };
  if (!handle) return empty;
  const token = process.env.GITHUB_TOKEN;
  if (!token) return { ...empty, error: "GITHUB_TOKEN not configured" };

  try {
    const [user, repos, events] = await Promise.all([
      gh(`/users/${encodeURIComponent(handle)}`, token),
      gh(`/users/${encodeURIComponent(handle)}/repos?per_page=100&sort=updated`, token).catch(() => []),
      gh(`/users/${encodeURIComponent(handle)}/events/public?per_page=100`, token).catch(() => []),
    ]);

    const sorted = (Array.isArray(repos) ? repos : [])
      .filter((r: any) => !r.fork)
      .sort((a: any, b: any) => (b.stargazers_count ?? 0) - (a.stargazers_count ?? 0));
    const top = sorted.slice(0, 6).map((r: any) => ({
      name: r.name,
      stars: r.stargazers_count ?? 0,
      language: r.language,
      description: r.description,
      url: r.html_url,
    }));
    const total_stars = sorted.reduce((s: number, r: any) => s + (r.stargazers_count ?? 0), 0);

    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const recent = (Array.isArray(events) ? events : []).filter((e: any) => {
      const t = new Date(e.created_at).getTime();
      return t >= cutoff && (e.type === "PushEvent" || e.type === "PullRequestEvent");
    }).length;

    return {
      handle,
      found: true,
      name: user.name,
      bio: user.bio,
      company: user.company,
      location: user.location,
      followers: user.followers,
      public_repos: user.public_repos,
      created_at: user.created_at,
      top_repos: top,
      total_stars,
      recent_commit_events_90d: recent,
    };
  } catch (e: any) {
    return { ...empty, handle, error: e?.message ?? String(e) };
  }
}

export type GitHubTrendingRepo = {
  full_name: string;
  owner_login: string;
  description: string | null;
  stars: number;
  language: string | null;
  url: string;
  pushed_at: string;
  topics: string[];
};

function toTopic(sector: string): string {
  return sector
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Discover trending GitHub repos matching thesis sectors.
 * Uses the GitHub Search API with topic/keyword + freshness + stars filters.
 */
export async function githubDiscover(
  sectors: string[],
  opts: { perSector?: number; minStars?: number; sinceDays?: number } = {},
): Promise<{ repos: GitHubTrendingRepo[]; error?: string }> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return { repos: [], error: "GITHUB_TOKEN not configured" };

  const perSector = opts.perSector ?? 8;
  const minStars = opts.minStars ?? 50;
  const sinceDays = opts.sinceDays ?? 120;
  const since = new Date(Date.now() - sinceDays * 86400_000).toISOString().slice(0, 10);

  const seen = new Set<string>();
  const out: GitHubTrendingRepo[] = [];
  const errors: string[] = [];

  for (const sector of sectors.slice(0, 4)) {
    const topic = toTopic(sector);
    const keyword = sector.replace(/"/g, "").trim();
    const q = `(topic:${topic} OR "${keyword}") stars:>=${minStars} pushed:>=${since}`;
    try {
      const res = await fetch(
        `${GH_BASE}/search/repositories?q=${encodeURIComponent(q)}&sort=stars&order=desc&per_page=${perSector}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "User-Agent": "cerebro-vc",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          signal: AbortSignal.timeout(15000),
        },
      );
      if (!res.ok) {
        errors.push(`gh ${res.status} for ${sector}`);
        continue;
      }
      const json = (await res.json()) as any;
      for (const r of json.items ?? []) {
        if (seen.has(r.full_name)) continue;
        seen.add(r.full_name);
        out.push({
          full_name: r.full_name,
          owner_login: r.owner?.login ?? "",
          description: r.description ?? null,
          stars: r.stargazers_count ?? 0,
          language: r.language ?? null,
          url: r.html_url,
          pushed_at: r.pushed_at,
          topics: r.topics ?? [],
        });
      }
    } catch (e: any) {
      errors.push(`gh ${sector}: ${e?.message ?? e}`);
    }
  }
  return { repos: out, error: errors.length ? errors.join("; ") : undefined };
}