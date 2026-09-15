import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Bell, BellRing, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { CivicMap } from "@/components/map/CivicMap";
import { StatusChip } from "@/components/StatusChip";
import { StillAProblemButton } from "@/components/StillAProblemButton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  assetLabel,
  assetMeta,
  displayHandle,
  fetchAsset,
  fetchCategories,
  fetchIssue,
  formatDate,
  signedPhotoUrl,
  STATUS_META,
  timeAgo,
} from "@/lib/civic";

export const Route = createFileRoute("/issues/$id")({
  head: () => ({
    meta: [
      { title: "Issue details — CivicLense" },
      {
        name: "description",
        content:
          "See the full history of a reported local issue: photos, location, status changes, comments and resident confirmations.",
      },
      { property: "og:title", content: "Issue details — CivicLense" },
      {
        property: "og:description",
        content: "Photos, location, status history and resident confirmations for this issue.",
      },
    ],
  }),
  component: IssueDetail,
});

function IssueDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: issue, isLoading } = useQuery({
    queryKey: ["issue", id],
    queryFn: () => fetchIssue(id),
  });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const category = categories.find((c) => c.id === issue?.category_id);

  const { data: authority } = useQuery({
    queryKey: ["authority", issue?.authority_id],
    enabled: !!issue?.authority_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("authorities")
        .select("id, name, website_url, is_verified")
        .eq("id", issue!.authority_id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: ward } = useQuery({
    queryKey: ["ward", issue?.ward_id],
    enabled: !!issue?.ward_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wards")
        .select("id, name")
        .eq("id", issue!.ward_id!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: asset } = useQuery({
    queryKey: ["asset", issue?.asset_id],
    enabled: !!issue?.asset_id,
    queryFn: () => fetchAsset(issue!.asset_id!),
  });

  const { data: assetReports = 0 } = useQuery({
    queryKey: ["asset-reports", issue?.asset_id],
    enabled: !!issue?.asset_id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("issues")
        .select("id", { count: "exact", head: true })
        .eq("asset_id", issue!.asset_id!);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const { data: photos = [] } = useQuery({
    queryKey: ["issue-photos", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issue_photos")
        .select("id, storage_path, caption")
        .eq("issue_id", id)
        .order("created_at");
      if (error) throw error;
      const signed = await Promise.all(
        (data ?? []).map(async (p) => ({ ...p, url: await signedPhotoUrl(p.storage_path) })),
      );
      return signed;
    },
  });

  const { data: history = [] } = useQuery({
    queryKey: ["issue-history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issue_status_history")
        .select("id, from_status, to_status, note, created_at")
        .eq("issue_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["issue-comments", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issue_comments")
        .select("id, body, created_at, author_id")
        .eq("issue_id", id)
        .eq("is_hidden", false)
        .order("created_at");
      if (error) throw error;
      const rows = data ?? [];
      const ids = [...new Set(rows.map((r) => r.author_id))];
      const authors = new Map<string, { first_name: string; postcode_district: string | null }>();
      if (ids.length) {
        const { data: profiles } = await supabase
          .from("public_profiles")
          .select("id, first_name, postcode_district")
          .in("id", ids);
        for (const p of profiles ?? []) authors.set(p.id, p);
      }
      return rows.map((r) => ({ ...r, author: authors.get(r.author_id) ?? null }));
    },
  });

  const { data: following } = useQuery({
    queryKey: ["issue-follow", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("issue_followers")
        .select("id")
        .eq("issue_id", id)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to follow this issue");
      if (following) {
        const { error } = await supabase.from("issue_followers").delete().eq("id", following.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("issue_followers")
          .insert({ issue_id: id, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["issue-follow", id] });
      toast.success(following ? "You've stopped following this issue." : "You're following this issue.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [comment, setComment] = useState("");
  const postComment = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in to comment");
      const body = comment.trim();
      if (!body) throw new Error("Write something first");
      if (body.length > 1000) throw new Error("Comments must be under 1000 characters");
      const { error } = await supabase
        .from("issue_comments")
        .insert({ issue_id: id, author_id: user.id, body });
      if (error) throw error;
    },
    onSuccess: () => {
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["issue-comments", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const [hero, setHero] = useState<string | null>(null);
  useEffect(() => {
    setHero(photos.find((p) => p.url)?.url ?? null);
  }, [photos]);

  if (isLoading) {
    return (
      <AppShell>
        <p className="text-muted-foreground">Loading issue…</p>
      </AppShell>
    );
  }

  if (!issue) {
    return (
      <AppShell>
        <div className="civic-card p-8 text-center">
          <h1 className="text-xl font-semibold">Issue not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This issue may have been removed or the link is incorrect.
          </p>
          <Button asChild className="mt-4">
            <Link to="/issues">Browse all issues</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Link
        to="/issues"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All issues
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <header>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-secondary px-3 py-1 text-sm font-medium">
                <span aria-hidden>{category?.emoji} </span>
                {category?.name ?? "Other"}
              </span>
              <StatusChip status={issue.status} />
              {issue.is_sample && (
                <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                  Demo data
                </span>
              )}
            </div>
            <h1 className="mt-3 text-3xl font-semibold">{issue.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Reference {issue.reference} · reported {timeAgo(issue.created_at)}
            </p>
          </header>

          {hero && (
            <img
              src={hero}
              alt={`Photo of the reported issue: ${issue.title}`}
              className="civic-card max-h-[420px] w-full object-cover"
            />
          )}
          {photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto">
              {photos.map((p) =>
                p.url ? (
                  <button key={p.id} type="button" onClick={() => setHero(p.url)}>
                    <img
                      src={p.url}
                      alt={p.caption ?? "Additional photo of the issue"}
                      className="h-20 w-28 rounded-lg object-cover"
                    />
                  </button>
                ) : null,
              )}
            </div>
          )}

          <section className="civic-card p-5">
            <h2 className="text-lg font-semibold">Description</h2>
            <p className="mt-2 whitespace-pre-line text-muted-foreground">
              {issue.description || "No description was provided."}
            </p>
          </section>

          <section className="civic-card overflow-hidden">
            <div className="h-64">
              <CivicMap
                issues={[issue]}
                categories={categories}
                baseStyle="minimal"
                selectedId={issue.id}
                onSelect={() => {}}
                interactivePins={false}
                flyTo={{ lat: issue.latitude, lng: issue.longitude, zoom: 16, key: 1 }}
              />
            </div>
            <p className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              {issue.address_text ?? `${issue.latitude.toFixed(5)}, ${issue.longitude.toFixed(5)}`}
            </p>
          </section>

          <section className="civic-card p-5">
            <h2 className="text-lg font-semibold">Status history</h2>
            <ol className="mt-4 space-y-4">
              {history.map((h) => (
                <li key={h.id} className="flex gap-3">
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_META[h.to_status].dot}`}
                  />
                  <div>
                    <p className="text-sm font-medium">
                      {h.from_status
                        ? `${STATUS_META[h.from_status].label} → ${STATUS_META[h.to_status].label}`
                        : `Reported as ${STATUS_META[h.to_status].label}`}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(h.created_at)}</p>
                    {h.note && <p className="mt-1 text-sm text-muted-foreground">{h.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className="civic-card p-5">
            <h2 className="text-lg font-semibold">Comments</h2>
            <ul className="mt-4 space-y-4">
              {comments.map((c) => (
                <li key={c.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                  <p className="text-sm font-medium">{displayHandle(c.author)}</p>
                  <p className="text-xs text-muted-foreground">{timeAgo(c.created_at)}</p>
                  <p className="mt-2 text-sm">{c.body}</p>
                </li>
              ))}
              {comments.length === 0 && (
                <li className="text-sm text-muted-foreground">No comments yet.</li>
              )}
            </ul>
            {user ? (
              <div className="mt-4 space-y-2">
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Add local context — what's happening, how it affects people."
                  maxLength={1000}
                />
                <Button onClick={() => postComment.mutate()} disabled={postComment.isPending}>
                  Post comment
                </Button>
              </div>
            ) : (
              <Button asChild variant="outline" className="mt-4">
                <Link to="/login" search={{ redirect: `/issues/${issue.id}` }}>
                  Sign in to comment
                </Link>
              </Button>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <StillAProblemButton
            issueId={issue.id}
            count={issue.confirmation_count}
            lastConfirmedAt={issue.last_confirmed_at}
          />

          <div className="civic-card space-y-3 p-5 text-sm">
            <Row label="Status" value={STATUS_META[issue.status].label} />
            <Row label="Reported" value={formatDate(issue.created_at)} />
            <Row label="Last confirmed" value={timeAgo(issue.last_confirmed_at)} />
            <Row label="Confirmations" value={String(issue.confirmation_count)} />
            {issue.resolved_at && <Row label="Resolved" value={formatDate(issue.resolved_at)} />}
            {issue.resolved_at && (
              <Row
                label="Resolution time"
                value={`${Math.max(
                  1,
                  Math.round(
                    (new Date(issue.resolved_at).getTime() - new Date(issue.created_at).getTime()) /
                      86400000,
                  ),
                )} days`}
              />
            )}
            {ward?.name && <Row label="Ward" value={ward.name} />}
            {issue.postcode_sector && <Row label="Postcode sector" value={issue.postcode_sector} />}
          </div>

          {asset && (
            <div className="civic-card p-5">
              <h2 className="text-sm font-semibold">Linked infrastructure</h2>
              <p className="mt-1 text-sm">
                <span aria-hidden>{assetMeta(asset.asset_type).emoji} </span>
                {assetLabel(asset)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                <span className="capitalize">{asset.status.replace(/_/g, " ")}</span> ·{" "}
                {assetReports} community report{assetReports === 1 ? "" : "s"}
                {asset.external_asset_id ? ` · ${asset.external_asset_id}` : ""}
              </p>
              {asset.is_sample && (
                <p className="mt-2 text-xs text-muted-foreground">Demo asset record.</p>
              )}
            </div>
          )}


          <div className="civic-card p-5">
            <h2 className="text-sm font-semibold">Responsible authority</h2>
            <p className="mt-1 text-sm">{authority?.name ?? "Being determined"}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              Determined from the report location. CivicLense is independent — this authority has
              not seen or responded to this report.
            </p>
          </div>

          <Button
            variant="outline"
            className="h-12 w-full gap-2"
            onClick={() => toggleFollow.mutate()}
            disabled={toggleFollow.isPending}
          >
            {following ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
            {following ? "Following this issue" : "Follow this issue"}
          </Button>
        </aside>
      </div>
    </AppShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
