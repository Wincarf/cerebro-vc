import { createFileRoute } from "@tanstack/react-router";

// Sole intentionally-public endpoint. Returns no PII, no config, no versions.
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "content-type": "application/json", "cache-control": "no-store" },
        }),
    },
  },
});