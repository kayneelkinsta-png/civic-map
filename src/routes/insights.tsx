import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";

import { AppShell } from "@/components/AppShell";
import {
  ageInDays,
  fetchCategories,
  fetchInsightsByWard,
  fetchInsightsSummary,
  fetchIssues,
} from "@/lib/civic";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Local issue insights — CivicLense Southampton" },
      {
        name: "description",
        content:
          "Live community statistics: open and resolved issues, most reported categories, average issue age and resident confirmations.",
      },
      { property: "og:title", content: "Local issue insights — CivicLense" },
      {
        property: "og:description",
        content: "Live community statistics from resident reports in Southampton.",
      },
    ],
  }),
  component: InsightsPage,
});

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="civic-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function InsightsPage() {
  const { data: issues = [] } = useQuery({ queryKey: ["issues"], queryFn: fetchIssues });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const { data: summary } = useQuery({
    queryKey: ["insights-summary"],
    queryFn: fetchInsightsSummary,
  });
  const { data: byWard = [] } = useQuery({
    queryKey: ["insights-by-ward"],
    queryFn: fetchInsightsByWard,
  });
  const { data: confirmations = 0 } = useQuery({
    queryKey: ["confirmation-total"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("issue_confirmations")
        .select("id", { count: "exact", head: true });
      if (error) throw error;
      return count ?? 0;
    },
  });

  const stats = useMemo(() => {
    const open = issues.filter((i) => i.status !== "RESOLVED");
    const resolved = issues.filter((i) => i.status === "RESOLVED");
    const byCategory = new Map<string, number>();
    for (const issue of issues) {
      byCategory.set(issue.category_id, (byCategory.get(issue.category_id) ?? 0) + 1);
    }
    const avgAge = open.length
      ? Math.round(open.reduce((sum, i) => sum + ageInDays(i.created_at), 0) / open.length)
      : 0;
    return {
      open,
      resolved,
      avgAge,
      topCategories: [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6),
      communityCount: issues.reduce((s, i) => s + i.confirmation_count, 0),
    };
  }, [issues]);

  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const maxCategory = stats.topCategories[0]?.[1] ?? 1;

  return (
    <AppShell>
      <header className="mb-6">
        <h1 className="text-3xl font-semibold">Insights</h1>
        <p className="mt-1 text-muted-foreground">
          Community-reported data only. These figures describe reports made on CivicLense, not
          local authority performance.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total issues" value={String(issues.length)} />
        <Stat label="Open issues" value={String(stats.open.length)} />
        <Stat label="Resolved issues" value={String(stats.resolved.length)} />
        <Stat
          label="Average age of open issues"
          value={`${stats.avgAge} days`}
          hint="Since first reported"
        />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <section className="civic-card p-5">
          <h2 className="text-lg font-semibold">Most reported categories</h2>
          <ul className="mt-4 space-y-3">
            {stats.topCategories.map(([id, count]) => {
              const category = categoryById.get(id);
              return (
                <li key={id}>
                  <div className="flex items-center justify-between text-sm">
                    <span>
                      <span aria-hidden>{category?.emoji} </span>
                      {category?.name ?? "Unknown"}
                    </span>
                    <span className="font-medium">{count}</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-secondary">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${(count / maxCategory) * 100}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="civic-card p-5">
          <h2 className="text-lg font-semibold">Issues by ward</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {byWard.map((row) => (
              <li
                key={row.ward_id}
                className="flex items-center justify-between border-b border-border pb-2 last:border-0"
              >
                <span className="truncate pr-3">{row.name}</span>
                <span className="font-medium">{row.total}</span>
              </li>
            ))}
            {byWard.length === 0 && (
              <li className="text-muted-foreground">
                No reports yet fall inside an imported ward boundary.
              </li>
            )}
          </ul>
        </section>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Community confirmations"
          value={String(confirmations)}
          hint="Times residents pressed “Still a problem”, including demo data"
        />
        <Stat
          label="Issues with confirmations"
          value={String(issues.filter((i) => i.confirmation_count > 0).length)}
          hint="Issues at least one resident says are still a problem"
        />
        <Stat
          label="Median age of open issues"
          value={
            summary?.median_age_days != null
              ? `${Math.round(Number(summary.median_age_days))} days`
              : "—"
          }
          hint="Half of open issues are older than this"
        />
        <Stat
          label="Median time to resolved"
          value={
            summary?.median_resolution_days != null
              ? `${Math.round(Number(summary.median_resolution_days))} days`
              : "Not enough data"
          }
          hint="Based on issues marked resolved on CivicLense"
        />
      </div>
    </AppShell>
  );
}
