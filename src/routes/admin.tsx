import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "@/components/AppShell";
import { StatusChip } from "@/components/StatusChip";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchCategories, fetchIssues, timeAgo } from "@/lib/civic";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — CivicLense" },
      { name: "description", content: "Moderation and configuration tools for CivicLense staff." },
      { property: "og:title", content: "Admin — CivicLense" },
      { property: "og:description", content: "Staff tools for moderation and configuration." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const TABS = ["Reports", "Users", "Moderation", "Authorities", "Categories", "Data sources"] as const;
type Tab = (typeof TABS)[number];

function AdminPage() {
  const { user, isStaff } = useAuth();
  const [tab, setTab] = useState<Tab>("Reports");

  const { data: issues = [] } = useQuery({
    queryKey: ["issues"],
    queryFn: fetchIssues,
    enabled: isStaff,
  });
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    enabled: isStaff,
  });
  const { data: authorities = [] } = useQuery({
    queryKey: ["authorities"],
    enabled: isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("authorities")
        .select("id, name, slug, authority_type, gss_code, is_verified")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: dataSources = [] } = useQuery({
    queryKey: ["data-sources"],
    enabled: isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("data_sources")
        .select(
          "id, organisation, dataset_name, dataset_type, source_url, licence, last_imported_at, record_count, is_active, import_status",
        )
        .order("organisation");
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: assetCount = 0 } = useQuery({
    queryKey: ["asset-count"],
    enabled: isStaff,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("infrastructure_assets")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });
  const { data: moderation = [] } = useQuery({
    queryKey: ["moderation-actions"],
    enabled: isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moderation_actions")
        .select("id, action, target_type, reason, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  if (!user) {
    return (
      <AppShell>
        <div className="civic-card p-8 text-center">
          <h1 className="text-xl font-semibold">Staff sign-in required</h1>
          <Button asChild className="mt-4">
            <Link to="/login" search={{ redirect: "/admin" }}>
              Sign in
            </Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  if (!isStaff) {
    return (
      <AppShell>
        <div className="civic-card p-8 text-center">
          <h1 className="text-xl font-semibold">You need admin access</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This area is limited to CivicLense moderators and administrators.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="mb-6">
        <h1 className="text-3xl font-semibold">Admin</h1>
        <p className="mt-1 text-muted-foreground">Moderation and platform configuration.</p>
      </header>

      <nav className="mb-6 flex flex-wrap gap-2">
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

      {tab === "Reports" && (
        <ul className="space-y-2">
          {issues.slice(0, 50).map((issue) => (
            <li key={issue.id} className="civic-card flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <Link to="/issues/$id" params={{ id: issue.id }} className="truncate font-medium hover:underline">
                  {issue.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {issue.reference} · {timeAgo(issue.created_at)} · {issue.confirmation_count} confirmations
                </p>
              </div>
              <StatusChip status={issue.status} />
            </li>
          ))}
        </ul>
      )}

      {tab === "Authorities" && (
        <ul className="space-y-2">
          {authorities.map((a) => (
            <li key={a.id} className="civic-card flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{a.name}</p>
                <p className="text-xs text-muted-foreground">
                  {a.authority_type} · {a.gss_code ?? "no GSS code"}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {a.is_verified ? "Verified" : "Unverified"}
              </span>
            </li>
          ))}
        </ul>
      )}

      {tab === "Categories" && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {categories.map((c) => (
            <li key={c.id} className="civic-card flex items-center gap-3 p-4">
              <span className="text-xl" aria-hidden>
                {c.emoji}
              </span>
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">{c.slug}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {tab === "Moderation" && (
        <ul className="space-y-2">
          {moderation.map((m) => (
            <li key={m.id} className="civic-card p-4">
              <p className="font-medium">
                {m.action} · {m.target_type}
              </p>
              <p className="text-xs text-muted-foreground">
                {timeAgo(m.created_at)}
                {m.reason ? ` · ${m.reason}` : ""}
              </p>
            </li>
          ))}
          {moderation.length === 0 && (
            <li className="civic-card p-6 text-sm text-muted-foreground">
              No moderation actions recorded yet.
            </li>
          )}
        </ul>
      )}

      {tab === "Users" && (
        <div className="civic-card p-6 text-sm text-muted-foreground">
          Resident accounts are managed in the backend user tools. Account suspension and role
          changes arrive in a later phase.
        </div>
      )}

      {tab === "Data sources" && (
        <div className="space-y-2">
          <div className="civic-card p-4 text-sm">
            <p className="font-medium">{assetCount} infrastructure assets stored</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Assets, boundaries, wards and postcode sectors are only populated from official open
              datasets registered below. Nothing has been imported yet.
            </p>
          </div>
          {dataSources.map((s) => (
            <div key={s.id} className="civic-card p-4">
              <p className="font-medium">
                {s.dataset_name}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  · {s.organisation}
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {s.dataset_type} · {s.licence ?? "licence not recorded"} · {s.record_count} records ·{" "}
                {s.import_status.replace(/_/g, " ")} ·{" "}
                {s.last_imported_at ? timeAgo(s.last_imported_at) : "never imported"}
              </p>
            </div>
          ))}
          {dataSources.length === 0 && (
            <div className="civic-card p-6 text-sm text-muted-foreground">
              No data sources registered yet. Official boundary, ward, postcode and asset datasets
              will be registered here before import.
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
