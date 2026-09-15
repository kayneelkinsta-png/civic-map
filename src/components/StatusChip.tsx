import { STATUS_META, type IssueStatus } from "@/lib/civic";
import { cn } from "@/lib/utils";

export function StatusChip({
  status,
  size = "sm",
}: {
  status: IssueStatus;
  size?: "sm" | "lg";
}) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        meta.chip,
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}
