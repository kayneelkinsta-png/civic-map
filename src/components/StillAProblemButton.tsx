import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { AlertTriangle, Check } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/civic";
import { Button } from "@/components/ui/button";

export function StillAProblemButton({
  issueId,
  count,
  lastConfirmedAt,
}: {
  issueId: string;
  count: number;
  lastConfirmedAt: string | null;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: mine } = useQuery({
    queryKey: ["confirmation", issueId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issue_confirmations")
        .select("id, updated_at")
        .eq("issue_id", issueId)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const confirm = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in first");
      if (mine) {
        const { error } = await supabase
          .from("issue_confirmations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", mine.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("issue_confirmations")
          .insert({ issue_id: issueId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Thanks — your confirmation has been recorded.");
      queryClient.invalidateQueries({ queryKey: ["issue", issueId] });
      queryClient.invalidateQueries({ queryKey: ["issues"] });
      queryClient.invalidateQueries({ queryKey: ["confirmation", issueId] });
    },
    onError: (e: Error) => {
      toast.error(
        e.message.includes("already confirmed")
          ? "You've already confirmed this recently. Try again later."
          : e.message,
      );
    },
  });

  if (!user) {
    return (
      <div className="civic-card p-4">
        <Button asChild size="lg" variant="outline" className="h-14 w-full text-base">
          <Link to="/login" search={{ redirect: `/issues/${issueId}` }}>
            Sign in to confirm this is still a problem
          </Link>
        </Button>
        <p className="mt-3 text-sm text-muted-foreground">
          {count} resident{count === 1 ? " has" : "s have"} confirmed this is still a problem.
        </p>
      </div>
    );
  }

  return (
    <div className="civic-card p-4">
      <Button
        size="lg"
        onClick={() => confirm.mutate()}
        disabled={confirm.isPending}
        className="h-14 w-full gap-2 text-base font-semibold"
      >
        {mine ? <Check className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
        {mine ? "CONFIRM AGAIN — STILL A PROBLEM" : "STILL A PROBLEM"}
      </Button>
      <p className="mt-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{count}</span> resident
        {count === 1 ? " has" : "s have"} confirmed this is still a problem.
        {lastConfirmedAt ? ` Last confirmed ${timeAgo(lastConfirmedAt)}.` : ""}
      </p>
    </div>
  );
}
