import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output, NoObjectGeneratedError } from "ai";
import { z } from "zod";
import { throwSanitized, sanitizeError, safeLog } from "./security/redact";
import { assertEnvHygiene } from "./security/env-guard.server";

// Boot-time hygiene check (idempotent).
assertEnvHygiene();

async function assertOrgAccess(supabase: any, orgId: string | null | undefined): Promise<void> {
  if (!orgId) throwSanitized(new Error("Forbidden: missing organization"), "authz");
  const { data, error } = await supabase.rpc("is_org_member", { _org: orgId });
  if (error) throwSanitized(error, "authz");
  if (!data) throwSanitized(new Error("Forbidden: not a member of this organization"), "authz");
}

const MODEL = "openai/gpt-5.5";

async function getGateway() {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const { createLovableGateway } = await import("./ai-gateway.server");
  return createLovableGateway(key);
}

async function getOrg(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("user_organizations")
    .select("organization_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  if (error) throwSanitized(error, "getOrg");
  if (!data) throwSanitized(new Error("No organization for user"), "getOrg");
  return data.organization_id as string;
}

// ---------- Sourcing Agent ----------
export const runSourcing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const orgId = await getOrg(context.supabase, context.userId);
    const { data: thesis } = await context.supabase
      .from("thesis_config")
      .select("*")
      .eq("organization_id", orgId)
      .maybeSingle();

    const gateway = await getGateway();
    const prompt = `You are a venture-capital sourcing agent. Generate 3 realistic-sounding but FICTIONAL new startup opportunities that fit this thesis:
Sectors: ${thesis?.sectors?.join(", ") ?? "AI Infrastructure"}
Geography: ${thesis?.geography?.join(", ") ?? "Global"}
Check size: $${thesis?.check_size ?? 100000}
Risk appetite: ${thesis?.risk_appetite ?? "high"}

For each, invent a plausible technical founder (name, github handle, linkedin slug, one-line bio, city) and a startup (company_name, one-sentence pitch).
Everything is fictional; do NOT use real people or companies.`;

    let items: Array<{
      founder_name: string;
      github: string;
      linkedin: string;
      bio: string;
      location: string;
      company_name: string;
      pitch: string;
    }> = [];

    try {
      const { output } = await generateText({
        model: gateway(MODEL),
        prompt,
        output: Output.object({
          schema: z.object({
            opportunities: z.array(
              z.object({
                founder_name: z.string(),
                github: z.string(),
                linkedin: z.string(),
                bio: z.string(),
                location: z.string(),
                company_name: z.string(),
                pitch: z.string(),
              }),
            ),
          }),
        }),
      });
      items = output.opportunities.slice(0, 3);
    } catch (e) {
      if (!NoObjectGeneratedError.isInstance(e)) throwSanitized(e, "runSourcing");
    }

    if (items.length === 0) return { inserted: 0 };

    for (const it of items) {
      const { data: founder, error: fErr } = await context.supabase
        .from("founders")
        .insert({
          organization_id: orgId,
          name: it.founder_name,
          github_handle: it.github,
          linkedin_url: `https://linkedin.com/in/${it.linkedin}`,
          bio: it.bio,
          location: it.location,
          company_name: it.company_name,
          founder_score: null,
        })
        .select("id")
        .single();
      if (fErr) throwSanitized(fErr, "runSourcing.insertFounder");

      await context.supabase.from("opportunities").insert({
        organization_id: orgId,
        founder_id: founder.id,
        company_name: it.company_name,
        status: "sourced",
        investment_memo: it.pitch,
      });
    }

    return { inserted: items.length };
  });

// ---------- Founder Score ----------
export const calculateFounderScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ founderId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: founder, error } = await context.supabase
      .from("founders")
      .select("*")
      .eq("id", data.founderId)
      .single();
    if (error) throwSanitized(error, "calculateFounderScore");
    await assertOrgAccess(context.supabase, founder.organization_id);

    const gateway = await getGateway();
    let score = 60;
    let rationale = "Baseline score.";
    try {
      const { output } = await generateText({
        model: gateway(MODEL),
        prompt: `Rate this technical founder 0-100 based on signals of exceptional talent (repeat founder, technical depth, hackathon wins, open-source impact).
Name: ${founder.name}
GitHub: ${founder.github_handle}
LinkedIn: ${founder.linkedin_url}
Bio: ${founder.bio ?? "N/A"}
Return an integer score and one-line rationale.`,
        output: Output.object({
          schema: z.object({ score: z.number(), rationale: z.string() }),
        }),
      });
      score = Math.max(0, Math.min(100, Math.round(output.score)));
      rationale = output.rationale;
    } catch (e) {
      if (!NoObjectGeneratedError.isInstance(e)) throwSanitized(e, "calculateFounderScore.ai");
    }

    await context.supabase
      .from("founders")
      .update({ founder_score: score, last_updated: new Date().toISOString() })
      .eq("id", data.founderId);

    return { score, rationale };
  });

// ---------- Multi-Axis Screening ----------
export const screenMultiAxis = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ opportunityId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const orgId = await getOrg(context.supabase, context.userId);
    const { data: opp, error } = await context.supabase
      .from("opportunities")
      .select("*, founders(*)")
      .eq("id", data.opportunityId)
      .single();
    if (error) throwSanitized(error, "screenMultiAxis");
    await assertOrgAccess(context.supabase, opp.organization_id);

    const gateway = await getGateway();
    let result = {
      founder: { score: 70, signals: ["Technical background", "Prior startup experience"] },
      market: { sentiment: "Neutral" as "Bullish" | "Neutral" | "Bearish", tam_estimate_usd: 10_000_000_000, thesis_note: "Emerging category." },
      idea: { fit: "Medium" as "High" | "Medium" | "Low", moat: "Data recursion", wedge: "Cost advantage" },
      claims: [] as Array<{ claim: string; trust_score: number; source_url: string }>,
    };

    try {
      const { output } = await generateText({
        model: gateway(MODEL),
        prompt: `Screen this VC opportunity on three axes: Founder, Market, Idea. Also list 3-5 verifiable claims with fictional but plausible source URLs and trust_score 0-1.
Company: ${opp.company_name}
Founder: ${opp.founders?.name} (${opp.founders?.github_handle})
Pitch: ${opp.investment_memo ?? "N/A"}`,
        output: Output.object({
          schema: z.object({
            founder: z.object({
              score: z.number(),
              signals: z.array(z.string()),
            }),
            market: z.object({
              sentiment: z.enum(["Bullish", "Neutral", "Bearish"]),
              tam_estimate_usd: z.number(),
              thesis_note: z.string(),
            }),
            idea: z.object({
              fit: z.enum(["High", "Medium", "Low"]),
              moat: z.string(),
              wedge: z.string(),
            }),
            claims: z.array(
              z.object({
                claim: z.string(),
                trust_score: z.number(),
                source_url: z.string(),
              }),
            ),
          }),
        }),
      });
      result = output as typeof result;
    } catch (e) {
      if (!NoObjectGeneratedError.isInstance(e)) throwSanitized(e, "screenMultiAxis.ai");
    }

    await context.supabase
      .from("opportunities")
      .update({
        screening_result: result,
        trust_report: { claims: result.claims },
        status: "screened",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.opportunityId);

    // Insert evidence logs
    for (const c of result.claims) {
      await context.supabase.from("evidence_logs").insert({
        opportunity_id: data.opportunityId,
        organization_id: orgId,
        source_type: "web",
        source_url: c.source_url,
        content_snippet: c.claim,
        trust_score: c.trust_score,
      });
    }

    return result;
  });

// ---------- Investment Memo ----------
export const generateMemo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ opportunityId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: opp, error } = await context.supabase
      .from("opportunities")
      .select("*, founders(*)")
      .eq("id", data.opportunityId)
      .single();
    if (error) throwSanitized(error, "generateMemo");
    await assertOrgAccess(context.supabase, opp.organization_id);

    const gateway = await getGateway();
    const { text } = await generateText({
      model: gateway(MODEL),
      prompt: `Write a concise investment memo (markdown, ~250 words) for a $100K pre-seed check.
Sections: ## Thesis Match, ## Founder, ## Market, ## Risks, ## Recommendation.
If any factual detail is unknown, write "Not disclosed" verbatim.

Company: ${opp.company_name}
Founder: ${opp.founders?.name}
Founder Score: ${opp.founders?.founder_score ?? "N/A"}
Screening: ${JSON.stringify(opp.screening_result ?? {})}`,
    });

    await context.supabase
      .from("opportunities")
      .update({ investment_memo: text, updated_at: new Date().toISOString() })
      .eq("id", data.opportunityId);

    return { memo: text };
  });

// ---------- Decision ----------
export const decideOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) =>
    z.object({
      opportunityId: z.string().uuid(),
      decision: z.enum(["approved", "rejected"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: ownerCheck, error: ocErr } = await context.supabase
      .from("opportunities").select("organization_id").eq("id", data.opportunityId).single();
    if (ocErr) throwSanitized(ocErr, "decideOpportunity");
    await assertOrgAccess(context.supabase, ownerCheck.organization_id);
    const { error } = await context.supabase
      .from("opportunities")
      .update({ status: data.decision, updated_at: new Date().toISOString() })
      .eq("id", data.opportunityId);
    if (error) throwSanitized(error, "decideOpportunity");
    return { ok: true };
  });

// ---------- Real Enrichment (GitHub + Tavily + OpenAI) ----------
export const enrichOpportunity = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ opportunityId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const orgId = await getOrg(context.supabase, context.userId);
    const { data: opp, error } = await context.supabase
      .from("opportunities")
      .select("*, founders(*)")
      .eq("id", data.opportunityId)
      .single();
    if (error) throwSanitized(error, "enrichOpportunity");
    await assertOrgAccess(context.supabase, opp.organization_id);

    const founder = opp.founders as any;
    const { fetchFounderGitHub } = await import("./providers/github.server");
    const { tavilySearch, domainTrustBoost } = await import("./providers/tavily.server");
    const { openaiJSON } = await import("./providers/openai.server");
    const { fetchFounderPapers, searchTopicPapers } = await import("./providers/arxiv.server");

    // Pull thesis sectors to focus the web query.
    const { data: thesisRow } = await context.supabase
      .from("thesis_config")
      .select("sectors")
      .eq("organization_id", orgId)
      .maybeSingle();
    const sectorHint =
      Array.isArray(thesisRow?.sectors) && thesisRow!.sectors.length
        ? (thesisRow!.sectors as string[]).slice(0, 2).join(" ")
        : "AI infrastructure";

    const founderName = founder?.name ?? "";
    const startupName = opp.company_name;
    const founderQuery = `"${founderName}" OR "${startupName}" ${sectorHint} github`;
    const companyQuery = `"${startupName}" ${sectorHint} funding traction`;

    const [gh, webFounder, webCompany, arxivFounder, arxivTopic] = await Promise.all([
      fetchFounderGitHub(founder?.github_handle),
      tavilySearch(founderQuery, { maxResults: 5, searchDepth: "advanced" }),
      tavilySearch(companyQuery, { maxResults: 5, searchDepth: "advanced" }),
      fetchFounderPapers(founder?.name),
      searchTopicPapers(`${opp.company_name} ${opp.investment_memo ?? ""}`),
    ]);

    const webHits = [...webFounder.hits, ...webCompany.hits];

    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        founder_score: { type: "integer", minimum: 0, maximum: 100 },
        rationale: { type: "string" },
        founder: {
          type: "object",
          additionalProperties: false,
          properties: {
            score: { type: "integer", minimum: 0, maximum: 100 },
            signals: { type: "array", items: { type: "string" } },
          },
          required: ["score", "signals"],
        },
        market: {
          type: "object",
          additionalProperties: false,
          properties: {
            sentiment: { type: "string", enum: ["Bullish", "Neutral", "Bearish"] },
            tam_estimate_usd: { type: "number" },
            thesis_note: { type: "string" },
          },
          required: ["sentiment", "tam_estimate_usd", "thesis_note"],
        },
        idea: {
          type: "object",
          additionalProperties: false,
          properties: {
            fit: { type: "string", enum: ["High", "Medium", "Low"] },
            moat: { type: "string" },
            wedge: { type: "string" },
          },
          required: ["fit", "moat", "wedge"],
        },
        claims: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              claim: { type: "string" },
              trust_score: { type: "number", minimum: 0, maximum: 1 },
              source_url: { type: "string" },
            },
            required: ["claim", "trust_score", "source_url"],
          },
        },
        investment_memo: { type: "string" },
      },
      required: ["founder_score", "rationale", "founder", "market", "idea", "claims", "investment_memo"],
    } as const;

    const userPayload = {
      opportunity: { company: opp.company_name, pitch: opp.investment_memo ?? "" },
      founder: {
        name: founder?.name,
        bio: founder?.bio,
        location: founder?.location,
        github_handle: founder?.github_handle,
        linkedin_url: founder?.linkedin_url,
      },
      github_signals: gh,
      web_signals: webHits,
      arxiv_founder_signals: {
        count: arxivFounder.count,
        recent_count: arxivFounder.recent_count,
        top_categories: arxivFounder.top_categories,
        papers: arxivFounder.papers.map((p) => ({
          title: p.title,
          summary: p.summary,
          published: p.published,
          categories: p.categories,
          url: p.url,
        })),
      },
      arxiv_topic_signals: {
        count: arxivTopic.count,
        top_categories: arxivTopic.top_categories,
        papers: arxivTopic.papers.map((p) => ({
          title: p.title,
          summary: p.summary,
          published: p.published,
          categories: p.categories,
          url: p.url,
        })),
      },
    };

    const result = await openaiJSON<{
      founder_score: number;
      rationale: string;
      founder: { score: number; signals: string[] };
      market: { sentiment: "Bullish" | "Neutral" | "Bearish"; tam_estimate_usd: number; thesis_note: string };
      idea: { fit: "High" | "Medium" | "Low"; moat: string; wedge: string };
      claims: Array<{ claim: string; trust_score: number; source_url: string }>;
      investment_memo: string;
    }>({
      system:
        "You are a rigorous venture-capital analyst. Use ONLY the provided GitHub, web, and arXiv signals to ground your evaluation. Treat arXiv publications as a strong signal for technical depth (founder axis) and idea originality vs. field crowding (idea axis) — recent papers by the founder in relevant categories (cs.LG, cs.AI, cs.CL, quant-ph, etc.) increase the founder score; a crowded topic search decreases the moat/wedge. If a fact is missing, write 'Not disclosed' verbatim in the memo. For every claim you output, cite a source_url that appears in the provided signals; prefer arXiv URLs for academic claims. Score conservatively.",
      user:
        "Evaluate this opportunity and return strict JSON matching the schema. The memo should be markdown (~250 words) with sections: ## Thesis Match, ## Founder, ## Market, ## Risks, ## Recommendation.\n\nDATA:\n" +
        JSON.stringify(userPayload).slice(0, 20000),
      schemaName: "vc_enrichment",
      schema: schema as any,
    });

    const screening = {
      founder: result.founder,
      market: result.market,
      idea: result.idea,
      claims: result.claims,
    };

    await context.supabase
      .from("founders")
      .update({ founder_score: result.founder_score, last_updated: new Date().toISOString() })
      .eq("id", founder.id);

    await context.supabase
      .from("opportunities")
      .update({
        screening_result: screening,
        trust_report: { claims: result.claims },
        investment_memo: result.investment_memo,
        status: "screened",
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.opportunityId);

    for (const c of result.claims) {
      const isArxiv = /arxiv\.org/i.test(c.source_url);
      const boosted = Math.min(1, (c.trust_score ?? 0) + domainTrustBoost(c.source_url));
      await context.supabase.from("evidence_logs").insert({
        opportunity_id: data.opportunityId,
        organization_id: orgId,
        source_type: isArxiv ? "arxiv" : "web",
        source_url: c.source_url,
        content_snippet: c.claim,
        trust_score: boosted,
      });
    }

    return {
      ok: true,
      founder_score: result.founder_score,
      rationale: result.rationale,
      providers: {
        github: gh.error ? sanitizeError(gh.error).message : (gh.found ? "ok" : "not-found"),
        tavily:
          webFounder.error || webCompany.error
            ? sanitizeError(webFounder.error ?? webCompany.error).message
            : "ok",
        arxiv:
          arxivFounder.error && arxivTopic.error
            ? sanitizeError(arxivFounder.error).message
            : `${arxivFounder.count} founder / ${arxivTopic.count} topic papers`,
      },
    };
  });

// ---------- Seed Demo Data ----------
export const seedDemoData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const orgId = await getOrg(context.supabase, context.userId);
    const demos = [
      { name: "Sarah Mayer", gh: "smayer", li: "sarahmayer", loc: "Berlin", co: "Synthetix AI", pitch: "Proprietary dataset enabling inference at 1/10th the cost of incumbent models.", score: 84, status: "screened" },
      { name: "Jonas Kahn", gh: "jkahn", li: "jonaskahn", loc: "Berlin", co: "VectorDB Core", pitch: "Open-source vector database purpose-built for edge inference.", score: 91, status: "sourced" },
      { name: "Elena Reyes", gh: "elenar", li: "elenareyes", loc: "London", co: "NeuroNet Labs", pitch: "Multimodal agents for scientific research automation.", score: 78, status: "screened" },
      { name: "Marcus Chen", gh: "mchen", li: "marcuschen", loc: "SF", co: "QuantumFabric", pitch: "Quantum-inspired optimization for logistics networks.", score: 79, status: "sourced" },
      { name: "Priya Shah", gh: "priyash", li: "priyashah", loc: "Bangalore", co: "AgentOps", pitch: "Observability platform for autonomous AI agent fleets.", score: 88, status: "screened" },
      { name: "Lukas Weber", gh: "lweber", li: "lukasweber", loc: "Munich", co: "SiliconMind", pitch: "Custom silicon compiler for transformer workloads.", score: 92, status: "sourced" },
      { name: "Aiko Tanaka", gh: "aikot", li: "aikotanaka", loc: "Tokyo", co: "ReasonEngine", pitch: "Symbolic reasoning layer over LLMs for finance.", score: 71, status: "sourced" },
      { name: "David Okonkwo", gh: "dokonkwo", li: "davidokonkwo", loc: "Lagos", co: "FrontierData", pitch: "Data annotation network for African languages.", score: 68, status: "sourced" },
      { name: "Maya Rossi", gh: "mrossi", li: "mayarossi", loc: "Milan", co: "InferEdge", pitch: "On-device inference SDK for embedded systems.", score: 82, status: "screened" },
      { name: "Tomás Silva", gh: "tsilva", li: "tomassilva", loc: "Lisbon", co: "AutoResearcher", pitch: "AI research assistant that reproduces papers end-to-end.", score: 74, status: "sourced" },
    ];

    let inserted = 0;
    for (const d of demos) {
      const { data: f } = await context.supabase
        .from("founders")
        .insert({
          organization_id: orgId,
          name: d.name,
          github_handle: d.gh,
          linkedin_url: `https://linkedin.com/in/${d.li}`,
          location: d.loc,
          company_name: d.co,
          founder_score: d.score,
          bio: `Repeat technical founder based in ${d.loc}.`,
        })
        .select("id")
        .single();
      if (!f) continue;
      const screening = d.status === "screened" ? {
        founder: { score: d.score, signals: ["Strong GitHub velocity", "Prior exit"] },
        market: { sentiment: d.score > 85 ? "Bullish" : "Neutral", tam_estimate_usd: 85_000_000_000, thesis_note: "TAM expansion into edge-compute." },
        idea: { fit: d.score > 80 ? "High" : "Medium", moat: "Data recursion", wedge: "Cost advantage" },
        claims: [
          { claim: `${d.co} team velocity +40% MoM (GitHub commits)`, trust_score: 0.92, source_url: `https://github.com/${d.gh}` },
          { claim: `${d.name} previously exited startup at $42M ACQ`, trust_score: 0.78, source_url: `https://linkedin.com/in/${d.li}` },
        ],
      } : null;
      await context.supabase.from("opportunities").insert({
        organization_id: orgId,
        founder_id: f.id,
        company_name: d.co,
        status: d.status,
        investment_memo: d.pitch,
        screening_result: screening,
        trust_report: screening ? { claims: screening.claims } : null,
      });
      if (screening) {
        for (const c of screening.claims) {
          await context.supabase.from("evidence_logs").insert({
            opportunity_id: null,
            organization_id: orgId,
            source_type: "web",
            source_url: c.source_url,
            content_snippet: c.claim,
            trust_score: c.trust_score,
          });
        }
      }
      inserted++;
    }
    return { inserted };
  });

// ---------- AI Discovery Feed (GitHub + arXiv → OpenAI curator) ----------
function normalizeKey(s: string): string {
  return (s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

export const discoverOpportunities = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const orgId = await getOrg(context.supabase, context.userId);
    const { data: thesis } = await context.supabase
      .from("thesis_config")
      .select("*")
      .eq("organization_id", orgId)
      .maybeSingle();

    const sectors: string[] =
      Array.isArray(thesis?.sectors) && thesis!.sectors.length
        ? thesis!.sectors
        : ["AI Infrastructure", "DeepTech"];
    const geography: string[] = thesis?.geography ?? ["Global"];
    const checkSize: number = thesis?.check_size ?? 100_000;

    const { githubDiscover } = await import("./providers/github.server");
    const { arxivDiscover } = await import("./providers/arxiv.server");
    const { openaiJSON } = await import("./providers/openai.server");

    const [gh, ax] = await Promise.all([
      githubDiscover(sectors, { perSector: 8, minStars: 50, sinceDays: 120 }),
      arxivDiscover(sectors, { perSector: 8 }),
    ]);

    // Existing dedupe_keys for the org to filter out on the client side too
    const { data: existing } = await context.supabase
      .from("opportunities")
      .select("dedupe_key")
      .eq("organization_id", orgId)
      .not("dedupe_key", "is", null);
    const existingKeys = new Set((existing ?? []).map((r: any) => r.dedupe_key));

    const payload = {
      thesis: { sectors, geography, check_size: checkSize },
      github_repos: gh.repos.slice(0, 25).map((r) => ({
        repo: r.full_name,
        owner: r.owner_login,
        description: r.description,
        stars: r.stars,
        language: r.language,
        url: r.url,
        topics: r.topics,
      })),
      arxiv_papers: ax.papers.slice(0, 25).map((p) => ({
        title: p.title,
        summary: p.summary,
        authors: p.authors.slice(0, 4),
        categories: p.categories,
        published: p.published,
        url: p.url,
      })),
    };

    const schema = {
      type: "object",
      additionalProperties: false,
      properties: {
        candidates: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            properties: {
              founder_name: { type: "string" },
              startup_name: { type: "string" },
              source: { type: "string", enum: ["github", "arxiv"] },
              source_url: { type: "string" },
              github_handle: { type: "string" },
              founder_score: { type: "integer", minimum: 0, maximum: 100 },
              screening: {
                type: "object",
                additionalProperties: false,
                properties: {
                  founder: { type: "string", enum: ["Strong", "Neutral", "Weak"] },
                  market: { type: "string", enum: ["Bullish", "Neutral", "Bearish"] },
                  idea: { type: "string", enum: ["High", "Medium", "Low"] },
                },
                required: ["founder", "market", "idea"],
              },
              memo_short: { type: "string" },
              reason: { type: "string" },
              dedupe_key: { type: "string" },
            },
            required: [
              "founder_name",
              "startup_name",
              "source",
              "source_url",
              "github_handle",
              "founder_score",
              "screening",
              "memo_short",
              "reason",
              "dedupe_key",
            ],
          },
        },
      },
      required: ["candidates"],
    } as const;

    type Candidate = {
      founder_name: string;
      startup_name: string;
      source: "github" | "arxiv";
      source_url: string;
      github_handle: string;
      founder_score: number;
      screening: { founder: string; market: "Bullish" | "Neutral" | "Bearish"; idea: "High" | "Medium" | "Low" };
      memo_short: string;
      reason: string;
      dedupe_key: string;
    };

    let candidates: Candidate[] = [];
    try {
      const result = await openaiJSON<{ candidates: Candidate[] }>({
        system:
          "You are a venture-capital scout. From raw GitHub repos and arXiv papers, curate real, high-signal candidates that fit the thesis. Rules: (1) One candidate per unique founder+startup. (2) Skip tutorials, awesome-lists, surveys, review papers, and forks. (3) Prefer solo/small-team repos with meaningful stars and recent activity; prefer arXiv authors with recent original research in aligned categories (cs.LG, cs.AI, cs.CL, quant-ph, etc.). (4) For GitHub candidates, use the repo owner as founder_name (or the repo name as startup_name); github_handle = owner login. (5) For arXiv, use the first author as founder_name; startup_name = short project name derived from paper title; github_handle = ''. (6) source_url MUST be a URL that appears in the input. (7) dedupe_key = lowercase-slug of startup_name. (8) founder_score conservative (0-100). (9) reason: one sentence tying signal to the thesis. Return 4-8 candidates total; skip everything below the bar.",
        user:
          "Curate opportunities from these signals for the given thesis. Return strict JSON.\n\n" +
          JSON.stringify(payload).slice(0, 22000),
        schemaName: "vc_discovery",
        schema: schema as any,
      });
      candidates = result.candidates ?? [];
    } catch (e: any) {
      return {
        inserted: 0,
        skipped: 0,
        error: sanitizeError(e).message,
        providers: {
          github: gh.error ? sanitizeError(gh.error).message : `${gh.repos.length} repos`,
          arxiv: ax.error ? sanitizeError(ax.error).message : `${ax.papers.length} papers`,
        },
      };
    }

    let inserted = 0;
    let skipped = 0;
    for (const c of candidates) {
      const key = normalizeKey(c.dedupe_key || c.startup_name);
      if (!key || existingKeys.has(key)) {
        skipped++;
        continue;
      }
      existingKeys.add(key);

      const { data: founder, error: fErr } = await context.supabase
        .from("founders")
        .insert({
          organization_id: orgId,
          name: c.founder_name,
          github_handle: c.github_handle || null,
          company_name: c.startup_name,
          founder_score: c.founder_score,
          bio: c.reason,
        })
        .select("id")
        .single();
      if (fErr || !founder) {
        skipped++;
        continue;
      }

      const screening = {
        founder: { score: c.founder_score, signals: [c.reason] },
        market: { sentiment: c.screening.market, tam_estimate_usd: 0, thesis_note: c.reason },
        idea: { fit: c.screening.idea, moat: "", wedge: "" },
        claims: [{ claim: c.reason, trust_score: 0.7, source_url: c.source_url }],
      };

      const { data: opp } = await context.supabase
        .from("opportunities")
        .insert({
          organization_id: orgId,
          founder_id: founder.id,
          company_name: c.startup_name,
          status: "discovered",
          source: c.source,
          discovery_reason: c.reason,
          dedupe_key: key,
          discovered_at: new Date().toISOString(),
          investment_memo: c.memo_short,
          screening_result: screening,
          trust_report: { claims: screening.claims },
        })
        .select("id")
        .single();

      if (opp) {
        await context.supabase.from("evidence_logs").insert({
          opportunity_id: opp.id,
          organization_id: orgId,
          source_type: c.source,
          source_url: c.source_url,
          content_snippet: c.reason,
          trust_score: 0.7,
        });
        inserted++;
      } else {
        skipped++;
      }
    }

    return {
      inserted,
      skipped,
      providers: {
        github: gh.error ? sanitizeError(gh.error).message : `${gh.repos.length} repos`,
        arxiv: ax.error ? sanitizeError(ax.error).message : `${ax.papers.length} papers`,
      },
    };
  });

// ---------- Promote a discovered opportunity into the pipeline ----------
export const promoteDiscovery = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((d: unknown) => z.object({ opportunityId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: ownerCheck, error: ocErr } = await context.supabase
      .from("opportunities").select("organization_id").eq("id", data.opportunityId).single();
    if (ocErr) throwSanitized(ocErr, "promoteDiscovery");
    await assertOrgAccess(context.supabase, ownerCheck.organization_id);
    const { error } = await context.supabase
      .from("opportunities")
      .update({ status: "sourced", updated_at: new Date().toISOString() })
      .eq("id", data.opportunityId);
    if (error) throwSanitized(error, "promoteDiscovery");
    return { ok: true };
  });