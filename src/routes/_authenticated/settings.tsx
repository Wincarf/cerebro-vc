import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/lib/vc-ui";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);
  return (
    <div>
      <PageHeader title="Settings" subtitle="Account & workspace" />
      <div className="p-8 space-y-4">
        <div className="rounded-lg border bg-card p-6">
          <div className="label-caps">Signed in as</div>
          <div className="mt-2 data-mono">{email ?? "…"}</div>
        </div>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = "/auth";
          }}
          className="rounded-md border px-4 py-2 text-sm hover:bg-secondary"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}