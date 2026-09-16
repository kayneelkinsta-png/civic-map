import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { StatusChip } from "@/components/StatusChip";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useAuthorityConfig } from "@/hooks/useAuthorityConfig";
import { displayHandle, timeAgo, type Issue } from "@/lib/civic";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "My CivicLense — your reports and confirmations" },
      {
        name: "description",
        content: "Track the issues you've reported, confirmed and followed on CivicLense.",
      },
      { property: "og:title", content: "My CivicLense" },
      { property: "og:description", content: "Your reports, confirmations and followed issues." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

const TABS = ["Reports", "Confirmations", "Following", "Resolved", "Account"] as const;
type Tab = (typeof TABS)[number];

const FIELDS =
  "id, reference, title, description, address_text, latitude, longitude, status, confirmation_count, last_confirmed_at, resolved_at, created_at, is_sample, category_id, authority_id, reporter_id";

function ProfilePage() {
  const { user, profile, signOut } = useAuth();
  const { config } = useAuthorityConfig();
  const [tab, setTab] = useState<Tab>("Reports");

  const { data: mine = [] } = useQuery({
    queryKey: ["my-issues", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issues")
        .select(FIELDS)
        .eq("reporter_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Issue[];
    },
  });

  const { data: confirmed = [] } = useQuery({
    queryKey: ["my-confirmations", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issue_confirmations")
        .select(`updated_at, issues!inner(${FIELDS})`)
        .eq("user_id", user!.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => row.issues as unknown as Issue);
    },
  });

  const { data: following = [] } = useQuery({
    queryKey: ["my-following", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issue_followers")
        .select(`created_at, issues!inner(${FIELDS})`)
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => row.issues as unknown as Issue);
    },
  });

  if (!user) {
    return (
      <AppShell>
        <div className="civic-card mx-auto max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold">Sign in to see My CivicLense</h1>
          <div className="mt-5 flex flex-col gap-2">
            <Button asChild className="h-12">
              <Link to="/login" search={{ redirect: "/profile" }}>
                Sign in
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-12">
              <Link to="/register">Create an account</Link>
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const resolved = mine.filter((i) => i.status === "RESOLVED");
  const lists: Record<Exclude<Tab, "Account">, Issue[]> = {
    Reports: mine,
    Confirmations: confirmed,
    Following: following,
    Resolved: resolved,
  };

  return (
    <AppShell>
      <header className="mb-6">
        <h1 className="text-3xl font-semibold">My CivicLense</h1>
        <p className="mt-1 text-muted-foreground">
          Publicly you appear as{" "}
          <span className="font-medium text-foreground">{displayHandle(profile)}</span>
        </p>
      </header>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Reports" value={mine.length} />
        <Stat label="Confirmations" value={confirmed.length} />
        <Stat label="Following" value={following.length} />
        <Stat label="Resolved" value={resolved.length} />
      </div>

      <nav className="mb-5 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full border border-border px-3.5 py-2 text-sm font-medium",
              tab === t ? "bg-primary text-primary-foreground" : "bg-card",
            )}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "Account" ? (
        <div className="civic-card max-w-md space-y-4 p-5">
          <h2 className="text-lg font-semibold">Account settings</h2>
          <Field label="Name" value={`${profile?.first_name ?? ""} ${profile?.surname ?? ""}`.trim()} />
          <Field label="Email" value={user.email ?? ""} />
          <Field label="Postcode" value={profile?.postcode ?? "—"} />
          <p className="text-xs text-muted-foreground">
            Your surname, email and full postcode are never shown publicly.
          </p>
          <Button variant="outline" className="h-12 w-full" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {lists[tab].map((issue) => (
            <li key={issue.id}>
              <Link
                to="/issues/$id"
                params={{ id: issue.id }}
                className="civic-card flex items-center justify-between gap-4 p-4 transition-shadow hover:shadow-float"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{issue.title}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {issue.address_text ?? config?.location_fallback_label ?? "Location not given"} ·{" "}
                    {timeAgo(issue.created_at)}
                  </p>
                </div>
                <StatusChip status={issue.status} />
              </Link>
            </li>
          ))}
          {lists[tab].length === 0 && (
            <li className="civic-card p-8 text-center text-sm text-muted-foreground">
              Nothing here yet.
            </li>
          )}
        </ul>
      )}
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="civic-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value || "—"}</span>
    </div>
  );
}
