// Demo dataset used in MVP mode (no signup required).
// Displayed as fallback when the Supabase-backed data is empty or unavailable.

export type DemoOpportunity = {
  id: string;
  company_name: string;
  status: string;
  updated_at: string;
  created_at: string;
  founder_id: string;
  founders: {
    name: string;
    founder_score: number;
    bio?: string;
    location?: string;
    github_handle?: string;
    linkedin_url?: string;
  };
  screening_result: {
    founder: { score: number; signals: string[] };
    market: { sentiment: "Bullish" | "Neutral" | "Bearish"; tam_estimate_usd: number; thesis_note: string };
    idea: { fit: "High" | "Medium" | "Low"; moat: string; wedge: string };
  };
  trust_report: {
    claims: Array<{ claim: string; trust_score: number; source_url: string }>;
  };
  investment_memo: string;
};

export const demoOpportunities: DemoOpportunity[] = [
  {
    id: "demo-synthetix",
    company_name: "Synthetix AI",
    status: "screening_complete",
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    founder_id: "f-synthetix",
    founders: {
      name: "Elena Voss",
      founder_score: 84,
      bio: "Ex-OpenAI research engineer, MIT PhD. Built distributed inference at scale.",
      location: "San Francisco, USA",
      github_handle: "elenavoss",
      linkedin_url: "https://linkedin.com/in/elenavoss",
    },
    screening_result: {
      founder: { score: 84, signals: ["MIT PhD in ML systems", "3 papers cited 500+ times", "Shipped inference infra at OpenAI"] },
      market: { sentiment: "Bullish", tam_estimate_usd: 42_000_000_000, thesis_note: "Inference is the new compute bottleneck; margins compressing at hyperscalers create opening for specialized runtimes." },
      idea: { fit: "High", moat: "Proprietary kernel scheduler with 3.4x throughput vs vLLM on H100 clusters.", wedge: "Land with agent workloads; expand into enterprise fine-tuning serving." },
    },
    trust_report: {
      claims: [
        { claim: "Elena led inference infrastructure for GPT-4 serving at OpenAI.", trust_score: 0.92, source_url: "https://openai.com/blog/gpt-4-infrastructure" },
        { claim: "Company achieves 3.4x throughput improvement over vLLM benchmark.", trust_score: 0.78, source_url: "https://github.com/synthetix-ai/benchmarks" },
        { claim: "Raised $2M pre-seed from Sequoia scouts (Undisclosed).", trust_score: 0.45, source_url: "https://techcrunch.com/synthetix-launch" },
      ],
    },
    investment_memo: `## Synthetix AI — Investment Memo\n\n**Recommendation:** Approve $100K pre-seed check.\n\n### Team\nElena Voss (CEO) — MIT PhD, ex-OpenAI inference lead. Co-founder Marcus Cheng — ex-Anthropic kernel engineer. Team of 4, all technical.\n\n### Market\nAI inference spend projected to reach $42B by 2028. Enterprises are actively seeking alternatives to hyperscaler-locked pricing.\n\n### Product\nDrop-in serving runtime with proprietary CUDA kernels. 3.4x throughput on H100 vs vLLM baseline. Currently in private beta with 12 design partners.\n\n### Traction\n- 12 design partners, 3 paid pilots\n- $180K in signed LOIs\n- Revenue: Not disclosed\n\n### Risks\n- Hyperscaler competition (AWS, GCP building similar offerings)\n- Talent concentration risk (2 founders own all core IP)\n- Runway: Not disclosed`,
  },
  {
    id: "demo-mercuria",
    company_name: "Mercuria Bio",
    status: "sourced",
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    founder_id: "f-mercuria",
    founders: {
      name: "Dr. Rohan Ayer",
      founder_score: 71,
      bio: "Stanford Biochem PhD. Published in Nature. Second-time founder (exit to Illumina, 2021).",
      location: "Boston, USA",
      github_handle: "rohanayer",
      linkedin_url: "https://linkedin.com/in/rohanayer",
    },
    screening_result: {
      founder: { score: 71, signals: ["Prior exit to Illumina", "Nature publication h-index 22", "Domain expert in protein folding"] },
      market: { sentiment: "Neutral", tam_estimate_usd: 8_500_000_000, thesis_note: "Computational biology adjacent to AI wave, but sales cycles remain slow and regulatory-heavy." },
      idea: { fit: "Medium", moat: "Proprietary training dataset from prior startup exit.", wedge: "Enzyme design for industrial biotech before targeting pharma." },
    },
    trust_report: {
      claims: [
        { claim: "Rohan sold prior startup to Illumina for undisclosed sum in 2021.", trust_score: 0.88, source_url: "https://illumina.com/news/2021-acquisition" },
        { claim: "Team has exclusive licensing rights to Stanford enzyme dataset.", trust_score: 0.62, source_url: "https://otl.stanford.edu/dockets/mercuria" },
      ],
    },
    investment_memo: `## Mercuria Bio — Investment Memo\n\n**Recommendation:** Defer — needs stronger market signal.\n\n### Team\nDr. Rohan Ayer (CEO) — Stanford PhD, previously exited to Illumina.\n\n### Market\nComputational protein design for industrial biotech. TAM $8.5B but ramp is slower than pure AI plays.\n\n### Product\nAI-designed enzymes for detergent and biofuel applications. 2 patents pending.\n\n### Traction\n- 1 paid PoC with Novozymes\n- ARR: Not disclosed\n\n### Risks\n- Long sales cycles typical of industrial biotech\n- Regulatory uncertainty in EU\n- Team size: 3 (too lean for GTM)`,
  },
  {
    id: "demo-photonic",
    company_name: "Photonic Labs",
    status: "screening_complete",
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 30).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
    founder_id: "f-photonic",
    founders: {
      name: "Sofia Nakamura",
      founder_score: 91,
      bio: "Caltech physics PhD. Y Combinator W23. Published in Science on silicon photonics.",
      location: "Palo Alto, USA",
      github_handle: "sofianakamura",
      linkedin_url: "https://linkedin.com/in/sofianakamura",
    },
    screening_result: {
      founder: { score: 91, signals: ["Caltech physics PhD", "YC W23 top 5%", "First-author Science publication", "Prior experience at NVIDIA"] },
      market: { sentiment: "Bullish", tam_estimate_usd: 65_000_000_000, thesis_note: "Photonic interconnects unlock next generation of AI training clusters. Frontier labs actively investing." },
      idea: { fit: "High", moat: "12 patents on silicon-photonic transceiver design.", wedge: "Sell into hyperscaler procurement teams already frustrated with NVLink bottlenecks." },
    },
    trust_report: {
      claims: [
        { claim: "Sofia's paper 'Silicon-photonic AI interconnects' cited 340 times.", trust_score: 0.95, source_url: "https://www.science.org/doi/photonic-labs" },
        { claim: "Photonic Labs graduated YC W23 with $500K SAFE.", trust_score: 0.91, source_url: "https://www.ycombinator.com/companies/photonic-labs" },
        { claim: "LOI signed with a top-3 hyperscaler for pilot deployment.", trust_score: 0.55, source_url: "https://photoniclabs.co/blog/hyperscaler-pilot" },
      ],
    },
    investment_memo: `## Photonic Labs — Investment Memo\n\n**Recommendation:** Strong approve. Lead the round if possible.\n\n### Team\nSofia Nakamura (CEO) — Caltech PhD, ex-NVIDIA silicon photonics. YC W23.\n\n### Market\n$65B TAM by 2030 driven by AI cluster interconnect bottlenecks. Every hyperscaler is a potential customer.\n\n### Product\nSilicon-photonic transceivers with 5x bandwidth per watt vs copper NVLink.\n\n### Traction\n- 12 patents filed\n- LOI with a top-3 hyperscaler (name Not disclosed)\n- Pre-seed: $500K from YC + angels\n\n### Risks\n- Long hardware development cycles\n- Capex intensive; will need Series A within 18 months\n- Competing with well-funded incumbents (Lightmatter, Ayar Labs)`,
  },
  {
    id: "demo-quorum",
    company_name: "Quorum Security",
    status: "rejected",
    updated_at: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 14).toISOString(),
    founder_id: "f-quorum",
    founders: {
      name: "James O'Connell",
      founder_score: 42,
      bio: "Ex-Deloitte consultant. First-time founder. No technical background.",
      location: "London, UK",
      linkedin_url: "https://linkedin.com/in/jamesoconnell",
    },
    screening_result: {
      founder: { score: 42, signals: ["Consulting background", "First-time founder", "No technical co-founder yet"] },
      market: { sentiment: "Bearish", tam_estimate_usd: 3_200_000_000, thesis_note: "Crowded compliance-tech segment with entrenched incumbents (Vanta, Drata). Little differentiation." },
      idea: { fit: "Low", moat: "None identified.", wedge: "Compliance dashboard for SMBs — undifferentiated." },
    },
    trust_report: {
      claims: [
        { claim: "Founder claims 7 years at Deloitte (verified).", trust_score: 0.85, source_url: "https://linkedin.com/in/jamesoconnell" },
        { claim: "Company projects $10M ARR by year 2 (Not disclosed methodology).", trust_score: 0.20, source_url: "https://quorumsecurity.io/investors" },
      ],
    },
    investment_memo: `## Quorum Security — Investment Memo\n\n**Recommendation:** Pass.\n\n### Team\nJames O'Connell (CEO, solo) — 7 years Deloitte, no technical co-founder.\n\n### Market\nCompliance automation is crowded (Vanta, Drata, Secureframe). Late entry.\n\n### Product\nCompliance dashboard for SMBs. Feature parity with Vanta 2020.\n\n### Traction\n- 2 paying customers\n- MRR: Not disclosed\n\n### Risks\n- No technical co-founder\n- Undifferentiated in a mature category\n- Projections not supported by pipeline data`,
  },
];

export const demoThesis = {
  sectors: ["AI Infrastructure", "DeepTech"],
  geography: ["Global"],
  check_size: 100000,
  risk_appetite: "high",
};

export function getDemoOpportunity(id: string) {
  return demoOpportunities.find((o) => o.id === id) ?? null;
}

export type DemoEvidence = {
  id: string;
  opportunity_id: string;
  company_name: string;
  source_type: "github" | "web" | "manual";
  source_url: string;
  content_snippet: string;
  trust_score: number;
  created_at: string;
};

export const demoEvidence: DemoEvidence[] = demoOpportunities.flatMap((o) =>
  o.trust_report.claims.map((c, i) => ({
    id: `${o.id}-ev-${i}`,
    opportunity_id: o.id,
    company_name: o.company_name,
    source_type: c.source_url.includes("github.com") ? "github" : "web",
    source_url: c.source_url,
    content_snippet: c.claim,
    trust_score: c.trust_score,
    created_at: new Date(Date.now() - 1000 * 60 * (5 + i * 17)).toISOString(),
  })),
);

// Founders derived from opportunities for Memory Bench fallback.
export const demoFounders = demoOpportunities.map((o) => ({
  id: o.founder_id,
  name: o.founders.name,
  founder_score: o.founders.founder_score,
  bio: o.founders.bio,
  location: o.founders.location,
  github_handle: o.founders.github_handle,
  linkedin_url: o.founders.linkedin_url,
  company_name: o.company_name,
  last_updated: o.updated_at,
  opportunity_id: o.id,
  status: o.status,
  sector: o.screening_result.market.sentiment === "Bullish" ? "AI Infra" : "DeepTech",
}));