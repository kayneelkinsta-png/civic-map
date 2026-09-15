import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { AppShell } from "@/components/AppShell";
import { StatusChip } from "@/components/StatusChip";
import { fetchCategories, fetchIssues, timeAgo } from "@/lib/civic";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/issues/")({
  head: () => ({
    meta: [
      { title: "All reported issues — CivicLense Southampton" },
      {
        name: "description",
        content:
          "Browse every issue reported by residents in Southampton: potholes, street lighting, fly-tipping, flooding and more.",
      },
      { property: "og:title", content: "All reported issues — CivicLense" },
      {
        property: "og:description",
        content: "Browse local issues reported and confirmed by residents.",
      },
    ],
  }),
  component: IssuesPage,
});

type Sort = "recent" | "confirmed" | "oldest";

function IssuesPage() {
  const [sort, setSort] = useState<Sort>("recent");
  const [openOnly, setOpenOnly] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);

  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const { data: issues = [], isLoading } = useQuery({ queryKey: ["issues"], queryFn: fetchIssues });
  const categoryById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const rows = useMemo(() => {
    let list = [...issues];
    if (openOnly) list = list.filter((i) => i.status !== "RESOLVED");
    if (categoryId) list = list.filter((i) => i.category_id === categoryId);
    if (sort === "confirmed") list.sort((a, b) => b.confirmation_count - a.confirmation_count);
    if (sort === "oldest")
      list.sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
    return list;
  }, [issues, sort, openOnly, categoryId]);

  return (
    <AppShell>
      <header className="mb-6">
        <h1 className="text-3xl font-semibold">Issues</h1>
        <p className="mt-1 text-muted-foreground">
          {isLoading ? "Loading…" : `${rows.length} issues reported by residents`}
        </p>
      </header>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {(["recent", "confirmed", "oldest"] as Sort[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setSort(key)}
            className={cn(
              "rounded-full border border-border px-3.5 py-2 text-sm font-medium",
              sort === key ? "bg-primary text-primary-foreground" : "bg-card",
            )}
          >
            {key === "recent" ? "Most recent" : key === "confirmed" ? "Most confirmed" : "Oldest"}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpenOnly((v) => !v)}
          className={cn(
            "rounded-full border border-border px-3.5 py-2 text-sm font-medium",
            openOnly ? "bg-primary text-primary-foreground" : "bg-card",
          )}
        >
          Unresolved only
        </button>
        <select
          value={categoryId ?? ""}
          onChange={(e) => setCategoryId(e.target.value || null)}
          className="rounded-full border border-border bg-card px-3.5 py-2 text-sm font-medium"
          aria-label="Filter by category"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <ul className="space-y-3">
        {rows.map((issue) => {
          const category = categoryById.get(issue.category_id);
          return (
            <li key={issue.id}>
              <Link
                to="/issues/$id"
                params={{ id: issue.id }}
                className="civic-card flex gap-4 p-4 transition-shadow hover:shadow-float"
              >
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-secondary text-xl">
                  {category?.emoji ?? "⚠️"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{issue.title}</p>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {issue.address_text ?? "Southampton"} · reported {timeAgo(issue.created_at)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <StatusChip status={issue.status} />
                    <span className="text-xs text-muted-foreground">
                      ⚠️ {issue.confirmation_count} confirmed
                    </span>
                    {issue.is_sample && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        Demo data
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
        {!isLoading && rows.length === 0 && (
          <li className="civic-card p-8 text-center text-muted-foreground">
            No issues match these filters.
          </li>
        )}
      </ul>
    </AppShell>
  );
}
