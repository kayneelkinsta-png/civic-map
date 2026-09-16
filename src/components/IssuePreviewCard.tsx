import { Link } from "@tanstack/react-router";
import { ArrowRight, X } from "lucide-react";

import { StatusChip } from "@/components/StatusChip";
import { timeAgo, type Category, type Issue } from "@/lib/civic";

export function IssuePreviewCard({
  issue,
  category,
  onClose,
}: {
  issue: Issue;
  category?: Category | undefined;
  onClose: () => void;
}) {
  return (
    <div className="civic-float relative p-4 shadow-panel">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close issue preview"
        className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <span aria-hidden>{category?.emoji} </span>
        {category?.name ?? "Issue"}
      </p>
      <h3 className="mt-1 pr-8 text-base font-semibold leading-snug">{issue.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Reported {timeAgo(issue.created_at)}
        {issue.address_text ? ` · ${issue.address_text}` : ""}
      </p>
      {issue.confirmation_count > 0 && (
        <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-signal-ack-soft px-2.5 py-1 text-xs font-semibold text-signal-ack">
          <span aria-hidden>⚠️</span> {issue.confirmation_count} resident
          {issue.confirmation_count === 1 ? "" : "s"} say this is still a problem
        </p>
      )}
      <div className="mt-3 flex items-center justify-between gap-3">
        <StatusChip status={issue.status} />
        <Link
          to="/issues/$id"
          params={{ id: issue.id }}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          View issue <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
