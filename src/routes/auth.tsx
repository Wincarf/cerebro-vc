import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Brain, Eye } from "lucide-react";
import { demoSignup } from "@/lib/auth.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Cérebro VC" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/dashboard" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signup") {
        // Server-side auto-confirmed signup, then immediate sign-in.
        await demoSignup({ data: { email, password } });
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInErr) {
          // Do not disclose whether the email already exists — keep the message generic.
          throw new Error("Could not sign in. Check your email and password.");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (error.message.toLowerCase().includes("not confirmed")) {
            throw new Error(
              "Email not confirmed. Check your inbox, or disable email confirmation in your Supabase dashboard (Auth → Providers → Email)."
            );
          }
          throw error;
        }
      }
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setError(null);
    setNotice(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/dashboard" },
    });
    if (error) {
      const msg = error.message.toLowerCase();
      const notConfigured =
        msg.includes("not enabled") ||
        msg.includes("missing oauth secret") ||
        msg.includes("unsupported provider");
      setError(
        notConfigured
          ? "Google sign-in isn't configured yet. In Supabase → Auth → Providers → Google, enable the provider and paste a Client ID + Client Secret from Google Cloud (redirect URI: https://enixltmubqqwciomvfqs.supabase.co/auth/v1/callback)."
          : error.message
      );
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-lg border bg-card p-8 space-y-6">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <span className="font-display font-semibold">Cérebro VC</span>
        </div>
        <div>
          <h1 className="text-2xl font-display font-semibold">
            {mode === "signin" ? "Sign in" : "Create account"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Access your venture intelligence terminal.
          </p>
        </div>

        <button
          onClick={onGoogle}
          className="w-full rounded-md border bg-background py-2 text-sm font-medium hover:bg-secondary"
        >
          Continue with Google
        </button>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-border" /> or <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          {notice && (
            <p className="text-xs text-primary bg-primary/10 border border-primary/20 rounded-md p-2">
              {notice}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading ? "..." : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <button
          onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          className="text-xs text-muted-foreground hover:text-foreground w-full text-center"
        >
          {mode === "signin"
            ? "Don't have an account? Sign up"
            : "Already have an account? Sign in"}
        </button>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex-1 h-px bg-border" /> demo <div className="flex-1 h-px bg-border" />
        </div>

        <button
          onClick={() => navigate({ to: "/dashboard" })}
          className="w-full rounded-md border border-dashed py-2 text-sm font-medium hover:bg-secondary flex items-center justify-center gap-2"
        >
          <Eye className="h-4 w-4" />
          Explore demo without account
        </button>
      </div>
    </div>
  );
}