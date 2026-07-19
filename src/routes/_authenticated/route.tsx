import { createFileRoute, Outlet } from "@tanstack/react-router";
import { TopBar, BottomNav } from "@/components/AppSidebar";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  // MVP demo mode: no sign-in required to explore the terminal.
  component: Layout,
});

function Layout() {
  return (
    <div className="min-h-screen bg-background text-foreground relative">
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[40%] bg-secondary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[10%] left-[-10%] w-[50%] h-[30%] bg-primary/5 blur-[100px] rounded-full" />
      </div>
      <TopBar />
      <main className="pb-28">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}