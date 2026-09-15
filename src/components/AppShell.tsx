import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { BottomNav } from "@/components/BottomNav";
import { Logo } from "@/components/Logo";
import { AccountButton } from "@/components/AccountButton";
import { Button } from "@/components/ui/button";

const links = [
  { to: "/issues", label: "Issues" },
  { to: "/insights", label: "Insights" },
  { to: "/about", label: "About" },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                activeProps={{ "data-active": "true" }}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground data-[active=true]:bg-secondary data-[active=true]:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild size="sm" className="hidden md:inline-flex">
              <Link to="/report">Report an issue</Link>
            </Button>
            <AccountButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6 md:py-10">{children}</main>
      <BottomNav />
    </div>
  );
}
