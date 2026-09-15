import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Camera, Crosshair, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { CivicMap } from "@/components/map/CivicMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { fetchCategories, geocode, reverseGeocode, SOUTHAMPTON, type Category } from "@/lib/civic";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/report")({
  head: () => ({
    meta: [
      { title: "Report a local issue — CivicLense" },
      {
        name: "description",
        content:
          "Report a pothole, broken street light, fly-tipping or other local problem in a few taps, with a photo and exact location.",
      },
      { property: "og:title", content: "Report a local issue — CivicLense" },
      {
        property: "og:description",
        content: "Report a local problem in a few taps, with a photo and exact location.",
      },
    ],
  }),
  component: ReportPage,
});

const STEPS = ["Category", "Location", "Details", "Photo", "Review"];

function ReportPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });

  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<Category | null>(null);
  const [pin, setPin] = useState({ lat: SOUTHAMPTON.lat, lng: SOUTHAMPTON.lng });
  const [flyTo, setFlyTo] = useState<{ lat: number; lng: number; zoom: number; key: number } | null>(
    null,
  );
  const [address, setAddress] = useState("");
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!user) {
    return (
      <AppShell>
        <div className="civic-card mx-auto max-w-md p-8 text-center">
          <h1 className="text-xl font-semibold">Sign in to report an issue</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A quick account keeps reports accountable and lets you track what happens next.
          </p>
          <div className="mt-5 flex flex-col gap-2">
            <Button asChild className="h-12">
              <Link to="/login" search={{ redirect: "/report" }}>
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

  async function useMyLocation() {
    if (!navigator.geolocation) {
      toast.error("Location isn't available on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPin(next);
        setFlyTo({ ...next, zoom: 17, key: Date.now() });
        setAddress((await reverseGeocode(next.lat, next.lng)) ?? "");
      },
      () => toast.error("We couldn't get your location."),
      { enableHighAccuracy: true },
    );
  }

  async function runSearch() {
    const hit = await geocode(search);
    if (!hit) {
      toast.error("We couldn't find that postcode or place.");
      return;
    }
    setPin({ lat: hit.lat, lng: hit.lng });
    setFlyTo({ lat: hit.lat, lng: hit.lng, zoom: 17, key: Date.now() });
    setAddress(hit.label);
  }

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0] ?? null;
    if (selected && selected.size > 10 * 1024 * 1024) {
      toast.error("Photos must be under 10MB.");
      return;
    }
    setFile(selected);
    setPreview(selected ? URL.createObjectURL(selected) : null);
  }

  async function submit() {
    if (!category) return;
    setBusy(true);
    try {
      const { data: issue, error } = await supabase
        .from("issues")
        .insert({
          reporter_id: user!.id,
          category_id: category.id,
          title: title.trim() || category.name,
          description: description.trim(),
          address_text: address.trim() || null,
          latitude: pin.lat,
          longitude: pin.lng,
        })
        .select("id")
        .single();
      if (error) throw error;

      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
        const path = `${user!.id}/${issue.id}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("issue-photos").upload(path, file);
        if (upErr) throw upErr;
        const { error: rowErr } = await supabase
          .from("issue_photos")
          .insert({ issue_id: issue.id, uploaded_by: user!.id, storage_path: path });
        if (rowErr) throw rowErr;
      }

      toast.success("Report submitted. Thank you.");
      navigate({ to: "/issues/$id", params: { id: issue.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const canContinue =
    (step === 0 && !!category) ||
    (step === 1 && !!pin) ||
    (step === 2 && description.trim().length > 4) ||
    step === 3 ||
    step === 4;

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold">Report an issue</h1>
          <div className="mt-4 flex gap-1.5">
            {STEPS.map((label, index) => (
              <div key={label} className="flex-1">
                <div
                  className={cn(
                    "h-1.5 rounded-full",
                    index <= step ? "bg-primary" : "bg-secondary",
                  )}
                />
                <p className="mt-1.5 text-[11px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </header>

        {step === 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCategory(c);
                  setStep(1);
                }}
                className={cn(
                  "civic-card flex flex-col items-center gap-2 p-5 text-center transition-shadow hover:shadow-float",
                  category?.id === c.id && "ring-2 ring-primary",
                )}
              >
                <span className="text-3xl" aria-hidden>
                  {c.emoji}
                </span>
                <span className="text-sm font-medium">{c.name}</span>
              </button>
            ))}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runSearch()}
                placeholder="Postcode or street name"
                className="h-12"
              />
              <Button variant="outline" className="h-12" onClick={runSearch}>
                Find
              </Button>
              <Button variant="outline" className="h-12 gap-2" onClick={useMyLocation}>
                <Crosshair className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">Locate me</span>
              </Button>
            </div>
            <div className="civic-card h-[360px] overflow-hidden">
              <CivicMap
                issues={[]}
                categories={categories}
                baseStyle="streets"
                selectedId={null}
                onSelect={() => {}}
                pin={pin}
                onPinMove={async (lat, lng) => {
                  setPin({ lat, lng });
                  setAddress((await reverseGeocode(lat, lng)) ?? "");
                }}
                flyTo={flyTo}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Drag the pin to the exact spot. {address || "No address detected yet."}
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Short title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder={category ? `${category.name} on…` : "Short summary"}
                className="h-12"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">What's the problem?</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                rows={6}
                placeholder="Describe what you can see, how long it's been there and why it matters."
              />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <label className="civic-card flex cursor-pointer flex-col items-center gap-3 p-10 text-center">
              <Camera className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">Take or choose a photo</span>
              <span className="text-xs text-muted-foreground">Optional · up to 10MB</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={pickFile}
              />
            </label>
            {preview && (
              <img src={preview} alt="Preview of your photo" className="civic-card w-full object-cover" />
            )}
          </div>
        )}

        {step === 4 && (
          <div className="civic-card space-y-4 p-5">
            <h2 className="text-lg font-semibold">Check your report</h2>
            <p className="text-sm">
              <span aria-hidden>{category?.emoji} </span>
              <span className="font-medium">{category?.name}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              {address || `${pin.lat.toFixed(5)}, ${pin.lng.toFixed(5)}`}
            </p>
            {preview && <img src={preview} alt="Your photo" className="rounded-xl" />}
            <p className="whitespace-pre-line text-sm">{description}</p>
            <p className="text-xs text-muted-foreground">
              CivicLense is an independent community platform. Submitting this report does not send
              it to a council.
            </p>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            className="h-12 gap-2"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          {step < 4 ? (
            <Button className="h-12 px-8" disabled={!canContinue} onClick={() => setStep((s) => s + 1)}>
              Continue
            </Button>
          ) : (
            <Button className="h-12 px-8" disabled={busy} onClick={submit}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit report
            </Button>
          )}
        </div>
      </div>
    </AppShell>
  );
}
