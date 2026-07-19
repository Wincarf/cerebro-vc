import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { Brain, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="flex items-center justify-between px-8 py-5 border-b">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <span className="font-display font-semibold">Cérebro VC</span>
        </div>
        <Link
          to="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          Open terminal →
        </Link>
      </header>
      <main className="flex-1 flex items-center">
        <div className="max-w-5xl mx-auto px-8 py-24 grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="label-caps">Autonomous Venture Intelligence</span>
            <h1 className="mt-4 text-5xl md:text-6xl font-display font-semibold tracking-tight leading-[1.05]">
              The investment brain that never sleeps.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-md">
              AI-native sourcing, multi-axis screening, and trust-verified
              investment memos — engineered for the next generation of pre-seed
              capital.
            </p>
            <Link
              to="/dashboard"
              className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-3 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Enter the terminal <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="label-caps">Live Signal</span>
              <span className="text-xs text-bullish flex items-center gap-1">
                ● Streaming
              </span>
            </div>
            <div className="data-mono text-xs text-muted-foreground space-y-2">
              <div>[14:22] THESIS_MATCH  Synthetix AI → 92%</div>
              <div>[14:23] RISK_DETECT   ARR variance detected</div>
              <div>[14:24] RECOMMEND     Proceed with $100K</div>
              <div>[14:25] SOURCING      3 new candidates queued</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
