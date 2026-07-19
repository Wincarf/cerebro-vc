import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function MSym({ name, className = "" }: { name: string; className?: string }) {
  return (
    <span
      className={"material-symbols-outlined " + className}
      style={{ fontVariationSettings: "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24" }}
    >
      {name}
    </span>
  );
}

const navItems = [
  { title: "Dashboard", to: "/dashboard", icon: "dashboard" },
  { title: "Sourcing", to: "/sourcing", icon: "explore" },
  { title: "Intelligence", to: "/thesis", icon: "query_stats" },
  { title: "Memory", to: "/founders", icon: "database" },
] as const;

export function TopBar({ right }: { right?: React.ReactNode }) {
  return (
    <header className="bg-background/80 backdrop-blur-xl border-b border-outline-variant/30 sticky top-0 z-50 flex justify-between items-center gap-3 px-4 md:px-6 w-full max-w-[1440px] mx-auto h-16">
      <Link to="/dashboard" className="flex items-center gap-2 min-w-0">
        <MSym name="psychology" className="text-primary text-2xl" />
        <h1 className="font-display text-xl md:text-2xl font-bold text-primary tracking-tighter truncate">
          Cérebro VC
        </h1>
      </Link>
      {right ?? <SessionChip />}
    </header>
  );
}

function SessionChip() {
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  if (!email) {
    return (
      <Link
        to="/auth"
        className="text-primary hover:text-primary/80 transition-colors text-[11px] font-mono uppercase tracking-[0.06em] font-bold"
      >
        Sign in
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-2">
      <span className="text-on-surface-variant text-[11px] font-mono truncate max-w-[140px]">
        {email}
      </span>
      <button
        onClick={async () => {
          await supabase.auth.signOut();
          window.location.href = "/auth";
        }}
        className="text-on-surface-variant hover:text-primary transition-colors text-[11px] font-mono uppercase tracking-[0.06em] font-bold"
      >
        Sign out
      </button>
    </div>
  );
}

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 py-3 bg-surface-container-lowest/90 backdrop-blur-2xl border-t border-outline-variant/20 shadow-[0_-8px_32px_rgba(0,0,0,0.5)] z-50">
      {navItems.map((it) => {
        const active = pathname === it.to || pathname.startsWith(it.to + "/");
        return (
          <Link
            key={it.to}
            to={it.to}
            className={
              active
                ? "flex flex-col items-center justify-center bg-secondary-container text-on-secondary-container rounded-full px-5 py-1.5 shadow-[0_0_15px_rgba(5,102,217,0.3)]"
                : "flex flex-col items-center justify-center text-on-surface-variant/70 hover:text-on-surface transition-all"
            }
          >
            <MSym name={it.icon} />
            <span className="font-mono text-[10px] mt-0.5 uppercase tracking-wider font-bold">
              {it.title}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

// Backwards compatibility
export function AppSidebar() {
  return null;
}